/**
 * Single consistent icon set (24px viewBox, 2px stroke, currentColor).
 * Every icon in the app comes from here so weight and style never drift.
 * Props: size (px), plus any SVG spread attrs.
 */
function base(paths, { size = 16, ...rest } = {}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {paths}
    </svg>
  );
}

export const Icon = {
  gauge: (p) => base(<path d="M12 14l4-4M3.34 19a10 10 0 1 1 17.32 0" />, p),
  stethoscope: (p) => base(
    <>
      <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
      <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
      <circle cx="20" cy="10" r="2" />
    </>,
    p,
  ),
  users: (p) => base(
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>,
    p,
  ),
  search: (p) => base(
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>,
    p,
  ),
  userPlus: (p) => base(
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </>,
    p,
  ),
  pen: (p) => base(<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />, p),
  trash: (p) => base(<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />, p),
  mail: (p) => base(
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </>,
    p,
  ),
  phone: (p) => base(<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.13.96.37 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.33 1.84.57 2.8.7A2 2 0 0 1 22 16.9z" />, p),
  calendar: (p) => base(
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>,
    p,
  ),
  fee: (p) => base(
    <>
      <path d="M20 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H4" />
      <path d="M18.5 8.5v-3M18.5 17.5v3M4 12l-2-2m2 2-2 2" strokeDasharray="2 2" />
    </>,
    p,
  ),
  plus: (p) => base(<path d="M12 5v14M5 12h14" />, p),
  close: (p) => base(<path d="M6 6l12 12M6 18 18 6" />, p),
  menu: (p) => base(<path d="M4 6h16M4 12h16M4 18h16" />, p),
  logout: (p) => base(<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />, p),
  arrowLeft: (p) => base(<path d="M19 12H5m7 7-7-7 7-7" />, p),
  chevronLeft: (p) => base(<path d="m15 18-6-6 6-6" />, p),
  chevronRight: (p) => base(<path d="m9 18 6-6-6-6" />, p),
  inbox: (p) => base(
    <>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </>,
    p,
  ),
  alert: (p) => base(
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </>,
    p,
  ),
  eye: (p) => base(
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </>,
    p,
  ),
  eyeOff: (p) => base(
    <>
      <path d="M10.7 5.08A9.85 9.85 0 0 1 12 5c6.5 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68M6.61 6.39A13.5 13.5 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.39-1.61M2 2l20 20" />
    </>,
    p,
  ),
};

/** Wordmark cross (the one place the mark appears as itself). */
export function Mark({ size = 20, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden {...rest}>
      <path d="M10 2h4v8h8v4h-8v8h-4v-8H2v-4h8V2z" />
    </svg>
  );
}
