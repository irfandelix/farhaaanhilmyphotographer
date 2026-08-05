'use client';

import { useEffect, useState, use } from 'react';
import { getProjectById, updateSelectedPhotos } from '@/lib/projectService';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function ClientGallery({ params }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  
  const [project, setProject] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  const [editedPhotos, setEditedPhotos] = useState([]);
  const [activeTab, setActiveTab] = useState('raw'); // 'raw' or 'edited'
  
  // State untuk Lightbox Preview
  const [previewPhoto, setPreviewPhoto] = useState(null);

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

      if (proj.gdriveFolderId) {
        try {
          const res = await fetch(`/api/drive?folderId=${proj.gdriveFolderId}`);
          const data = await res.json();
          if (!data.error) setPhotos(data.files || []);
        } catch (err) {
          console.error("Gagal mengambil foto dari GDrive:", err);
        }
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
          {photos.map((photo) => {
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
                onClick={() => setPreviewPhoto(photo)}
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

      {/* Render Edited Photos (Download Mode) */}
      {activeTab === 'edited' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button 
              onClick={handleDownloadZip}
              disabled={downloadingZip}
              className="btn-primary" 
              style={{ padding: '10px 20px', fontSize: '0.95rem', backgroundColor: '#059669', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {downloadingZip ? `⏳ Mengemas ZIP... ${downloadProgress}%` : '📥 Unduh Semua (ZIP)'}
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
                onClick={() => setPreviewPhoto(photo)}
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
      {previewPhoto && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.9)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          backdropFilter: 'blur(5px)'
        }}>
          <button 
            onClick={() => setPreviewPhoto(null)}
            style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: '2rem', cursor: 'pointer', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: '6px' }}
            title="Tutup Preview"
          >&times;</button>
          
          <img 
            src={previewPhoto.thumbnailLink ? `/api/proxy?url=${encodeURIComponent(previewPhoto.thumbnailLink.replace('=s220', '=w1200'))}` : ''}
            onError={(e) => { 
              e.target.onerror = null; 
              e.target.src = `/api/proxy?url=${encodeURIComponent(`https://drive.google.com/thumbnail?id=${previewPhoto.id}&sz=w1200`)}`; 
            }}
            alt={previewPhoto.name}
            style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}
          />
          
          <div style={{ marginTop: '24px', display: 'flex', gap: '16px', alignItems: 'center', width: '100%', justifyContent: 'center' }}>
            {activeTab === 'raw' ? (
              !project?.isLocked ? (
                <button 
                  onClick={() => {
                    toggleSelect(previewPhoto.name);
                    setPreviewPhoto(null);
                  }}
                  className="btn-primary"
                  style={{ 
                    padding: '14px 24px', 
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    width: '100%',
                    maxWidth: '300px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                    backgroundColor: selectedPhotos.includes(previewPhoto.name) ? '#ef4444' : 'var(--primary)'
                  }}
                >
                  {selectedPhotos.includes(previewPhoto.name) ? 'Hapus dari Pilihan' : 'Pilih Foto Ini'}
                </button>
              ) : (
                <div style={{ padding: '12px 24px', background: '#dcfce3', color: '#166534', borderRadius: '8px', fontWeight: '600' }}>
                  🔒 Pilihan Sudah Dikunci
                </div>
              )
            ) : (
              <a 
                href={previewPhoto.webContentLink || `https://drive.google.com/uc?export=download&id=${previewPhoto.id}`} 
                target="_blank" rel="noopener noreferrer"
                style={{ width: '100%', maxWidth: '300px', display: 'block', textDecoration: 'none' }}
              >
                <button className="btn-primary" style={{ width: '100%', padding: '14px 24px', fontSize: '1rem', fontWeight: 'bold', backgroundColor: '#059669', boxShadow: '0 4px 15px rgba(5,150,105,0.3)' }}>
                  ⬇️ Download Foto
                </button>
              </a>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
