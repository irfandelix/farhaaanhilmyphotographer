import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebaseAdmin';

const COLLECTION_NAME = 'projects';

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = getAdminDb();
    const docRef = db.collection(COLLECTION_NAME).doc(id);

    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    if (docSnap.data().isLocked) {
      return NextResponse.json({ success: false, error: 'Selection is locked' }, { status: 403 });
    }

    if (body.mode === 'toggle') {
      const { photoName, isSelected } = body;
      if (!photoName || typeof photoName !== 'string') {
        return NextResponse.json({ success: false, error: 'Invalid photoName' }, { status: 400 });
      }
      await docRef.update({
        selectedPhotos: isSelected
          ? FieldValue.arrayUnion(photoName)
          : FieldValue.arrayRemove(photoName),
      });
      return NextResponse.json({ success: true });
    }

    if (body.mode === 'save') {
      const selectedPhotos = Array.isArray(body.selectedPhotos) ? body.selectedPhotos : [];
      const isLocked = body.isLocked !== undefined ? Boolean(body.isLocked) : true;
      await docRef.update({
        selectedPhotos,
        isLocked,
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid mode' }, { status: 400 });
  } catch (error) {
    console.error('Error updating selection:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
