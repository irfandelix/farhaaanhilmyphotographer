import Link from 'next/link';

export default function Home() {
  return (
    <main className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
      <div className="glass-panel" style={{ padding: '40px', maxWidth: '600px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '16px', color: '#111827' }}>
          Client Photo Selector
        </h1>
        <p style={{ fontSize: '1.1rem', color: '#4b5563', marginBottom: '32px', lineHeight: '1.6' }}>
          Platform eksklusif untuk fotografer. Kelola project, pantau status pembayaran, dan biarkan klien Anda memilih foto dengan pengalaman yang memukau.
        </p>
        
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <Link href="/admin">
            <button className="btn-primary">Masuk sebagai Admin</button>
          </Link>
        </div>
      </div>
    </main>
  );
}
