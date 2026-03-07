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
import { BlogIndex, BlogPost } from './components/BlogPages';
import { ReferralPage } from './components/dashboard/ReferralPage';
import { ReleaseCalendarPage } from './components/dashboard/ReleaseCalendarPage';
import { RoyaltyStatementsPage } from './components/dashboard/RoyaltyStatementsPage';
import { ContentIDPage } from './components/dashboard/ContentIDPage';
import { DemographicsPage } from './components/dashboard/DemographicsPage';
import { CommunityPage } from './components/dashboard/CommunityPage';
import { CuratorDirectoryPage } from './components/dashboard/CuratorDirectoryPage';
import { AcademyPage } from './components/dashboard/AcademyPage';
import { StatusPage } from './components/StatusPage';
import { AdminABTests } from './components/admin/AdminABTests';
import { AdminCompetitorSpy } from './components/admin/AdminCompetitorSpy';

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    children: [
      { path: '/',       Component: LandingPage },
      { path: '/auth',   Component: AuthPage },
      { path: '/p/:slug', Component: PublicSmartPage },
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
          { path: 'referrals',      Component: ReferralPage },
          { path: 'calendar',       Component: ReleaseCalendarPage },
          { path: 'royalties',      Component: RoyaltyStatementsPage },
          { path: 'content-id',     Component: ContentIDPage },
          { path: 'demographics',   Component: DemographicsPage },
          { path: 'community',      Component: CommunityPage },
          { path: 'curators',       Component: CuratorDirectoryPage },
          { path: 'academy',        Component: AcademyPage },
        ],
      },
      { path: '/admin/bootstrap', Component: AdminBootstrap },
      {
        path: '/admin',
        Component: AdminLayout,
        children: [
          { index: true,             Component: AdminOverview },
          { path: 'releases',        Component: AdminReleases },
          { path: 'tickets',         Component: AdminTickets },
          { path: 'campaigns',       Component: AdminCampaigns },
          { path: 'users',           Component: AdminUsers },
          { path: 'tracking',        Component: TrackingDocs },
          { path: 'seo',             Component: SEODashboard },
          { path: 'seo/daily',       Component: DailySEOManager },
          { path: 'seo/competitors', Component: AdminCompetitorSpy },
          { path: 'ab-tests',        Component: AdminABTests },
        ],
      },
      { path: '/status',     Component: StatusPage },
      { path: '/blog',       Component: BlogIndex },
      { path: '/blog/:slug', Component: BlogPost },
      { path: '*',           Component: NotFound },
    ],
  },
]);
