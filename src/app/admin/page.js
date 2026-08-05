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

  return (
    <main style={{ padding: '20px 16px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: '700' }}>Dashboard Admin</h1>
        <Link href="/admin/new" style={{ width: '100%' }}>
          <button className="btn-primary" style={{ width: '100%', maxWidth: '200px' }}>+ Klien Baru</button>
        </Link>
      </div>

      {loading ? (
        <p>Loading projects...</p>
      ) : projects.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>Belum ada project klien.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {projects.map((project) => {
             const statusColor = project.paymentStatus === 'Lunas' ? '#dcfce3' : project.paymentStatus === 'DP' ? '#fef3c7' : '#fee2e2';
             const statusTextColor = project.paymentStatus === 'Lunas' ? '#166534' : project.paymentStatus === 'DP' ? '#92400e' : '#991b1b';
             return (
            <Link key={project.id} href={`/admin/client/${project.id}`}>
              <div className="glass-panel animate-fade-in" style={{ padding: '20px', cursor: 'pointer', transition: 'transform 0.2s', ':hover': { transform: 'translateY(-4px)' } }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '8px' }}>{project.clientName}</h3>
                    <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '4px' }}>
                      {project.photoType} &bull; {project.shootDate}
                    </p>
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
            )
          })}
        </div>
      )}
    </main>
  );
}
