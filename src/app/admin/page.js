'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import NewClientModal from '@/components/NewClientModal';
import { CalendarIcon } from '@/components/Icons';
import { getProjects } from '@/lib/projectService';
import { MONTH_NAMES_ID, parseIndonesianDateMs, parseShootDateTime } from '@/lib/dateUtils';

export default function AdminDashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const sortProjects = (data) => {
    return [...data].sort((a, b) => {
      const timeA = parseShootDateTime(a.shootDate, a.shootTime) || (a.createdAt?.seconds * 1000) || 0;
      const timeB = parseShootDateTime(b.shootDate, b.shootTime) || (b.createdAt?.seconds * 1000) || 0;
      return timeB - timeA;
    });
  };

  const fetchProjects = async () => {
    setLoading(true);
    const data = await getProjects();
    setProjects(sortProjects(data));
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    async function init() {
      const data = await getProjects();
      if (!active) return;
      setProjects(sortProjects(data));
      setLoading(false);
    }
    init();
    return () => {
      active = false;
    };
  }, []);

  const getUpcomingProjects = (projects) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const currentMonth = MONTH_NAMES_ID[today.getMonth()];
    const nextMonth = MONTH_NAMES_ID[(today.getMonth() + 1) % 12];

    const isUpcoming = (dateStr) => {
      if (!dateStr) return false;
      const t = parseIndonesianDateMs(dateStr);
      if (t !== 9999999999999) {
        const diffDays = Math.ceil((t - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= -2 && diffDays <= 14; 
      }
      const text = dateStr.toLowerCase();
      if (text.includes(currentMonth) || text.includes(nextMonth)) {
         return true;
      }
      return false;
    };

    const upcomingList = [];

    projects.forEach(p => {
      const hasLegacyLink = !!p.gdriveLink;
      const hasSessionLink = p.sessions && p.sessions.length > 0 && p.sessions.some(s => s.link);
      if (hasLegacyLink || hasSessionLink) return;

      if (isUpcoming(p.shootDate)) {
        upcomingList.push({
          ...p,
          scheduleTitle: p.shootTitle || '',
          scheduleDate: p.shootDate,
          scheduleTime: p.shootTime,
          isPrimary: true,
          uniqueKey: `${p.id}-primary`
        });
      }

      if (p.additionalSchedules && p.additionalSchedules.length > 0) {
        p.additionalSchedules.forEach((sch, index) => {
          if (isUpcoming(sch.shootDate)) {
            upcomingList.push({
              ...p,
              scheduleTitle: sch.title || `Tambahan #${index + 1}`,
              scheduleDate: sch.shootDate,
              scheduleTime: sch.shootTime,
              isPrimary: false,
              uniqueKey: `${p.id}-sch-${index}`
            });
          }
        });
      }
    });

    upcomingList.sort((a, b) => parseDateToMs(a.scheduleDate) - parseDateToMs(b.scheduleDate));
    return upcomingList;
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
            <CalendarIcon size={18} /> Pengingat Jadwal Pemotretan Terdekat
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {upcomingProjects.map(p => (
              <div key={p.uniqueKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #fde68a' }}>
                <div>
                  <div style={{ color: '#92400e', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.05em' }}>
                    {p.scheduleTitle ? <span style={{ color: '#92400e' }}>{p.scheduleTitle}: </span> : ''}{p.scheduleDate} {p.scheduleTime && `• ${p.scheduleTime}`}
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
        <div className="studio-card" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Belum ada project klien.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama klien atau jenis foto..."
              aria-label="Cari project klien"
              className="input-field"
              style={{ maxWidth: '420px' }}
            />
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'Semua', count: projects.length },
                {
                  id: 'need_selection',
                  label: 'Belum Pilih Foto',
                  count: projects.filter(p => !(p.gdriveEditedLink && p.gdriveEditedLink.trim() !== '') && !(p.selectedPhotos && p.selectedPhotos.length > 0) && (p.gdriveLink || (p.sessions && p.sessions.length > 0))).length,
                },
                {
                  id: 'need_edit',
                  label: 'Siap Diedit',
                  count: projects.filter(p => !(p.gdriveEditedLink && p.gdriveEditedLink.trim() !== '') && p.selectedPhotos && p.selectedPhotos.length > 0).length,
                },
                {
                  id: 'unpaid',
                  label: 'Belum Lunas',
                  count: projects.filter(p => p.paymentStatus !== 'Lunas').length,
                },
              ].map((tab) => {
                const active = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      border: active ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                      backgroundColor: active ? 'var(--primary)' : 'var(--surface-color)',
                      color: active ? '#ffffff' : 'var(--text-secondary)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>{tab.label}</span>
                    <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: '0.78rem', opacity: active ? 0.9 : 0.75 }}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {(() => {
            const isFinished = (p) => p.gdriveEditedLink && p.gdriveEditedLink.trim() !== '';

            const normalizedQuery = searchQuery.trim().toLowerCase();
            const filteredProjects = projects.filter((p) => {
              if (normalizedQuery) {
                const nameMatch = (p.clientName || '').toLowerCase().includes(normalizedQuery);
                const typeMatch = (p.photoType || '').toLowerCase().includes(normalizedQuery);
                if (!nameMatch && !typeMatch) return false;
              }
              if (statusFilter === 'need_selection') {
                return !isFinished(p) && !(p.selectedPhotos && p.selectedPhotos.length > 0) && (p.gdriveLink || (p.sessions && p.sessions.length > 0));
              }
              if (statusFilter === 'need_edit') {
                return !isFinished(p) && p.selectedPhotos && p.selectedPhotos.length > 0;
              }
              if (statusFilter === 'unpaid') {
                return p.paymentStatus !== 'Lunas';
              }
              return true;
            });
            
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

            const sortedProjects = [...filteredProjects].sort((a, b) => getSortValue(a) - getSortValue(b));
            const sortedProjectsDesc = [...filteredProjects].sort((a, b) => getSortValue(b) - getSortValue(a));

            const upcomingProjects = sortedProjects.filter(p => !isFinished(p) && parseIndonesianDate(p.shootDate) > today);
            const progressProjects = sortedProjectsDesc.filter(p => !isFinished(p) && parseIndonesianDate(p.shootDate) <= today);
            const completedProjects = sortedProjectsDesc.filter(p => isFinished(p));

            const formatProjectDates = (project) => {
              if (!project.shootDate) return null;
              
              const schedules = [];
              if (project.shootDate) schedules.push(project.shootDate);
              if (project.additionalSchedules && project.additionalSchedules.length > 0) {
                project.additionalSchedules.forEach(s => {
                  if (s.shootDate) schedules.push(s.shootDate);
                });
              }

              if (schedules.length === 1) {
                if (filteredProjects.length === 0) {
              return (
                <div className="studio-card" style={{ padding: '40px 24px', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '16px' }}>
                    Tidak ada project yang cocok dengan pencarian atau filter ini.
                  </p>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                    }}
                  >
                    Reset Filter
                  </button>
                </div>
              );
            }

            return (
                  <>
                    {project.shootTitle ? <span style={{ color: '#374151' }}>{project.shootTitle}: </span> : ''}
                    {project.shootDate} {project.shootTime && `• ${project.shootTime}`}
                  </>
                );
              }

              const parsed = schedules.map(d => {
                const parts = d.split(' ');
                if (parts.length === 3) {
                  return { day: parseInt(parts[0]), month: parts[1], year: parseInt(parts[2]), original: d };
                }
                return { original: d };
              });

              if (parsed.some(p => !p.day)) {
                 return <>{schedules.length} Sesi Terjadwal</>;
              }
              
              const grouped = {};
              parsed.forEach(p => {
                const key = `${p.month} ${p.year}`;
                if (!grouped[key]) grouped[key] = [];
                if (!grouped[key].includes(p.day)) grouped[key].push(p.day);
              });
              
              const resultStrs = [];
              for (const key in grouped) {
                 const days = grouped[key].sort((a,b) => a - b);
                 const ranges = [];
                 let currentStart = days[0];
                 let currentEnd = days[0];
                 
                 for (let i = 1; i < days.length; i++) {
                   if (days[i] === currentEnd + 1) {
                     currentEnd = days[i];
                   } else if (days[i] > currentEnd + 1) {
                     if (currentStart === currentEnd) ranges.push(`${currentStart}`);
                     else if (currentEnd === currentStart + 1) ranges.push(`${currentStart}, ${currentEnd}`);
                     else ranges.push(`${currentStart}-${currentEnd}`);
                     
                     currentStart = days[i];
                     currentEnd = days[i];
                   }
                 }
                 if (currentStart === currentEnd) ranges.push(`${currentStart}`);
                 else if (currentEnd === currentStart + 1) ranges.push(`${currentStart}, ${currentEnd}`);
                 else ranges.push(`${currentStart}-${currentEnd}`);
                 
                 resultStrs.push(`${ranges.join(', ')} ${key}`);
              }
              
              if (filteredProjects.length === 0) {
              return (
                <div className="studio-card" style={{ padding: '40px 24px', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '16px' }}>
                    Tidak ada project yang cocok dengan pencarian atau filter ini.
                  </p>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                    }}
                  >
                    Reset Filter
                  </button>
                </div>
              );
            }

            return (
                 <>
                   {project.shootTitle ? <span style={{ color: '#374151' }}>{project.shootTitle} (+{schedules.length - 1}): </span> : ''}
                   {resultStrs.join(' & ')}
                 </>
              );
            };

            const renderProjectCard = (project) => {
              const statusColor = project.paymentStatus === 'Lunas' ? '#dcfce3' : project.paymentStatus === 'DP' ? '#fef3c7' : '#fee2e2';
              const statusTextColor = project.paymentStatus === 'Lunas' ? '#166534' : project.paymentStatus === 'DP' ? '#92400e' : '#991b1b';
              if (filteredProjects.length === 0) {
              return (
                <div className="studio-card" style={{ padding: '40px 24px', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '16px' }}>
                    Tidak ada project yang cocok dengan pencarian atau filter ini.
                  </p>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                    }}
                  >
                    Reset Filter
                  </button>
                </div>
              );
            }

            return (
                <Link key={project.id} href={`/admin/client/${project.id}`} style={{ display: 'block' }}>
                  <div className="studio-card studio-card-interactive animate-fade-in" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                      <div>
                        {project.shootDate && (
                          <div style={{ color: 'var(--accent-hover)', fontFamily: 'var(--font-mono), monospace', fontSize: '0.78rem', fontWeight: '600', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>
                            {formatProjectDates(project)}
                          </div>
                        )}
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '6px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', color: 'var(--text-primary)' }}>
                          {project.clientName}
                        </h3>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span>{project.photoType}</span>
                          <div>
                            {(() => {
                              const badgeBase = {
                                fontSize: '0.78rem',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontWeight: '600',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                              };
                              if (project.gdriveEditedLink) {
                                if (filteredProjects.length === 0) {
              return (
                <div className="studio-card" style={{ padding: '40px 24px', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '16px' }}>
                    Tidak ada project yang cocok dengan pencarian atau filter ini.
                  </p>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                    }}
                  >
                    Reset Filter
                  </button>
                </div>
              );
            }

            return (
                                  <span style={{ ...badgeBase, backgroundColor: '#dcfce3', color: '#166534' }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                                    Selesai (Foto Terkirim)
                                  </span>
                                );
                              }
                              if (project.selectedPhotos && project.selectedPhotos.length > 0) {
                                if (filteredProjects.length === 0) {
              return (
                <div className="studio-card" style={{ padding: '40px 24px', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '16px' }}>
                    Tidak ada project yang cocok dengan pencarian atau filter ini.
                  </p>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                    }}
                  >
                    Reset Filter
                  </button>
                </div>
              );
            }

            return (
                                  <span style={{ ...badgeBase, backgroundColor: '#fef3c7', color: '#92400e' }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                    Belum Upload Edit
                                  </span>
                                );
                              }
                              if (project.gdriveLink || (project.sessions && project.sessions.length > 0)) {
                                if (filteredProjects.length === 0) {
              return (
                <div className="studio-card" style={{ padding: '40px 24px', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '16px' }}>
                    Tidak ada project yang cocok dengan pencarian atau filter ini.
                  </p>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                    }}
                  >
                    Reset Filter
                  </button>
                </div>
              );
            }

            return (
                                  <span style={{ ...badgeBase, backgroundColor: '#fee2e2', color: '#991b1b' }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                                    Belum Pilih Foto
                                  </span>
                                );
                              }
                              if (filteredProjects.length === 0) {
              return (
                <div className="studio-card" style={{ padding: '40px 24px', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '16px' }}>
                    Tidak ada project yang cocok dengan pencarian atau filter ini.
                  </p>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                    }}
                  >
                    Reset Filter
                  </button>
                </div>
              );
            }

            return (
                                <span style={{ ...badgeBase, backgroundColor: 'var(--surface-muted)', color: 'var(--text-secondary)' }}>
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                  Belum Upload Original
                                </span>
                              );
                            })()}
                          </div>
                          {project.selectedPhotos && project.selectedPhotos.length > 0 && (
                            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--primary)', fontFamily: 'var(--font-mono), monospace' }}>
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

            if (filteredProjects.length === 0) {
              return (
                <div className="studio-card" style={{ padding: '40px 24px', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '16px' }}>
                    Tidak ada project yang cocok dengan pencarian atau filter ini.
                  </p>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                    }}
                  >
                    Reset Filter
                  </button>
                </div>
              );
            }

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
