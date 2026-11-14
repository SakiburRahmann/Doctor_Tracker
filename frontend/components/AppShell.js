'use client';

/**
 * App shell: dark petrol sidebar with a layoutId-morphing active pill
 * (the highlight physically slides between nav items), aurora + beam ambience,
 * and a spring drawer on mobile.
 */
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '@/lib/auth-context';
import { Icon, Mark } from './icons';
import { springs } from './motion-kit';
import { initials, avatarTint } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: Icon.gauge },
  { href: '/doctors', label: 'Doctors', icon: Icon.stethoscope },
  { href: '/patients', label: 'Patients', icon: Icon.users },
];

function Brand({ compact = false, dark = true }) {
  return (
    <Link href="/dashboard" className="group flex items-center gap-2.5 px-2">
      <motion.span
        whileHover={{ rotate: 90, scale: 1.08 }}
        transition={springs.bouncy}
        className={`grid h-9 w-9 place-items-center rounded-xl text-sea-200 ring-1 ring-inset ring-sea-300/30 ${
          dark ? 'bg-sea-500/20' : 'bg-sea-700 text-white ring-sea-600/40'
        }`}
      >
        <Mark size={compact ? 15 : 17} />
      </motion.span>
      <span className={`font-semibold tracking-tight ${dark ? 'text-white' : 'text-mist-900'} ${compact ? 'text-sm' : 'text-[15px]'}`}>
        Doctor Tracker
      </span>
    </Link>
  );
}

/**
 * Nav with layoutId: the active pill is ONE element that morphs position
 * between items (FLIP-style shared layout animation).
 */
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
            className={`relative flex items-center gap-3 rounded-[10px] px-3 py-2 text-sm outline-none transition-colors duration-150 ${
              active
                ? dark
                  ? 'font-semibold text-white'
                  : 'font-semibold text-sea-800'
                : dark
                  ? 'font-medium text-sea-100/70 hover:text-white'
                  : 'font-medium text-mist-600 hover:text-mist-900'
            }`}
          >
            {active && (
              <motion.span
                layoutId={dark ? 'nav-pill' : 'nav-pill-mobile'}
                transition={springs.layout}
                className={`absolute inset-0 rounded-[10px] ${dark ? 'bg-white/[0.08]' : 'bg-sea-50'}`}
              />
            )}
            {/* Indicator bar morphs between items together with the pill */}
            <motion.span
              layoutId={dark ? 'nav-bar' : 'nav-bar-mobile'}
              transition={springs.layout}
              className={`absolute -left-4 h-5 w-1 rounded-r-full bg-sea-400 ${active ? 'opacity-100' : 'opacity-0'}`}
            />
            <motion.span
              className="relative z-10 flex"
              animate={{ scale: active ? 1.12 : 1, x: active ? 1 : 0 }}
              transition={springs.snappy}
            >
              <span className={active ? 'text-sea-300' : dark ? 'text-sea-100/50' : 'text-mist-400'}>
                {Ico({ size: 16 })}
              </span>
            </motion.span>
            <span className="relative z-10">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SessionBlock({ onLogout, compact = false }) {
  const { user } = useAuth();
  return (
    <div className={`border-t ${compact ? 'border-mist-200' : 'border-white/[0.08]'} pt-3`}>
      <div className="flex items-center gap-2.5 px-2 pb-2">
        <motion.span
          whileHover={{ scale: 1.1 }}
          transition={springs.bouncy}
          className={`avatar h-8 w-8 text-xs ${avatarTint(user?.email || 'admin')}`}
        >
          {initials(user?.name || 'Admin')}
        </motion.span>
        <div className="min-w-0">
          <p className={`truncate text-[13px] font-semibold ${compact ? 'text-mist-900' : 'text-white'}`}>{user?.name}</p>
          <p className={`truncate text-[11px] ${compact ? 'text-mist-500' : 'text-sea-100/50'}`}>{user?.email}</p>
        </div>
      </div>
      <motion.button
        onClick={onLogout}
        whileHover={{ x: 3 }}
        whileTap={{ scale: 0.97 }}
        transition={springs.snappy}
        className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium outline-none ${
          compact
            ? 'text-mist-600 hover:bg-mist-100 hover:text-mist-900'
            : 'text-sea-100/70 hover:bg-white/[0.05] hover:text-white'
        }`}
      >
        <span className={compact ? 'text-mist-400' : 'text-sea-100/50'}>{Icon.logout({ size: 15 })}</span>
        Log out
      </motion.button>
    </div>
  );
}

function LiveBadge() {
  return (
    <div className="rounded-xl bg-white/[0.04] p-3 ring-1 ring-inset ring-white/[0.06]">
      <div className="flex items-center gap-2 text-[11px] font-medium text-sea-100/60">
        <span className="relative flex h-2 w-2">
          <motion.span
            className="absolute inline-flex h-full w-full rounded-full bg-sea-400"
            animate={{ scale: [1, 2.2], opacity: [0.7, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
          />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-sea-400" />
        </span>
        API live · MongoDB Atlas
      </div>
    </div>
  );
}

export default function AppShell({ children }) {
  const { logout } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <div className="min-h-screen bg-canvas">
      {/* Desktop sidebar: petrol gradient + aurora + sweeping beam */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 overflow-hidden bg-gradient-to-b from-sea-950 to-[#0C1F1E] px-5 py-5 md:flex">
        <div className="aurora opacity-40" />
        <div className="beam" />
        <div className="relative flex min-h-full flex-col">
          <div className="mb-8 px-1">
            <Brand />
          </div>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-sea-100/40">Workspace</p>
          <NavLinks />

          <div className="mt-auto space-y-3">
            <LiveBadge />
            <SessionBlock onLogout={handleLogout} />
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-mist-200 bg-white/80 px-4 py-3 backdrop-blur-md md:hidden">
        <motion.button
          aria-label="Open navigation"
          onClick={() => setMobileOpen(true)}
          whileTap={{ scale: 0.9 }}
          transition={springs.bouncy}
          className="rounded-[10px] p-2 text-mist-600 hover:bg-mist-100"
        >
          {Icon.menu({ size: 20 })}
        </motion.button>
        <Brand compact dark={false} />
        <motion.button
          onClick={handleLogout}
          aria-label="Log out"
          whileTap={{ scale: 0.9 }}
          transition={springs.bouncy}
          className="rounded-[10px] p-2 text-mist-500 hover:bg-mist-100"
        >
          {Icon.logout({ size: 20 })}
        </motion.button>
      </header>

      {/* Mobile drawer: spring slide + backdrop fade, exits properly */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-mist-900/40 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={springs.soft}
              className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-mist-200 bg-white px-4 py-5 shadow-overlay"
            >
              <div className="mb-6 flex items-center justify-between px-1">
                <Brand compact dark={false} />
                <motion.button
                  aria-label="Close navigation"
                  onClick={() => setMobileOpen(false)}
                  whileTap={{ rotate: 90, scale: 0.9 }}
                  transition={springs.bouncy}
                  className="rounded-[10px] p-1.5 text-mist-400 hover:bg-mist-100"
                >
                  {Icon.close({ size: 16 })}
                </motion.button>
              </div>
              <NavLinks dark={false} onNavigate={() => setMobileOpen(false)} />
              <SessionBlock onLogout={handleLogout} compact />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Page content */}
      <main className="md:pl-60">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
    </div>
  );
}
