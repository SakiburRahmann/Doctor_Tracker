import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

export const metadata = {
  title: 'Doctor Tracker — Admin Portal',
  description: 'Secure administrative portal to manage doctors and their patients.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {/* Session context available to every route (login, dashboard, doctors, patients) */}
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
