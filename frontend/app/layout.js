import './globals.css';
import localFont from 'next/font/local';
import { AuthProvider } from '@/lib/auth-context';

/* Self-hosted (latin subset) — avoids the next/font/google v20 variable-URL loader bug. */
const inter = localFont({
  src: [
    { path: './fonts/Inter-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/Inter-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/Inter-600.woff2', weight: '600', style: 'normal' },
    { path: './fonts/Inter-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-inter',
  display: 'swap',
});

const jbMono = localFont({
  src: [
    { path: './fonts/JetBrainsMono-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/JetBrainsMono-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/JetBrainsMono-600.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-jbmono',
  display: 'swap',
});

export const metadata = {
  title: 'Doctor Tracker',
  description: 'Registry of doctors and patients for clinic administrators.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${jbMono.variable}`}>
      <body>
        {/* Session context available to every route (login, dashboard, doctors, patients) */}
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
