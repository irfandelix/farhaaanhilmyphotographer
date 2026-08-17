'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getProjects } from '@/lib/projectService';

export default function AdminDashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      const data = await getProjects();
      setProjects(data);
      setLoading(false);
    }
    fetchProjects();
  }, []);

  const getUpcomingProjects = (projects) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const monthNames = ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"];
    const currentMonth = monthNames[today.getMonth()];
    const nextMonth = monthNames[(today.getMonth() + 1) % 12];
    
    return projects.filter(p => {
      if (!p.shootDate) return false;
      
      // Jika sudah ada link gdrive mentahan, berarti pemotretan sudah selesai
      const hasLegacyLink = !!p.gdriveLink;
      const hasSessionLink = p.sessions && p.sessions.length > 0 && p.sessions.some(s => s.link);
      if (hasLegacyLink || hasSessionLink) return false;

      // Konversi nama bulan Indonesia ke Inggris agar bisa diparse oleh new Date()
      const monthMap = {
        'januari': 'January', 'februari': 'February', 'maret': 'March', 'april': 'April',
        'mei': 'May', 'juni': 'June', 'juli': 'July', 'agustus': 'August',
        'september': 'September', 'oktober': 'October', 'november': 'November', 'desember': 'December'
      };
      
      let parsedDateStr = p.shootDate;
      Object.keys(monthMap).forEach(idMonth => {
        const regex = new RegExp(idMonth, "gi");
        parsedDateStr = parsedDateStr.replace(regex, monthMap[idMonth]);
      });

      // Coba parse tanggal
      const d = new Date(parsedDateStr);
      if (!isNaN(d.getTime())) {
        const diffTime = d.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        // Tampilkan jika jadwalnya hari ini s.d 14 hari ke depan, atau baru lewat 2 hari tapi belum diupload
        return diffDays >= -2 && diffDays <= 14; 
      }
      
      // Jika format teks ("12-13 Agustus")
      const text = p.shootDate.toLowerCase();
      if (text.includes(currentMonth) || text.includes(nextMonth)) {
         return true;
      }
      
      return false;
    });
  };

  const upcomingProjects = getUpcomingProjects(projects);

  return (
    <main style={{ padding: '20px 16px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: '700' }}>Dashboard Admin</h1>
        <Link href="/admin/new">
          <button className="btn-primary" style={{ padding: '10px 24px', fontSize: '1rem' }}>+ Klien Baru</button>
        </Link>
      </div>

      {!loading && upcomingProjects.length > 0 && (
        <div style={{ marginBottom: '32px', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#92400e', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔔 Pengingat Jadwal Pemotretan Terdekat
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {upcomingProjects.map(p => (
              <div key={`alert-${p.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #fde68a' }}>
                <div>
                  <strong style={{ display: 'block', color: '#111827', fontSize: '1rem' }}>{p.clientName} ({p.photoType})</strong>
                  <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                    Tanggal: {p.shootDate} {p.shootTime && <span style={{ whiteSpace: 'nowrap' }}>&bull; Jam: {p.shootTime}</span>}
                  </span>
                </div>
                <Link href={`/admin/client/${p.id}`}>
                  <button style={{ backgroundColor: '#f59e0b', color: 'white', padding: '6px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600', border: 'none', cursor: 'pointer' }}>
                    Lihat
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <p>Loading projects...</p>
      ) : projects.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>Belum ada project klien.</p>
        </div>
      ) : (
        <>
          {(() => {
            const isFinished = (p) => p.paymentStatus === 'Lunas' || (p.gdriveEditedLink && p.gdriveEditedLink.trim() !== '');
            const progressProjects = projects.filter(p => !isFinished(p));
            const lunasProjects = projects.filter(p => isFinished(p));

            const renderProjectCard = (project) => {
              const statusColor = project.paymentStatus === 'Lunas' ? '#dcfce3' : project.paymentStatus === 'DP' ? '#fef3c7' : '#fee2e2';
              const statusTextColor = project.paymentStatus === 'Lunas' ? '#166534' : project.paymentStatus === 'DP' ? '#92400e' : '#991b1b';
              return (
                <Link key={project.id} href={`/admin/client/${project.id}`}>
                  <div className="glass-panel animate-fade-in" style={{ padding: '20px', cursor: 'pointer', transition: 'transform 0.2s', ':hover': { transform: 'translateY(-4px)' } }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                      <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          {project.clientName}
                          {project.gdriveEditedLink 
                            ? <span style={{ fontSize: '0.8rem', backgroundColor: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '12px', fontWeight: 'normal' }}>✓ Foto Terkirim</span>
                            : <span style={{ fontSize: '0.8rem', backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '12px', fontWeight: 'normal' }}>⏳ Belum Upload Edit</span>
                          }
                        </h3>
                        <div style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span>{project.photoType}</span>
                          <span>Tanggal: {project.shootDate}</span>
                          {project.shootTime && <span>Waktu: {project.shootTime}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                        <span style={{ 
                          padding: '6px 12px', 
                          borderRadius: '20px', 
                          fontSize: '0.85rem', 
                          fontWeight: '500',
                          backgroundColor: statusColor,
                          color: statusTextColor
                        }}>
                          {project.paymentStatus}
                        </span>
                        <span style={{ fontWeight: '600', color: '#111827' }}>
                          Rp {project.paymentAmount.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            };

            return (
              <>
                {progressProjects.length > 0 && (
                  <div style={{ marginBottom: '40px' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>Sedang Berjalan (Progress)</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                      {progressProjects.map(renderProjectCard)}
                    </div>
                  </div>
                )}
                
                {lunasProjects.length > 0 && (
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>Selesai (Lunas / Foto Terkirim)</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                      {lunasProjects.map(renderProjectCard)}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </>
      )}
    </main>
  );
}
