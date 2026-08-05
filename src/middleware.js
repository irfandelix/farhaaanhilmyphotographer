import { NextResponse } from 'next/server';

export function middleware(req) {
  const basicAuth = req.headers.get('authorization');
  
  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    // atob is supported in Edge Runtime
    const [user, pwd] = atob(authValue).split(':');

    // Gunakan variabel environment dari .env.local atau Vercel
    const adminUser = process.env.ADMIN_USERNAME;
    const adminPwd = process.env.ADMIN_PASSWORD;

    if (user === adminUser && pwd === adminPwd) {
      return NextResponse.next();
    }
  }
  
  return new NextResponse('Akses Ditolak: Anda harus login untuk masuk ke halaman Admin.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Area Terkunci - Masukkan Username dan PIN"',
    },
  });
}

// Hanya jalankan middleware ini pada halaman yang berawalan /admin
export const config = {
  matcher: ['/admin/:path*'],
};
