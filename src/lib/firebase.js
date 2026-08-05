import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB3jQorv2ol8eZXq_l71V6Ech4SK3DfjXE",
  authDomain: "photo-selector-260e2.firebaseapp.com",
  projectId: "photo-selector-260e2",
  storageBucket: "photo-selector-260e2.firebasestorage.app",
  messagingSenderId: "149326519751",
  appId: "1:149326519751:web:535d69647e3a6b4c4a8de2"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db };
