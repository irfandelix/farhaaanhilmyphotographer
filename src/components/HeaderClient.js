'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import LogoutButton from '@/components/LogoutButton';

export default function HeaderClient({ isAdmin }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');
  const showLogout = isAdmin && isAdminRoute;
  const targetHref = isAdmin && isAdminRoute ? '/admin' : '/';

  return (
    <header
      className="no-print"
      style={{
        backgroundColor: 'var(--primary)',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: showLogout ? 'space-between' : 'center',
        gap: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        borderBottom: '4px solid var(--accent)',
      }}
    >
      <Link
        href={targetHref}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          textDecoration: 'none',
          minWidth: 0,
        }}
      >
        <div
          style={{
            background: 'white',
            borderRadius: '8px',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Image src="/logo.png" alt="Logo" width={32} height={32} style={{ borderRadius: '4px' }} />
        </div>
        <span
          style={{
            fontSize: 'clamp(1rem, 4vw, 1.4rem)',
            fontWeight: '800',
            color: 'white',
            letterSpacing: '1px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          FARHAAAN<span style={{ color: 'var(--accent)' }}>HILMY</span>
        </span>
      </Link>
      {showLogout && <LogoutButton />}
    </header>
  );
}
