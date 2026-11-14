'use client';
import Swal from 'sweetalert2';

import { useEffect, useState, use, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getProjectById, updateSelectedPhotos, subscribeToProject, togglePhotoSelectionDB } from '@/lib/projectService';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Zoom from "yet-another-react-lightbox/plugins/zoom";

export default function ClientGallery({ params }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  
  const [project, setProject] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortOrder, setSortOrder] = useState('name');
  const [viewMode, setViewMode] = useState('all'); // 'all' or 'selected'
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectorName, setSelectorName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);
  
  const [editedPhotos, setEditedPhotos] = useState([]);
  const [activeTab, setActiveTab] = useState('raw'); // 'raw' or 'edited'
  const [viewFormat, setViewFormat] = useState('grid'); // 'grid' or 'list'
  // Sessions
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  
  // State untuk Lightbox Preview
  const [previewIndex, setPreviewIndex] = useState(-1);

  // State untuk Download ZIP
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadState, setDownloadState] = useState('idle'); // idle, downloading, paused
  const cancelDownloadRef = useRef(false);
  const abortControllerRef = useRef(null);
  const pauseDownloadRef = useRef(false);

  const fetchSessionPhotos = async (folderId) => {
    setLoadingPhotos(true);
    setPhotos([]);
    try {
      const res = await fetch(`/api/drive?folderId=${folderId}`);
      const data = await res.json();
      if (!data.error) setPhotos(data.files || []);
    } catch (err) {
      console.error("Gagal mengambil foto sesi:", err);
    }
    setLoadingPhotos(false);
  };

  useEffect(() => {
    async function loadData() {
      const proj = await getProjectById(id);
      if (!proj) {
        setError('Project tidak ditemukan.');
        setLoading(false);
        return;
      }
      setProject(proj);
      setSelectedPhotos(proj.selectedPhotos || []);
      if (typeof window !== 'undefined') {
        const savedSelector = window.localStorage.getItem(`selector_${id}`);
        if (savedSelector) {
          setSelectorName(savedSelector);
        }
      }

      let loadedSessions = [];
      if (proj.sessions && proj.sessions.length > 0) {
        loadedSessions = proj.sessions;
      } else if (proj.gdriveFolderId) {
        loadedSessions = [{ id: 'default', name: 'Semua Sesi', folderId: proj.gdriveFolderId }];
      }
      setSessions(loadedSessions);

      if (loadedSessions.length > 0) {
        setActiveSessionId(loadedSessions[0].id);
        await fetchSessionPhotos(loadedSessions[0].folderId);
      }

      if (proj.gdriveEditedFolderId) {
        try {
          const res = await fetch(`/api/drive?folderId=${proj.gdriveEditedFolderId}`);
          const data = await res.json();
          if (!data.error) {
            setEditedPhotos(data.files || []);
            setActiveTab('edited'); // Default to edited if available
          }
        } catch (err) {
          console.error("Gagal mengambil foto edit dari GDrive:", err);
        }
      }
      
      setLoading(false);
    }
    loadData();

    // Subscribe to real-time changes
    const unsubscribe = subscribeToProject(id, (proj) => {
      if (proj) {
        setProject(proj);
        setSelectedPhotos(proj.selectedPhotos || []);
      }
    });

    return () => unsubscribe();
  }, [id]);


  const handleSessionChange = (sessionId) => {
    setActiveSessionId(sessionId);
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      fetchSessionPhotos(session.folderId);
    }
  };

  const handleDownloadRawZip = () => {
    const currentSession = sessions.find(s => s.id === activeSessionId);
    if (currentSession && currentSession.folderId) {
      window.open(`https://drive.google.com/drive/folders/${currentSession.folderId}`, '_blank');
    } else {
      Swal.fire('Error', 'Folder Google Drive tidak ditemukan.', 'error');
    }
  };

  const handleDownloadZip = () => {
    if (project && project.gdriveEditedFolderId) {
      window.open(`https://drive.google.com/drive/folders/${project.gdriveEditedFolderId}`, '_blank');
    } else {
      Swal.fire('Error', 'Folder Google Drive untuk foto edit tidak ditemukan.', 'error');
    }
  };

  const isMultiSelector = Boolean(project?.isMultiSelector);
  const maxSelections = Number(project?.maxSelections || 0);
  const photoSelections = project?.photoSelections || {};
  const lockedSelectors = project?.lockedSelectors || [];
  const isCurrentSelectorLocked = Boolean(project?.isLocked) || (isMultiSelector && Boolean(selectorName) && lockedSelectors.includes(selectorName));
  const mySelectedPhotos = isMultiSelector
    ? selectedPhotos.filter((name) => photoSelections[name] === selectorName)
    : selectedPhotos;

  const getPhotoOwner = (photoName) => (isMultiSelector ? (photoSelections[photoName] || null) : null);
  const isOwnedByOther = (photoName) => {
    const owner = getPhotoOwner(photoName);
    return Boolean(owner && owner !== selectorName);
  };
  const isPhotoSelectedByMe = (photoName) => {
    if (isMultiSelector) {
      return photoSelections[photoName] === selectorName;
    }
    return selectedPhotos.includes(photoName);
  };

  const handleConfirmSelectorName = (chosenName) => {
    const trimmed = (chosenName || '').trim();
    if (!trimmed) return;
    setSelectorName(trimmed);
    setNameInput('');
    setShowNameModal(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`selector_${id}`, trimmed);
    }
  };

  const toggleSelect = async (photoName) => {
    if (isCurrentSelectorLocked) {
      Swal.fire('Selection Locked', 'Your selection has been submitted and locked.', 'info');
      return;
    }

    if (isMultiSelector && !selectorName) {
      setShowNameModal(true);
      return;
    }

    if (isMultiSelector) {
      const owner = photoSelections[photoName];
      if (owner && owner !== selectorName) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'warning',
          title: `Already selected by ${owner}`,
          showConfirmButton: false,
          timer: 2000,
        });
        return;
      }
    }

    // Optimistic UI Update
    const isCurrentlySelected = isPhotoSelectedByMe(photoName);
    const willBeSelected = !isCurrentlySelected;

    if (willBeSelected && maxSelections > 0) {
      const currentCount = (isMultiSelector ? mySelectedPhotos : selectedPhotos).length;
      if (currentCount >= maxSelections) {
        Swal.fire(
          'Selection Limit Reached',
          `You can select up to ${maxSelections} ${maxSelections === 1 ? 'photo' : 'photos'}${isMultiSelector ? ' per person' : ''}. Unselect another photo first if you want to swap.`,
          'warning'
        );
        return;
      }
    }

    setSelectedPhotos((prev) =>
      willBeSelected
        ? (prev.includes(photoName) ? prev : [...prev, photoName])
        : prev.filter((p) => p !== photoName)
    );
    if (isMultiSelector) {
      setProject((prev) => {
        if (!prev) return prev;
        const nextSelections = { ...(prev.photoSelections || {}) };
        if (willBeSelected) {
          nextSelections[photoName] = selectorName;
        } else {
          delete nextSelections[photoName];
        }
        return { ...prev, photoSelections: nextSelections };
      });
    }
    setSaved(false);

    // Sync to Firestore immediately
    const res = await togglePhotoSelectionDB(id, photoName, willBeSelected, isMultiSelector ? selectorName : null);
    if (!res || !res.success) {
      if (res?.selectedPhotos) {
        setSelectedPhotos(res.selectedPhotos);
      } else {
        setSelectedPhotos((prev) =>
          isCurrentlySelected
            ? (prev.includes(photoName) ? prev : [...prev, photoName])
            : prev.filter((p) => p !== photoName)
        );
      }
      if (res?.photoSelections) {
        setProject((prev) => (prev ? {
          ...prev,
          photoSelections: res.photoSelections,
          selectedPhotos: res.selectedPhotos || prev.selectedPhotos,
          lockedSelectors: res.lockedSelectors || prev.lockedSelectors,
        } : prev));
      }
      if (res?.code === 'LIMIT_REACHED') {
        Swal.fire('Selection Limit Reached', res.error, 'warning');
      } else if (res?.owner) {
        Swal.fire('Already Selected', `This photo was just selected by ${res.owner}.`, 'warning');
      } else if (res?.error) {
        Swal.fire('Info', res.error, 'info');
      }
      return;
    }

    if (res.selectedPhotos) {
      setSelectedPhotos(res.selectedPhotos);
      setProject((prev) => (prev ? {
        ...prev,
        selectedPhotos: res.selectedPhotos,
        photoSelections: res.photoSelections || prev.photoSelections,
        lockedSelectors: res.lockedSelectors || prev.lockedSelectors,
      } : prev));
    }
  };

  const saveSelection = async () => {
    const photosToSubmit = isMultiSelector ? mySelectedPhotos : selectedPhotos;
    if (photosToSubmit.length === 0) {
      Swal.fire('Select Photo', "You haven't selected any photos yet.", 'info');
      return;
    }

    const result1 = await Swal.fire({
      title: 'Finish Selection?',
      text: isMultiSelector
        ? `Submit and lock your ${photosToSubmit.length} selected photos as ${selectorName}? Other people can still continue selecting.`
        : "Are you sure you have finished selecting photos? If so, please confirm with the photographer.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Finish',
      cancelButtonText: 'Not yet',
    });
    if (!result1.isConfirmed) {
      return;
    }

    setSaving(true);
    const res = await updateSelectedPhotos(id, photosToSubmit, true, isMultiSelector ? selectorName : null);
    setSaving(false);

    if (!res || !res.success) {
      Swal.fire('Error', res?.error || 'Failed to save selection.', 'error');
      return;
    }

    setProject((prev) => (prev ? {
      ...prev,
      isLocked: res.isLocked !== undefined ? res.isLocked : prev.isLocked,
      lockedSelectors: res.lockedSelectors || prev.lockedSelectors,
      selectedPhotos: res.selectedPhotos || prev.selectedPhotos,
      photoSelections: res.photoSelections || prev.photoSelections,
    } : prev));
    setSaved(true);

    // Construct WhatsApp URL
    const waNumber = "6281234567890";
    const who = isMultiSelector ? `${selectorName} (${project.clientName})` : project.clientName;
    let message = `Hello, I am ${who}!\nI have finished selecting ${photosToSubmit.length} photos to be edited:\n\n`;
    [...photosToSubmit].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).forEach((photo, idx) => {
      message += `${idx + 1}. ${photo}\n`;
    });
    message += `\nPlease process them soon. Thank you!`;

    const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;

    const result2 = await Swal.fire({ text: "System is synced! Do you want to send a confirmation message to the photographer via WhatsApp now?", icon: 'success', showCancelButton: true, confirmButtonText: 'Open WhatsApp', cancelButtonText: 'Later' });
    if (result2.isConfirmed) {
      window.open(waLink, '_blank');
    }
  };


  const getSortedEditedPhotos = () => {
    let sorted = [...editedPhotos];
    if (sortOrder === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    } else if (sortOrder === 'time') {
      sorted.sort((a, b) => {
        const timeA = new Date(a.createdTime || 0).getTime();
        const timeB = new Date(b.createdTime || 0).getTime();
        return timeA - timeB; // Oldest first
      });
    }
    return sorted;
  };

  const getSortedPhotos = () => {
    let sorted = [...photos];
    if (sortOrder === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    } else if (sortOrder === 'time') {
      sorted.sort((a, b) => {
        const timeA = new Date(a.createdTime || 0).getTime();
        const timeB = new Date(b.createdTime || 0).getTime();
        return timeA - timeB; // Oldest first
      });
    } else if (sortOrder === 'selected') {
      sorted.sort((a, b) => {
        const aSel = selectedPhotos.includes(a.name);
        const bSel = selectedPhotos.includes(b.name);
        if (aSel === bSel) return a.name.localeCompare(b.name, undefined, { numeric: true });
        return aSel ? -1 : 1;
      });
    }
    return sorted;
  };

  const sortedPhotos = getSortedPhotos();
  const sortedEditedPhotos = getSortedEditedPhotos();
  const selectedPhotoObjects = sortedPhotos.filter((p) => isPhotoSelectedByMe(p.name));
  const unselectedPhotoObjects = sortedPhotos.filter((p) => !selectedPhotos.includes(p.name));
  const activeRawList = viewMode === 'selected'
    ? selectedPhotoObjects
    : viewMode === 'unselected'
      ? unselectedPhotoObjects
      : sortedPhotos;
  const currentList = activeTab === 'edited' ? sortedEditedPhotos : activeRawList;

  if (loading) return <main style={{ padding: '40px', textAlign: 'center' }}>Loading Gallery...</main>;
  if (error) return <main style={{ padding: '40px', textAlign: 'center', color: '#991b1b' }}>{error}</main>;


  return (
    <main style={{ padding: '20px 16px', paddingBottom: '120px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', fontWeight: '700', marginBottom: '8px' }}>Hai, {project.clientName}! 👋</h1>
        <p style={{ color: '#4b5563', fontSize: 'clamp(0.95rem, 3vw, 1.1rem)' }}>
          {project.gdriveEditedFolderId 
            ? "Kabar gembira! Foto hasil editan kamu sudah siap diunduh." 
            : "Silakan pilih foto-foto yang Anda inginkan untuk diedit."}
        </p>
        {maxSelections > 0 && (
          <div style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 14px', borderRadius: '999px', backgroundColor: '#fffbeb', border: '1px solid #f59e0b', color: '#92400e', fontSize: '0.85rem', fontWeight: '600', marginRight: isMultiSelector && selectorName ? '8px' : '0' }}>
            🎯 Max Selection: {maxSelections} {maxSelections === 1 ? 'photo' : 'photos'}{isMultiSelector ? ' / person' : ''}
          </div>
        )}
        {isMultiSelector && selectorName && (
          <div style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '6px 14px', borderRadius: '999px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}>
            <span style={{ color: '#334155' }}>
              Selecting as: <strong style={{ color: 'var(--primary)' }}>{selectorName}</strong>
              {isCurrentSelectorLocked && ' 🔒'}
            </span>
            <button
              type="button"
              onClick={() => setShowNameModal(true)}
              style={{ border: 'none', background: 'white', color: '#0f172a', padding: '3px 10px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }}
            >
              Switch
            </button>
          </div>
        )}
      </div>

      {/* Multi-Selector Name Entry Modal */}
      {isMultiSelector && (!selectorName || showNameModal) && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '420px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.25)'
          }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '6px', color: '#0f172a' }}>
              Who is selecting photos?
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '16px', lineHeight: 1.45 }}>
              Enter your name so your photo picks are saved under your name and won&apos;t overlap with others.
            </p>

            {(() => {
              const counts = {};
              Object.values(photoSelections).forEach((n) => {
                counts[n] = (counts[n] || 0) + 1;
              });
              const existingNames = Array.from(new Set([...Object.keys(counts), ...lockedSelectors]));
              if (existingNames.length === 0) return null;
              return (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: '600', color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Continue as:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {existingNames.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => handleConfirmSelectorName(name)}
                        style={{
                          padding: '6px 12px', borderRadius: '999px', border: '1px solid #cbd5e1',
                          backgroundColor: name === selectorName ? '#0f172a' : '#f8fafc',
                          color: name === selectorName ? 'white' : '#0f172a',
                          fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer'
                        }}
                      >
                        {name} ({counts[name] || 0}){lockedSelectors.includes(name) ? ' 🔒' : ''}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            <form onSubmit={(e) => { e.preventDefault(); handleConfirmSelectorName(nameInput); }} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Enter your name (e.g. Budi)"
                autoFocus
                className="input-field"
                style={{ width: '100%', padding: '10px 12px', fontSize: '0.95rem' }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                {selectorName && (
                  <button
                    type="button"
                    onClick={() => setShowNameModal(false)}
                    className="btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!nameInput.trim()}
                  className="btn-primary"
                  style={{ flex: 2 }}
                >
                  Start Selecting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabs */}
      {project.gdriveEditedFolderId && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '32px' }}>
          <button 
            onClick={() => setActiveTab('raw')}
            style={{
              padding: '12px 24px', borderRadius: '100px', fontWeight: '600', border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              backgroundColor: activeTab === 'raw' ? 'var(--primary)' : '#e5e7eb',
              color: activeTab === 'raw' ? 'white' : '#4b5563',
              boxShadow: activeTab === 'raw' ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Foto Original 📸
          </button>
          <button 
            onClick={() => setActiveTab('edited')}
            style={{
              padding: '12px 24px', borderRadius: '100px', fontWeight: '600', border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              backgroundColor: activeTab === 'edited' ? '#3b82f6' : '#e5e7eb',
              color: activeTab === 'edited' ? 'white' : '#4b5563',
              boxShadow: activeTab === 'edited' ? '0 4px 12px rgba(5,150,105,0.3)' : 'none'
            }}
          >
            Hasil Edit Final ✨
          </button>
        </div>
      )}

      {/* Render Raw Photos (Selection Mode) */}
      {activeTab === 'raw' && (
        <>
          {/* Removed tabs, sessions, download to put in toolbar below */}
          
          {loadingPhotos ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '8px' }}></div>
              <p>Memuat foto sesi...</p>
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
                {/* Left Controls: Tabs and Download */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => setViewMode('all')}
                      style={{
                        padding: '6px 14px', borderRadius: '8px', fontWeight: '600', border: '1px solid', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.9rem',
                        backgroundColor: viewMode === 'all' ? '#111827' : 'white',
                        color: viewMode === 'all' ? 'white' : '#4b5563',
                        borderColor: viewMode === 'all' ? '#111827' : '#d1d5db'
                      }}
                    >
                      All Photos ({photos.length})
                    </button>
                    <button 
                      onClick={() => setViewMode('selected')}
                      style={{
                        padding: '6px 14px', borderRadius: '8px', fontWeight: '600', border: '1px solid', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.9rem',
                        backgroundColor: viewMode === 'selected' ? '#111827' : 'white',
                        color: viewMode === 'selected' ? 'white' : '#4b5563',
                        borderColor: viewMode === 'selected' ? '#111827' : '#d1d5db'
                      }}
                    >
                      {isMultiSelector ? `My Picks (${mySelectedPhotos.length})` : `Selected Photos (${selectedPhotos.length})`}
                    </button>
                    {isMultiSelector && (
                      <button 
                        onClick={() => setViewMode('unselected')}
                        style={{
                          padding: '6px 14px', borderRadius: '8px', fontWeight: '600', border: '1px solid', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.9rem',
                          backgroundColor: viewMode === 'unselected' ? '#111827' : 'white',
                          color: viewMode === 'unselected' ? 'white' : '#4b5563',
                          borderColor: viewMode === 'unselected' ? '#111827' : '#d1d5db'
                        }}
                      >
                        Available ({unselectedPhotoObjects.length})
                      </button>
                    )}
                  </div>
                  
                  {project.paymentStatus === 'Lunas' && sessions.length > 0 && viewMode === 'all' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
<button 
                      onClick={handleDownloadRawZip}
                      disabled={downloadingZip}
                      className="btn-primary" 
                      style={{ padding: '6px 14px', fontSize: '0.9rem', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px', border: 'none', color: 'white', cursor: 'pointer', fontWeight: '600' }}
                      title="Only available for fully paid clients"
                    >
                      {downloadingZip ? '⏳ Processing...' : '📂 Open Original Photo'}
                    </button>

                        {downloadingZip && (
                           <div style={{ display: 'flex', alignItems: 'center', background: '#f3f4f6', borderRadius: '8px', padding: '6px 12px', gap: '12px' }}>
                             <div style={{ display: 'flex', flexDirection: 'column', minWidth: '130px' }}>
                               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.8rem' }}>
                                  <span style={{ fontWeight: '600', color: 'black' }}>{downloadProgress}% {downloadState === 'packing' ? '(Mengemas)' : ''}</span>
                               </div>
                               <div style={{ width: '100%', backgroundColor: '#e5e7eb', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                                 <div style={{ width: `${downloadProgress}%`, backgroundColor: downloadState === 'paused' ? '#f59e0b' : '#3b82f6', height: '100%', transition: 'width 0.3s' }}></div>
                               </div>
                             </div>
                             <div style={{ display: 'flex', gap: '4px' }}>
                                <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if (downloadState === 'paused') {
                                      pauseDownloadRef.current = false;
                                      setDownloadState('downloading');
                                    } else {
                                      pauseDownloadRef.current = true;
                                      setDownloadState('paused');
                                    }
                                  }} 
                                  style={{ padding: '4px 8px', backgroundColor: downloadState === 'paused' ? '#10b981' : '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', fontSize: '0.8rem' }}
                                >
                                  {downloadState === 'paused' ? '▶ Lanjut' : '⏸ Jeda'}
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cancelDownloadRef.current = true;
                                    if (abortControllerRef.current) abortControllerRef.current.abort();
                                  }} 
                                  style={{ padding: '4px 8px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', fontSize: '0.8rem' }}
                                >
                                  ⏹ Batal
                                </button>
                             </div>
                           </div>
                        )}

</div>
                  )}
                </div>

                {/* Right Controls: Filters */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#e5e7eb', padding: '4px', borderRadius: '8px' }}>
                    <button 
                      onClick={() => setViewFormat('grid')}
                      style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: viewFormat === 'grid' ? 'white' : 'transparent', color: viewFormat === 'grid' ? '#111827' : '#4b5563', boxShadow: viewFormat === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontWeight: viewFormat === 'grid' ? '600' : '400', fontSize: '0.85rem' }}
                    >
                      Grid
                    </button>
                    <button 
                      onClick={() => setViewFormat('list')}
                      style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: viewFormat === 'list' ? 'white' : 'transparent', color: viewFormat === 'list' ? '#111827' : '#4b5563', boxShadow: viewFormat === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontWeight: viewFormat === 'list' ? '600' : '400', fontSize: '0.85rem' }}
                    >
                      List
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label htmlFor="photo-sort-select" style={{ fontSize: '0.9rem', color: '#4b5563', fontWeight: '500' }}>Sort by:</label>
                    <select 
                      id="photo-sort-select"
                      value={sortOrder} 
                      onChange={(e) => setSortOrder(e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white', color: '#111827', fontSize: '0.9rem', cursor: 'pointer' }}
                    >
                      <option value="name">Name (A-Z)</option>
                      <option value="time">Upload Time</option>
                    </select>
                  </div>
                </div>
              </div>

              {sessions.length > 1 && viewMode === 'all' && (
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '8px', justifyContent: 'flex-start' }}>
                  {sessions.map(session => (
                    <button
                      key={session.id}
                      onClick={() => handleSessionChange(session.id)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        whiteSpace: 'nowrap',
                        fontSize: '0.85rem',
                        fontWeight: activeSessionId === session.id ? '600' : '400',
                        backgroundColor: activeSessionId === session.id ? '#e0f2fe' : '#f3f4f6',
                        color: activeSessionId === session.id ? '#0369a1' : '#4b5563',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {session.name}
                    </button>
                  ))}
                </div>
              )}
              
              {viewMode === 'selected' && selectedPhotoObjects.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px dashed #d1d5db' }}>
                  <p style={{ color: '#6b7280', fontSize: '1.1rem', marginBottom: '8px' }}>No photos selected yet.</p>
                  <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Please return to &quot;All Photos&quot; and check the photos you want.</p>
                </div>
              ) : viewMode === 'unselected' && unselectedPhotoObjects.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px dashed #d1d5db' }}>
                  <p style={{ color: '#6b7280', fontSize: '1.1rem', marginBottom: '8px' }}>All photos have been selected.</p>
                </div>
              ) : viewFormat === 'list' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div className="client-list-header">
                    <div style={{ width: '24px' }}></div>
                    <div>Photo</div>
                    <div>File Name</div>
                    <div>Resolution</div>
                    <div>Size</div>
                    <div>Date Uploaded</div>
                  </div>
                  {activeRawList.map((photo, index) => {
                    const isSelected = isPhotoSelectedByMe(photo.name);
                    const owner = getPhotoOwner(photo.name);
                    const takenByOther = isOwnedByOther(photo.name);
                    const fileSizeBytes = parseInt(photo.size || '0');
                    const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2) + ' MB';
                    const width = photo.imageMediaMetadata?.width || '?';
                    const height = photo.imageMediaMetadata?.height || '?';
                    
                    let dateStr = '-';
                    if (photo.createdTime) {
                       const d = new Date(photo.createdTime);
                       if (!isNaN(d.getTime())) {
                         dateStr = d.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                       }
                    }

                    return (
                      <div 
                        key={photo.id}
                        className="client-list-row"
                        style={{ 
                          backgroundColor: isSelected ? 'rgba(21, 16, 58, 0.04)' : 'white', 
                          border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)'
                        }}
                      >
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={isSelected}
                          aria-label={`Select ${photo.name}`}
                          disabled={takenByOther}
                          onClick={() => toggleSelect(photo.name)}
                          style={{
                            width: '24px', height: '24px', borderRadius: '6px',
                            backgroundColor: isSelected ? 'var(--primary)' : (takenByOther ? '#e5e7eb' : 'white'),
                            border: isSelected ? '1px solid var(--primary)' : '2px solid #d1d5db',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', cursor: takenByOther ? 'not-allowed' : 'pointer', fontSize: '0.9rem', fontWeight: 'bold', padding: 0,
                            opacity: takenByOther ? 0.6 : 1
                          }}
                        >
                          {isSelected && <span aria-hidden="true">✓</span>}
                        </button>
                        
                        <div 
                          onClick={() => setPreviewIndex(currentList.findIndex(p => p.id === photo.id))}
                          style={{ width: '60px', height: '40px', background: '#e5e7eb', cursor: 'zoom-in', borderRadius: '4px', overflow: 'hidden', opacity: takenByOther ? 0.6 : 1 }}
                        >
                          <img 
                            src={photo.thumbnailLink ? photo.thumbnailLink.replace('=s220', '=w100') : ''}
                            alt={photo.name} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        </div>
                        
                        <div onClick={() => !takenByOther && toggleSelect(photo.name)} style={{ fontSize: '0.9rem', fontWeight: '500', cursor: takenByOther ? 'default' : 'pointer', wordBreak: 'break-all' }}>
                          <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: '0.78rem', color: 'var(--accent-hover)', fontWeight: '600', marginRight: '8px' }}>#{String(index + 1).padStart(2, '0')}</span>
                          {photo.name}
                          {takenByOther && (
                            <span style={{ marginLeft: '8px', fontSize: '0.72rem', fontWeight: '600', padding: '2px 8px', borderRadius: '999px', backgroundColor: '#fef3c7', color: '#92400e' }}>
                              By {owner}
                            </span>
                          )}
                        </div>
                        <div className="client-list-meta-hide-mobile" style={{ fontSize: '0.85rem', color: '#6b7280' }}>{width} x {height}</div>
                        <div className="client-list-meta-hide-mobile" style={{ fontSize: '0.85rem', color: '#6b7280' }}>{fileSizeMB}</div>
                        <div className="client-list-meta-hide-mobile" style={{ fontSize: '0.85rem', color: '#6b7280' }}>{dateStr}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                  {activeRawList.map((photo, index) => {
                    const isSelected = isPhotoSelectedByMe(photo.name);
                    const owner = getPhotoOwner(photo.name);
                    const takenByOther = isOwnedByOther(photo.name);
                    return (
                      <div 
                        key={photo.id}
                        className="glass-panel"
                        style={{
                          overflow: 'hidden',
                          transition: 'all 0.2s',
                          transform: isSelected ? 'scale(0.95)' : 'scale(1)',
                          border: isSelected ? '3px solid var(--primary)' : (takenByOther ? '1px solid #fcd34d' : '1px solid var(--glass-border)'),
                          backgroundColor: isSelected ? 'rgba(21, 16, 58, 0.04)' : 'var(--glass-bg)',
                          opacity: takenByOther ? 0.72 : 1,
                          display: 'flex',
                          flexDirection: 'column',
                          position: 'relative'
                        }}
                      >
                        {/* Checkbox (Klik untuk memilih cepat) */}
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={isSelected}
                          aria-label={`Select ${photo.name}`}
                          disabled={takenByOther}
                          onClick={() => toggleSelect(photo.name)}
                          style={{
                            position: 'absolute', top: '12px', left: '12px', zIndex: 10,
                            width: '32px', height: '32px', borderRadius: '50%', padding: 0,
                            backgroundColor: isSelected ? 'var(--primary)' : (takenByOther ? '#e5e7eb' : 'rgba(255,255,255,0.92)'),
                            border: isSelected ? '1px solid var(--primary)' : '2px solid #9ca3af',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', cursor: takenByOther ? 'not-allowed' : 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            fontSize: '1.1rem', fontWeight: 'bold'
                          }}
                        >
                          {isSelected && <span aria-hidden="true">✓</span>}
                        </button>

                        {takenByOther && (
                          <span style={{
                            position: 'absolute', top: '12px', right: '10px', zIndex: 10,
                            backgroundColor: 'rgba(254, 243, 199, 0.95)', color: '#92400e',
                            fontSize: '0.7rem', fontWeight: '700', padding: '3px 8px',
                            borderRadius: '999px', boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                            maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                          }}>
                            By {owner}
                          </span>
                        )}

                        <div 
                          onClick={() => setPreviewIndex(currentList.findIndex(p => p.id === photo.id))}
                          style={{ height: '160px', width: '100%', position: 'relative', background: '#e5e7eb', cursor: 'zoom-in' }}
                          title="Klik untuk perbesar"
                        >
                          <img 
                            src={photo.thumbnailLink ? photo.thumbnailLink.replace('=s220', '=w600') : ''}
                            onError={(e) => { 
                              e.target.onerror = null; 
                              e.target.src = `https://drive.google.com/thumbnail?id=${photo.id}&sz=w600`; 
                            }}
                            alt={photo.name} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                          <span style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(17, 16, 29, 0.78)', color: '#ffffff', fontFamily: 'var(--font-mono), monospace', fontSize: '0.72rem', fontWeight: '600', padding: '2px 7px', borderRadius: '4px', letterSpacing: '0.03em' }}>#{String(index + 1).padStart(2, '0')}</span>
                        </div>
                        <div 
                          onClick={() => !takenByOther && toggleSelect(photo.name)}
                          style={{ padding: '12px', textAlign: 'center', fontSize: '0.9rem', fontWeight: '500', wordBreak: 'break-all', cursor: takenByOther ? 'default' : 'pointer' }}
                        >
                {photo.name}
              </div>
            </div>
          )
        })}
            </div>
            )}
            </>
          )}
        </>
      )}

      {/* Render Edited Photos (Download Mode) */}
      {activeTab === 'edited' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
            {/* Left Controls: Download */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
<button 
                onClick={handleDownloadZip}
                disabled={downloadingZip}
                className="btn-primary" 
                style={{ padding: '6px 14px', fontSize: '0.9rem', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px', border: 'none', color: 'white', cursor: 'pointer', fontWeight: '600' }}
              >
                {downloadingZip ? '⏳ Processing...' : '📂 Open Edited Photo'}
              </button>

                        {downloadingZip && (
                           <div style={{ display: 'flex', alignItems: 'center', background: '#f3f4f6', borderRadius: '8px', padding: '6px 12px', gap: '12px' }}>
                             <div style={{ display: 'flex', flexDirection: 'column', minWidth: '130px' }}>
                               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.8rem' }}>
                                  <span style={{ fontWeight: '600', color: 'black' }}>{downloadProgress}% {downloadState === 'packing' ? '(Mengemas)' : ''}</span>
                               </div>
                               <div style={{ width: '100%', backgroundColor: '#e5e7eb', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                                 <div style={{ width: `${downloadProgress}%`, backgroundColor: downloadState === 'paused' ? '#f59e0b' : '#3b82f6', height: '100%', transition: 'width 0.3s' }}></div>
                               </div>
                             </div>
                             <div style={{ display: 'flex', gap: '4px' }}>
                                <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if (downloadState === 'paused') {
                                      pauseDownloadRef.current = false;
                                      setDownloadState('downloading');
                                    } else {
                                      pauseDownloadRef.current = true;
                                      setDownloadState('paused');
                                    }
                                  }} 
                                  style={{ padding: '4px 8px', backgroundColor: downloadState === 'paused' ? '#10b981' : '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', fontSize: '0.8rem' }}
                                >
                                  {downloadState === 'paused' ? '▶ Lanjut' : '⏸ Jeda'}
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cancelDownloadRef.current = true;
                                    if (abortControllerRef.current) abortControllerRef.current.abort();
                                  }} 
                                  style={{ padding: '4px 8px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', fontSize: '0.8rem' }}
                                >
                                  ⏹ Batal
                                </button>
                             </div>
                           </div>
                        )}

</div>
            </div>

            {/* Right Controls: Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#e5e7eb', padding: '4px', borderRadius: '8px' }}>
                <button 
                  onClick={() => setViewFormat('grid')}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: viewFormat === 'grid' ? 'white' : 'transparent', color: viewFormat === 'grid' ? '#111827' : '#4b5563', boxShadow: viewFormat === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontWeight: viewFormat === 'grid' ? '600' : '400', fontSize: '0.85rem' }}
                >
                  Grid
                </button>
                <button 
                  onClick={() => setViewFormat('list')}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: viewFormat === 'list' ? 'white' : 'transparent', color: viewFormat === 'list' ? '#111827' : '#4b5563', boxShadow: viewFormat === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontWeight: viewFormat === 'list' ? '600' : '400', fontSize: '0.85rem' }}
                >
                  List
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '0.9rem', color: '#4b5563', fontWeight: '500' }}>Urutkan:</label>
                <select 
                  value={sortOrder} 
                  onChange={(e) => setSortOrder(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white', color: '#111827', fontSize: '0.9rem', cursor: 'pointer' }}
                >
                  <option value="name">Nama (A-Z)</option>
                  <option value="time">Waktu Diunggah</option>
                </select>
              </div>
            </div>
          </div>
          
          {viewFormat === 'list' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr 1fr 120px', gap: '16px', padding: '12px 16px', backgroundColor: '#f3f4f6', borderRadius: '8px', fontWeight: '600', fontSize: '0.85rem', color: '#4b5563' }}>
                <div>Photo</div>
                <div>File Name</div>
                <div>Resolution</div>
                <div>Size</div>
                <div>Date Uploaded</div>
                <div style={{ textAlign: 'center' }}>Action</div>
              </div>
              {sortedEditedPhotos.map((photo, index) => {
                const fileSizeBytes = parseInt(photo.size || '0');
                const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(2) + ' MB';
                const width = photo.imageMediaMetadata?.width || '?';
                const height = photo.imageMediaMetadata?.height || '?';
                
                let dateStr = '-';
                if (photo.createdTime) {
                   const d = new Date(photo.createdTime);
                   if (!isNaN(d.getTime())) {
                     dateStr = d.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                   }
                }

                return (
                  <div 
                    key={photo.id}
                    style={{ 
                      display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr 1fr 120px', gap: '16px', padding: '8px 16px', 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px', alignItems: 'center', transition: 'all 0.2s'
                    }}
                  >
                    <div 
                      onClick={() => setPreviewIndex(currentList.findIndex(p => p.id === photo.id))}
                      style={{ width: '80px', height: '50px', backgroundColor: '#f3f4f6', borderRadius: '6px', overflow: 'hidden', cursor: 'zoom-in', flexShrink: 0 }}
                    >
                      <img 
                        src={photo.thumbnailLink ? photo.thumbnailLink : ''} 
                        onError={(e) => { 
                          e.target.onerror = null; 
                          e.target.src = `https://drive.google.com/thumbnail?id=${photo.id}&sz=w200`; 
                        }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        alt={photo.name} 
                      />
                    </div>
                    
                    <div style={{ fontSize: '0.85rem', fontWeight: '500', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={photo.name}>
                      {photo.name}
                    </div>
                    
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      {width} x {height}
                    </div>
                    
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      {fileSizeMB}
                    </div>
                    
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      {dateStr}
                    </div>
                    
                    <div>
                      <a 
                        href={photo.webContentLink || `https://drive.google.com/uc?export=download&id=${photo.id}`} 
                        target="_blank" rel="noopener noreferrer"
                        style={{ textDecoration: 'none' }}
                      >
                        <button style={{ width: '100%', padding: '6px 12px', background: '#e0e7ff', color: '#4f46e5', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '0.8rem' }}>
                          ⬇️ Unduh
                        </button>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
              {sortedEditedPhotos.map((photo) => (
                <div 
                  key={photo.id}
                  className="glass-panel"
                  style={{
                    overflow: 'hidden',
                    transition: 'all 0.2s',
                    border: '1px solid var(--glass-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    backgroundColor: 'var(--glass-bg)'
                  }}
                >
                  <div 
                    onClick={() => setPreviewIndex(currentList.findIndex(p => p.id === photo.id))}
                    style={{ height: '160px', width: '100%', position: 'relative', background: '#e5e7eb', cursor: 'zoom-in' }}
                    title="Klik untuk perbesar"
                  >
                    <img 
                      src={photo.thumbnailLink ? photo.thumbnailLink.replace('=s220', '=w600') : ''}
                      onError={(e) => { 
                        e.target.onerror = null; 
                        e.target.src = `https://drive.google.com/thumbnail?id=${photo.id}&sz=w600`; 
                      }}
                      alt={photo.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  </div>
                  <div style={{ padding: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '500', wordBreak: 'break-all', color: '#4b5563' }}>
                      {photo.name}
                    </div>
                    <a 
                      href={photo.webContentLink || `https://drive.google.com/uc?export=download&id=${photo.id}`} 
                      target="_blank" rel="noopener noreferrer"
                      style={{ width: '100%', display: 'block', textDecoration: 'none' }}
                    >
                      <button style={{ width: '100%', padding: '6px', background: '#e0e7ff', color: '#4f46e5', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}>
                        ⬇️ Download
                      </button>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'raw' && photos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          Belum ada foto yang ditemukan di folder original ini.
        </div>
      )}
      
      {activeTab === 'edited' && editedPhotos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          Belum ada foto hasil editan di folder ini.
        </div>
      )}

      {/* Sticky Bottom Action Bar (Hanya untuk tab RAW) */}
      {activeTab === 'raw' && (
      <div style={{
        position: 'fixed',
        bottom: 'max(14px, env(safe-area-inset-bottom))',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--surface-color)',
        border: '1px solid var(--border-strong)',
        padding: '10px 16px',
        borderRadius: '14px',
        boxShadow: '0 12px 32px rgba(21, 16, 58, 0.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        width: 'calc(100% - 24px)',
        maxWidth: '440px',
        zIndex: 100
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {isCurrentSelectorLocked ? 'Selection Locked' : (isMultiSelector && selectorName ? `${selectorName}'s Picks` : 'Selected Photos')}
          </span>
          <span style={{ fontFamily: 'var(--font-mono), monospace', color: maxSelections > 0 && (isMultiSelector ? mySelectedPhotos : selectedPhotos).length >= maxSelections ? '#d97706' : 'var(--primary)', fontSize: '1.15rem', fontWeight: '700' }}>
            {maxSelections > 0
              ? `${(isMultiSelector ? mySelectedPhotos : selectedPhotos).length} / ${maxSelections} ${maxSelections === 1 ? 'photo' : 'photos'}`
              : `${(isMultiSelector ? mySelectedPhotos : selectedPhotos).length} ${(isMultiSelector ? mySelectedPhotos : selectedPhotos).length === 1 ? 'photo' : 'photos'}`}
          </span>
        </div>
        {!isCurrentSelectorLocked && (
          <button 
            type="button"
            onClick={saveSelection} 
            disabled={saving || (isMultiSelector ? mySelectedPhotos : selectedPhotos).length === 0}
            className="btn-primary"
            style={{ padding: '10px 18px', fontSize: '0.92rem' }}
          >
            {saving ? 'Saving...' : saved ? 'Saved' : 'Send Selection'}
          </button>
        )}
      </div>
      )}

      {/* Lightbox / Preview Modal */}
      {previewIndex >= 0 && (() => {
        const currentPhoto = currentList[previewIndex];
        const isSelected = selectedPhotos.includes(currentPhoto?.name);
        
        return (
          <>
            <Lightbox
              open={true}
              index={previewIndex}
              close={() => setPreviewIndex(-1)}
              slides={currentList.map(photo => ({
                src: photo.thumbnailLink ? photo.thumbnailLink.replace('=s220', '=w600') : '',
                alt: photo.name,
                photo: photo // Pass original photo object
              }))}
              plugins={[Zoom]}
              on={{
                view: ({ index }) => setPreviewIndex(index),
              }}
              styles={{
                root: {
                  '--yarl__carousel_padding_px': '0',
                  backgroundColor: 'rgba(0,0,0,1)'
                },
                container: {
                  backgroundColor: 'transparent'
                }
              }}
              render={{
                slideFooter: ({ slide }) => {
                  if (!slide || !slide.photo) return null;
                  const currentPhoto = slide.photo;
                  const isSelected = isPhotoSelectedByMe(currentPhoto.name);
                  const owner = getPhotoOwner(currentPhoto.name);
                  const takenByOther = isOwnedByOther(currentPhoto.name);
                  
                  return (
                    <div style={{
                      position: 'absolute',
                      bottom: '30px',
                      left: 0,
                      right: 0,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '16px 24px',
                      pointerEvents: 'none' // Allow swipe through the gap
                    }}>
                      {activeTab === 'raw' && (
                        takenByOther ? (
                          <span style={{
                            padding: '8px 16px',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            backgroundColor: '#fef3c7',
                            color: '#92400e',
                            borderRadius: '100px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                            pointerEvents: 'auto'
                          }}>
                            Selected by {owner}
                          </span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelect(currentPhoto.name);
                            }}
                            style={{
                              padding: '8px 16px',
                              fontSize: '0.9rem',
                              fontWeight: '600',
                              backgroundColor: isSelected ? '#ef4444' : 'var(--primary)',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                              border: 'none',
                              color: 'white',
                              borderRadius: '100px',
                              cursor: 'pointer',
                              pointerEvents: 'auto',
                              minWidth: '120px',
                              textAlign: 'center'
                            }}
                          >
                            {isSelected ? 'Selected (Batal)' : 'Select Photo'}
                          </button>
                        )
                      )}
                      
                      {project?.paymentStatus === 'Lunas' && (
                        <a
                          href={`https://drive.google.com/uc?export=download&id=${currentPhoto.id}`}
                          download={currentPhoto.name}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            padding: '8px 16px',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            backgroundColor: '#3b82f6',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                            border: 'none',
                            color: 'white',
                            borderRadius: '100px',
                            cursor: 'pointer',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'auto',
                            minWidth: '120px'
                          }}
                        >
                          Unduh
                        </a>
                      )}
                    </div>
                  );
                }
              }}
            />
          </>
        );
      })()}

    </main>
  );
}
