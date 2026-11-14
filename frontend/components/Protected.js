'use client';

/**
 * Client-side route guard for the authenticated area.
 * Redirects unauthenticated visitors to /login and blocks rendering until
 * the session is resolved (no protected content flash).
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import AppShell from './AppShell';

export default function Protected({ children }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  if (status !== 'authenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-3">
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="text-sm text-slate-500">Loading your session…</p>
        </div>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
