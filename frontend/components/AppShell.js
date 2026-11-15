'use client';

/**
 * Application shell.
 *
 * Matches the reference chrome: wordmark on the canvas, a dark pill holding the
 * product tabs (active tab in lime), a row of quick links, and the account at
 * the far right. On mobile the tabs collapse into a sheet.
 */
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '@/lib/auth-context';
import { Icon, Mark } from './icons';
import { springs } from './motion-kit';
import { initials } from '@/lib/utils';
import { prefetchApi } from '@/lib/useApi';
import ThemeToggle from './ThemeToggle';

/** Page-1 payload for each destination, warmed on hover so the click lands on data. */
const PREFETCH = {
  '/dashboard': ['/api/analytics/dashboard', { months: 12 }],
  '/doctors': [
    '/api/doctors',
    {
      page: 1,
      limit: 10,
      search: '',
      specialization: '',
      hospital: '',
      status: '',
      createdFrom: '',
      createdTo: '',
      sort: 'newest',
    },
  ],
  '/patients': [
    '/api/patients',
    {
      page: 1,
      limit: 10,
      search: '',
      condition: '',
      status: '',
      doctor: '',
      createdFrom: '',
      createdTo: '',
      sort: 'newest',
    },
  ],
};

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/doctors', label: 'Doctors' },
  { href: '/patients', label: 'Patients' },
];

function Brand() {
  return (
    <Link href="/dashboard" className="flex shrink-0 items-center gap-2" aria-label="Doctor Tracker home">
      <Mark size={17} className="text-ink" />
      <span className="text-[13.5px] font-medium tracking-[-0.01em] text-ink">Doctor Tracker</span>
    </Link>
  );
}

function NavTabs({ vertical = false, onNavigate }) {
  const pathname = usePathname();
  return (
    <nav className={vertical ? 'flex flex-col gap-1' : 'hidden items-center gap-0.5 md:flex'} aria-label="Main">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            onMouseEnter={() => {
              const target = PREFETCH[item.href];
              if (target) prefetchApi(target[0], target[1]);
            }}
            onFocus={() => {
              const target = PREFETCH[item.href];
              if (target) prefetchApi(target[0], target[1]);
            }}
            aria-current={active ? 'page' : undefined}
            className={`relative flex items-center gap-1.5 rounded-full text-[12px] font-medium transition-colors duration-150 ${
              vertical ? 'h-9 px-3' : 'h-7 px-3'
            } ${
              active
                ? vertical
                  ? 'bg-accent text-accent-ink'
                  : 'text-accent-ink'
                : 'text-white/70 hover:text-white'
            }`}
          >
            {active && !vertical && (
              <motion.span
                layoutId="nav-pill"
                transition={springs.layout}
                className="absolute inset-0 rounded-full bg-accent"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {active && <span className="h-1 w-1 rounded-full bg-current" />}
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 items-center gap-1.5 rounded-full p-0.5 transition-colors duration-150 hover:bg-ink/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-3 text-[11px] font-semibold text-ink ring-1 ring-line">
          {initials(user?.name || 'Admin')}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={springs.snappy}
            className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-pop"
          >
            <div className="px-2.5 py-2">
              <p className="truncate text-[13px] font-semibold text-ink">{user?.name || 'Portal Admin'}</p>
              <p className="truncate text-[11.5px] text-ink-3">{user?.email}</p>
            </div>
            <div className="divider my-1" />
            <button
              type="button"
              role="menuitem"
              onClick={onLogout}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              {Icon.logout({ size: 15 })}
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);

  const signOut = async () => {
    setDrawer(false);
    await logout();
    router.replace('/login');
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="z-40 shrink-0 px-4 pt-4 sm:px-6 sm:pt-5">
        <div className="mx-auto flex max-w-[1500px] items-center gap-3 md:grid md:grid-cols-[1fr_auto_1fr]">
          <Brand />

          {/* Primary navigation sits dead centre of the bar. */}
          <div className="hidden h-11 items-center rounded-full bg-[rgb(var(--nav))] p-1 shadow-soft md:flex md:justify-self-center">
            <NavTabs />
          </div>

          <div className="ml-auto flex items-center gap-1 md:ml-0 md:justify-self-end">
            <ThemeToggle />
            <UserMenu user={user} onLogout={signOut} />
            <button
              type="button"
              onClick={() => setDrawer(true)}
              aria-label="Open menu"
              className="icon-btn md:hidden"
            >
              {Icon.menu({ size: 18 })}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-[1500px] flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
        {children}
      </main>

      <AnimatePresence>
        {drawer && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDrawer(false)}
              className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
              aria-hidden
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={springs.soft}
              className="absolute right-0 top-0 flex h-full w-[280px] flex-col gap-4 border-l border-line bg-surface p-5"
              aria-label="Menu"
            >
              <div className="flex items-center justify-between">
                <Brand />
                <button type="button" onClick={() => setDrawer(false)} aria-label="Close menu" className="icon-btn h-9 w-9">
                  {Icon.close({ size: 16 })}
                </button>
              </div>
              <div className="divider" />
              <div className="flex flex-col gap-1 rounded-2xl bg-[rgb(var(--nav))] p-2">
                <NavTabs vertical onNavigate={() => setDrawer(false)} />
              </div>
              <div className="mt-auto">
                <div className="mb-3 flex items-center gap-2.5 rounded-2xl border border-line bg-surface-2 p-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-3 text-[11px] font-semibold text-ink">
                    {initials(user?.name || 'Admin')}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-ink">{user?.name}</p>
                    <p className="truncate text-[11px] text-ink-3">{user?.email}</p>
                  </div>
                </div>
                <button type="button" onClick={signOut} className="btn-secondary w-full">
                  {Icon.logout({ size: 15 })} Sign out
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
