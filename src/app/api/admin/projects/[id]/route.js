import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/auth';
import { getAdminDb, serializeProjectDoc } from '@/lib/firebaseAdmin';
import { extractFolderId } from '@/lib/driveUtils';

const COLLECTION_NAME = 'projects';

async function isAuthorized(request) {
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminToken(token);
}

export async function GET(request, { params }) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const db = getAdminDb();
    const docSnap = await db.collection(COLLECTION_NAME).doc(id).get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ project: serializeProjectDoc(docSnap) });
  } catch (error) {
    console.error('Error getting project:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { action, payload } = body;
    const db = getAdminDb();
    const docRef = db.collection(COLLECTION_NAME).doc(id);

    if (action === 'paymentStatus') {
      await docRef.update({ paymentStatus: payload.paymentStatus });
      return NextResponse.json({ success: true });
    }

    if (action === 'unlock') {
      if (payload?.selectorName) {
        await docRef.update({
          isLocked: false,
          lockedSelectors: FieldValue.arrayRemove(payload.selectorName),
        });
      } else {
        await docRef.update({
          isLocked: false,
          lockedSelectors: [],
        });
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'toggleMultiSelector') {
      await docRef.update({
        isMultiSelector: Boolean(payload?.isMultiSelector),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'setMaxSelections') {
      const raw = Number(payload?.maxSelections || 0);
      const maxSelections = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
      await docRef.update({
        maxSelections,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ success: true, maxSelections });
    }

    if (action === 'resetSelections') {
      const selectorName = typeof payload?.selectorName === 'string' ? payload.selectorName.trim() : '';
      if (selectorName) {
        const result = await db.runTransaction(async (transaction) => {
          const snap = await transaction.get(docRef);
          if (!snap.exists) {
            return null;
          }
          const data = snap.data();
          const currentSelections = { ...(data.photoSelections || {}) };
          Object.keys(currentSelections).forEach((photoName) => {
            if (currentSelections[photoName] === selectorName) {
              delete currentSelections[photoName];
            }
          });
          const nextSelectedPhotos = Object.keys(currentSelections);
          const nextLockedSelectors = (Array.isArray(data.lockedSelectors) ? data.lockedSelectors : []).filter(
            (n) => n !== selectorName
          );
          transaction.update(docRef, {
            photoSelections: currentSelections,
            selectedPhotos: nextSelectedPhotos,
            lockedSelectors: nextLockedSelectors,
            isLocked: false,
            updatedAt: FieldValue.serverTimestamp(),
          });
          return {
            selectedPhotos: nextSelectedPhotos,
            photoSelections: currentSelections,
            lockedSelectors: nextLockedSelectors,
          };
        });
        if (!result) {
          return NextResponse.json({ success: false, error: 'Project tidak ditemukan' }, { status: 404 });
        }
        return NextResponse.json({ success: true, ...result });
      }

      await docRef.update({
        selectedPhotos: [],
        photoSelections: {},
        lockedSelectors: [],
        isLocked: false,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({
        success: true,
        selectedPhotos: [],
        photoSelections: {},
        lockedSelectors: [],
      });
    }

    if (action === 'financials') {
      const data = payload || {};
      const updatePayload = {
        dpAmount: Number(data.dpAmount || 0),
        dpDate: data.dpDate || '',
        lunasAmount: Number(data.lunasAmount || 0),
        lunasDate: data.lunasDate || '',
        whatsapp: data.whatsapp || '',
        shootTitle: data.shootTitle || '',
        additionalSchedules: data.additionalSchedules || [],
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (data.clientName !== undefined) updatePayload.clientName = data.clientName;
      if (data.photoType !== undefined) updatePayload.photoType = data.photoType;
      if (data.shootDate !== undefined) updatePayload.shootDate = data.shootDate;
      if (data.shootTime !== undefined) updatePayload.shootTime = data.shootTime;
      if (data.description !== undefined) updatePayload.description = data.description;
      if (data.paymentStatus !== undefined) updatePayload.paymentStatus = data.paymentStatus;

      if (data.items) {
        updatePayload.items = data.items;
        updatePayload.paymentAmount = data.items.reduce(
          (sum, item) => sum + Number(item.qty) * Number(item.price),
          0
        );
      } else if (data.paymentAmount !== undefined) {
        updatePayload.paymentAmount = Number(data.paymentAmount);
      }

      await docRef.update(updatePayload);
      return NextResponse.json({ success: true });
    }

    if (action === 'gdriveLink') {
      const folderId = extractFolderId(payload?.link);
      if (!folderId) {
        return NextResponse.json({ success: false, error: 'Link Google Drive tidak valid' }, { status: 400 });
      }
      await docRef.update({
        gdriveLink: payload.link,
        gdriveFolderId: folderId,
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'gdriveEditedLink') {
      const link = payload?.link || '';
      if (link.trim() === '') {
        await docRef.update({
          gdriveEditedLink: '',
          gdriveEditedFolderId: '',
        });
        return NextResponse.json({ success: true });
      }

      const folderId = extractFolderId(link);
      if (!folderId) {
        return NextResponse.json({ success: false, error: 'Link Google Drive tidak valid' }, { status: 400 });
      }

      await docRef.update({
        gdriveEditedLink: link,
        gdriveEditedFolderId: folderId,
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'gdriveSessions') {
      const sessions = Array.isArray(payload?.sessions) ? payload.sessions : [];
      const processedSessions = sessions.map((session) => {
        const folderId = extractFolderId(session.link);
        if (!folderId) {
          throw new Error(`Link Google Drive tidak valid untuk sesi: ${session.name}`);
        }
        return {
          id: session.id || Math.random().toString(36).substring(7),
          name: session.name,
          link: session.link,
          folderId,
        };
      });

      const fallbackData =
        processedSessions.length > 0
          ? { gdriveLink: processedSessions[0].link, gdriveFolderId: processedSessions[0].folderId }
          : { gdriveLink: '', gdriveFolderId: '' };

      await docRef.update({
        sessions: processedSessions,
        ...fallbackData,
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const db = getAdminDb();
    await db.collection(COLLECTION_NAME).doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
