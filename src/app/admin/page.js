'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import NewClientModal from '@/components/NewClientModal';
import { getProjects } from '@/lib/projectService';

export default function AdminDashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    const data = await getProjects();
    const parseShootDateTime = (dateStr, timeStr) => {
      if (!dateStr) return 0;
      const monthMap = {
        'januari': 'January', 'februari': 'February', 'maret': 'March', 'april': 'April',
        'mei': 'May', 'juni': 'June', 'juli': 'July', 'agustus': 'August',
        'september': 'September', 'oktober': 'October', 'november': 'November', 'desember': 'December'
      };
      let parsedDateStr = dateStr.toLowerCase();
      Object.keys(monthMap).forEach(idMonth => {
        parsedDateStr = parsedDateStr.replace(new RegExp(idMonth, "g"), monthMap[idMonth]);
      });
      
      if (timeStr) {
        let cleanTime = timeStr.replace(/WIB|WITA|WIT/gi, '').trim();
        // If range (e.g. "9.00-10.00"), take the first one
        cleanTime = cleanTime.split('-')[0].trim();
        // Replace dot with colon for valid JS Date parsing
        cleanTime = cleanTime.replace(/\./g, ':');
        parsedDateStr += ` ${cleanTime}`;
      }
      
      const d = new Date(parsedDateStr);
      if (isNaN(d.getTime())) return 0;
      return d.getTime();
    };

    const sortedData = [...data].sort((a, b) => {
      const timeA = parseShootDateTime(a.shootDate, a.shootTime) || (a.createdAt?.seconds * 1000) || 0;
      const timeB = parseShootDateTime(b.shootDate, b.shootTime) || (b.createdAt?.seconds * 1000) || 0;
      return timeB - timeA;
    });
    setProjects(sortedData);
    setLoading(false);
  };

  useEffect(() => {
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
      
      // Jika sudah ada link gdrive original, berarti pemotretan sudah selesai
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
        <button onClick={() => setShowModal(true)} className="btn-primary" style={{ padding: '10px 24px', fontSize: '1rem', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>+ Klien Baru</button>
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
                  <div style={{ color: '#92400e', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.05em' }}>
                    {p.shootDate} {p.shootTime && `• ${p.shootTime}`}
                  </div>
                  <strong style={{ display: 'block', color: '#111827', fontSize: '1rem', marginBottom: '2px' }}>{p.clientName}</strong>
                  <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>{p.photoType}</span>
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
            const isFinished = (p) => p.gdriveEditedLink && p.gdriveEditedLink.trim() !== '';
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const parseIndonesianDate = (dateStr) => {
              if (!dateStr) return new Date(0);
              const months = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
              const parts = dateStr.split(' ');
              if (parts.length === 3) {
                const day = parseInt(parts[0]);
                const monthIdx = months.indexOf(parts[1].toUpperCase());
                const year = parseInt(parts[2]);
                if (!isNaN(day) && monthIdx !== -1 && !isNaN(year)) {
                  return new Date(year, monthIdx, day);
                }
              }
              // Fallback for valid non-Indonesian dates or invalid dates
              const fallback = new Date(dateStr);
              return isNaN(fallback.getTime()) ? new Date(0) : fallback;
            };

            const getSortValue = (p) => {
              const d = parseIndonesianDate(p.shootDate);
              if (isNaN(d.getTime())) return 0;
              let timeOffset = 0;
              if (p.shootTime) {
                const timeStr = p.shootTime.split('-')[0].trim().replace(/\./g, ':').replace(/WIB|WITA|WIT/gi, '');
                const [hours, minutes] = timeStr.split(':');
                if (!isNaN(parseInt(hours)) && !isNaN(parseInt(minutes))) {
                  timeOffset = (parseInt(hours) * 60 + parseInt(minutes)) * 60 * 1000;
                }
              }
              return d.getTime() + timeOffset;
            };

            const sortedProjects = [...projects].sort((a, b) => getSortValue(a) - getSortValue(b));
            const sortedProjectsDesc = [...projects].sort((a, b) => getSortValue(b) - getSortValue(a));

            const upcomingProjects = sortedProjects.filter(p => !isFinished(p) && parseIndonesianDate(p.shootDate) > today);
            const progressProjects = sortedProjectsDesc.filter(p => !isFinished(p) && parseIndonesianDate(p.shootDate) <= today);
            const completedProjects = sortedProjectsDesc.filter(p => isFinished(p));

            const renderProjectCard = (project) => {
              const statusColor = project.paymentStatus === 'Lunas' ? '#dcfce3' : project.paymentStatus === 'DP' ? '#fef3c7' : '#fee2e2';
              const statusTextColor = project.paymentStatus === 'Lunas' ? '#166534' : project.paymentStatus === 'DP' ? '#92400e' : '#991b1b';
              return (
                <Link key={project.id} href={`/admin/client/${project.id}`}>
                  <div className="glass-panel animate-fade-in" style={{ padding: '20px', cursor: 'pointer', transition: 'transform 0.2s', ':hover': { transform: 'translateY(-4px)' } }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                      <div>
                        {project.shootDate && (
                          <div style={{ color: '#4f46e5', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.05em' }}>
                            {project.shootDate} {project.shootTime && `• ${project.shootTime}`}
                          </div>
                        )}
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '6px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', color: '#111827' }}>
                          {project.clientName}
                        </h3>
                        <div style={{ color: '#6b7280', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span>{project.photoType}</span>
                          <div>
                            {(() => {
                              if (project.gdriveEditedLink) {
                                return <span style={{ fontSize: '0.8rem', backgroundColor: '#dcfce3', color: '#166534', padding: '4px 10px', borderRadius: '12px', fontWeight: '500', display: 'inline-block' }}>✅ Selesai (Foto Terkirim)</span>;
                              }
                              if (project.selectedPhotos && project.selectedPhotos.length > 0) {
                                return <span style={{ fontSize: '0.8rem', backgroundColor: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: '12px', fontWeight: '500', display: 'inline-block' }}>⏳ Belum Upload Edit</span>;
                              }
                              if (project.gdriveLink || (project.sessions && project.sessions.length > 0)) {
                                return <span style={{ fontSize: '0.8rem', backgroundColor: '#fee2e2', color: '#991b1b', padding: '4px 10px', borderRadius: '12px', fontWeight: '500', display: 'inline-block' }}>📸 Belum Pilih Foto</span>;
                              }
                              return <span style={{ fontSize: '0.8rem', backgroundColor: '#f3f4f6', color: '#374151', padding: '4px 10px', borderRadius: '12px', fontWeight: '500', display: 'inline-block' }}>📤 Belum Upload Original</span>;
                            })()}
                          </div>
                          {project.selectedPhotos && project.selectedPhotos.length > 0 && (
                            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#4f46e5' }}>
                              {project.selectedPhotos.length} Foto Terpilih
                            </span>
                          )}
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
                {upcomingProjects.length > 0 && (
                  <div style={{ marginBottom: '40px' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>Yang Akan Datang</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                      {upcomingProjects.map(renderProjectCard)}
                    </div>
                  </div>
                )}

                {progressProjects.length > 0 && (
                  <div style={{ marginBottom: '40px' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>Sedang Berjalan</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                      {progressProjects.map(renderProjectCard)}
                    </div>
                  </div>
                )}
                
                {completedProjects.length > 0 && (
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>Selesai (Foto Terkirim)</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                      {completedProjects.map(renderProjectCard)}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </>
      )}

      {showModal && (
        <NewClientModal 
          onClose={() => setShowModal(false)} 
          onSuccess={() => {
            setShowModal(false);
            fetchProjects();
          }} 
        />
      )}
    </main>
  );
}
