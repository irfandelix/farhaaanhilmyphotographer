import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_MAX_AGE, ADMIN_COOKIE_NAME, createAdminToken } from '@/lib/auth';

export async function POST(req) {
  try {
    const { username, password } = await req.json();

    const adminUser = process.env.ADMIN_USERNAME;
    const adminPwd = process.env.ADMIN_PASSWORD;

    if (!adminUser || !adminPwd) {
      return NextResponse.json(
        { success: false, message: 'Konfigurasi akun admin belum diatur di server' },
        { status: 500 }
      );
    }

    if (username === adminUser && password === adminPwd) {
      const token = await createAdminToken();
      if (!token) {
        return NextResponse.json(
          { success: false, message: 'Konfigurasi sesi server tidak valid' },
          { status: 500 }
        );
      }

      const response = NextResponse.json({ success: true });

      response.cookies.set({
        name: ADMIN_COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: ADMIN_COOKIE_MAX_AGE,
      });

      return response;
    }

    return NextResponse.json({ success: false, message: 'Username atau Password salah' }, { status: 401 });
  } catch {
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
