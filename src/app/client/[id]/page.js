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
    setSaved(false);
    setSelectedPhotos(prev => 
      prev.includes(photoName) 
        ? prev.filter(p => p !== photoName)
        : [...prev, photoName]
    );
  };

  const saveSelection = async () => {
    if (!window.confirm("Apakah Anda yakin dengan pilihan ini?\n\nSetelah dikirim, foto akan langsung diproses.")) {
      return;
    }

    setSaving(true);
    const success = await updateSelectedPhotos(id, selectedPhotos, false);
    setSaving(false);
    if (success) {
      setSaved(true);
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
                      Semua Foto ({photos.length})
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
                      Foto Terpilih ({selectedPhotos.length})
                    </button>
                  </div>
                  
                  {project.paymentStatus === 'Lunas' && sessions.length > 0 && viewMode === 'all' && (
                    <button 
                      onClick={handleDownloadRawZip}
                      disabled={downloadingZip}
                      className="btn-primary" 
                      style={{ padding: '6px 14px', fontSize: '0.9rem', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px', border: 'none', color: 'white', cursor: 'pointer', fontWeight: '600' }}
                      title="Hanya tersedia untuk klien yang sudah Lunas"
                    >
                      {downloadingZip ? `⏳ Mengemas ZIP... ${downloadProgress}%` : '📥 Unduh Mentahan Sesi Ini'}
                    </button>
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
                  <p style={{ color: '#6b7280', fontSize: '1.1rem', marginBottom: '8px' }}>Belum ada foto yang dipilih.</p>
                  <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Silakan kembali ke &quot;Semua Foto&quot; dan klik tanda centang pada foto yang Anda inginkan.</p>
                </div>
              ) : viewFormat === 'list' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 60px 1fr 1fr 1fr 1fr', gap: '16px', padding: '12px 16px', backgroundColor: '#f3f4f6', borderRadius: '8px', fontWeight: '600', fontSize: '0.85rem', color: '#4b5563' }}>
                    <div style={{ width: '24px' }}></div>
                    <div>Foto</div>
                    <div>Nama File</div>
                    <div>Resolusi</div>
                    <div>Ukuran</div>
                    <div>Tanggal Diunggah</div>
                  </div>
                  {(viewMode === 'selected' ? selectedPhotoObjects : sortedPhotos).map((photo, index) => {
                    const isSelected = selectedPhotos.includes(photo.name);
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
                          display: 'grid', gridTemplateColumns: 'auto 60px 1fr 1fr 1fr 1fr', gap: '16px', padding: '8px 16px', 
                          backgroundColor: isSelected ? '#e8f9ef' : 'white', 
                          border: isSelected ? '1px solid var(--primary)' : '1px solid #e5e7eb',
                          borderRadius: '8px', alignItems: 'center', transition: 'all 0.2s'
                        }}
                      >
                        <div 
                          onClick={() => toggleSelect(photo.name)}
                          style={{
                            width: '24px', height: '24px', borderRadius: '6px',
                            backgroundColor: isSelected ? 'var(--primary)' : 'white',
                            border: isSelected ? 'none' : '2px solid #d1d5db',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold'
                          }}
                        >
                          {isSelected && <span>✓</span>}
                        </div>
                        
                        <div 
                          onClick={() => setPreviewIndex((activeTab === 'edited' ? editedPhotos : (viewMode === 'selected' ? selectedPhotoObjects : sortedPhotos)).findIndex(p => p.id === photo.id))}
                          style={{ width: '60px', height: '40px', background: '#e5e7eb', cursor: 'zoom-in', borderRadius: '4px', overflow: 'hidden' }}
                        >
                          <img 
                            src={photo.thumbnailLink ? `/api/proxy?url=${encodeURIComponent(photo.thumbnailLink.replace('=s220', '=w100'))}` : ''}
                            alt={photo.name} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        </div>
                        
                        <div onClick={() => toggleSelect(photo.name)} style={{ fontSize: '0.9rem', fontWeight: '500', cursor: 'pointer', wordBreak: 'break-all' }}>{photo.name}</div>
                        <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{width} x {height}</div>
                        <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{fileSizeMB}</div>
                        <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{dateStr}</div>
                      </div>
                    );
                  })}
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
        <button 
          onClick={saveSelection} 
          disabled={saving || selectedPhotos.length === 0}
          className="btn-primary"
          style={{ padding: '12px 20px', fontSize: '0.95rem', opacity: (saving || selectedPhotos.length === 0) ? 0.7 : 1 }}
        >
          {saving ? 'Menyimpan...' : saved ? 'Tersimpan ✓' : 'Kirim Pilihan'}
        </button>
      </div>
      )}

      {/* Lightbox / Preview Modal */}
      {previewIndex >= 0 && (() => {
        const currentPhoto = (activeTab === 'edited' ? editedPhotos : (viewMode === 'selected' ? selectedPhotoObjects : sortedPhotos))[previewIndex];
        const isSelected = selectedPhotos.includes(currentPhoto?.name);
        
        return (
          <>
            <Lightbox
              open={true}
              index={previewIndex}
              close={() => setPreviewIndex(-1)}
              slides={(activeTab === 'edited' ? editedPhotos : (viewMode === 'selected' ? selectedPhotoObjects : sortedPhotos)).map(photo => ({
                src: photo.thumbnailLink ? '/api/proxy?url=' + encodeURIComponent(photo.thumbnailLink.replace('=s220', '=w600')) : '',
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
                  const isSelected = selectedPhotos.includes(currentPhoto.name);
                  
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
                          {isSelected ? 'Terpilih (Batal)' : 'Pilih Foto'}
                        </button>
                      )}
                      
                      {project?.paymentStatus === 'Lunas' && (
                        <a
                          href={`/api/proxy?url=${encodeURIComponent(`https://drive.google.com/uc?export=download&id=${currentPhoto.id}`)}`}
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
