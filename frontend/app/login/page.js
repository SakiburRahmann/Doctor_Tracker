'use client';

/**
 * Login — split screen.
 * Left: fixed-dark brand panel with the product promise and live counts.
 * Right: the form on the app canvas, theme-aware.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { Icon, Mark } from '@/components/icons';
import { springs } from '@/components/motion-kit';
import ThemeToggle from '@/components/ThemeToggle';

const STATS = [
  { value: '24', label: 'Doctors' },
  { value: '175', label: 'Patients' },
  { value: '6', label: 'Hospitals' },
];

export default function LoginPage() {
  const { login, status } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Already signed in? Skip the form.
  useEffect(() => {
    if (status === 'authenticated') router.replace('/dashboard');
  }, [status, router]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const fe = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) fe.email = 'Enter a valid email address';
    if (password.length < 6) fe.password = 'Password must be at least 6 characters';
    setFieldErrors(fe);
    if (Object.keys(fe).length) return;

    setSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Sign-in failed. Check your connection and try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-canvas lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-night-line bg-night p-12 lg:flex xl:p-16">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springs.soft}
          className="flex items-center gap-2.5"
        >
          <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-accent text-accent-ink">
            <Mark size={15} />
          </span>
          <span className="text-[14.5px] font-semibold tracking-[-0.01em] text-white">Doctor Tracker</span>
        </motion.div>

        <div className="max-w-[440px]">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springs.soft, delay: 0.1 }}
            className="flex items-center gap-2 text-[11.5px] font-medium text-white/45"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Administrator portal
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springs.soft, delay: 0.18 }}
            className="mt-4 max-w-[300px] text-[32px] font-semibold leading-[1.15] tracking-[-0.03em] text-white xl:max-w-[340px] xl:text-[36px]"
          >
            Every doctor, every patient, in one registry.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springs.soft, delay: 0.28 }}
            className="mt-4 max-w-[380px] text-[13.5px] leading-relaxed text-white/50"
          >
            Admissions, caseloads and follow-ups in a single view — searchable,
            filterable and measured live from MongoDB.
          </motion.p>
        </div>

        <div>
          <div className="grid grid-cols-3 gap-3">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springs.soft, delay: 0.4 + i * 0.08 }}
                className="rounded-inner border border-white/10 bg-white/[0.04] px-3.5 py-3"
              >
                <p className="text-[22px] font-semibold leading-none tracking-[-0.03em] text-white tnum">{s.value}</p>
                <p className="mt-1.5 text-[10.5px] font-medium uppercase tracking-[0.1em] text-white/40">{s.label}</p>
              </motion.div>
            ))}
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="mt-6 flex items-center gap-2 text-[11px] text-white/30"
          >
            {Icon.shield({ size: 12 })}
            JWT sessions · bcrypt credentials · rate-limited login
          </motion.p>
        </div>
      </aside>

      {/* Form panel */}
      <main className="relative flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="absolute right-5 top-5">
          <ThemeToggle />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springs.soft, delay: 0.15 }}
          className="w-full max-w-[370px]"
        >
          <div className="mb-10 flex items-center gap-2.5 lg:hidden">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-accent text-accent-ink">
              <Mark size={15} />
            </span>
            <span className="text-[14.5px] font-semibold tracking-[-0.01em] text-ink">Doctor Tracker</span>
          </div>

          <h2 className="text-[28px] font-semibold leading-none tracking-[-0.035em] text-ink">Sign in</h2>
          <p className="mt-2 text-[13px] text-ink-3">Continue to the administrator portal.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  role="alert"
                  className="overflow-hidden"
                >
                  <div className="flex items-start gap-2.5 rounded-inner border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-[12.5px] text-danger">
                    <span className="mt-0.5 shrink-0">{Icon.alert({ size: 14 })}</span>
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="label" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                className="input"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((fe) => ({ ...fe, email: undefined }));
                }}
                placeholder="you@clinic.com"
              />
              {fieldErrors.email && (
                <p className="mt-1.5 text-[11.5px] font-medium text-danger">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="login-password">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="input pr-11"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldErrors((fe) => ({ ...fe, password: undefined }));
                  }}
                  placeholder="Your password"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-3 transition-colors hover:text-ink"
                >
                  {showPassword ? Icon.eyeOff({ size: 15 }) : Icon.eye({ size: 15 })}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1.5 text-[11.5px] font-medium text-danger">{fieldErrors.password}</p>
              )}
            </div>

            <button type="submit" disabled={submitting} className="btn-primary mt-2 w-full">
              {submitting ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent-ink/30 border-t-accent-ink" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  {Icon.chevronRight({ size: 15 })}
                </>
              )}
            </button>
          </form>

          <div className="mt-8 rounded-inner border border-line bg-surface-2/60 p-4">
            <p className="eyebrow">Demo account</p>
            <dl className="mt-2.5 space-y-1 text-[12px]">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-ink-3">Email</dt>
                <dd className="font-mono text-ink tnum">admin@doctortracker.com</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-ink-3">Password</dt>
                <dd className="font-mono text-ink tnum">Admin@123</dd>
              </div>
            </dl>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
