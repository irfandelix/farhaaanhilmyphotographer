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

export async function GET(request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const snapshot = await db
      .collection(COLLECTION_NAME)
      .orderBy('createdAt', 'desc')
      .get();

    const projects = snapshot.docs.map(serializeProjectDoc);
    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error getting projects:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.json();
    const db = getAdminDb();

    const folderId = data.gdriveLink ? extractFolderId(data.gdriveLink) : null;
    const items = Array.isArray(data.items) ? data.items : [];
    let calculatedPaymentAmount = Number(data.paymentAmount || 0);

    if (items.length > 0) {
      calculatedPaymentAmount = items.reduce(
        (sum, item) => sum + Number(item.qty) * Number(item.price),
        0
      );
    }

    const maxSeqSnap = await db
      .collection(COLLECTION_NAME)
      .orderBy('invoiceSeq', 'desc')
      .limit(1)
      .get();

    const currentMaxSeq = !maxSeqSnap.empty
      ? maxSeqSnap.docs[0].data().invoiceSeq || 0
      : 0;

    const counterRef = db.collection('counters').doc('invoice');
    const newDocRef = db.collection(COLLECTION_NAME).doc();

    const seqNum = await db.runTransaction(async (transaction) => {
      const counterSnap = await transaction.get(counterRef);
      const lastSeq = counterSnap.exists
        ? Math.max(counterSnap.data().lastSeq || 0, currentMaxSeq)
        : currentMaxSeq;
      const nextSeq = lastSeq + 1;

      transaction.set(counterRef, { lastSeq: nextSeq }, { merge: true });
      transaction.set(newDocRef, {
        clientName: data.clientName,
        photoType: data.photoType,
        description: data.description || '',
        items,
        shootDate: data.shootDate,
        shootTime: data.shootTime || '',
        paymentAmount: calculatedPaymentAmount,
        dpAmount: Number(data.dpAmount || 0),
        dpDate: data.dpDate || '',
        lunasAmount: Number(data.lunasAmount || 0),
        lunasDate: data.lunasDate || '',
        whatsapp: data.whatsapp || '',
        shootTitle: data.shootTitle || '',
        additionalSchedules: data.additionalSchedules || [],
        paymentStatus: data.paymentStatus || 'Belum Bayar',
        gdriveLink: data.gdriveLink || '',
        gdriveFolderId: folderId,
        selectedPhotos: [],
        isMultiSelector: Boolean(data.isMultiSelector),
        photoSelections: {},
        lockedSelectors: [],
        isLocked: false,
        invoiceSeq: nextSeq,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return nextSeq;
    });

    return NextResponse.json({ success: true, id: newDocRef.id, invoiceSeq: seqNum });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
