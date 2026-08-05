'use client';

import { useState, useEffect, use } from 'react';
import { getProjectById } from '@/lib/projectService';
import { useSearchParams } from 'next/navigation';

export default function InvoicePage({ params }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const searchParams = useSearchParams();
  const type = searchParams.get('type') || 'invoice'; // 'invoice', 'receipt_dp', 'receipt'
  
  useEffect(() => {
    async function load() {
      const data = await getProjectById(id);
      setProject(data);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Memuat Invoice...</div>;
  if (!project) return <div style={{ padding: '40px', textAlign: 'center' }}>Data tidak ditemukan.</div>;

  const total = project.paymentAmount || 0;
  const dp = project.dpAmount || 0;
  const sisa = total - dp;
  
  // Logic Status & Titles
  let invoiceTitle = 'INVOICE';
  let invoiceSubtitle = 'Tagihan Pembayaran';
  let invoiceStatus = 'BELUM LUNAS';
  let statusColor = '#991b1b'; // Red

  if (type === 'receipt_dp') {
    invoiceTitle = 'TANDA TERIMA';
    invoiceSubtitle = 'Uang Muka (DP)';
    invoiceStatus = 'DP DITERIMA';
    statusColor = '#ca8a04'; // Yellow/Orange
  } else if (type === 'receipt') {
    invoiceTitle = 'TANDA TERIMA';
    invoiceSubtitle = 'Pelunasan';
    invoiceStatus = 'LUNAS';
    statusColor = '#166534'; // Green
  }

  const formatRp = (angka) => 'Rp ' + angka.toLocaleString('id-ID');

  const seqStr = String(project.invoiceSeq || 1).padStart(3, '0');
  const invoiceNumber = `INV-${seqStr}`;
  
  const printInvoice = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      
      const element = document.getElementById('invoice-content');
      
      const opt = {
        margin:       10,
        filename:     `${invoiceNumber}_${project.clientName.replace(/\s+/g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Gagal membuat PDF.');
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print { display: none !important; }
          body { background: white; margin: 0; padding: 0; }
          .invoice-container { box-shadow: none !important; border: none !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; padding: 20px !important; }
        }
        body { background: #f3f4f6; }
      `}} />
      
      {/* Action Buttons */}
      <div className="no-print" style={{ display: 'flex', gap: '12px', justifyContent: 'center', margin: '24px auto 0', maxWidth: '800px', padding: '0 20px' }}>
        <button onClick={printInvoice} className="btn-secondary" style={{ padding: '12px 24px', flex: 1, maxWidth: '200px' }}>
          🖨️ Cetak
        </button>
        <button onClick={handleDownloadPDF} className="btn-primary" style={{ padding: '12px 24px', flex: 1, maxWidth: '200px' }}>
          📄 Unduh PDF
        </button>
      </div>

      <main id="invoice-content" className="invoice-container" style={{ 
        maxWidth: '800px', 
        margin: '20px auto', 
        background: 'white', 
        padding: '30px', 
        borderRadius: '8px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        color: '#111827',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e5e7eb', paddingBottom: '24px', marginBottom: '32px' }}>
          <div style={{ textAlign: 'left' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '700', margin: 0, letterSpacing: '1px' }}>FARHAAANHILMY</h2>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: '6px 0 0 0', lineHeight: '1.5' }}>
              Jl. Utama no. 45, Pugeran, Maguwoharjo,<br/>
              Depok, Sleman, Daerah Istimewa Yogyakarta<br/>
              WA: +62 813-2731-9118<br/>
              IG: @farhaaanhilmy
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '800', letterSpacing: '-1px', color: 'var(--primary)', margin: 0 }}>
              {invoiceTitle}
            </h1>
            <p style={{ fontSize: '1.1rem', fontWeight: '600', color: '#4b5563', margin: '4px 0 0 0', textTransform: 'uppercase' }}>
              {invoiceSubtitle}
            </p>
          </div>
        </div>

        {/* Info Box (Sesuai Format DOCX User) */}
        <div style={{ marginBottom: '24px' }}>
          <table style={{ borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '4px 0', width: '160px', color: '#4b5563', fontSize: '1rem' }}>Tanggal Terbit</td>
                <td style={{ padding: '4px 16px 4px 8px', color: '#111827', fontSize: '1rem' }}>:</td>
                <td style={{ padding: '4px 0', fontWeight: '600', fontSize: '1rem' }}>{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0', color: '#4b5563', fontSize: '1rem' }}>Nomor Invoice</td>
                <td style={{ padding: '4px 16px 4px 8px', color: '#111827', fontSize: '1rem' }}>:</td>
                <td style={{ padding: '4px 0', fontWeight: '600', fontSize: '1rem' }}>{invoiceNumber}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0', color: '#4b5563', fontSize: '1rem' }}>Kepada</td>
                <td style={{ padding: '4px 16px 4px 8px', color: '#111827', fontSize: '1rem' }}>:</td>
                <td style={{ padding: '4px 0', fontWeight: '600', fontSize: '1rem' }}>{project.clientName}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0', color: '#4b5563', fontSize: '1rem' }}>Layanan / Kegiatan</td>
                <td style={{ padding: '4px 16px 4px 8px', color: '#111827', fontSize: '1rem' }}>:</td>
                <td style={{ padding: '4px 0', fontWeight: '600', fontSize: '1rem' }}>{project.photoType}</td>
              </tr>
              <tr>
                <td style={{ padding: '4px 0', color: '#4b5563', fontSize: '1rem' }}>Tanggal Pemotretan</td>
                <td style={{ padding: '4px 16px 4px 8px', color: '#111827', fontSize: '1rem' }}>:</td>
                <td style={{ padding: '4px 0', fontWeight: '600', fontSize: '1rem' }}>{project.shootDate}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Detail Pembayaran (Non-Table, Modern Look) */}
        <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '24px', marginBottom: '24px', border: '1px solid #e5e7eb' }}>
          
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: '0 0 20px 0', color: '#111827', borderBottom: '2px solid #e5e7eb', paddingBottom: '12px' }}>
            Detail Layanan
          </h3>

          {/* Rincian Paket */}
          <div style={{ marginBottom: '24px' }}>
            {project.items && project.items.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {project.items.map((item, index) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, paddingRight: '20px' }}>
                      <p style={{ fontSize: '1.05rem', fontWeight: '700', color: '#111827', margin: '0 0 4px 0' }}>{item.name}</p>
                      <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: 0 }}>
                        {item.qty} x {formatRp(item.price)}
                      </p>
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: '600', color: '#111827', whiteSpace: 'nowrap' }}>
                      {formatRp(Number(item.qty) * Number(item.price))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, paddingRight: '20px' }}>
                  <p style={{ fontSize: '1.1rem', fontWeight: '700', color: '#111827', margin: '0 0 6px 0' }}>{project.photoType}</p>
                  <p style={{ fontSize: '0.95rem', color: '#4b5563', margin: 0, lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                    {project.description || "Paket Jasa Fotografi"}
                  </p>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#111827', whiteSpace: 'nowrap' }}>
                  {formatRp(total)}
                </div>
              </div>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px dashed #cbd5e1', margin: '0 0 24px 0' }} />

          {/* Hitung-hitungan (DP & Sisa) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            
            {/* Bank Info ditaruh di dalam card detail */}
            <div style={{ width: '45%' }}>
              <p style={{ fontWeight: '700', marginBottom: '8px', fontSize: '0.95rem', color: '#111827' }}>Metode Pembayaran:</p>
              <div style={{ background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <p style={{ margin: 0, color: '#4b5563', fontSize: '0.9rem', lineHeight: '1.6' }}>
                  Bank Syariah Indonesia (BSI)<br/>
                  <strong style={{ fontSize: '1.1rem', color: '#111827' }}>7198894383</strong><br/>
                  a.n. Farhan Hilmy
                </p>
              </div>
            </div>

            {/* Total */}
            <div style={{ width: '45%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: '#6b7280' }}>Total Harga:</span>
                <span style={{ fontWeight: '600' }}>{formatRp(total)}</span>
              </div>
              
              {type !== 'invoice' && dp > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: '#6b7280' }}>Telah dibayar (DP):</span>
                  <span style={{ fontWeight: '600', color: '#166534' }}>- {formatRp(dp)}</span>
                </div>
              )}

              {type === 'receipt' && sisa > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: '#6b7280' }}>Telah dibayar (Pelunasan):</span>
                  <span style={{ fontWeight: '600', color: '#166534' }}>- {formatRp(sisa)}</span>
                </div>
              )}

              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                marginTop: '16px', 
                paddingTop: '16px', 
                borderTop: '2px solid #111827',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#111827', whiteSpace: 'nowrap' }}>
                  {type === 'receipt_dp' ? 'SISA TAGIHAN:' : 'TOTAL TAGIHAN:'}
                </span>
                <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary)', whiteSpace: 'nowrap', textAlign: 'right' }}>
                  {type === 'receipt' ? formatRp(0) : formatRp(sisa)}
                </span>
              </div>

              <div style={{ marginTop: '24px', textAlign: 'right' }}>
                <span style={{ 
                  display: 'inline-block',
                  padding: '8px 24px', 
                  border: `3px solid ${statusColor}`,
                  color: statusColor,
                  fontWeight: '800',
                  fontSize: '1.3rem',
                  letterSpacing: '2px',
                  borderRadius: '4px',
                  transform: 'rotate(-3deg)'
                }}>
                  {invoiceStatus}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '32px', textAlign: 'center', color: '#6b7280', fontSize: '0.9rem', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
          Terima kasih atas kepercayaan Anda menggunakan jasa kami. <br/>
          Semoga hasil foto kami memberikan kenangan yang indah untuk Anda.
        </div>

      </main>
    </>
  );
}
