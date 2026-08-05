import { NextResponse } from 'next/server';

export function middleware(req) {
  // Cek apakah ada cookie sesi admin
  const authToken = req.cookies.get('admin_token')?.value;

  if (authToken === 'authenticated') {
    return NextResponse.next();
  }
  
  // Jika tidak ada atau salah, kembalikan ke halaman depan (login)
  return NextResponse.redirect(new URL('/', req.url));
}

// Hanya jalankan middleware ini pada halaman yang berawalan /admin
export const config = {
  matcher: ['/admin/:path*'],
};
