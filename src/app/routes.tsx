import { createBrowserRouter } from 'react-router';
import { RootLayout } from './components/home/RootLayout';
import { LandingPage } from './components/home/LandingPage';
import { NotFound } from './components/home/NotFound';
import { AuthPage } from './components/dashboard/AuthPage';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { DistributionPage } from './components/dashboard/DistributionPage';
import { PromotionsPage } from './components/dashboard/PromotionsPage';
import { PublishingPage } from './components/dashboard/PublishingPage';
import { AnalyticsPage } from './components/dashboard/AnalyticsPage';
import { SmartPagesPage } from './components/dashboard/SmartPagesPage';
import { RoyaltySplitsPage } from './components/dashboard/RoyaltySplitsPage';
import { MessagesPage } from './components/dashboard/MessagesPage';
import { CreditsPage } from './components/dashboard/CreditsPage';
import { SettingsPage } from './components/dashboard/SettingsPage';
import { PlaylistMarketplacePage } from './components/dashboard/PlaylistMarketplacePage';
import { TeamPage } from './components/dashboard/TeamPage';
import { PublicSmartPage } from './components/dashboard/PublicSmartPage';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminOverview } from './components/admin/AdminOverview';
import { AdminTickets } from './components/admin/AdminTickets';
import { AdminCampaigns } from './components/admin/AdminCampaigns';
import { AdminUsers } from './components/admin/AdminUsers';
import { AdminBootstrap } from './components/admin/AdminBootstrap';
import { AdminReleases } from './components/admin/AdminReleases';
import { TrackingDocs } from './components/tracking/TrackingDocs';
import { SEODashboard } from './components/seo/SEODashboard';
import { DailySEOManager } from './components/seo/DailySEOManager';

export const router = createBrowserRouter([
  {
    // Root layout provides AuthProvider + Toaster to the entire app
    Component: RootLayout,
    children: [
      {
        path: '/',
        Component: LandingPage,
      },
      {
        path: '/auth',
        Component: AuthPage,
      },
      // Public Smart Pages
      {
        path: '/p/:slug',
        Component: PublicSmartPage,
      },
      {
        path: '/dashboard',
        Component: DashboardLayout,
        children: [
          { index: true,            Component: DashboardOverview },
          { path: 'distribution',   Component: DistributionPage },
          { path: 'promotions',     Component: PromotionsPage },
          { path: 'publishing',     Component: PublishingPage },
          { path: 'analytics',      Component: AnalyticsPage },
          { path: 'smart-pages',    Component: SmartPagesPage },
          { path: 'royalty-splits', Component: RoyaltySplitsPage },
          { path: 'messages',       Component: MessagesPage },
          { path: 'credits',        Component: CreditsPage },
          { path: 'settings',       Component: SettingsPage },
          { path: 'marketplace',    Component: PlaylistMarketplacePage },
          { path: 'team',           Component: TeamPage },
        ],
      },
      {
        path: '/admin/bootstrap',
        Component: AdminBootstrap,
      },
      {
        path: '/admin',
        Component: AdminLayout,
        children: [
          { index: true,          Component: AdminOverview },
          { path: 'releases',     Component: AdminReleases },
          { path: 'tickets',      Component: AdminTickets },
          { path: 'campaigns',    Component: AdminCampaigns },
          { path: 'users',        Component: AdminUsers },
          { path: 'tracking',     Component: TrackingDocs },
          { path: 'seo',          Component: SEODashboard },
          { path: 'seo/daily',    Component: DailySEOManager },
        ],
      },
      // 404 catch-all
      { path: '*', Component: NotFound },
    ],
  },
]);