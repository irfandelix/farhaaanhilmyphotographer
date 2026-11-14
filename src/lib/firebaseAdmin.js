import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp() {
  if (getApps().length > 0) {
    return getApp();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin credentials (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) are not configured.');
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export function serializeProjectDoc(docSnap) {
  const data = docSnap.data();
  const normalizeTimestamp = (ts) => {
    if (!ts) return null;
    if (typeof ts.seconds === 'number') {
      return { seconds: ts.seconds, nanoseconds: ts.nanoseconds || 0 };
    }
    return ts;
  };

  return {
    id: docSnap.id,
    ...data,
    createdAt: normalizeTimestamp(data.createdAt),
    updatedAt: normalizeTimestamp(data.updatedAt),
  };
}
