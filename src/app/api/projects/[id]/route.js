import { NextResponse } from 'next/server';
import { getAdminDb, serializeProjectDoc } from '@/lib/firebaseAdmin';

const COLLECTION_NAME = 'projects';

export async function GET(_request, { params }) {
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
