'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProject, getProjects } from '@/lib/projectService';

export default function NewClientModal({ onClose, onSuccess }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    clientName: '',
    whatsapp: '',
    photoType: 'Foto Produk',
    shootDate: '',
    startTime: '',
    endTime: '',
    dpAmount: '',
    paymentAmount: '', 
    description: '',   
    paymentStatus: 'Belum Bayar'
  });
  
  const [items, setItems] = useState([{ name: '', qty: 1, price: '' }]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'dpAmount' || name === 'paymentAmount') {
      const rawValue = value.replace(/\D/g, '');
      setFormData({ ...formData, [name]: rawValue });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    if (field === 'qty' || field === 'price') {
      newItems[index][field] = value.replace(/\D/g, '');
    } else {
      newItems[index][field] = value;
    }
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { name: '', qty: 1, price: '' }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    }
  };

  const totalPaymentAmount = items.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.price || 0)), 0);

  const parseShootDateTime = (dateStr, timeStr) => {
    if (!dateStr) return { date: 0, start: 0, end: 0 };
    const monthMap = {
      'januari': 'January', 'februari': 'February', 'maret': 'March', 'april': 'April',
      'mei': 'May', 'juni': 'June', 'juli': 'July', 'agustus': 'August',
      'september': 'September', 'oktober': 'October', 'november': 'November', 'desember': 'December'
    };
    let parsedDateStr = dateStr.toLowerCase();
    Object.keys(monthMap).forEach(idMonth => {
      parsedDateStr = parsedDateStr.replace(new RegExp(idMonth, 'g'), monthMap[idMonth]);
    });
    
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
        end = start + (2 * 60 * 60 * 1000); // assume 2 hours if no end
      }
    }
    return { date: d.setHours(0,0,0,0), start, end };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const d = new Date(formData.shootDate);
    const formattedDate = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    const formattedTime = `${formData.startTime} - ${formData.endTime}`;

    const newTiming = parseShootDateTime(formattedDate, formattedTime);
    if (newTiming.date !== 0 && newTiming.start !== 0) {
      const existingProjects = await getProjects();
      const overlaps = existingProjects.filter(p => {
        const pTiming = parseShootDateTime(p.shootDate, p.shootTime);
        if (pTiming.date !== newTiming.date) return false;
        if (pTiming.start === 0 || pTiming.end === 0) return false;
        return (newTiming.start < pTiming.end && newTiming.end > pTiming.start);
      });

      if (overlaps.length > 0) {
        const confirmMsg = `PERINGATAN BENTROK JADWAL!\n\nJadwal ini bentrok dengan klien berikut:\n` + 
          overlaps.map(o => `- ${o.clientName} (${o.shootTime})`).join('\n') + 
          `\n\nApakah Anda tetap ingin menyimpan jadwal ini?`;
        if (!window.confirm(confirmMsg)) {
          setLoading(false);
          return;
        }
      }
    }

    let payload = { 
      ...formData,
      shootDate: formattedDate,
      shootTime: formattedTime
    };
    delete payload.startTime;
    delete payload.endTime;
    
    if (formData.photoType === 'Foto Produk') {
      payload.items = items.filter(item => item.name && item.price);
      payload.paymentAmount = totalPaymentAmount;
    } else {
      payload.items = []; // Reset items if not Foto Produk
    }
    
    const result = await createProject(payload);
    
    if (result.success) {
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } else {
      alert("Gagal membuat proyek: " + result.error);
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="glass-panel" style={{ padding: '24px 16px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button onClick={onClose} type="button" style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}>&times;</button>
        <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 1.8rem)', fontWeight: '700', marginBottom: '24px' }}>Tambah Klien Baru</h1>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group">
            <label className="form-label">Nama Klien</label>
            <input required type="text" name="clientName" className="input-field" value={formData.clientName} onChange={handleChange} placeholder="Masukkan nama klien" />
          </div>

          <div className="form-group">
            <label className="form-label">Nomor WhatsApp (Cth: 081234567890)</label>
            <input type="text" name="whatsapp" className="input-field" value={formData.whatsapp} onChange={handleChange} placeholder="Opsional: untuk kirim invoice" />
          </div>

          <div className="form-group">
            <label className="form-label">Jenis Foto</label>
            <select name="photoType" className="input-field" value={formData.photoType} onChange={handleChange}>
              <option value="Graduation">Graduation</option>
              <option value="Foto Studio">Foto Studio</option>
              <option value="Foto Group">Foto Group</option>
              <option value="Foto Produk">Foto Produk</option>
              <option value="Event / Dokumentasi">Event / Dokumentasi</option>
              <option value="Wedding">Wedding</option>
              <option value="Engagement">Engagement</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>

          {formData.photoType === 'Foto Produk' ? (
            <div className="form-group" style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <label className="form-label" style={{ marginBottom: '16px', borderBottom: '1px solid #d1d5db', paddingBottom: '8px' }}>Rincian Layanan / Produk</label>
              
              {items.map((item, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'flex-start' }}>
                  <div style={{ flex: 3 }}>
                    <input required type="text" placeholder="Nama Layanan (Cth: Baju Merah)" className="input-field" value={item.name} onChange={(e) => handleItemChange(index, 'name', e.target.value)} style={{ padding: '8px' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <input required type="text" placeholder="Qty" className="input-field" value={item.qty} onChange={(e) => handleItemChange(index, 'qty', e.target.value)} style={{ padding: '8px' }} />
                  </div>
                  <div style={{ flex: 2 }}>
                    <input required type="text" placeholder="Harga Satuan" className="input-field" value={item.price ? Number(item.price).toLocaleString('id-ID') : ''} onChange={(e) => handleItemChange(index, 'price', e.target.value)} style={{ padding: '8px' }} />
                  </div>
                  <button type="button" onClick={() => removeItem(index)} className="btn-secondary" style={{ padding: '8px', color: '#dc2626', borderColor: '#fca5a5' }} disabled={items.length === 1}>
                    X
                  </button>
                </div>
              ))}
              
              <button type="button" onClick={addItem} className="btn-secondary" style={{ width: '100%', padding: '8px', marginTop: '8px', fontSize: '0.9rem' }}>
                + Tambah Baris Item
              </button>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Keterangan / Detail Paket (Akan tampil di Invoice)</label>
              <textarea 
                name="description" 
                className="input-field" 
                value={formData.description} 
                onChange={handleChange} 
                placeholder="Contoh: Paket Wedding Silver + Album Fisik 20 Halaman"
                style={{ minHeight: '80px', resize: 'vertical' }}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Tanggal Pemotretan</label>
            <input required type="date" name="shootDate" className="input-field" value={formData.shootDate} onChange={handleChange} />
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Jam Mulai</label>
              <input required type="time" name="startTime" className="input-field" value={formData.startTime} onChange={handleChange} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Jam Selesai</label>
              <input required type="time" name="endTime" className="input-field" value={formData.endTime} onChange={handleChange} />
            </div>
          </div>

          {formData.photoType === 'Foto Produk' ? (
            <div className="form-group">
              <label className="form-label">Total Pembayaran (Auto)</label>
              <div style={{ background: '#e5e7eb', padding: '12px', borderRadius: '8px', fontWeight: '700', fontSize: '1.2rem' }}>
                Rp {totalPaymentAmount.toLocaleString('id-ID')}
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Total Pembayaran (Rp)</label>
              <input 
                required 
                type="text" 
                name="paymentAmount" 
                className="input-field" 
                value={formData.paymentAmount ? Number(formData.paymentAmount).toLocaleString('id-ID') : ''} 
                onChange={handleChange} 
                placeholder="Contoh: 1.500.000" 
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Jumlah Uang Muka / DP (Rp)</label>
            <input 
              type="text" 
              name="dpAmount" 
              className="input-field" 
              value={formData.dpAmount ? Number(formData.dpAmount).toLocaleString('id-ID') : ''} 
              onChange={handleChange} 
              placeholder="Kosongkan jika tidak ada DP" 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Status Pembayaran</label>
            <select name="paymentStatus" className="input-field" value={formData.paymentStatus} onChange={handleChange}>
              <option value="Belum Bayar">Belum Bayar</option>
              <option value="DP">DP</option>
              <option value="Lunas">Lunas</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Batal</button>
            <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 2 }}>
              {loading ? 'Menyimpan...' : 'Simpan Klien'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
