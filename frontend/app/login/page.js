'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { Icon, Mark } from '@/components/icons';

function GlassStat({ value, label }) {
  return (
    <div className="glass rounded-2xl px-4 py-3">
      <p className="font-mono text-xl font-semibold text-white tnum">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.08em] text-sea-100/70">{label}</p>
    </div>
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
      {/* Hero panel (hidden on small screens): petrol gradient + glass stats */}
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-sea-950 p-10 lg:flex">
        {/* Ambient gradient glows */}
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-sea-600/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-sea-400/15 blur-3xl" />
        {/* Subtle grid texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />

        <div className="anim-rise relative flex items-center gap-2.5 text-white">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 ring-1 ring-inset ring-white/15">
            <Mark size={19} />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">Doctor Tracker</span>
        </div>

        <div className="anim-rise delay-1 relative max-w-md">
          <h1 className="text-[34px] font-semibold leading-[1.15] tracking-tight text-white">
            The registry your clinic actually runs on.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-sea-100/70">
            Doctors, patients, visits, and follow-ups in one place. Search 24 practitioners,
            track 175 patient records, and read the state of the clinic in numbers.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <GlassStat value={24} label="Doctors" />
            <GlassStat value={175} label="Patients" />
            <GlassStat value={6} label="Hospitals" />
          </div>
        </div>

        <div className="anim-rise delay-2 relative flex items-center gap-2 font-mono text-xs text-sea-100/50">
          {Icon.shield({ size: 13 })}
          REST API · MongoDB · JWT sessions
        </div>
      </div>

      {/* Form panel */}
      <div className="flex w-full items-center justify-center px-4 py-12 lg:w-[54%]">
        <div className="anim-rise w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-sea-700 text-white">
              <Mark size={17} />
            </span>
            <span className="text-base font-semibold tracking-tight text-mist-900">Doctor Tracker</span>
          </div>

          <h2 className="text-[26px] font-semibold tracking-tight text-mist-900">Welcome back</h2>
          <p className="mt-1 text-sm text-mist-500">Sign in to the administrator portal.</p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
            {error && (
              <div
                role="alert"
                className="anim-pop flex items-start gap-2.5 rounded-[10px] border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700"
              >
                <span className="mt-0.5 shrink-0">{Icon.alert({ size: 15 })}</span>
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
              {fieldErrors.email && <p className="mt-1.5 text-xs font-medium text-rose-600">{fieldErrors.email}</p>}
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
                  placeholder="At least 6 characters"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-mist-400 transition hover:text-mist-700"
                >
                  {showPassword ? Icon.eyeOff({ size: 16 }) : Icon.eye({ size: 16 })}
                </button>
              </div>
              {fieldErrors.password && <p className="mt-1.5 text-xs font-medium text-rose-600">{fieldErrors.password}</p>}
            </div>

            <button type="submit" className="btn-primary w-full py-2.5" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
              {!submitting && Icon.chevronRight({ size: 15 })}
            </button>
          </form>

          <div className="mt-8 rounded-2xl border border-mist-200 bg-white p-4 shadow-xs">
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
          </div>
        </div>
      </div>
    </div>
  );
}
