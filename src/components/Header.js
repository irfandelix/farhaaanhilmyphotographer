import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
  return (
    <header className="no-print" style={{
      backgroundColor: 'var(--primary)',
      padding: '16px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      borderBottom: '4px solid var(--accent)'
    }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
        <div style={{ background: 'white', borderRadius: '8px', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Image src="/logo.png" alt="Logo" width={36} height={36} style={{ borderRadius: '4px' }} />
        </div>
        <span style={{ fontSize: '1.4rem', fontWeight: '800', color: 'white', letterSpacing: '1.5px' }}>
          FARHAAAN<span style={{ color: 'var(--accent)' }}>HILMY</span>
        </span>
      </Link>
    </header>
  );
}
