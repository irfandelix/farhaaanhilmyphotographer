import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/auth';

export async function middleware(req) {
  const authToken = req.cookies.get(ADMIN_COOKIE_NAME)?.value;

  if (await verifyAdminToken(authToken)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL('/', req.url));
}

export const config = {
  matcher: ['/admin/:path*'],
};
