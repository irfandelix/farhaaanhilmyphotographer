import { cookies } from 'next/headers';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/auth';
import HeaderClient from '@/components/HeaderClient';

export default async function Header() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const isAdmin = await verifyAdminToken(token);

  return <HeaderClient isAdmin={isAdmin} />;
}
