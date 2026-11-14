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
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-mist-200 border-t-sea-600" />
          <p className="text-sm text-mist-500">Checking your session</p>
        </div>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
