import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc, 
  doc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  limit
} from 'firebase/firestore';

const COLLECTION_NAME = 'projects';

// Helper to extract Folder ID from various Google Drive link formats
export function extractFolderId(url) {
  try {
    const regex = /[-\w]{25,}/;
    const match = url.match(regex);
    return match ? match[0] : null;
  } catch (error) {
    return null;
  }
}

// Create a new project
export async function createProject(data) {
  try {
    let folderId = null;
    if (data.gdriveLink) {
      folderId = extractFolderId(data.gdriveLink);
    }

    const items = data.items || [];
    let calculatedPaymentAmount = Number(data.paymentAmount || 0);

    // Jika ada items, hitung ulang total payment berdasarkan items
    if (items.length > 0) {
      calculatedPaymentAmount = items.reduce((sum, item) => sum + (Number(item.qty) * Number(item.price)), 0);
    }

    // Cari nomor urut (seqNum) tertinggi yang pernah ada
    const q = query(collection(db, COLLECTION_NAME), orderBy('seqNum', 'desc'), limit(1));
    const querySnapshot = await getDocs(q);
    
    let seqNum = 1;
    if (!querySnapshot.empty) {
      const highestSeqNum = querySnapshot.docs[0].data().seqNum || 0;
      seqNum = highestSeqNum + 1;
    }

    const projectData = {
      clientName: data.clientName,
      photoType: data.photoType,
      description: data.description || "",
      items: items, // Save line items
      shootDate: data.shootDate,
      shootTime: data.shootTime || "",
      paymentAmount: calculatedPaymentAmount,
      dpAmount: Number(data.dpAmount || 0),
      paymentStatus: data.paymentStatus || "Belum Bayar",
      gdriveLink: data.gdriveLink || "",
      gdriveFolderId: folderId,
      selectedPhotos: [], // Will store photo IDs or names
      isLocked: false,
      invoiceSeq: seqNum,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), projectData);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding document: ", error);
    return { success: false, error: error.message };
  }
}

// Get all projects for Admin Dashboard
export async function getProjects() {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const projects = [];
    querySnapshot.forEach((doc) => {
      projects.push({ id: doc.id, ...doc.data() });
    });
    return projects;
  } catch (error) {
    console.error("Error getting projects: ", error);
    return [];
  }
}

// Get a single project by ID (for Admin Detail & Client Page)
export async function getProjectById(id) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error getting project: ", error);
    return null;
  }
}

// Update payment status
export async function updatePaymentStatus(id, newStatus) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      paymentStatus: newStatus
    });
    return true;
  } catch (error) {
    console.error("Error updating status: ", error);
    return false;
  }
}

// Update payment financials (Harga & DP)
export const updateProjectFinancials = async (id, data) => {
  try {
    const docRef = doc(db, 'projects', id);
    
    const updatePayload = {
      dpAmount: Number(data.dpAmount || 0),
      updatedAt: serverTimestamp()
    };

    if (data.whatsapp !== undefined) updatePayload.whatsapp = data.whatsapp;
    if (data.lunasAmount !== undefined) updatePayload.lunasAmount = Number(data.lunasAmount);
    if (data.lunasDate !== undefined) updatePayload.lunasDate = data.lunasDate;
    if (data.shootDate !== undefined) updatePayload.shootDate = data.shootDate;
    if (data.shootTime !== undefined) updatePayload.shootTime = data.shootTime;
    if (data.description !== undefined) updatePayload.description = data.description;

    if (data.items) {
      updatePayload.items = data.items;
      updatePayload.paymentAmount = data.items.reduce((sum, item) => sum + (Number(item.qty) * Number(item.price)), 0);
    } else if (data.paymentAmount !== undefined) {
      updatePayload.paymentAmount = Number(data.paymentAmount);
    }

    await updateDoc(docRef, updatePayload);
    return { success: true };
  } catch (error) {
    console.error("Error updating financials:", error);
    return { success: false, error: error.message };
  }
};

// Save client selections and lock them
export async function updateSelectedPhotos(id, selectedPhotos, isLocked = true) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      selectedPhotos: selectedPhotos,
      isLocked: isLocked
    });
    return true;
  } catch (error) {
    console.error("Error updating photos: ", error);
    return false;
  }
}

// Unlock client selections (For Admin)
export async function unlockClientSelection(id) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      isLocked: false
    });
    return true;
  } catch (error) {
    console.error("Error unlocking: ", error);
    return false;
  }
}

// Update GDrive Link
export async function updateGDriveLink(id, link) {
  try {
    const folderId = extractFolderId(link);
    if (!folderId) throw new Error("Link Google Drive tidak valid");

    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      gdriveLink: link,
      gdriveFolderId: folderId
    });
    return true;
  } catch (error) {
    console.error("Error updating GDrive link: ", error);
    return false;
  }
}

// Update GDrive Edited Link
export async function updateGDriveEditedLink(id, link) {
  try {
    const folderId = extractFolderId(link);
    if (!folderId) throw new Error("Link Google Drive tidak valid");

    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      gdriveEditedLink: link,
      gdriveEditedFolderId: folderId
    });
    return true;
  } catch (error) {
    console.error("Error updating GDrive edited link: ", error);
    return false;
  }
}

// Update GDrive Sessions (Multiple Links)
export async function updateGDriveSessions(id, sessions) {
  try {
    const processedSessions = sessions.map(session => {
      const folderId = extractFolderId(session.link);
      if (!folderId) throw new Error(`Link Google Drive tidak valid untuk sesi: ${session.name}`);
      return {
        id: session.id || Math.random().toString(36).substring(7),
        name: session.name,
        link: session.link,
        folderId: folderId
      };
    });

    const docRef = doc(db, COLLECTION_NAME, id);
    // Kita tetap simpan gdriveLink pertama sebagai fallback legacy jika dibutuhkan
    const fallbackData = processedSessions.length > 0 
      ? { gdriveLink: processedSessions[0].link, gdriveFolderId: processedSessions[0].folderId }
      : { gdriveLink: '', gdriveFolderId: '' };
      
    await updateDoc(docRef, {
      sessions: processedSessions,
      ...fallbackData
    });
    return true;
  } catch (error) {
    console.error("Error updating GDrive sessions: ", error);
    return false;
  }
}

// Delete a project
export async function deleteProject(id) {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error("Error deleting project: ", error);
    return false;
  }
}
