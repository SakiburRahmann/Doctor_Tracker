'use client';

/**
 * App shell: sidebar navigation (desktop) + top bar with mobile drawer.
 * Persistent across the authenticated area for smooth navigation between
 * Dashboard / Doctors / Patients, with the active route highlighted.
 */
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Icon, Mark } from './icons';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: Icon.gauge },
  { href: '/doctors', label: 'Doctors', icon: Icon.stethoscope },
  { href: '/patients', label: 'Patients', icon: Icon.users },
];

function Brand({ compact = false }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 px-2">
      <span className="text-spruce-700">
        <Mark size={compact ? 16 : 20} />
      </span>
      <span className={`font-semibold tracking-tight text-ink-900 ${compact ? 'text-sm' : 'text-base'}`}>
        Doctor Tracker
      </span>
    </Link>
  );
}

function NavLinks({ onNavigate }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Ico = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-2.5 rounded-[3px] px-3 py-2 text-sm transition ${
              active
                ? 'bg-spruce-50 font-semibold text-spruce-800'
                : 'font-medium text-ink-700 hover:bg-sand-100 hover:text-ink-900'
            }`}
          >
            <span className={active ? 'text-spruce-700' : 'text-sand-500'}>{Ico({ size: 15 })}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SessionBlock({ onLogout, compact = false }) {
  const { user } = useAuth();
  return (
    <div className={`border-t border-hairline pt-3 ${compact ? '' : 'mt-auto'}`}>
      <div className="mb-2 px-2">
        <p className="text-sm font-medium text-ink-800">{user?.name}</p>
        <p className="truncate text-xs text-sand-500">{user?.email}</p>
      </div>
      <button
        onClick={onLogout}
        className="flex w-full items-center gap-2.5 rounded-[3px] px-3 py-2 text-sm font-medium text-ink-600 transition hover:bg-sand-100 hover:text-ink-900"
      >
        <span className="text-sand-500">{Icon.logout({ size: 15 })}</span>
        Log out
      </button>
    </div>
  );
}

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <div className="min-h-screen bg-paper">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-hairline bg-sand-50 px-3 py-5 md:flex">
        <div className="mb-6">
          <Brand />
        </div>
        <NavLinks />
        <SessionBlock onLogout={handleLogout} />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-hairline bg-sand-50 px-4 py-3 md:hidden">
        <button
          aria-label="Open navigation"
          onClick={() => setMobileOpen(true)}
          className="rounded-[3px] p-2 text-ink-700 hover:bg-sand-100"
        >
          {Icon.menu({ size: 20 })}
        </button>
        <Brand compact />
        <button onClick={handleLogout} aria-label="Log out" className="rounded-[3px] p-2 text-ink-600 hover:bg-sand-100">
          {Icon.logout({ size: 20 })}
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-60 flex-col bg-sand-50 px-3 py-5 shadow-raised">
            <div className="mb-6 flex items-center justify-between px-2">
              <Brand compact />
              <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="rounded-[3px] p-1.5 text-sand-500 hover:bg-sand-100">
                {Icon.close({ size: 16 })}
              </button>
            </div>
            <NavLinks onNavigate={() => setMobileOpen(false)} />
            <SessionBlock onLogout={handleLogout} compact />
          </div>
        </div>
      )}

      {/* Page content */}
      <main className="md:pl-56">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
    </div>
  );
}
