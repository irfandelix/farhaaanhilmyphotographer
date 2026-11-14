'use client';
import Swal from 'sweetalert2';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CustomDatePicker from '@/components/CustomDatePicker';
import { getProjectById, updatePaymentStatus, updateGDriveLink, updateGDriveEditedLink, updateProjectFinancials, updateGDriveSessions, deleteProject, getProjects, toggleMultiSelector, unlockClientSelection, updateMaxSelections } from '@/lib/projectService';

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
  const [editDpDate, setEditDpDate] = useState('');
  const [editPaymentAmount, setEditPaymentAmount] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editPhotoType, setEditPhotoType] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editShootDate, setEditShootDate] = useState('');
  const [editShootTitle, setEditShootTitle] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [additionalSchedules, setAdditionalSchedules] = useState([]);
  
  // GDrive Link State
  const [savingLink, setSavingLink] = useState(false);
  const [sessions, setSessions] = useState([]);
  
  const [gdriveEditedLink, setGdriveEditedLink] = useState('');
  const [savingEditedLink, setSavingEditedLink] = useState(false);

  const [editLunasAmount, setEditLunasAmount] = useState('');
  const [editLunasDate, setEditLunasDate] = useState('');
  const [editPaymentScheme, setEditPaymentScheme] = useState('dp');
  const [togglingMulti, setTogglingMulti] = useState(false);
  const [selectorFilter, setSelectorFilter] = useState('all');
  const [maxSelectionsInput, setMaxSelectionsInput] = useState('');
  const [savingMaxSelections, setSavingMaxSelections] = useState(false);

  const handleSaveMaxSelections = async (overrideValue = null) => {
    if (!project || savingMaxSelections) return;
    const rawVal = overrideValue !== null ? overrideValue : maxSelectionsInput;
    const parsed = Math.max(0, Math.floor(Number(rawVal || 0))) || 0;
    setSavingMaxSelections(true);
    const res = await updateMaxSelections(id, parsed);
    setSavingMaxSelections(false);
    if (res?.success) {
      setProject((prev) => ({ ...prev, maxSelections: res.maxSelections }));
      setMaxSelectionsInput(res.maxSelections > 0 ? String(res.maxSelections) : '');
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: res.maxSelections > 0
          ? `Batas pilihan diatur: maksimal ${res.maxSelections} foto`
          : 'Batas pilihan dihapus (bebas)',
        showConfirmButton: false,
        timer: 2200,
      });
    } else {
      Swal.fire('Gagal', res?.error || 'Tidak dapat menyimpan batas pilihan foto.', 'error');
    }
  };

  const handleToggleMultiSelector = async () => {
    if (!project || togglingMulti) return;
    const nextVal = !project.isMultiSelector;
    setTogglingMulti(true);
    const ok = await toggleMultiSelector(id, nextVal);
    setTogglingMulti(false);
    if (ok) {
      setProject((prev) => ({ ...prev, isMultiSelector: nextVal }));
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: nextVal ? 'Mode Multi-Pemilih diaktifkan' : 'Mode Multi-Pemilih dimatikan',
        showConfirmButton: false,
        timer: 2000,
      });
    } else {
      Swal.fire('Gagal', 'Tidak dapat mengubah mode multi-pemilih.', 'error');
    }
  };

  const handleUnlockSelector = async (selectorName = null) => {
    const ok = await unlockClientSelection(id, selectorName);
    if (ok) {
      setProject((prev) => ({
        ...prev,
        isLocked: false,
        lockedSelectors: selectorName
          ? (prev.lockedSelectors || []).filter((n) => n !== selectorName)
          : [],
      }));
      Swal.fire('Berhasil', selectorName ? `Pilihan ${selectorName} dibuka kembali.` : 'Pilihan foto dibuka kembali.', 'success');
    } else {
      Swal.fire('Gagal', 'Tidak dapat membuka kunci pilihan.', 'error');
    }
  };

  useEffect(() => {
    async function fetchProject() {
      const data = await getProjectById(id);
      if (data) {
        setProject(data);
        setMaxSelectionsInput(data.maxSelections ? String(data.maxSelections) : '');
        setStatus(data.paymentStatus);
        setEditItems(data.items || [{ name: 'Paket Jasa Fotografi', qty: 1, price: data.paymentAmount || 0 }]);
        setEditClientName(data.clientName || '');
        setEditPhotoType(data.photoType || '');
        setEditDpAmount(data.dpAmount || '');
        setEditDpDate(data.dpDate || '');
        setEditPaymentAmount(data.paymentAmount || '');
        setEditDescription(data.description || '');
        setEditWhatsapp(data.whatsapp || '');
        setEditLunasAmount(data.lunasAmount || '');
        setEditLunasDate(data.lunasDate || '');
        setEditPaymentScheme((!data.dpAmount && data.paymentStatus === 'Lunas') ? 'lunas' : 'dp');
        let initDate = '';
        setEditShootTitle(data.shootTitle || '');

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

        if (data.additionalSchedules) {
          // Convert back from formatted string to input values
          const monthMapRev = {'Januari': '01', 'Februari': '02', 'Maret': '03', 'April': '04', 'Mei': '05', 'Juni': '06', 'Juli': '07', 'Agustus': '08', 'September': '09', 'Oktober': '10', 'November': '11', 'Desember': '12'};
          const parsedSch = data.additionalSchedules.map(sch => {
            let d = '';
            if (sch.shootDate) {
              const p = sch.shootDate.split(' ');
              if (p.length === 3) d = `${p[2]}-${monthMapRev[p[1]]}-${p[0].padStart(2, '0')}`;
            }
            let st = '', et = '';
            if (sch.shootTime) {
              if (sch.shootTime.includes('-')) {
                const p = sch.shootTime.split('-');
                st = p[0].trim(); et = p[1].trim();
              } else {
                st = sch.shootTime.trim();
              }
            }
            return { title: sch.title || '', shootDate: d, startTime: st, endTime: et };
          });
          setAdditionalSchedules(parsedSch);
        }
        
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

  const addSchedule = () => setAdditionalSchedules([...additionalSchedules, { shootDate: '', startTime: '', endTime: '', title: '' }]);
  const updateSchedule = (index, field, value) => { const arr = [...additionalSchedules]; arr[index][field] = value; setAdditionalSchedules(arr); };
  const removeSchedule = (index) => { const arr = [...additionalSchedules]; arr.splice(index, 1); setAdditionalSchedules(arr); };

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
    const formattedTime = editEndTime ? `${editStartTime} - ${editEndTime}` : editStartTime;

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

    const formattedAdditionalSchedules = additionalSchedules.map(sch => {
      if (!sch.shootDate) return null;
      const sd = new Date(sch.shootDate);
      const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
      return {
        title: sch.title || 'Acara Tambahan',
        shootDate: `${sd.getDate()} ${months[sd.getMonth()]} ${sd.getFullYear()}`,
        shootTime: sch.endTime ? `${sch.startTime} - ${sch.endTime}` : sch.startTime
      };
    }).filter(Boolean);

    const calcTotal = editPhotoType === 'Foto Produk'
      ? editItems.filter(item => item.name && item.price).reduce((sum, item) => sum + (Number(item.qty) * Number(item.price)), 0)
      : Number(editPaymentAmount || 0);

    const finalDpAmount = editPaymentScheme === 'lunas' ? 0 : editDpAmount;
    const finalDpDate = editPaymentScheme === 'lunas' ? '' : editDpDate;
    const finalLunasAmount = editPaymentScheme === 'lunas' ? (editLunasAmount || calcTotal) : editLunasAmount;

    let payload = { 
      dpAmount: finalDpAmount,
      dpDate: finalDpDate, 
      clientName: editClientName,
      photoType: editPhotoType,
      whatsapp: editWhatsapp,
      lunasAmount: finalLunasAmount,
      lunasDate: editLunasDate,
      shootTitle: editShootTitle,
      shootDate: formattedDate,
      shootTime: formattedTime,
      additionalSchedules: formattedAdditionalSchedules,
      ...(editPaymentScheme === 'lunas' ? { paymentStatus: 'Lunas' } : {})
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
          dpAmount: Number(finalDpAmount),
          dpDate: finalDpDate,
          lunasAmount: Number(finalLunasAmount),
          ...(editPaymentScheme === 'lunas' ? { paymentStatus: 'Lunas' } : {}),
          lunasDate: editLunasDate,
          shootTitle: editShootTitle,
      shootTitle: editShootTitle,
          shootDate: formattedDate,
          shootTime: formattedTime,
          additionalSchedules: additionalSchedules.map(sch => {
            if (!sch.shootDate) return null;
            const sd = new Date(sch.shootDate);
            const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
            return {
              title: sch.title || 'Acara Tambahan',
              shootDate: `${sd.getDate()} ${months[sd.getMonth()]} ${sd.getFullYear()}`,
              shootTime: sch.endTime ? `${sch.startTime} - ${sch.endTime}` : sch.startTime
            };
          }).filter(Boolean),
          whatsapp: editWhatsapp 
        });
      } else {
        setProject({
          ...project,
          clientName: editClientName,
          photoType: editPhotoType,
          paymentAmount: Number(editPaymentAmount),
          description: editDescription,
          dpAmount: Number(finalDpAmount),
          dpDate: finalDpDate,
          lunasAmount: Number(finalLunasAmount),
          ...(editPaymentScheme === 'lunas' ? { paymentStatus: 'Lunas' } : {}),
          lunasDate: editLunasDate,
          shootTitle: editShootTitle,
      shootTitle: editShootTitle,
          shootDate: formattedDate,
          shootTime: formattedTime,
          additionalSchedules: additionalSchedules.map(sch => {
            if (!sch.shootDate) return null;
            const sd = new Date(sch.shootDate);
            const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
            return {
              title: sch.title || 'Acara Tambahan',
              shootDate: `${sd.getDate()} ${months[sd.getMonth()]} ${sd.getFullYear()}`,
              shootTime: sch.endTime ? `${sch.startTime} - ${sch.endTime}` : sch.startTime
            };
          }).filter(Boolean),
          whatsapp: editWhatsapp
        });
      }
      if (editPaymentScheme === 'lunas') { setStatus('Lunas'); setEditDpAmount(''); setEditDpDate(''); setEditLunasAmount(String(finalLunasAmount)); }
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
            <p style={{ color: '#4b5563', fontSize: '0.9rem' }}>{project.photoType} &bull; {project.shootTitle ? <span style={{ fontWeight: '500' }}>{project.shootTitle}: </span> : ''}{project.shootDate} {project.shootTime ? `• ${project.shootTime}` : ''}</p>
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
                      <option value="Foto Wisuda">Foto Wisuda</option>
                      <option value="Foto Studio">Foto Studio</option>
                      <option value="Foto Group">Foto Group</option>
                      <option value="Family Photoshoot">Family Photoshoot</option>
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
                  <label style={{ fontSize: '0.85rem', color: '#4b5563', display: 'block', marginBottom: '6px' }}>Apakah melakukan DP atau langsung Lunas?</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div
                      onClick={() => setEditPaymentScheme('dp')}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: editPaymentScheme === 'dp' ? '2px solid #2563eb' : '1px solid #d1d5db',
                        backgroundColor: editPaymentScheme === 'dp' ? '#eff6ff' : '#ffffff',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: editPaymentScheme === 'dp' ? '600' : '500',
                        color: editPaymentScheme === 'dp' ? '#1d4ed8' : '#374151',
                        userSelect: 'none'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={editPaymentScheme === 'dp'}
                        readOnly
                        style={{ width: '16px', height: '16px', accentColor: '#2563eb', pointerEvents: 'none' }}
                      />
                      <span>Melakukan DP</span>
                    </div>

                    <div
                      onClick={() => {
                        setEditPaymentScheme('lunas');
                        setEditDpAmount('');
                        setEditDpDate('');
                        const totalVal = editPhotoType === 'Foto Produk'
                          ? editItems.filter(item => item.name && item.price).reduce((sum, item) => sum + (Number(item.qty) * Number(item.price)), 0)
                          : editPaymentAmount;
                        if (totalVal) setEditLunasAmount(String(totalVal));
                        setStatus('Lunas');
                      }}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: editPaymentScheme === 'lunas' ? '2px solid #059669' : '1px solid #d1d5db',
                        backgroundColor: editPaymentScheme === 'lunas' ? '#ecfdf5' : '#ffffff',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: editPaymentScheme === 'lunas' ? '600' : '500',
                        color: editPaymentScheme === 'lunas' ? '#047857' : '#374151',
                        userSelect: 'none'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={editPaymentScheme === 'lunas'}
                        readOnly
                        style={{ width: '16px', height: '16px', accentColor: '#059669', pointerEvents: 'none' }}
                      />
                      <span>Langsung Lunas</span>
                    </div>
                  </div>
                </div>

                {editPaymentScheme === 'dp' && (
                  <>
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

                    <div style={{ marginTop: '8px' }}>
                      <label style={{ fontSize: '0.85rem', color: '#4b5563', display: 'block', marginBottom: '4px' }}>Tanggal Pembayaran DP</label>
                      <CustomDatePicker 
                        className="input-field" 
                        value={editDpDate}
                        onChange={(e) => setEditDpDate(e.target.value)}
                        style={{ padding: '8px', width: '100%' }}
                      />
                    </div>
                  </>
                )}
                
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
                  <CustomDatePicker 
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

                <div style={{ marginTop: '12px' }}>
                    <label style={{ fontSize: '0.85rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Nama Acara Utama (Opsional)</label>
                    <input 
                      type="text" 
                      value={editShootTitle}
                      onChange={(e) => setEditShootTitle(e.target.value)}
                      className="input-field"
                      style={{ padding: '8px' }}
                      placeholder="Cth: Akad Nikah"
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.85rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Tanggal</label>
                    <CustomDatePicker 
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
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button 
                      type="button" 
                      onClick={() => { setEditStartTime(''); setEditEndTime(''); }}
                      className="btn-secondary"
                      style={{ padding: '0 12px', height: '44px', minHeight: '44px', color: '#4b5563', display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                      title="Reset Jam"
                    >
                      🔄 Reset
                    </button>
                  </div>
                  </div>
                  {additionalSchedules.map((sch, index) => (
                    <div key={index} style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>Jadwal Tambahan #{index + 1}</label>
                        <button type="button" onClick={() => removeSchedule(index)} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>Hapus</button>
                      </div>
                      <input type="text" className="input-field" style={{ padding: '8px' }} placeholder="Nama Acara (Cth: Resepsi)" value={sch.title} onChange={(e) => updateSchedule(index, 'title', e.target.value)} />
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.85rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Tanggal</label>
                          <CustomDatePicker required className="input-field" style={{ padding: '8px' }} value={sch.shootDate} onChange={(e) => updateSchedule(index, 'shootDate', e.target.value)} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.85rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Mulai</label>
                          <input required type="time" className="input-field" style={{ padding: '8px' }} value={sch.startTime} onChange={(e) => updateSchedule(index, 'startTime', e.target.value)} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.85rem', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Selesai</label>
                          <input type="time" className="input-field" style={{ padding: '8px' }} value={sch.endTime} onChange={(e) => updateSchedule(index, 'endTime', e.target.value)} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                          <button type="button" onClick={() => { updateSchedule(index, 'startTime', ''); updateSchedule(index, 'endTime', ''); }} className="btn-secondary" style={{ padding: '8px', height: '40px', color: '#4b5563' }}>🔄</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={addSchedule} className="btn-secondary" style={{ width: '100%', padding: '8px', marginTop: '8px', fontSize: '0.85rem', borderStyle: 'dashed' }}>
                    + Tambah Tanggal/Sesi Acara
                  </button>
                </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#4b5563' }}>Total Harga:</span>
                  <span style={{ fontWeight: '600' }}>Rp {project.paymentAmount?.toLocaleString('id-ID')}</span>
                </div>
                
                {project.dpAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#166534' }}>
                    <span>Uang Muka (DP) {project.dpDate ? `(${new Date(project.dpDate).toLocaleDateString('id-ID', {day: '2-digit', month: '2-digit', year: 'numeric'}).split('/').join('-')})` : ''}:</span>
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

            {/* Pembatas & Pengaturan Mode Multi-Pemilih */}
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed rgba(22, 101, 52, 0.28)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <div style={{ fontWeight: '600', fontSize: '0.92rem', color: '#14532d', marginBottom: '4px' }}>
                  Mode Multi-Pemilih (Bebas Bentrok)
                </div>
                <div style={{ fontSize: '0.82rem', color: '#374151', lineHeight: 1.5 }}>
                  Aktifkan jika link ini dipakai lebih dari 1 orang secara bersamaan. Setiap orang akan diminta mengisi nama, dan foto yang sudah dipilih tidak dapat dipilih ulang oleh orang lain.
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(project.isMultiSelector)}
                aria-label="Toggle Mode Multi-Pemilih"
                onClick={handleToggleMultiSelector}
                disabled={togglingMulti}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '6px 12px 6px 8px',
                  borderRadius: '999px',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: project.isMultiSelector ? '1.5px solid #16a34a' : '1.5px solid #cbd5e1',
                  cursor: togglingMulti ? 'wait' : 'pointer',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{
                  position: 'relative',
                  width: '44px',
                  height: '24px',
                  borderRadius: '999px',
                  backgroundColor: project.isMultiSelector ? '#16a34a' : '#cbd5e1',
                  transition: 'background-color 0.2s ease',
                  flexShrink: 0
                }}>
                  <span style={{
                    position: 'absolute',
                    top: '2px',
                    left: project.isMultiSelector ? '22px' : '2px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.25)',
                    transition: 'left 0.2s ease'
                  }} />
                </span>
                <span style={{
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  letterSpacing: '0.03em',
                  color: project.isMultiSelector ? '#15803d' : '#64748b',
                  minWidth: '28px',
                  textAlign: 'left'
                }}>
                  {project.isMultiSelector ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>

            {/* Pembatas & Pengaturan Batas Maksimal Pilihan (Mencolok) */}
            <div style={{
              marginTop: '16px',
              padding: '14px 16px',
              borderRadius: '10px',
              backgroundColor: '#fffbeb',
              border: '2px solid #f59e0b',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.12)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🎯 Batas Maksimal Pilihan Foto
                </div>
                <span style={{
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  backgroundColor: Number(project.maxSelections || 0) > 0 ? '#f59e0b' : '#e5e7eb',
                  color: Number(project.maxSelections || 0) > 0 ? '#ffffff' : '#374151',
                }}>
                  {Number(project.maxSelections || 0) > 0
                    ? `Maks. ${project.maxSelections} Foto${project.isMultiSelector ? ' / Orang' : ''}`
                    : 'Tanpa Batas (Bebas)'}
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#78350f', lineHeight: 1.45, marginBottom: '12px' }}>
                {project.isMultiSelector
                  ? 'Mode Multi-Pemilih aktif: batas ini berlaku untuk masing-masing orang (contoh: isi 10 berarti tiap orang boleh pilih maksimal 10 foto). Kosongkan atau isi 0 jika bebas.'
                  : 'Tentukan batas maksimal foto yang boleh dipilih klien (boleh pilih kurang dari batas, tidak bisa lebih). Kosongkan atau isi 0 jika bebas.'}
              </p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="number"
                  min="0"
                  placeholder="Contoh: 20 (0 = bebas)"
                  value={maxSelectionsInput}
                  onChange={(e) => setMaxSelectionsInput(e.target.value)}
                  className="input-field"
                  style={{ flex: '1 1 160px', backgroundColor: '#ffffff', borderColor: '#f59e0b', fontWeight: '600' }}
                />
                <button
                  type="button"
                  onClick={() => handleSaveMaxSelections()}
                  disabled={savingMaxSelections}
                  className="btn-primary"
                  style={{ backgroundColor: '#d97706', border: 'none', padding: '10px 18px', minHeight: '44px', whiteSpace: 'nowrap' }}
                >
                  {savingMaxSelections ? 'Menyimpan...' : 'Simpan Batas'}
                </button>
                {Number(project.maxSelections || 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSaveMaxSelections(0)}
                    disabled={savingMaxSelections}
                    className="btn-secondary"
                    style={{ padding: '10px 14px', minHeight: '44px', whiteSpace: 'nowrap', borderColor: '#fcd34d', color: '#92400e', backgroundColor: '#ffffff' }}
                  >
                    Jadikan Bebas
                  </button>
                )}
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
              {project.isLocked && (
                <button
                  onClick={() => handleUnlockSelector(null)}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                >
                  🔓 Buka Kunci Pilihan
                </button>
              )}
            </div>
          </div>
          {project.isMultiSelector && project.photoSelections && Object.keys(project.photoSelections).length > 0 && (() => {
            const counts = {};
            Object.values(project.photoSelections).forEach((name) => {
              counts[name] = (counts[name] || 0) + 1;
            });
            const lockedList = project.lockedSelectors || [];
            const allSelectors = Array.from(new Set([...Object.keys(counts), ...lockedList]));
            return (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                <button
                  onClick={() => setSelectorFilter('all')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '999px',
                    fontSize: '0.82rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    border: selectorFilter === 'all' ? '1px solid #0f172a' : '1px solid #cbd5e1',
                    backgroundColor: selectorFilter === 'all' ? '#0f172a' : '#ffffff',
                    color: selectorFilter === 'all' ? '#ffffff' : '#334155',
                  }}
                >
                  Semua ({project.selectedPhotos ? project.selectedPhotos.length : 0})
                </button>
                {allSelectors.map((selName) => {
                  const isSelLocked = lockedList.includes(selName);
                  const isActive = selectorFilter === selName;
                  return (
                    <div key={selName} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        onClick={() => setSelectorFilter(selName)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '999px',
                          fontSize: '0.82rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          border: isActive ? '1px solid #0f172a' : '1px solid #cbd5e1',
                          backgroundColor: isActive ? '#0f172a' : '#ffffff',
                          color: isActive ? '#ffffff' : '#334155',
                        }}
                      >
                        {selName} ({counts[selName] || 0}){isSelLocked ? ' 🔒' : ''}
                      </button>
                      {isSelLocked && (
                        <button
                          onClick={() => handleUnlockSelector(selName)}
                          title={`Buka kunci pilihan ${selName}`}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            border: '1px solid #fca5a5',
                            backgroundColor: '#fef2f2',
                            color: '#b91c1c',
                            cursor: 'pointer',
                          }}
                        >
                          Buka
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
          {(!project.selectedPhotos || project.selectedPhotos.length === 0) ? (
            <p style={{ color: '#6b7280' }}>Klien belum memilih foto.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                {[...project.selectedPhotos]
                  .filter((photoName) => {
                    if (!project.isMultiSelector || selectorFilter === 'all') return true;
                    return project.photoSelections?.[photoName] === selectorFilter;
                  })
                  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
                  .map((photoName, i) => {
                    const owner = project.isMultiSelector ? project.photoSelections?.[photoName] : null;
                    return (
                      <div key={photoName} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '0.9rem', color: '#374151', padding: '8px 12px', backgroundColor: '#ffffff', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <span style={{ color: '#9ca3af', width: '24px', flexShrink: 0 }}>{i + 1}.</span>
                          <span style={{ wordBreak: 'break-all', fontWeight: '500' }}>{photoName}</span>
                        </div>
                        {owner && (
                          <span style={{ fontSize: '0.72rem', fontWeight: '600', padding: '2px 8px', borderRadius: '999px', backgroundColor: '#e0f2fe', color: '#0369a1', flexShrink: 0 }}>
                            {owner}
                          </span>
                        )}
                      </div>
                    );
                  })}
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
