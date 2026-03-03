// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — SEOProvider
//  Automatically applies the correct SEO config for the current route.
//  Wraps the whole app in RootLayout — zero per-page boilerplate needed.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { SEO_PAGES } from './seoConfig';
import { useSEO } from './useSEO';
import { GlobalStructuredData } from './StructuredData';

// Normalise dynamic segments (/p/my-slug → /p/:slug)
function matchRoute(pathname: string): string {
  if (pathname.startsWith('/p/')) return '/p/:slug';
  if (pathname.startsWith('/dashboard')) return '/dashboard';
  if (pathname.startsWith('/admin')) return '/admin';
  return pathname;
}

function AutoSEO() {
  const { pathname } = useLocation();
  const key    = matchRoute(pathname);
  const config = SEO_PAGES[key] ?? SEO_PAGES['/'];
  useSEO(config);
  return null;
}

export function SEOProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GlobalStructuredData />
      <AutoSEO />
      {children}
    </>
  );
}
