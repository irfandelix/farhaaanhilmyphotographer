export { extractFolderId } from './driveUtils';

export async function createProject(data) {
  try {
    const res = await fetch('/api/admin/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (error) {
    console.error('Error adding document: ', error);
    return { success: false, error: error.message };
  }
}

export async function getProjects() {
  try {
    const res = await fetch('/api/admin/projects', { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.projects || [];
  } catch (error) {
    console.error('Error getting projects: ', error);
    return [];
  }
}

export async function getProjectById(id) {
  try {
    const res = await fetch(`/api/projects/${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.project || null;
  } catch (error) {
    console.error('Error getting project: ', error);
    return null;
  }
}

async function patchAdminProject(id, action, payload) {
  const res = await fetch(`/api/admin/projects/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload }),
  });
  return res.json();
}

export async function updatePaymentStatus(id, newStatus) {
  try {
    const data = await patchAdminProject(id, 'paymentStatus', { paymentStatus: newStatus });
    return !!data.success;
  } catch (error) {
    console.error('Error updating status: ', error);
    return false;
  }
}

export const updateProjectFinancials = async (id, data) => {
  try {
    return await patchAdminProject(id, 'financials', data);
  } catch (error) {
    console.error('Error updating financials:', error);
    return { success: false, error: error.message };
  }
};

export async function updateSelectedPhotos(id, selectedPhotos, isLocked = true, selectorName = null) {
  try {
    const res = await fetch(`/api/projects/${encodeURIComponent(id)}/selection`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'save', selectedPhotos, isLocked, selectorName }),
    });
    return await res.json();
  } catch (error) {
    console.error('Error updating photos: ', error);
    return { success: false, error: error.message };
  }
}

export async function unlockClientSelection(id, selectorName = null) {
  try {
    const data = await patchAdminProject(id, 'unlock', selectorName ? { selectorName } : {});
    return !!data.success;
  } catch (error) {
    console.error('Error unlocking: ', error);
    return false;
  }
}

export async function toggleMultiSelector(id, isMultiSelector) {
  try {
    const data = await patchAdminProject(id, 'toggleMultiSelector', { isMultiSelector });
    return !!data.success;
  } catch (error) {
    console.error('Error toggling multi-selector: ', error);
    return false;
  }
}

export async function updateGDriveLink(id, link) {
  try {
    const data = await patchAdminProject(id, 'gdriveLink', { link });
    return !!data.success;
  } catch (error) {
    console.error('Error updating GDrive link: ', error);
    return false;
  }
}

export async function updateGDriveEditedLink(id, link) {
  try {
    const data = await patchAdminProject(id, 'gdriveEditedLink', { link });
    return !!data.success;
  } catch (error) {
    console.error('Error updating GDrive edited link: ', error);
    return false;
  }
}

export async function updateGDriveSessions(id, sessions) {
  try {
    const data = await patchAdminProject(id, 'gdriveSessions', { sessions });
    return !!data.success;
  } catch (error) {
    console.error('Error updating GDrive sessions: ', error);
    return false;
  }
}

export async function deleteProject(id) {
  try {
    const res = await fetch(`/api/admin/projects/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    return !!data.success;
  } catch (error) {
    console.error('Error deleting project: ', error);
    return false;
  }
}

export function subscribeToProject(id, callback, intervalMs = 15000) {
  let active = true;

  const sync = async () => {
    if (!active) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    const project = await getProjectById(id);
    if (active) callback(project);
  };

  const intervalId = setInterval(sync, intervalMs);
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', sync);
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', sync);
  }

  return () => {
    active = false;
    clearInterval(intervalId);
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', sync);
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', sync);
    }
  };
}

export async function togglePhotoSelectionDB(id, photoName, isSelected, selectorName = null) {
  try {
    const res = await fetch(`/api/projects/${encodeURIComponent(id)}/selection`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'toggle', photoName, isSelected, selectorName }),
    });
    return await res.json();
  } catch (error) {
    console.error('Error toggling photo selection: ', error);
    return { success: false, error: error.message };
  }
}
