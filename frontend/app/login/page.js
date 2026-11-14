'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { Icon, Mark } from '@/components/icons';
import { springs, TiltCard } from '@/components/motion-kit';

/** Word-by-word title reveal (Aceternity "text generate" pattern). */
function GenerateTitle({ words, className = '' }) {
  return (
    <h1 className={className}>
      {words.map((w, i) => (
        <motion.span
          key={`${w}-${i}`}
          initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ ...springs.soft, delay: 0.35 + i * 0.11 }}
          className="inline-block whitespace-pre"
        >
          {w}{' '}
        </motion.span>
      ))}
    </h1>
  );
}

/** Glass stat chip whose number counts up from 0. */
function GlassStat({ value, label, index = 0 }) {
  const [display, setDisplay] = useState(0);
  // count-up when mounted
  useState(() => {
    if (typeof window === 'undefined') return null;
    const start = performance.now();
    const dur = 1100;
    const tick = (now) => {
      const t = Math.min((now - start) / dur, 1);
      setDisplay(Math.round(value * (1 - (1 - t) ** 3)));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return null;
  });
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...springs.soft, delay: 0.9 + index * 0.12 }}
      whileHover={{ y: -3, scale: 1.05 }}
      className="glass rounded-2xl px-4 py-3"
    >
      <p className="font-mono text-xl font-semibold text-white tnum text-glow">{display}</p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.08em] text-sea-100/70">{label}</p>
    </motion.div>
  );
}

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
  if (status === 'authenticated' && typeof window !== 'undefined') {
    router.replace('/dashboard');
  }

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
    <div className="flex min-h-screen bg-canvas">
      {/* Hero panel: petrol night + aurora + beams + grid */}
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-sea-950 p-10 lg:flex">
        <div className="aurora" />
        <div className="grid-overlay" />
        <div className="beam" />
        <div className="beam" style={{ animationDelay: '3.5s' }} />

        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springs.soft, delay: 0.1 }}
          className="relative flex items-center gap-2.5 text-white"
        >
          <motion.span
            whileHover={{ rotate: 90, scale: 1.1 }}
            transition={springs.bouncy}
            className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 ring-1 ring-inset ring-white/15"
          >
            <Mark size={19} />
          </motion.span>
          <span className="text-[15px] font-semibold tracking-tight">Doctor Tracker</span>
        </motion.div>

        <div className="relative max-w-md">
          <GenerateTitle
            words={['The', 'registry', 'your', 'clinic']}
            className="text-[34px] font-semibold leading-[1.15] tracking-tight text-white"
          />
          <GenerateTitle
            words={['actually', 'runs', 'on.']}
            className="text-[34px] font-semibold leading-[1.15] tracking-tight text-transparent"
          />
          {/* Second line rendered with gradient via background-clip on a wrapper */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springs.soft, delay: 1.05 }}
            className="mt-4 text-[15px] leading-relaxed text-sea-100/70"
          >
            Doctors, patients, visits, and follow-ups in one place. Search 24 practitioners,
            track 175 patient records, and read the state of the clinic in numbers.
          </motion.p>
          <div className="mt-8 flex flex-wrap gap-3">
            <GlassStat index={0} value={24} label="Doctors" />
            <GlassStat index={1} value={175} label="Patients" />
            <GlassStat index={2} value={6} label="Hospitals" />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          className="relative flex items-center gap-2 font-mono text-xs text-sea-100/50"
        >
          {Icon.shield({ size: 13 })}
          REST API · MongoDB · JWT sessions
        </motion.div>
      </div>

      {/* Form panel */}
      <div className="flex w-full items-center justify-center px-4 py-12 lg:w-[54%]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springs.soft, delay: 0.2 }}
          className="w-full max-w-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...springs.bouncy, delay: 0.25 }}
            className="mb-8 flex items-center gap-2.5 lg:hidden"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-sea-700 text-white shadow-glow">
              <Mark size={17} />
            </span>
            <span className="text-base font-semibold tracking-tight text-mist-900">Doctor Tracker</span>
          </motion.div>

          <h2 className="text-[26px] font-semibold tracking-tight text-mist-900">Welcome back</h2>
          <p className="mt-1 text-sm text-mist-500">Sign in to the administrator portal.</p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, scale: 0.97 }}
                  animate={{ opacity: 1, height: 'auto', scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.97 }}
                  transition={springs.snappy}
                  role="alert"
                  className="flex items-start gap-2.5 overflow-hidden rounded-[10px] border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700"
                >
                  <motion.span
                    animate={{ x: [0, -4, 4, -3, 3, 0] }}
                    transition={{ duration: 0.4, delay: 0.15 }}
                    className="mt-0.5 shrink-0"
                  >
                    {Icon.alert({ size: 15 })}
                  </motion.span>
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
            <motion.div
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...springs.soft, delay: 0.35 }}
            >
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
                placeholder="admin@doctortracker.com"
              />
              <AnimatePresence>
                {fieldErrors.email && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-1.5 text-xs font-medium text-rose-600"
                  >
                    {fieldErrors.email}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...springs.soft, delay: 0.45 }}
            >
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
                  placeholder="At least 6 characters"
                />
                <motion.button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((s) => !s)}
                  whileTap={{ scale: 0.85 }}
                  transition={springs.bouncy}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-mist-400 transition-colors hover:text-mist-700"
                >
                  {showPassword ? Icon.eyeOff({ size: 16 }) : Icon.eye({ size: 16 })}
                </motion.button>
              </div>
              <AnimatePresence>
                {fieldErrors.password && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-1.5 text-xs font-medium text-rose-600"
                  >
                    {fieldErrors.password}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>

            <motion.button
              type="submit"
              disabled={submitting}
              whileHover={{ scale: 1.015, y: -1 }}
              whileTap={{ scale: 0.97 }}
              transition={springs.bouncy}
              className="btn-primary relative w-full overflow-hidden py-2.5"
            >
              {/* Sheen sweep inside the button */}
              {!submitting && <span className="sheen pointer-events-none absolute inset-0 rounded-[10px]" />}
              <span className="relative z-10 flex items-center justify-center gap-1.5">
                {submitting ? (
                  <>
                    <motion.span
                      className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                    />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <motion.span animate={{ x: [0, 3, 0] }} transition={{ duration: 1.6, repeat: Infinity }}>
                      {Icon.chevronRight({ size: 15 })}
                    </motion.span>
                  </>
                )}
              </span>
            </motion.button>
          </form>

          <TiltCard
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springs.soft, delay: 0.6 }}
            className="mt-8 rounded-2xl border border-mist-200 bg-white p-4 shadow-xs"
          >
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-mist-500">Demo account</p>
            <dl className="space-y-1.5 font-mono text-[13px]">
              <div className="flex justify-between gap-4">
                <dt className="text-mist-500">email</dt>
                <dd className="font-medium text-mist-900">admin@doctortracker.com</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-mist-500">password</dt>
                <dd className="font-medium text-mist-900">Admin@123</dd>
              </div>
            </dl>
          </TiltCard>
        </motion.div>
      </div>
    </div>
  );
}
