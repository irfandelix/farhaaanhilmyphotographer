'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProject } from '@/lib/projectService';

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    clientName: '',
    whatsapp: '',
    photoType: 'Foto Produk',
    shootDate: '',
    shootTime: '',
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let payload = { ...formData };
    
    if (formData.photoType === 'Foto Produk') {
      payload.items = items.filter(item => item.name && item.price);
      payload.paymentAmount = totalPaymentAmount;
    } else {
      payload.items = []; // Reset items if not Foto Produk
    }
    
    const result = await createProject(payload);
    
    if (result.success) {
      router.push('/admin');
    } else {
      alert("Gagal membuat proyek: " + result.error);
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: '20px 16px', maxWidth: '600px', margin: '0 auto' }}>
      <div className="glass-panel" style={{ padding: '24px 16px' }}>
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
              <option value="Foto Produk">Foto Produk</option>
              <option value="Event Birthday">Event Birthday</option>
              <option value="Graduation">Graduation</option>
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

          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Tanggal Pemotretan</label>
              <input required type="text" name="shootDate" className="input-field" value={formData.shootDate} onChange={handleChange} placeholder="Cth: 12 Agustus 2026" />
            </div>
            
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Jam / Sesi</label>
              <input required type="text" name="shootTime" className="input-field" value={formData.shootTime} onChange={handleChange} placeholder="Cth: 14:00 atau Sesi Pagi" />
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
            <button type="button" className="btn-secondary" onClick={() => router.back()} style={{ flex: 1 }}>Batal</button>
            <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 2 }}>
              {loading ? 'Menyimpan...' : 'Simpan Klien'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
