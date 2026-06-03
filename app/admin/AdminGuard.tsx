'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '@/components/admin/Sidebar';
import { getToken, removeToken } from '@/lib/auth';
import { verifyToken } from '@/lib/api';
import { FiLoader } from 'react-icons/fi';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (pathname === '/admin') {
      setChecking(false);
      return;
    }
    const token = getToken();
    if (!token) {
      router.replace('/admin');
      return;
    }
    verifyToken(token)
      .then(() => setChecking(false))
      .catch(() => { removeToken(); router.replace('/admin'); });
  }, [pathname, router]);

  if (pathname === '/admin') return <>{children}</>;

  if (checking) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <FiLoader className="animate-spin text-[#E50914]" size={36} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#141414]">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
