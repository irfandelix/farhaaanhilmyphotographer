import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';

const COLLECTION_NAME = 'projects';

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = getAdminDb();
    const docRef = db.collection(COLLECTION_NAME).doc(id);

    const result = await db.runTransaction(async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists) {
        return { status: 404, body: { success: false, error: 'Project not found' } };
      }

      const data = docSnap.data();
      if (data.isLocked) {
        return { status: 403, body: { success: false, error: 'Selection is locked' } };
      }

      const isMultiSelector = Boolean(data.isMultiSelector);
      const currentSelections = { ...(data.photoSelections || {}) };
      const currentLockedSelectors = Array.isArray(data.lockedSelectors) ? [...data.lockedSelectors] : [];

      if (isMultiSelector) {
        const selectorName = typeof body.selectorName === 'string' ? body.selectorName.trim() : '';
        if (!selectorName) {
          return { status: 400, body: { success: false, error: 'Selector name is required' } };
        }

        if (currentLockedSelectors.includes(selectorName)) {
          return {
            status: 403,
            body: {
              success: false,
              error: 'Your selection is already locked',
              selectedPhotos: data.selectedPhotos || [],
              photoSelections: currentSelections,
              lockedSelectors: currentLockedSelectors,
              isLocked: false,
            },
          };
        }

        if (body.mode === 'toggle') {
          const { photoName, isSelected } = body;
          if (!photoName || typeof photoName !== 'string') {
            return { status: 400, body: { success: false, error: 'Invalid photoName' } };
          }

          const existingOwner = currentSelections[photoName];
          if (isSelected) {
            if (existingOwner && existingOwner !== selectorName) {
              return {
                status: 409,
                body: {
                  success: false,
                  error: `Photo already selected by ${existingOwner}`,
                  owner: existingOwner,
                  selectedPhotos: data.selectedPhotos || [],
                  photoSelections: currentSelections,
                  lockedSelectors: currentLockedSelectors,
                  isLocked: false,
                },
              };
            }
            currentSelections[photoName] = selectorName;
          } else {
            if (existingOwner && existingOwner !== selectorName) {
              return {
                status: 403,
                body: {
                  success: false,
                  error: `Cannot unselect photo owned by ${existingOwner}`,
                  owner: existingOwner,
                  selectedPhotos: data.selectedPhotos || [],
                  photoSelections: currentSelections,
                  lockedSelectors: currentLockedSelectors,
                  isLocked: false,
                },
              };
            }
            delete currentSelections[photoName];
          }

          const selectedPhotos = Object.keys(currentSelections);
          transaction.update(docRef, {
            photoSelections: currentSelections,
            selectedPhotos,
          });

          return {
            status: 200,
            body: {
              success: true,
              selectedPhotos,
              photoSelections: currentSelections,
              lockedSelectors: currentLockedSelectors,
              isLocked: false,
            },
          };
        }

        if (body.mode === 'save') {
          if (!currentLockedSelectors.includes(selectorName)) {
            currentLockedSelectors.push(selectorName);
          }
          transaction.update(docRef, {
            lockedSelectors: currentLockedSelectors,
            isLocked: false,
          });
          return {
            status: 200,
            body: {
              success: true,
              selectedPhotos: data.selectedPhotos || [],
              photoSelections: currentSelections,
              lockedSelectors: currentLockedSelectors,
              isLocked: false,
            },
          };
        }

        return { status: 400, body: { success: false, error: 'Invalid mode' } };
      }

      // Single-client mode (default)
      if (body.mode === 'toggle') {
        const { photoName, isSelected } = body;
        if (!photoName || typeof photoName !== 'string') {
          return { status: 400, body: { success: false, error: 'Invalid photoName' } };
        }
        const currentPhotos = Array.isArray(data.selectedPhotos) ? [...data.selectedPhotos] : [];
        const nextPhotos = isSelected
          ? (currentPhotos.includes(photoName) ? currentPhotos : [...currentPhotos, photoName])
          : currentPhotos.filter((name) => name !== photoName);

        transaction.update(docRef, { selectedPhotos: nextPhotos });
        return {
          status: 200,
          body: {
            success: true,
            selectedPhotos: nextPhotos,
            photoSelections: currentSelections,
            lockedSelectors: currentLockedSelectors,
            isLocked: false,
          },
        };
      }

      if (body.mode === 'save') {
        const selectedPhotos = Array.isArray(body.selectedPhotos) ? body.selectedPhotos : [];
        const isLocked = body.isLocked !== undefined ? Boolean(body.isLocked) : true;
        transaction.update(docRef, {
          selectedPhotos,
          isLocked,
        });
        return {
          status: 200,
          body: {
            success: true,
            selectedPhotos,
            photoSelections: currentSelections,
            lockedSelectors: currentLockedSelectors,
            isLocked,
          },
        };
      }

      return { status: 400, body: { success: false, error: 'Invalid mode' } };
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('Error updating selection:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
