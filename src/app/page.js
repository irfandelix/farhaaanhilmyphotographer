'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push('/admin');
      } else {
        setError(data.message || 'Login gagal');
      }
    } catch {
      setError('Terjadi kesalahan sistem');
    }

    setLoading(false);
  };

  return (
    <main
      className="animate-fade-in"
      style={{
        minHeight: 'calc(100vh - 84px)',
        display: 'grid',
        placeItems: 'center',
        padding: '32px 20px',
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: '920px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          background: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '14px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--primary)',
            color: '#ffffff',
            padding: '44px 36px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '32px',
            borderBottom: '4px solid var(--accent)',
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-display), Georgia, serif',
                fontSize: 'clamp(2.25rem, 4vw, 3.1rem)',
                fontWeight: '700',
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
                marginBottom: '16px',
              }}
            >
              FARHAAANHILMY Studio
            </h1>
            <p
              style={{
                fontSize: '1rem',
                color: '#d8d5ea',
                lineHeight: 1.65,
                maxWidth: '34ch',
              }}
            >
              Portal kerja fotografer untuk mengelola jadwal sesi, tagihan klien, dan kurasi foto hasil pemotretan.
            </p>
          </div>

          <div
            style={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: '0.8rem',
              color: '#b8b3d6',
              borderTop: '1px solid rgba(255,255,255,0.14)',
              paddingTop: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <span>YOGYAKARTA</span>
            <span style={{ color: 'var(--accent)' }}>CLIENT PHOTO SELECTOR</span>
          </div>
        </div>

        <div
          style={{
            padding: '44px 36px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          {!showLogin ? (
            <div>
              <h2
                style={{
                  fontSize: '1.35rem',
                  fontWeight: '700',
                  color: 'var(--text-primary)',
                  marginBottom: '10px',
                }}
              >
                Akses Studio
              </h2>
              <p
                style={{
                  fontSize: '0.95rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  marginBottom: '28px',
                }}
              >
                Klien dapat langsung membuka tautan galeri pribadi yang dikirimkan oleh admin. Untuk mengelola proyek, masuk sebagai admin.
              </p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setShowLogin(true)}
                style={{ width: '100%' }}
              >
                Masuk sebagai Admin
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="animate-fade-in">
              <h2
                style={{
                  fontSize: '1.35rem',
                  fontWeight: '700',
                  marginBottom: '20px',
                  color: 'var(--text-primary)',
                }}
              >
                Login Admin
              </h2>

              {error && (
                <div
                  role="alert"
                  style={{
                    padding: '10px 12px',
                    background: '#fee2e2',
                    color: '#991b1b',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                  }}
                >
                  {error}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="admin-username" className="form-label">
                  Username
                </label>
                <input
                  id="admin-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-field"
                  autoComplete="username"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label htmlFor="admin-password" className="form-label">
                  PIN / Password
                </label>
                <input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  autoComplete="current-password"
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowLogin(false)}
                  style={{ flex: 1 }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                  style={{ flex: 1 }}
                >
                  {loading ? 'Memverifikasi...' : 'Masuk'}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
