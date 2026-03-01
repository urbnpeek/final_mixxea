import { Outlet } from 'react-router';
import { Toaster } from 'sonner';
import { AuthProvider } from '../dashboard/AuthContext';
import { CurrencyProvider } from '../mixxea/CurrencyContext';
import { TrackingProvider } from '../tracking/TrackingContext';
import { CookieConsent } from '../tracking/CookieConsent';

export function RootLayout() {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <TrackingProvider>
          <Outlet />
          <CookieConsent />
          <Toaster
            position="top-right"
            theme="dark"
            toastOptions={{
              style: {
                background: '#1A1A1A',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#fff',
                borderRadius: '12px',
              },
            }}
          />
        </TrackingProvider>
      </CurrencyProvider>
    </AuthProvider>
  );
}
