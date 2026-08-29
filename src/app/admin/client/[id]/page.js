'use client';
import Swal from 'sweetalert2';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getProjectById, updatePaymentStatus, updateGDriveLink, updateGDriveEditedLink, updateProjectFinancials, updateGDriveSessions, deleteProject, getProjects } from '@/lib/projectService';

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
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  
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
        let initDate = '';
        if (data.shootDate) {
          const monthMap = { 'Januari': '01', 'Februari': '02', 'Maret': '03', 'April': '04', 'Mei': '05', 'Juni': '06', 'Juli': '07', 'Agustus': '08', 'September': '09', 'Oktober': '10', 'November': '11', 'Desember': '12' };
          const parts = data.shootDate.split(' ');
          if (parts.length === 3) {
            initDate = `${parts[2]}-${monthMap[parts[1]] || '01'}-${parts[0].padStart(2, '0')}`;
          } else {
            initDate = data.shootDate;
          }
        }
        setEditShootDate(initDate);
        
        let st = '';
        let et = '';
        if (data.shootTime) {
          if (data.shootTime.includes('-')) {
            const parts = data.shootTime.split('-');
            st = parts[0].trim();
            et = parts[1].trim();
          } else {
            st = data.shootTime.trim();
          }
        }
        setEditStartTime(st);
        setEditEndTime(et);
        
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
    // Validasi basic
    for (let s of sessions) {
      if (!s.name || !s.link) {
        Swal.fire("Nama sesi dan Link Google Drive tidak boleh kosong.");
        return;
      }
    }

    setSavingLink(true);
    const success = await updateGDriveSessions(id, sessions);
    setSavingLink(false);
    
    if (success) {
      Swal.fire('Sesi & Link Google Drive (Original) berhasil disimpan!');
      // Force refresh data
      const updatedData = await getProjectById(id);
      if (updatedData) {
        setProject(updatedData);
        setSessions(updatedData.sessions || []);
      }
    } else {
      Swal.fire('Gagal menyimpan link. Pastikan formatnya benar.');
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

  const handleSaveGDriveEditedLink = async (linkToSave = gdriveEditedLink) => {
    setSavingEditedLink(true);
    const success = await updateGDriveEditedLink(id, linkToSave);
    setSavingEditedLink(false);
    if (success) {
      if (!linkToSave || linkToSave.trim() === '') {
        Swal.fire('Link Google Drive (Hasil Edit) berhasil dihapus!');
      } else {
        Swal.fire('Link Google Drive (Hasil Edit) berhasil disimpan!');
      }
      setProject({ ...project, gdriveEditedLink: linkToSave, gdriveEditedFolderId: linkToSave ? 'updated' : '' });
      setGdriveEditedLink(linkToSave);
    } else {
      Swal.fire('Gagal menyimpan link. Pastikan formatnya benar.');
    }
  };

  const parseShootDateTime = (dateStr, timeStr) => {
    if (!dateStr) return { date: 0, start: 0, end: 0 };
    const monthMap = { 'januari': 'January', 'februari': 'February', 'maret': 'March', 'april': 'April', 'mei': 'May', 'juni': 'June', 'juli': 'July', 'agustus': 'August', 'september': 'September', 'oktober': 'October', 'november': 'November', 'desember': 'December' };
    let parsedDateStr = dateStr.toLowerCase();
    Object.keys(monthMap).forEach(idMonth => { parsedDateStr = parsedDateStr.replace(new RegExp(idMonth, 'g'), monthMap[idMonth]); });
    const d = new Date(parsedDateStr);
    if (isNaN(d.getTime())) return { date: 0, start: 0, end: 0 };
    let start = 0, end = 0;
    if (timeStr) {
      let cleanTime = timeStr.replace(/WIB|WITA|WIT/gi, '').trim().replace(/\./g, ':');
      if (cleanTime.includes('-')) {
        const parts = cleanTime.split('-');
        const ds = new Date(parsedDateStr + ' ' + parts[0].trim());
        const de = new Date(parsedDateStr + ' ' + parts[1].trim());
        start = isNaN(ds.getTime()) ? 0 : ds.getTime();
        end = isNaN(de.getTime()) ? 0 : de.getTime();
      } else {
        const ds = new Date(parsedDateStr + ' ' + cleanTime);
        start = isNaN(ds.getTime()) ? 0 : ds.getTime();
        end = start + (2 * 60 * 60 * 1000);
      }
    }
    return { date: d.setHours(0,0,0,0), start, end };
  };

  const handleSaveFinance = async () => {
    const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    let formattedDate = editShootDate;
    if (editShootDate && editShootDate.includes('-')) {
      const d = new Date(editShootDate);
      if (!isNaN(d.getTime())) {
        formattedDate = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
      }
    }
    const formattedTime = `${editStartTime} - ${editEndTime}`;

    const newTiming = parseShootDateTime(formattedDate, formattedTime);
    if (newTiming.date !== 0 && newTiming.start !== 0) {
      const existingProjects = await getProjects();
      const overlaps = existingProjects.filter(p => {
        if (p.id === id) return false;
        const pTiming = parseShootDateTime(p.shootDate, p.shootTime);
        if (pTiming.date !== newTiming.date) return false;
        if (pTiming.start === 0 || pTiming.end === 0) return false;
        return (newTiming.start < pTiming.end && newTiming.end > pTiming.start);
      });

      if (overlaps.length > 0) {
        const confirmMsg = `PERINGATAN BENTROK JADWAL!\n\nJadwal ini bentrok dengan klien berikut:\n` + 
          overlaps.map(o => `- ${o.clientName} (${o.shootTime})`).join('\n') + 
          `\n\nApakah Anda tetap ingin menyimpan jadwal ini?`;
        const result = await Swal.fire({ text: confirmMsg, showCancelButton: true, confirmButtonText: 'Ya, Simpan', cancelButtonText: 'Batal' });
        if (!result.isConfirmed) {
          return;
        }
      }
    }

    let payload = { 
      dpAmount: editDpAmount, 
      clientName: editClientName,
      photoType: editPhotoType,
      whatsapp: editWhatsapp,
      lunasAmount: editLunasAmount,
      lunasDate: editLunasDate,
      shootDate: formattedDate,
      shootTime: formattedTime
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
          shootDate: formattedDate,
          shootTime: formattedTime,
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
          shootDate: formattedDate,
          shootTime: formattedTime,
          whatsapp: editWhatsapp
        });
      }
      setIsEditingFinance(false);
    } else {
      Swal.fire("Gagal memperbarui info project.");
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
      Swal.fire('Terjadi kesalahan saat mengunduh ZIP. Pastikan koneksi stabil.');
    }
    
    setDownloadingZip(false);
  };

  const handleDeleteProject = async () => {
    const result = await Swal.fire({ title: 'PERINGATAN', text: `Apakah Anda yakin ingin menghapus project "${project.clientName}" secara permanen? Tindakan ini tidak dapat dibatalkan!`, icon: 'warning', showCancelButton: true, confirmButtonText: 'Ya, Hapus', cancelButtonText: 'Batal', confirmButtonColor: '#d33' });
    if (result.isConfirmed) {
      const success = await deleteProject(id);
      if (success) {
        Swal.fire("Project berhasil dihapus.");
        router.push('/admin');
      } else {
        Swal.fire("Gagal menghapus project.");
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
                      <option value="Foto Studio">Foto Studio</option>
                      <option value="Foto Group">Foto Group</option>
                      <option value="Foto Produk">Foto Produk</option>
                      <option value="Event Birthday">Event Birthday</option>
                      <option value="Birthday Photoshoot">Birthday Photoshoot</option>
                      <option value="Event / Dokumentasi">Event / Dokumentasi</option>
                      <option value="Wedding">Wedding</option>
                      <option value="Engagement">Engagement</option>
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

                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.85rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Tanggal</label>
                    <input 
                      type="date" 
                      value={editShootDate}
                      onChange={(e) => setEditShootDate(e.target.value)}
                      className="input-field"
                      style={{ padding: '8px' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.85rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Mulai</label>
                    <input 
                      type="time" 
                      value={editStartTime}
                      onChange={(e) => setEditStartTime(e.target.value)}
                      className="input-field"
                      style={{ padding: '8px' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.85rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Selesai</label>
                    <input 
                      type="time" 
                      value={editEndTime}
                      onChange={(e) => setEditEndTime(e.target.value)}
                      className="input-field"
                      style={{ padding: '8px' }}
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
                    <span>Pelunasan {project.lunasDate ? `(${new Date(project.lunasDate).toLocaleDateString('id-ID', {day: '2-digit', month:'2-digit', year:'numeric'}).split('/').join('-')})` : ''}:</span>
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

                {status !== 'Lunas' && (
                  <a href={`/admin/client/${id}/invoice?type=invoice`} target="_blank" rel="noopener noreferrer" style={{ flex: 1 }}>
                    <button className="btn-primary" style={{ width: '100%', fontSize: '0.85rem', padding: '10px 8px', backgroundColor: '#2563eb' }}>📄 Cetak Invoice (Web)</button>
                  </a>
                )}
                
                {status !== 'Lunas' && (
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

        {/* Link Original (Multi Sessions) */}
        <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px dashed var(--border-color)', background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Link Folder Original (Sesi)</h3>
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
          
          <button 
            onClick={handleSaveGDriveLink}
            disabled={savingLink}
            className="btn-primary" 
            style={{ width: '100%', marginTop: '8px' }}
          >
            {savingLink ? 'Menyimpan...' : 'Simpan Perubahan Sesi'}
          </button>
        </div>

        {/* Input GDrive Link Hasil Edit */}
        <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid var(--border-color)', marginTop: '24px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '600', marginBottom: '4px', color: '#111827' }}>Folder Hasil Foto Edit</h3>
          <p style={{ fontSize: '0.85rem', marginBottom: '12px', color: '#4b5563' }}>
            Masukkan link folder berisi foto yang SUDAH SELESAI DIEDIT untuk diunduh klien.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input 
                type="url" 
                value={gdriveEditedLink} 
                onChange={(e) => setGdriveEditedLink(e.target.value)} 
                className="input-field" 
                placeholder="https://drive.google.com/drive/folders/..." 
                style={{ flex: 1, width: '100%' }} 
              />
              {project.gdriveEditedLink && (
                <button 
                  onClick={async () => {
                    const result = await Swal.fire({ text: "Yakin ingin menghapus link folder hasil edit ini?", showCancelButton: true, confirmButtonText: 'Ya, Hapus', cancelButtonText: 'Batal', confirmButtonColor: '#d33' });
                    if (result.isConfirmed) {
                      handleSaveGDriveEditedLink('');
                    }
                  }}
                  disabled={savingEditedLink}
                  style={{ padding: '10px 12px', backgroundColor: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                  title="Hapus Link Hasil Edit"
                >
                  🗑️
                </button>
              )}
            </div>
            <button className="btn-primary" onClick={() => handleSaveGDriveEditedLink(gdriveEditedLink)} disabled={savingEditedLink || (!gdriveEditedLink && !project.gdriveEditedLink)} style={{ width: '100%', backgroundColor: '#059669' }}>
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
                  Swal.fire('Link disalin!');
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
                Swal.fire('Link Invoice disalin!');
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
            </h2>
            
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                {[...project.selectedPhotos].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map((photoName, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#374151', padding: '8px 12px', backgroundColor: '#ffffff', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <span style={{ color: '#9ca3af', width: '24px' }}>{i + 1}.</span>
                    <span style={{ wordBreak: 'break-all', fontWeight: '500' }}>{photoName}</span>
                  </div>
                ))}
              </div>
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
