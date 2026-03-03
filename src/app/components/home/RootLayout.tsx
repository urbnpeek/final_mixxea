import { Outlet } from 'react-router';
import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider } from '../dashboard/AuthContext';
import { CurrencyProvider } from '../mixxea/CurrencyContext';
import { TrackingProvider } from '../tracking/TrackingContext';
import { CookieConsent } from '../tracking/CookieConsent';

// ── MIXXEA SVG favicon injected at runtime ────────────────────────────────────
const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#00C4FF"/>
      <stop offset="33%"  stop-color="#7B5FFF"/>
      <stop offset="66%"  stop-color="#D63DF6"/>
      <stop offset="100%" stop-color="#FF5252"/>
    </linearGradient>
    <linearGradient id="mg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#7B5FFF"/>
      <stop offset="100%" stop-color="#D63DF6"/>
    </linearGradient>
  </defs>
  <!-- Rounded square background -->
  <rect width="64" height="64" rx="14" fill="#000000"/>
  <!-- Gradient border ring -->
  <rect x="1.5" y="1.5" width="61" height="61" rx="13" fill="none" stroke="url(#g)" stroke-width="1.5" opacity="0.7"/>
  <!-- Bold M lettermark -->
  <text x="32" y="46" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
        font-size="38" font-weight="900" text-anchor="middle"
        letter-spacing="-2" fill="url(#mg)">M</text>
</svg>`;

function useFavicon() {
  useEffect(() => {
    const svgBlob = new Blob([FAVICON_SVG], { type: 'image/svg+xml' });
    const url     = URL.createObjectURL(svgBlob);

    // Remove any existing favicon links
    document.querySelectorAll("link[rel~='icon']").forEach(el => el.remove());

    const link = document.createElement('link');
    link.rel  = 'icon';
    link.type = 'image/svg+xml';
    link.href = url;
    document.head.appendChild(link);

    // Also set page title
    document.title = 'MIXXEA — Music Distribution & Marketing';

    return () => URL.revokeObjectURL(url);
  }, []);
}

export function RootLayout() {
  useFavicon();

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