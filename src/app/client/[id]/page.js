'use client';

import { useEffect, useState, use } from 'react';
import { createPortal } from 'react-dom';
import { getProjectById, updateSelectedPhotos } from '@/lib/projectService';
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
  
  const [editedPhotos, setEditedPhotos] = useState([]);
  const [activeTab, setActiveTab] = useState('raw'); // 'raw' or 'edited'
  
  // Sessions
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  
  // State untuk Lightbox Preview
  const [previewIndex, setPreviewIndex] = useState(-1);

  // State untuk Download ZIP
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

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
  }, [id]);

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

  const handleSessionChange = (sessionId) => {
    setActiveSessionId(sessionId);
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      fetchSessionPhotos(session.folderId);
    }
  };

  const handleDownloadRawZip = async () => {
    if (!photos || photos.length === 0) return;
    
    setDownloadingZip(true);
    setDownloadProgress(0);
    
    try {
      const zip = new JSZip();
      let successCount = 0;
      const totalFilesToDownload = photos.length;
      
      const currentSession = sessions.find(s => s.id === activeSessionId);
      const sessionName = currentSession ? currentSession.name : 'Sesi';
      
      for (let i = 0; i < totalFilesToDownload; i++) {
        const photo = photos[i];
        if (photo.id) {
          const res = await fetch(`/api/proxy?url=${encodeURIComponent(`https://drive.google.com/uc?export=download&id=${photo.id}`)}`);
          
          if (res.ok) {
            const blob = await res.blob();
            zip.file(photo.name, blob);
            successCount++;
          }
          
          setDownloadProgress(Math.round(((i + 1) / totalFilesToDownload) * 100));
        }
      }
      
      if (successCount === 0) throw new Error("Tidak ada foto mentah yang berhasil diunduh.");
      
      setDownloadProgress(100); 
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${project.clientName} - Mentahan ${sessionName}.zip`);
      
    } catch (error) {
      console.error("Download Raw ZIP Error:", error);
      alert('Terjadi kesalahan saat mengunduh ZIP: ' + error.message);
    }
    
    setDownloadingZip(false);
  };

  const handleDownloadZip = async () => {
    if (!editedPhotos || editedPhotos.length === 0) return;
    
    setDownloadingZip(true);
    setDownloadProgress(0);
    
    try {
      const zip = new JSZip();
      const total = editedPhotos.length;
      let successCount = 0;
      
      for (let i = 0; i < total; i++) {
        const photo = editedPhotos[i];
        if (photo.id) {
          const res = await fetch(`/api/proxy?url=${encodeURIComponent(`https://drive.google.com/uc?export=download&id=${photo.id}`)}`);
          
          if (res.ok) {
            const blob = await res.blob();
            zip.file(photo.name, blob);
            successCount++;
          }
          
          setDownloadProgress(Math.round(((i + 1) / total) * 100));
        }
      }
      
      if (successCount === 0) throw new Error("Tidak ada foto yang berhasil diunduh.");
      
      setDownloadProgress(100); 
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${project.clientName} - Hasil Edit Final.zip`);
      
    } catch (error) {
      console.error("Download ZIP Error:", error);
      alert('Terjadi kesalahan saat mengunduh ZIP. Pastikan koneksi internet stabil.');
    }
    
    setDownloadingZip(false);
  };

  const toggleSelect = (photoName) => {
    if (project?.isLocked) {
      alert("Pilihan Anda sudah dikunci dan tidak dapat diubah lagi. Hubungi fotografer jika ada kesalahan.");
      return;
    }
    setSaved(false);
    setSelectedPhotos(prev => 
      prev.includes(photoName) 
        ? prev.filter(p => p !== photoName)
        : [...prev, photoName]
    );
  };

  const saveSelection = async () => {
    if (!window.confirm("Apakah Anda yakin dengan pilihan ini?\n\nSetelah dikirim, foto akan langsung diproses dan pilihan tidak dapat diubah lagi.")) {
      return;
    }

    setSaving(true);
    const success = await updateSelectedPhotos(id, selectedPhotos, true);
    setSaving(false);
    if (success) {
      setSaved(true);
      setProject({ ...project, isLocked: true });
      // Construct WhatsApp URL
      const waNumber = "6281234567890"; // In real app, this should come from project or admin settings
      let message = `Halo, saya ${project.clientName}!\nSaya sudah selesai memilih ${selectedPhotos.length} foto untuk diedit:\n\n`;
      selectedPhotos.forEach((photo, idx) => {
        message += `${idx + 1}. ${photo}\n`;
      });
      message += `\nMohon segera diproses. Terima kasih!`;
      
      const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
      
      if (confirm("Pilihan berhasil disimpan! Apakah Anda ingin mengirim konfirmasi via WhatsApp sekarang?")) {
        window.open(waLink, '_blank');
      }
    } else {
      alert("Gagal menyimpan pilihan. Silakan coba lagi.");
    }
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
  const selectedPhotoObjects = sortedPhotos.filter(p => selectedPhotos.includes(p.name));
  const currentList = activeTab === 'edited' ? editedPhotos : (viewMode === 'selected' ? selectedPhotoObjects : sortedPhotos);

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
      </div>

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
            Pilihan Foto 📸
          </button>
          <button 
            onClick={() => setActiveTab('edited')}
            style={{
              padding: '12px 24px', borderRadius: '100px', fontWeight: '600', border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              backgroundColor: activeTab === 'edited' ? '#059669' : '#e5e7eb',
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
          {/* Sub-tabs for Selection Mode */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
            <button 
              onClick={() => setViewMode('all')}
              style={{
                padding: '10px 20px', borderRadius: '8px', fontWeight: '600', border: '1px solid', cursor: 'pointer', transition: 'all 0.2s',
                backgroundColor: viewMode === 'all' ? '#111827' : 'white',
                color: viewMode === 'all' ? 'white' : '#4b5563',
                borderColor: viewMode === 'all' ? '#111827' : '#d1d5db'
              }}
            >
              Semua Foto ({photos.length})
            </button>
            <button 
              onClick={() => setViewMode('selected')}
              style={{
                padding: '10px 20px', borderRadius: '8px', fontWeight: '600', border: '1px solid', cursor: 'pointer', transition: 'all 0.2s',
                backgroundColor: viewMode === 'selected' ? '#111827' : 'white',
                color: viewMode === 'selected' ? 'white' : '#4b5563',
                borderColor: viewMode === 'selected' ? '#111827' : '#d1d5db'
              }}
            >
              Foto Terpilih ({selectedPhotos.length})
            </button>
          </div>

          {sessions.length > 1 && viewMode === 'all' && (
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '16px', justifyContent: 'center' }}>
              {sessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => handleSessionChange(session.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    whiteSpace: 'nowrap',
                    fontWeight: activeSessionId === session.id ? '600' : '400',
                    backgroundColor: activeSessionId === session.id ? '#3b82f6' : '#f3f4f6',
                    color: activeSessionId === session.id ? 'white' : '#374151',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: activeSessionId === session.id ? '0 2px 8px rgba(59,130,246,0.3)' : 'none'
                  }}
                >
                  {session.name}
                </button>
              ))}
            </div>
          )}

          {project.paymentStatus === 'Lunas' && sessions.length > 0 && viewMode === 'all' && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <button 
                onClick={handleDownloadRawZip}
                disabled={downloadingZip}
                className="btn-primary" 
                style={{ padding: '10px 20px', fontSize: '0.95rem', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '100px', boxShadow: '0 4px 15px rgba(59,130,246,0.3)', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                title="Hanya tersedia untuk klien yang sudah Lunas"
              >
                {downloadingZip ? `⏳ Mengemas ZIP... ${downloadProgress}%` : '📥 Unduh Mentahan Sesi Ini'}
              </button>
            </div>
          )}
          
          {loadingPhotos ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '8px' }}></div>
              <p>Memuat foto sesi...</p>
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <span style={{ color: '#4b5563', fontSize: '0.9rem' }}>
                  Total {sortedPhotos.length} foto
                </span>
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
              
              {viewMode === 'selected' && selectedPhotoObjects.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px dashed #d1d5db' }}>
                  <p style={{ color: '#6b7280', fontSize: '1.1rem', marginBottom: '8px' }}>Belum ada foto yang dipilih.</p>
                  <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Silakan kembali ke &quot;Semua Foto&quot; dan klik tanda centang pada foto yang Anda inginkan.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                  {(viewMode === 'selected' ? selectedPhotoObjects : sortedPhotos).map((photo) => {
          const isSelected = selectedPhotos.includes(photo.name);
          return (
            <div 
              key={photo.id}
              className="glass-panel"
              style={{
                overflow: 'hidden',
                transition: 'all 0.2s',
                transform: isSelected ? 'scale(0.95)' : 'scale(1)',
                border: isSelected ? '3px solid var(--primary)' : '1px solid var(--glass-border)',
                backgroundColor: isSelected ? '#e8f9ef' : 'var(--glass-bg)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
              }}
            >
              {/* Checkbox (Klik untuk memilih cepat) */}
              <div 
                onClick={() => toggleSelect(photo.name)}
                style={{
                  position: 'absolute', top: '12px', left: '12px', zIndex: 10,
                  width: '32px', height: '32px', borderRadius: '50%',
                  backgroundColor: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.9)',
                  border: isSelected ? 'none' : '2px solid #9ca3af',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  fontSize: '1.2rem', fontWeight: 'bold'
                }}
              >
                {isSelected && <span>✓</span>}
              </div>


              <div 
                onClick={() => setPreviewIndex((activeTab === 'edited' ? editedPhotos : (viewMode === 'selected' ? selectedPhotoObjects : sortedPhotos)).findIndex(p => p.id === photo.id))}
                style={{ height: '160px', width: '100%', position: 'relative', background: '#e5e7eb', cursor: 'zoom-in' }}
                title="Klik untuk perbesar"
              >
                <img 
                  src={photo.thumbnailLink ? `/api/proxy?url=${encodeURIComponent(photo.thumbnailLink.replace('=s220', '=w600'))}` : ''}
                  onError={(e) => { 
                    e.target.onerror = null; 
                    e.target.src = `/api/proxy?url=${encodeURIComponent(`https://drive.google.com/thumbnail?id=${photo.id}&sz=w600`)}`; 
                  }}
                  alt={photo.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              </div>
              <div 
                onClick={() => toggleSelect(photo.name)}
                style={{ padding: '12px', textAlign: 'center', fontSize: '0.9rem', fontWeight: '500', wordBreak: 'break-all', cursor: 'pointer' }}
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {sessions.length > 0 && project.paymentStatus === 'Lunas' && (
              <button 
                onClick={handleDownloadRawZip}
                disabled={downloadingZip}
                className="btn-secondary" 
                style={{ padding: '10px 20px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #9ca3af', backgroundColor: 'white', color: '#4b5563', borderRadius: '8px', cursor: 'pointer' }}
                title="Hanya tersedia untuk klien yang sudah Lunas"
              >
                {downloadingZip ? `⏳ Mengemas ZIP... ${downloadProgress}%` : `📥 Unduh Mentahan Sesi Ini`}
              </button>
            )}
            <button 
              onClick={handleDownloadZip}
              disabled={downloadingZip}
              className="btn-primary" 
              style={{ padding: '10px 20px', fontSize: '0.95rem', backgroundColor: '#059669', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {downloadingZip ? `⏳ Mengemas ZIP... ${downloadProgress}%` : '📥 Unduh Editan (ZIP)'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
          {editedPhotos.map((photo) => (
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
                onClick={() => setPreviewIndex((activeTab === 'edited' ? editedPhotos : (viewMode === 'selected' ? selectedPhotoObjects : sortedPhotos)).findIndex(p => p.id === photo.id))}
                style={{ height: '160px', width: '100%', position: 'relative', background: '#e5e7eb', cursor: 'zoom-in' }}
                title="Klik untuk perbesar"
              >

                <img 
                  src={photo.thumbnailLink ? `/api/proxy?url=${encodeURIComponent(photo.thumbnailLink.replace('=s220', '=w600'))}` : ''}
                  onError={(e) => { 
                    e.target.onerror = null; 
                    e.target.src = `/api/proxy?url=${encodeURIComponent(`https://drive.google.com/thumbnail?id=${photo.id}&sz=w600`)}`; 
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
        </>
      )}

      {activeTab === 'raw' && photos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          Belum ada foto yang ditemukan di folder mentah ini.
        </div>
      )}
      
      {activeTab === 'edited' && editedPhotos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          Belum ada foto hasil editan di folder ini.
        </div>
      )}

      {/* Floating Action Bar (Hanya untuk tab RAW) */}
      {activeTab === 'raw' && (
      <div style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        padding: '12px 20px',
        borderRadius: '100px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: 'calc(100% - 32px)',
        maxWidth: '400px',
        zIndex: 100
      }}>
        <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>
          Terpilih: <span style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>{selectedPhotos.length}</span>
        </div>
        {project?.isLocked ? (
          <div style={{ padding: '8px 16px', background: '#dcfce3', color: '#166534', borderRadius: '20px', fontSize: '0.9rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🔒 Terkunci
          </div>
        ) : (
          <button 
            onClick={saveSelection} 
            disabled={saving || selectedPhotos.length === 0}
            className="btn-primary"
            style={{ padding: '12px 20px', fontSize: '0.95rem', opacity: (saving || selectedPhotos.length === 0) ? 0.7 : 1 }}
          >
            {saving ? 'Menyimpan...' : saved ? 'Tersimpan ✓' : 'Kirim Pilihan'}
          </button>
        )}
      </div>
      )}

            {/* Lightbox / Preview Modal */}
      <Lightbox
        open={previewIndex >= 0}
        index={previewIndex >= 0 ? previewIndex : 0}
        close={() => setPreviewIndex(-1)}
        slides={(activeTab === 'edited' ? editedPhotos : (viewMode === 'selected' ? selectedPhotoObjects : sortedPhotos)).map(photo => ({
          src: photo.thumbnailLink ? '/api/proxy?url=' + encodeURIComponent(photo.thumbnailLink.replace('=s220', '=w600')) : '',
          alt: photo.name,
        }))}
        plugins={[Zoom]}
        on={{
          view: ({ index }) => setPreviewIndex(index),
        }}
      />

      {previewIndex >= 0 && (activeTab === 'edited' ? editedPhotos : (viewMode === 'selected' ? selectedPhotoObjects : sortedPhotos))[previewIndex] && (
        <>
          {activeTab === 'raw' && selectedPhotos.includes((activeTab === 'edited' ? editedPhotos : (viewMode === 'selected' ? selectedPhotoObjects : sortedPhotos))[previewIndex].name) && (
            <div style={{
              position: 'fixed',
              top: '20px',
              left: '20px',
              backgroundColor: 'var(--primary)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '20px',
              fontWeight: 'bold',
              fontSize: '1rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              zIndex: 100000
            }}>
              ✓ Terpilih
            </div>
          )}
          {typeof document !== 'undefined' && createPortal(
            <div style={{ 
              position: 'fixed', 
              bottom: '24px', 
              left: 0,
              right: 0, 
              margin: '0 auto',
              width: 'max-content',
              maxWidth: '90%',
              zIndex: 9999999, 
              display: 'flex',
            }}>
              <div style={{ 
              display: 'flex', 
              flexDirection: 'row', 
              gap: '8px', 
              width: '100%', 
              maxWidth: '600px',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(12px)',
              padding: '12px',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              {activeTab === 'raw' ? (
                <>
                  {!project?.isLocked ? (
                    <>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelect((activeTab === 'edited' ? editedPhotos : (viewMode === 'selected' ? selectedPhotoObjects : sortedPhotos))[previewIndex].name);
                        }}
                        style={{ 
                          padding: '10px 16px', 
                          fontSize: '0.9rem',
                          fontWeight: 'bold',
                          flex: 1,
                          boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                          backgroundColor: selectedPhotos.includes((activeTab === 'edited' ? editedPhotos : (viewMode === 'selected' ? selectedPhotoObjects : sortedPhotos))[previewIndex].name) ? '#ef4444' : 'var(--primary)',
                          border: 'none',
                          color: 'white',
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        {selectedPhotos.includes((activeTab === 'edited' ? editedPhotos : (viewMode === 'selected' ? selectedPhotoObjects : sortedPhotos))[previewIndex].name) ? 'Batal Pilih' : 'Pilih Foto'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewIndex(-1);
                        }}
                        style={{
                          padding: '10px 16px', 
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          flex: 1,
                          backgroundColor: 'rgba(0,0,0,0.6)',
                          border: 'none',
                          color: 'white',
                          borderRadius: '8px',
                          cursor: 'pointer',
                        }}
                      >
                        Tutup
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{ padding: '10px 16px', background: '#dcfce3', color: '#166534', borderRadius: '8px', fontWeight: '600', textAlign: 'center', flex: 1, fontSize: '0.9rem' }}>
                        🔒 Dikunci
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewIndex(-1);
                        }}
                        style={{
                          padding: '10px 16px', 
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          flex: 1,
                          backgroundColor: 'rgba(0,0,0,0.6)',
                          border: 'none',
                          color: 'white',
                          borderRadius: '8px',
                          cursor: 'pointer',
                        }}
                      >
                        Tutup
                      </button>
                    </>
                  )}
                  {project.paymentStatus === 'Lunas' && (
                    <a 
                      href={`/api/proxy?url=${encodeURIComponent(`https://drive.google.com/uc?export=download&id=${(activeTab === 'edited' ? editedPhotos : (viewMode === 'selected' ? selectedPhotoObjects : sortedPhotos))[previewIndex].id}`)}`}
                      download={(activeTab === 'edited' ? editedPhotos : (viewMode === 'selected' ? selectedPhotoObjects : sortedPhotos))[previewIndex].name}
                      style={{ 
                        padding: '10px 16px', 
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        flex: 1,
                        boxShadow: '0 4px 15px rgba(59,130,246,0.3)',
                        backgroundColor: '#3b82f6',
                        border: 'none',
                        color: 'white',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxSizing: 'border-box'
                      }}
                    >
                      📥 Unduh
                    </a>
                  )}
                </>
              ) : (
                <a 
                  href={`/api/proxy?url=${encodeURIComponent(`https://drive.google.com/uc?export=download&id=${(activeTab === 'edited' ? editedPhotos : (viewMode === 'selected' ? selectedPhotoObjects : sortedPhotos))[previewIndex].id}`)}`}
                  download={(activeTab === 'edited' ? editedPhotos : (viewMode === 'selected' ? selectedPhotoObjects : sortedPhotos))[previewIndex].name}
                  className="btn-primary" 
                  style={{ width: '100%', padding: '12px 24px', fontSize: '1rem', fontWeight: 'bold', backgroundColor: '#059669', boxShadow: '0 4px 15px rgba(5,150,105,0.3)', borderRadius: '8px', border: 'none', color: 'white', cursor: 'pointer', textDecoration: 'none', textAlign: 'center', display: 'block', boxSizing: 'border-box' }}
                >
                  📥 Download Foto
                </a>
              )}
            </div>
          </div>
          , document.body)}
        </>
      )}

    </main>
  );
}
