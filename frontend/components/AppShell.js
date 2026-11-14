'use client';

/**
 * App shell: dark petrol sidebar (desktop) + top bar with slide-in mobile drawer.
 * The active route gets a lit indicator bar + tinted pill; the user card sits
 * pinned at the bottom (Geist-style zone ordering).
 */
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Icon, Mark } from './icons';
import { initials, avatarTint } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: Icon.gauge },
  { href: '/doctors', label: 'Doctors', icon: Icon.stethoscope },
  { href: '/patients', label: 'Patients', icon: Icon.users },
];

function Brand({ compact = false }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 px-2">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-sea-500/20 text-sea-200 ring-1 ring-inset ring-sea-300/30">
        <Mark size={compact ? 15 : 17} />
      </span>
      <span className={`font-semibold tracking-tight text-white ${compact ? 'text-sm' : 'text-[15px]'}`}>
        Doctor Tracker
      </span>
    </Link>
  );
}

function NavLinks({ onNavigate, dark = true }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Ico = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`group relative flex items-center gap-3 rounded-[10px] px-3 py-2 text-sm transition duration-150 ${
              active
                ? dark
                  ? 'bg-white/[0.08] font-semibold text-white'
                  : 'bg-sea-50 font-semibold text-sea-800'
                : dark
                  ? 'font-medium text-sea-100/70 hover:bg-white/[0.05] hover:text-white'
                  : 'font-medium text-mist-600 hover:bg-mist-100 hover:text-mist-900'
            }`}
          >
            {/* Active indicator bar */}
            <span
              className={`absolute -left-3 h-5 w-1 rounded-r-full bg-sea-400 transition-all duration-200 ${
                active ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0'
              }`}
            />
            <span className={active ? 'text-sea-300' : dark ? 'text-sea-100/50 group-hover:text-sea-100/80' : 'text-mist-400'}>
              {Ico({ size: 16 })}
            </span>
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
    <div className={`border-t ${compact ? '' : 'mt-auto'} ${compact ? 'border-mist-200' : 'border-white/[0.08]'} pt-3`}>
      <div className="flex items-center gap-2.5 px-2 pb-2">
        <span className={`avatar h-8 w-8 text-xs ${avatarTint(user?.email || 'admin')}`}>{initials(user?.name || 'Admin')}</span>
        <div className="min-w-0">
          <p className={`truncate text-[13px] font-semibold ${compact ? 'text-mist-900' : 'text-white'}`}>{user?.name}</p>
          <p className={`truncate text-[11px] ${compact ? 'text-mist-500' : 'text-sea-100/50'}`}>{user?.email}</p>
        </div>
      </div>
      <button
        onClick={onLogout}
        className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium transition duration-150 ${
          compact
            ? 'text-mist-600 hover:bg-mist-100 hover:text-mist-900'
            : 'text-sea-100/70 hover:bg-white/[0.05] hover:text-white'
        }`}
      >
        <span className={compact ? 'text-mist-400' : 'text-sea-100/50'}>{Icon.logout({ size: 15 })}</span>
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
    <div className="min-h-screen bg-canvas">
      {/* Desktop sidebar: deep petrol, subtle gradient */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-gradient-to-b from-sea-950 to-[#0C1F1E] px-4 py-5 md:flex">
        <div className="mb-8 px-1">
          <Brand />
        </div>

        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-sea-100/40">Workspace</p>
        <NavLinks />

        {/* Ambient footer stats */}
        <div className="mt-auto rounded-xl bg-white/[0.04] p-3 ring-1 ring-inset ring-white/[0.06]">
          <div className="flex items-center gap-2 text-[11px] font-medium text-sea-100/60">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sea-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-sea-400" />
            </span>
            API live · MongoDB Atlas
          </div>
        </div>

        <div className="mt-3">
          <SessionBlock onLogout={handleLogout} />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-mist-200 bg-white/80 px-4 py-3 backdrop-blur-md md:hidden">
        <button
          aria-label="Open navigation"
          onClick={() => setMobileOpen(true)}
          className="rounded-[10px] p-2 text-mist-600 transition hover:bg-mist-100 active:scale-95"
        >
          {Icon.menu({ size: 20 })}
        </button>
        <Brand compact />
        <button
          onClick={handleLogout}
          aria-label="Log out"
          className="rounded-[10px] p-2 text-mist-500 transition hover:bg-mist-100 active:scale-95"
        >
          {Icon.logout({ size: 20 })}
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="anim-fade absolute inset-0 bg-mist-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="anim-drawer absolute inset-y-0 left-0 flex w-64 flex-col border-r border-mist-200 bg-white px-4 py-5 shadow-overlay">
            <div className="mb-6 flex items-center justify-between px-1">
              <Brand compact />
              <button
                aria-label="Close navigation"
                onClick={() => setMobileOpen(false)}
                className="rounded-[10px] p-1.5 text-mist-400 transition hover:bg-mist-100"
              >
                {Icon.close({ size: 16 })}
              </button>
            </div>
            <NavLinks dark={false} onNavigate={() => setMobileOpen(false)} />
            <SessionBlock onLogout={handleLogout} compact />
          </div>
        </div>
      )}

      {/* Page content */}
      <main className="md:pl-60">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
    </div>
  );
}
