'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { Icon, Mark } from '@/components/icons';

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
    <div className="flex min-h-screen bg-paper">
      {/* Registry panel (hidden on small screens) */}
      <div className="hidden w-2/5 flex-col justify-between bg-spruce-800 p-10 lg:flex">
        <div className="flex items-center gap-2.5 text-sand-50">
          <Mark size={20} />
          <span className="text-base font-semibold tracking-tight">Doctor Tracker</span>
        </div>

        <div className="max-w-sm">
          <h1 className="text-3xl font-semibold leading-snug tracking-tight text-sand-50">
            The registry your clinic actually runs on.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-spruce-200">
            Doctors, patients, visits, and follow-ups in one place. Search 24 practitioners,
            track 175 patient records, and read the state of the clinic in numbers.
          </p>
          <dl className="mt-8 space-y-3 border-t border-spruce-700 pt-6 text-sm">
            <div className="flex items-baseline justify-between">
              <dt className="text-spruce-200">Doctors on register</dt>
              <dd className="font-mono text-lg font-semibold text-sand-50">24</dd>
            </div>
            <div className="flex items-baseline justify-between">
              <dt className="text-spruce-200">Patient records</dt>
              <dd className="font-mono text-lg font-semibold text-sand-50">175</dd>
            </div>
            <div className="flex items-baseline justify-between">
              <dt className="text-spruce-200">Hospitals covered</dt>
              <dd className="font-mono text-lg font-semibold text-sand-50">6</dd>
            </div>
          </dl>
        </div>

        <p className="font-mono text-xs text-spruce-300">REST API / MongoDB / JWT sessions</p>
      </div>

      {/* Form panel */}
      <div className="flex w-full items-center justify-center px-4 py-12 lg:w-3/5">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="text-spruce-700">
              <Mark size={18} />
            </span>
            <span className="text-base font-semibold tracking-tight text-ink-900">Doctor Tracker</span>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-ink-900">Sign in</h2>
          <p className="mt-1 text-sm text-ink-600">Administrator access to the registry.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            {error && (
              <div role="alert" className="rounded-[3px] border border-brick-200 bg-brick-50 px-3 py-2.5 text-sm text-brick-700">
                {error}
              </div>
            )}
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
                placeholder="admin@doctortracker.com"
              />
              {fieldErrors.email && <p className="mt-1 text-xs text-brick-600">{fieldErrors.email}</p>}
            </div>
            <div>
              <label className="label" htmlFor="login-password">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="input pr-10"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldErrors((fe) => ({ ...fe, password: undefined }));
                  }}
                  placeholder="At least 6 characters"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-0 flex items-center px-2.5 text-sand-500 transition hover:text-ink-700"
                >
                  {showPassword ? Icon.eyeOff({ size: 16 }) : Icon.eye({ size: 16 })}
                </button>
              </div>
              {fieldErrors.password && <p className="mt-1 text-xs text-brick-600">{fieldErrors.password}</p>}
            </div>

            <button type="submit" className="btn-primary w-full py-2" disabled={submitting}>
              {submitting ? 'Signing in' : 'Sign in'}
            </button>
          </form>

          <div className="mt-8 rounded-[3px] border border-hairline-strong bg-sand-50 p-4 text-xs leading-relaxed text-ink-600">
            <p className="mb-2 font-semibold uppercase tracking-[0.08em] text-ink-600">Demo account</p>
            <dl className="space-y-1 font-mono">
              <div className="flex justify-between gap-4">
                <dt>email</dt>
                <dd className="text-ink-900">admin@doctortracker.com</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>password</dt>
                <dd className="text-ink-900">Admin@123</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
