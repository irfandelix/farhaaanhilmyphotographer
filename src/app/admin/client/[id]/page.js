'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getProjectById, updatePaymentStatus, updateGDriveLink, updateGDriveEditedLink, unlockClientSelection, updateProjectFinancials, updateGDriveSessions, deleteProject } from '@/lib/projectService';

export default function AdminClientDetail({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  
  const [project, setProject] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  
  const [isEditingFinance, setIsEditingFinance] = useState(false);
  const [editItems, setEditItems] = useState([]);
  const [editDpAmount, setEditDpAmount] = useState('');
  const [editPaymentAmount, setEditPaymentAmount] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editPhotoType, setEditPhotoType] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editShootDate, setEditShootDate] = useState('');
  const [editShootTime, setEditShootTime] = useState('');
  
  // GDrive Link State
  const [savingLink, setSavingLink] = useState(false);
  const [sessions, setSessions] = useState([]);
  
  const [gdriveEditedLink, setGdriveEditedLink] = useState('');
  const [savingEditedLink, setSavingEditedLink] = useState(false);

  const [editLunasAmount, setEditLunasAmount] = useState('');
  const [editLunasDate, setEditLunasDate] = useState('');

  useEffect(() => {
    async function fetchProject() {
      const data = await getProjectById(id);
      if (data) {
        setProject(data);
        setStatus(data.paymentStatus);
        setEditItems(data.items || [{ name: 'Paket Jasa Fotografi', qty: 1, price: data.paymentAmount || 0 }]);
        setEditClientName(data.clientName || '');
        setEditPhotoType(data.photoType || '');
        setEditDpAmount(data.dpAmount || '');
        setEditPaymentAmount(data.paymentAmount || '');
        setEditDescription(data.description || '');
        setEditWhatsapp(data.whatsapp || '');
        setEditLunasAmount(data.lunasAmount || '');
        setEditLunasDate(data.lunasDate || '');
        setEditShootDate(data.shootDate || '');
        setEditShootTime(data.shootTime || '');
        
        // Handle sessions (if empty, fallback to legacy gdriveLink)
        if (data.sessions && data.sessions.length > 0) {
          setSessions(data.sessions);
        } else if (data.gdriveLink) {
          setSessions([{ id: 'default', name: 'Semua Sesi', link: data.gdriveLink }]);
        } else {
          setSessions([]);
        }
        
        setGdriveEditedLink(data.gdriveEditedLink || '');
        
        // Fetch photos from ALL sessions to build a complete dictionary
        const foldersToFetch = data.sessions && data.sessions.length > 0 
          ? data.sessions.map(s => s.folderId)
          : (data.gdriveFolderId ? [data.gdriveFolderId] : []);

        if (foldersToFetch.length > 0) {
          try {
            const fetchPromises = foldersToFetch.map(folderId => 
              fetch(`/api/drive?folderId=${folderId}`).then(res => res.json())
            );
            
            const results = await Promise.all(fetchPromises);
            let allPhotos = [];
            results.forEach(driveData => {
              if (driveData.files) {
                allPhotos = [...allPhotos, ...driveData.files];
              }
            });
            
            setPhotos(allPhotos);
          } catch (e) {
            console.error("Gagal memuat thumbnail dari sesi:", e);
          }
        }
      }
      setLoading(false);
    }
    fetchProject();
  }, [id]);

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    await updatePaymentStatus(id, newStatus);
  };

  const handleSaveGDriveLink = async () => {
    if (sessions.length === 0) return;
    
    // Validasi basic
    for (let s of sessions) {
      if (!s.name || !s.link) {
        alert("Nama sesi dan Link Google Drive tidak boleh kosong.");
        return;
      }
    }

    setSavingLink(true);
    const success = await updateGDriveSessions(id, sessions);
    setSavingLink(false);
    
    if (success) {
      alert('Sesi & Link Google Drive (Mentah) berhasil disimpan!');
      // Force refresh data
      const updatedData = await getProjectById(id);
      if (updatedData) {
        setProject(updatedData);
        setSessions(updatedData.sessions || []);
      }
    } else {
      alert('Gagal menyimpan link. Pastikan formatnya benar.');
    }
  };

  const addSession = () => {
    setSessions([...sessions, { id: Math.random().toString(36).substring(7), name: `Sesi ${sessions.length + 1}`, link: '' }]);
  };

  const updateSession = (index, field, value) => {
    const newSessions = [...sessions];
    newSessions[index][field] = value;
    setSessions(newSessions);
  };

  const removeSession = (index) => {
    const newSessions = sessions.filter((_, i) => i !== index);
    setSessions(newSessions);
  };

  const handleSaveGDriveEditedLink = async () => {
    if (!gdriveEditedLink) return;
    setSavingEditedLink(true);
    const success = await updateGDriveEditedLink(id, gdriveEditedLink);
    setSavingEditedLink(false);
    if (success) {
      alert('Link Google Drive (Hasil Edit) berhasil disimpan!');
      setProject({ ...project, gdriveEditedLink: gdriveEditedLink, gdriveEditedFolderId: 'updated' });
    } else {
      alert('Gagal menyimpan link. Pastikan formatnya benar.');
    }
  };

  const handleSaveFinance = async () => {
    let payload = { 
      dpAmount: editDpAmount, 
      clientName: editClientName,
      photoType: editPhotoType,
      whatsapp: editWhatsapp,
      lunasAmount: editLunasAmount,
      lunasDate: editLunasDate,
      shootDate: editShootDate,
      shootTime: editShootTime
    };
    
    if (editPhotoType === 'Foto Produk') {
      const validItems = editItems.filter(item => item.name && item.price);
      payload.items = validItems;
    } else {
      payload.paymentAmount = editPaymentAmount;
      payload.description = editDescription;
    }

    const success = await updateProjectFinancials(id, payload);
    
    if (success) {
      if (editPhotoType === 'Foto Produk') {
        const validItems = editItems.filter(item => item.name && item.price);
        setProject({ 
          ...project, 
          clientName: editClientName,
          photoType: editPhotoType,
          items: validItems,
          paymentAmount: validItems.reduce((sum, item) => sum + (Number(item.qty) * Number(item.price)), 0),
          dpAmount: Number(editDpAmount),
          lunasAmount: Number(editLunasAmount),
          lunasDate: editLunasDate,
          shootDate: editShootDate,
          shootTime: editShootTime,
          whatsapp: editWhatsapp 
        });
      } else {
        setProject({
          ...project,
          clientName: editClientName,
          photoType: editPhotoType,
          paymentAmount: Number(editPaymentAmount),
          description: editDescription,
          dpAmount: Number(editDpAmount),
          lunasAmount: Number(editLunasAmount),
          lunasDate: editLunasDate,
          shootDate: editShootDate,
          shootTime: editShootTime,
          whatsapp: editWhatsapp
        });
      }
      setIsEditingFinance(false);
    } else {
      alert("Gagal memperbarui info project.");
    }
  };

  const handleFinanceChange = (e) => {
    const { name, value } = e.target;
    if (name === 'description') {
      setEditDescription(value);
    } else if (name === 'whatsapp') {
      setEditWhatsapp(value.replace(/\D/g, ''));
    } else if (name === 'lunasAmount') {
      setEditLunasAmount(value.replace(/\D/g, ''));
    } else if (name === 'lunasDate') {
      setEditLunasDate(value);
    } else {
      const rawValue = value.replace(/\D/g, '');
      if (name === 'dpAmount') setEditDpAmount(rawValue);
      if (name === 'paymentAmount') setEditPaymentAmount(rawValue);
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...editItems];
    if (field === 'qty' || field === 'price') {
      newItems[index][field] = value.replace(/\D/g, '');
    } else {
      newItems[index][field] = value;
    }
    setEditItems(newItems);
  };

  const addItem = () => {
    setEditItems([...editItems, { name: '', qty: 1, price: '' }]);
  };

  const removeItem = (index) => {
    if (editItems.length > 1) {
      const newItems = editItems.filter((_, i) => i !== index);
      setEditItems(newItems);
    }
  };

  const handleDownloadZip = async () => {
    setDownloadingZip(true);
    setDownloadProgress(0);
    
    try {
      const JSZip = (await import('jszip')).default;
      const { saveAs } = await import('file-saver');
      
      const zip = new JSZip();
      const total = project.selectedPhotos.length;
      let successCount = 0;
      
      for (let i = 0; i < total; i++) {
        const photoName = project.selectedPhotos[i];
        const photoObj = photos.find(p => p.name === photoName);
        
        if (photoObj) {
          const driveUrl = `https://drive.google.com/uc?export=download&id=${photoObj.id}`;
          const res = await fetch(`/api/proxy?url=${encodeURIComponent(driveUrl)}`);
          
          if (res.ok) {
            const blob = await res.blob();
            zip.file(photoName, blob);
            successCount++;
          }
          
          setDownloadProgress(Math.round(((i + 1) / total) * 100));
        }
      }
      
      if (successCount === 0) throw new Error("Tidak ada foto yang berhasil diunduh.");
      
      setDownloadProgress(100); 
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${project.clientName} - Foto Terpilih.zip`);
      
    } catch (error) {
      console.error("Download ZIP Error:", error);
      alert('Terjadi kesalahan saat mengunduh ZIP. Pastikan koneksi stabil.');
    }
    
    setDownloadingZip(false);
  };

  const handleUnlock = async () => {
    if (confirm("Yakin ingin membuka kunci pilihan? Klien akan bisa mengubah dan menghapus pilihan fotonya lagi.")) {
      const success = await unlockClientSelection(id);
      if (success) {
        setProject({ ...project, isLocked: false });
        alert("Kunci berhasil dibuka.");
      } else {
        alert("Gagal membuka kunci.");
      }
    }
  };

  const handleDeleteProject = async () => {
    if (confirm("⚠️ PERINGATAN: Anda yakin ingin menghapus project ini secara permanen? Data klien, invoice, dan tagihan akan hilang dan tidak dapat dikembalikan.")) {
      const success = await deleteProject(id);
      if (success) {
        alert("Project berhasil dihapus.");
        router.push('/admin');
      } else {
        alert("Gagal menghapus project.");
      }
    }
  };

  if (loading) return <main style={{ padding: '40px', textAlign: 'center' }}>Memuat...</main>;
  if (!project) return <main style={{ padding: '40px' }}>Project tidak ditemukan.</main>;

  const clientLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/client/${id}`;

  return (
    <main style={{ padding: '20px 16px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <button onClick={() => router.back()} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '14px' }}>
          &larr; Kembali
        </button>
      </div>

      <div className="glass-panel animate-fade-in" style={{ padding: '24px 16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
          <div style={{ width: '100%' }}>
            <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: '700', marginBottom: '4px' }}>{project.clientName}</h1>
            <p style={{ color: '#4b5563', fontSize: '0.9rem' }}>{project.photoType} &bull; {project.shootDate} {project.shootTime ? `• ${project.shootTime}` : ''}</p>
          </div>
          <div style={{ width: '100%', background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>Rincian Project & Keuangan</h3>
              <button 
                onClick={() => isEditingFinance ? handleSaveFinance() : setIsEditingFinance(true)}
                className={isEditingFinance ? "btn-primary" : "btn-secondary"}
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                {isEditingFinance ? 'Simpan' : '✏️ Edit'}
              </button>
            </div>

            {isEditingFinance ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.85rem', color: '#4b5563', display: 'block', marginBottom: '4px' }}>Nama Klien</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={editClientName}
                      onChange={(e) => setEditClientName(e.target.value)}
                      style={{ padding: '8px' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.85rem', color: '#4b5563', display: 'block', marginBottom: '4px' }}>Jenis Sesi</label>
                    <select 
                      className="input-field" 
                      value={editPhotoType}
                      onChange={(e) => setEditPhotoType(e.target.value)}
                      style={{ padding: '8px' }}
                    >
                      <option value="Graduation">Graduation</option>
                      <option value="Group / Studio">Group / Studio</option>
                      <option value="Foto Produk">Foto Produk</option>
                      <option value="Event / Dokumentasi">Event / Dokumentasi</option>
                      <option value="Wedding / Engagement">Wedding / Engagement</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>
                </div>

                {editPhotoType === 'Foto Produk' ? (
                  <>
                    <label style={{ fontSize: '0.85rem', color: '#4b5563', display: 'block', marginBottom: '4px' }}>Rincian Layanan / Produk</label>
                    {editItems.map((item, index) => (
                      <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <div style={{ flex: 3 }}>
                          <input type="text" placeholder="Nama Layanan" className="input-field" value={item.name} onChange={(e) => handleItemChange(index, 'name', e.target.value)} style={{ padding: '8px', fontSize: '0.85rem' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <input type="text" placeholder="Qty" className="input-field" value={item.qty} onChange={(e) => handleItemChange(index, 'qty', e.target.value)} style={{ padding: '8px', fontSize: '0.85rem' }} />
                        </div>
                        <div style={{ flex: 2 }}>
                          <input type="text" placeholder="Harga" className="input-field" value={item.price ? Number(item.price).toLocaleString('id-ID') : ''} onChange={(e) => handleItemChange(index, 'price', e.target.value)} style={{ padding: '8px', fontSize: '0.85rem' }} />
                        </div>
                        <button type="button" onClick={() => removeItem(index)} className="btn-secondary" style={{ padding: '8px', color: '#dc2626', borderColor: '#fca5a5' }} disabled={editItems.length === 1}>X</button>
                      </div>
                    ))}
                    <button type="button" onClick={addItem} className="btn-secondary" style={{ padding: '6px', fontSize: '0.8rem', marginTop: '4px' }}>+ Tambah Item</button>
                  </>
                ) : (
                  <>
                    <div>
                      <label style={{ fontSize: '0.85rem', color: '#4b5563', display: 'block', marginBottom: '4px' }}>Total Tagihan (Rp)</label>
                      <input 
                        type="text" 
                        name="paymentAmount"
                        className="input-field" 
                        value={editPaymentAmount ? Number(editPaymentAmount).toLocaleString('id-ID') : ''}
                        onChange={handleFinanceChange}
                        style={{ padding: '8px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.85rem', color: '#4b5563', display: 'block', marginBottom: '4px' }}>Keterangan / Detail Paket</label>
                      <textarea 
                        name="description"
                        className="input-field" 
                        value={editDescription}
                        onChange={handleFinanceChange}
                        style={{ padding: '8px', minHeight: '60px', resize: 'vertical' }}
                      />
                    </div>
                  </>
                )}
                
                <div style={{ marginTop: '12px' }}>
                  <label style={{ fontSize: '0.85rem', color: '#4b5563', display: 'block', marginBottom: '4px' }}>Uang Muka / DP (Rp)</label>
                  <input 
                    type="text" 
                    name="dpAmount"
                    className="input-field" 
                    value={editDpAmount ? Number(editDpAmount).toLocaleString('id-ID') : ''}
                    onChange={handleFinanceChange}
                    style={{ padding: '8px' }}
                  />
                </div>
                
                <div style={{ marginTop: '12px' }}>
                  <label style={{ fontSize: '0.85rem', color: '#4b5563', display: 'block', marginBottom: '4px' }}>Nominal Pelunasan (Rp)</label>
                  <input 
                    type="text" 
                    name="lunasAmount"
                    className="input-field" 
                    value={editLunasAmount ? Number(editLunasAmount).toLocaleString('id-ID') : ''}
                    onChange={handleFinanceChange}
                    style={{ padding: '8px' }}
                  />
                </div>
                
                <div style={{ marginTop: '12px' }}>
                  <label style={{ fontSize: '0.85rem', color: '#4b5563', display: 'block', marginBottom: '4px' }}>Tanggal Pelunasan</label>
                  <input 
                    type="date" 
                    name="lunasDate"
                    className="input-field" 
                    value={editLunasDate}
                    onChange={handleFinanceChange}
                    style={{ padding: '8px' }}
                  />
                </div>
                
                <div style={{ marginTop: '12px' }}>
                  <label style={{ fontSize: '0.85rem', color: '#4b5563', display: 'block', marginBottom: '4px' }}>Nomor WhatsApp (Cth: 08123...)</label>
                  <input 
                    type="text" 
                    name="whatsapp"
                    className="input-field" 
                    value={editWhatsapp}
                    onChange={handleFinanceChange}
                    style={{ padding: '8px' }}
                    placeholder="Opsional"
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.85rem', color: '#4b5563', display: 'block', marginBottom: '4px' }}>Tanggal Pemotretan</label>
                    <input 
                      type="text" 
                      name="shootDate"
                      className="input-field" 
                      value={editShootDate}
                      onChange={(e) => setEditShootDate(e.target.value)}
                      style={{ padding: '8px' }}
                      placeholder="Cth: 29 Agustus 2026"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.85rem', color: '#4b5563', display: 'block', marginBottom: '4px' }}>Jam / Sesi</label>
                    <input 
                      type="text" 
                      name="shootTime"
                      className="input-field" 
                      value={editShootTime}
                      onChange={(e) => setEditShootTime(e.target.value)}
                      style={{ padding: '8px' }}
                      placeholder="Cth: 14:00"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#4b5563' }}>Total Harga:</span>
                  <span style={{ fontWeight: '600' }}>Rp {project.paymentAmount?.toLocaleString('id-ID')}</span>
                </div>
                
                {project.dpAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#166534' }}>
                    <span>Uang Muka (DP):</span>
                    <span style={{ fontWeight: '600' }}>- Rp {project.dpAmount.toLocaleString('id-ID')}</span>
                  </div>
                )}
                
                {project.lunasAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#166534' }}>
                    <span>Pelunasan {project.lunasDate ? `(${new Date(project.lunasDate).toLocaleDateString('id-ID', {day: '2-digit', month:'2-digit', year:'numeric'}).replace(/\//g, '-')})` : ''}:</span>
                    <span style={{ fontWeight: '600' }}>- Rp {project.lunasAmount.toLocaleString('id-ID')}</span>
                  </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #d1d5db', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600', color: '#111827' }}>Sisa Tagihan:</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: '700', color: '#dc2626' }}>
                    Rp {((project.paymentAmount || 0) - (project.dpAmount || 0) - (project.lunasAmount || 0)).toLocaleString('id-ID')}
                  </span>
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Status:</span>
              <select 
                value={status} 
                onChange={handleStatusChange}
                style={{ 
                  padding: '6px 12px', 
                  borderRadius: '20px', 
                  border: 'none', 
                  backgroundColor: status === 'Lunas' ? '#dcfce3' : status === 'DP' ? '#fef3c7' : '#fee2e2',
                  color: status === 'Lunas' ? '#166534' : status === 'DP' ? '#92400e' : '#991b1b',
                  fontWeight: '600',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="Belum Bayar">Belum Bayar</option>
                <option value="DP">DP</option>
                <option value="Lunas">Lunas</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginTop: '20px', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Link href={`/admin/client/${id}/invoice?type=dp`} target="_blank" style={{ flex: 1 }}>
                  <button className="btn-secondary" style={{ width: '100%', fontSize: '0.85rem', padding: '10px 8px' }}>🖨️ Cetak (Web)</button>
                </Link>
                <a href={`/admin/client/${id}/invoice?type=invoice`} target="_blank" rel="noopener noreferrer" style={{ flex: 1 }}>
                  <button className="btn-primary" style={{ width: '100%', fontSize: '0.85rem', padding: '10px 8px', backgroundColor: '#2563eb' }}>📄 Cetak Invoice (Web)</button>
                </a>
                
                {status === 'DP' && (
                  <a href={`/admin/client/${id}/invoice?type=receipt_dp`} target="_blank" rel="noopener noreferrer" style={{ flex: 1 }}>
                    <button className="btn-primary" style={{ width: '100%', fontSize: '0.85rem', padding: '10px 8px', backgroundColor: '#ca8a04' }}>📄 Cetak DP (Web)</button>
                  </a>
                )}
                
                {status === 'Lunas' && (
                  <a href={`/admin/client/${id}/invoice?type=receipt`} target="_blank" rel="noopener noreferrer" style={{ flex: 1 }}>
                    <button className="btn-primary" style={{ width: '100%', fontSize: '0.85rem', padding: '10px 8px', backgroundColor: '#059669' }}>📄 Cetak Lunas (Web)</button>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Link Mentahan (Multi Sessions) */}
        <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px dashed var(--border-color)', background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Link Folder Mentahan (Sesi)</h3>
            <button 
              onClick={addSession} 
              style={{ padding: '4px 12px', fontSize: '0.8rem', backgroundColor: '#e5e7eb', color: '#374151', borderRadius: '4px', cursor: 'pointer', border: '1px solid #d1d5db' }}
            >
              + Tambah Sesi
            </button>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '16px' }}>
            Tambahkan sesi jika acara memiliki banyak bagian (misal: Sesi Akad, Sesi Resepsi). Klien akan melihatnya dalam tab yang berbeda.
          </p>
          
          {sessions.length === 0 && (
            <div style={{ padding: '16px', textAlign: 'center', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px dashed #d1d5db', marginBottom: '12px' }}>
              <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>Belum ada sesi ditambahkan. Klik <b>+ Tambah Sesi</b></p>
            </div>
          )}
          
          {sessions.map((session, index) => (
            <div key={session.id} style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1' }}>
                <input 
                  type="text" 
                  placeholder="Nama Sesi (Misal: Sesi Akad)"
                  className="input-field" 
                  value={session.name}
                  onChange={(e) => updateSession(index, 'name', e.target.value)}
                />
                <input 
                  type="url" 
                  placeholder="Link Google Drive Sesi Ini..."
                  className="input-field" 
                  value={session.link}
                  onChange={(e) => updateSession(index, 'link', e.target.value)}
                />
              </div>
              <button 
                onClick={() => removeSession(index)}
                style={{ padding: '10px 12px', backgroundColor: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                title="Hapus Sesi"
              >
                🗑️
              </button>
            </div>
          ))}
          
          {sessions.length > 0 && (
            <button 
              onClick={handleSaveGDriveLink}
              disabled={savingLink}
              className="btn-primary" 
              style={{ width: '100%', marginTop: '8px' }}
            >
              {savingLink ? 'Menyimpan...' : 'Simpan Semua Sesi Mentahan'}
            </button>
          )}
        </div>

        {/* Input GDrive Link Hasil Edit */}
        <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid var(--border-color)', marginTop: '24px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '4px', color: '#111827' }}>Folder Hasil Foto Edit</h3>
          <p style={{ fontSize: '0.85rem', marginBottom: '12px', color: '#4b5563' }}>
            Masukkan link folder berisi foto yang SUDAH SELESAI DIEDIT untuk diunduh klien.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input 
              type="url" 
              value={gdriveEditedLink} 
              onChange={(e) => setGdriveEditedLink(e.target.value)} 
              className="input-field" 
              placeholder="https://drive.google.com/drive/folders/..." 
              style={{ width: '100%' }} 
            />
            <button className="btn-primary" onClick={handleSaveGDriveEditedLink} disabled={savingEditedLink || !gdriveEditedLink} style={{ width: '100%', backgroundColor: '#059669' }}>
              {savingEditedLink ? 'Menyimpan...' : 'Simpan Link Hasil Edit'}
            </button>
          </div>
        </div>

        {/* Client Link Section */}
        {project.gdriveFolderId ? (
          <div style={{ background: 'rgba(37, 211, 102, 0.1)', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '4px', color: '#166534' }}>Link Klien Siap Dibagikan!</h3>
            <p style={{ fontSize: '0.85rem', marginBottom: '12px', color: '#4b5563' }}>Bagikan link ini ke klien Anda (untuk memilih & mengunduh foto).</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input type="text" readOnly value={clientLink} className="input-field" style={{ width: '100%', backgroundColor: 'white', fontSize: '0.85rem' }} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-primary" style={{ flex: 1 }} onClick={() => {
                  navigator.clipboard.writeText(clientLink);
                  alert('Link disalin!');
                }}>Copy</button>
                <Link href={`/client/${id}`} target="_blank" style={{ flex: 1 }}>
                  <button className="btn-secondary" style={{ width: '100%' }}>Buka</button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '16px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.9rem' }}>
            ⚠️ Anda belum menyimpan Link Google Drive. Link untuk klien belum bisa digunakan.
          </div>
        )}

        {/* Invoice Link Section */}
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '16px', borderRadius: '8px', marginBottom: '32px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '4px', color: '#1d4ed8' }}>Link Web Invoice</h3>
          <p style={{ fontSize: '0.85rem', marginBottom: '12px', color: '#4b5563' }}>Salin link ini jika ingin membagikan tagihan/kwitansi secara manual.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input 
              type="text" 
              readOnly 
              value={`${clientLink}/invoice?type=${status === 'Lunas' ? 'receipt' : status === 'DP' ? 'receipt_dp' : 'invoice'}`} 
              className="input-field" 
              style={{ width: '100%', backgroundColor: 'white', fontSize: '0.85rem' }} 
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-primary" style={{ flex: 1, backgroundColor: '#2563eb' }} onClick={() => {
                navigator.clipboard.writeText(`${clientLink}/invoice?type=${status === 'Lunas' ? 'receipt' : status === 'DP' ? 'receipt_dp' : 'invoice'}`);
                alert('Link Invoice disalin!');
              }}>Copy</button>
              <Link href={`${clientLink}/invoice?type=${status === 'Lunas' ? 'receipt' : status === 'DP' ? 'receipt_dp' : 'invoice'}`} target="_blank" style={{ flex: 1 }}>
                <button className="btn-secondary" style={{ width: '100%' }}>Buka</button>
              </Link>
            </div>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Foto Terpilih ({project.selectedPhotos ? project.selectedPhotos.length : 0})
              {project.isLocked && <span style={{ fontSize: '0.9rem', padding: '4px 8px', background: '#fee2e2', color: '#991b1b', borderRadius: '4px' }}>🔒 Terkunci</span>}
            </h2>
            
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {project.isLocked && (
                <button onClick={handleUnlock} className="btn-secondary" style={{ padding: '10px 20px', fontSize: '0.95rem' }}>
                  🔓 Buka Kunci
                </button>
              )}
              {project.selectedPhotos && project.selectedPhotos.length > 0 && photos.length > 0 && (
                <button 
                  onClick={handleDownloadZip}
                  disabled={downloadingZip}
                  className="btn-primary" 
                  style={{ 
                    padding: '10px 20px', 
                    fontSize: '0.95rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    backgroundColor: downloadingZip ? '#9ca3af' : 'var(--primary)',
                    boxShadow: downloadingZip ? 'none' : '0 4px 12px rgba(37,99,235,0.3)'
                  }}
                >
                  {downloadingZip ? `Mempersiapkan ZIP... ${downloadProgress}%` : '📥 Download Semua (ZIP)'}
                </button>
              )}
            </div>
          </div>
          {(!project.selectedPhotos || project.selectedPhotos.length === 0) ? (
            <p style={{ color: '#6b7280' }}>Klien belum memilih foto.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
              {project.selectedPhotos.map((photoName, i) => {
                const photoObj = photos.find(p => p.name === photoName);
                return (
                  <div key={i} className="glass-panel" style={{ padding: '8px', border: '1px solid var(--border-color)', borderRadius: '8px', textAlign: 'center', fontSize: '0.85rem', wordBreak: 'break-all', display: 'flex', flexDirection: 'column' }}>
                    {photoObj ? (
                      <div style={{ height: '140px', width: '100%', marginBottom: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                        <img 
                          src={`/api/proxy?url=${encodeURIComponent(`https://drive.google.com/thumbnail?id=${photoObj.id}&sz=w400`)}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          alt={photoName}
                        />
                      </div>
                    ) : (
                      <div style={{ height: '140px', width: '100%', marginBottom: '8px', backgroundColor: '#f3f4f6', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                        Memuat...
                      </div>
                    )}
                    <div style={{ padding: '4px' }}>{photoName}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Zona Berbahaya (Hapus Project) */}
        <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px dashed #ef4444', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#b91c1c', marginBottom: '8px' }}>Zona Berbahaya</h3>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '16px', textAlign: 'center', maxWidth: '400px' }}>
            Tindakan ini akan menghapus project beserta invoice-nya secara permanen dari sistem. Tindakan ini tidak dapat dibatalkan.
          </p>
          <button 
            onClick={handleDeleteProject}
            style={{ 
              padding: '10px 24px', 
              backgroundColor: '#fee2e2', 
              color: '#b91c1c', 
              border: '1px solid #f87171', 
              borderRadius: '8px', 
              fontWeight: '600', 
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#fecaca'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; }}
          >
            🗑️ Hapus Project Ini
          </button>
        </div>
      </div>
    </main>
  );
}
