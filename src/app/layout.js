import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { LockProvider } from '@/context/LockContext';
import OfflineBanner from '@/components/OfflineBanner';
import SWRegister from '@/components/SWRegister';
import Gate from '@/components/Gate';
import PullToRefresh from '@/components/PullToRefresh';
import { InstallProvider } from '@/context/InstallContext';

export const metadata = {
  title: 'Conmonie',
  description: 'Run your Ajo with confidence',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Conmonie' },
  other: { 'mobile-web-app-capable': 'yes' },
};
export const viewport = { themeColor: '#0A0A0A', viewportFit: 'cover', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body><AuthProvider><InstallProvider><OfflineBanner /><PullToRefresh /><SWRegister /><LockProvider><Gate>{children}</Gate></LockProvider></InstallProvider></AuthProvider></body>
    </html>
  );
}
