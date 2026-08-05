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
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        router.push('/admin');
      } else {
        setError(data.message || 'Login gagal');
      }
    } catch (err) {
      setError('Terjadi kesalahan sistem');
    }
    
    setLoading(false);
  };

  return (
    <main className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 84px)', padding: '20px' }}>
      <div className="glass-panel" style={{ padding: '40px', maxWidth: '500px', textAlign: 'center', width: '100%' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '16px', color: '#111827' }}>
          Client Photo Selector
        </h1>
        <p style={{ fontSize: '1.1rem', color: '#4b5563', marginBottom: '32px', lineHeight: '1.6' }}>
          Platform eksklusif untuk fotografer. Kelola project, pantau status pembayaran, dan biarkan klien Anda memilih foto dengan pengalaman yang memukau.
        </p>
        
        {!showLogin ? (
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button className="btn-primary" onClick={() => setShowLogin(true)} style={{ width: '100%' }}>
              Masuk sebagai Admin
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="animate-fade-in" style={{ textAlign: 'left', background: 'rgba(255,255,255,0.5)', padding: '24px', borderRadius: '12px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>Login Admin</h2>
            
            {error && (
              <div style={{ padding: '10px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '16px', fontSize: '0.9rem' }}>
                {error}
              </div>
            )}
            
            <div className="form-group">
              <label className="form-label">Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field" 
                required 
                autoFocus
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label">PIN / Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field" 
                required 
              />
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowLogin(false)} style={{ flex: 1 }}>
                Batal
              </button>
              <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>
                {loading ? 'Masuk...' : 'Login'}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
