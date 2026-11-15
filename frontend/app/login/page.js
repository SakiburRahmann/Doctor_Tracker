'use client';

/**
 * Sign in — a single centred column.
 *
 * A sign-in screen is a utility, not a landing page: brand mark, heading, two
 * fields, one button, a way back into the account. No stats, no pitch copy.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { Icon, Mark } from '@/components/icons';
import { springs } from '@/components/motion-kit';
import ThemeToggle from '@/components/ThemeToggle';

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
      else setError('Could not sign in. Check your connection and try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-canvas px-5 py-6 sm:px-8">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[13.5px] font-semibold tracking-[-0.01em] text-ink">
          <span className="grid h-7 w-7 place-items-center rounded-[9px] bg-accent text-accent-ink">
            <Mark size={14} />
          </span>
          Doctor Tracker
        </span>
        <ThemeToggle />
      </div>

      <main className="flex flex-1 items-center justify-center py-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springs.soft}
          className="w-full max-w-[368px]"
        >
          <h1 className="text-[26px] font-semibold leading-none tracking-[-0.03em] text-ink">
            Sign in
          </h1>
          <p className="mt-2 text-[13px] text-ink-3">Administrator account</p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-inner border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-[12.5px] text-danger"
              >
                <span className="mt-0.5 shrink-0">{Icon.alert({ size: 14 })}</span>
                {error}
              </div>
            )}

            <div>
              <label className="label" htmlFor="login-email">
                Email
              </label>
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
              <label className="label" htmlFor="login-password">
                Password
              </label>
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
                'Sign in'
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

      <p className="text-center text-[11px] text-ink-3">Doctor Tracker</p>
    </div>
  );
}
