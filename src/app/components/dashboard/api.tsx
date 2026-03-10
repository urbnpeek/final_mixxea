import { projectId, publicAnonKey } from '../../../../utils/supabase/info';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-f4d1ffe4`;

async function req(method: string, path: string, body?: any, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    // Always send the Supabase anon key in Authorization so the edge-function
    // infrastructure accepts the request regardless of JWT-verification settings.
    'Authorization': `Bearer ${publicAnonKey}`,
  };

  // Our HMAC session token is NOT a Supabase JWT — sending it in Authorization
  // causes Supabase to reject the request with 401 before Hono sees it.
  // Use a custom header instead; the Hono server reads it from X-MIXXEA-Token.
  if (token) {
    headers['X-MIXXEA-Token'] = token;
  }

  const res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });

  let data: any = {};
  try { data = await res.json(); } catch { data = {}; }

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}

// ──── Auth ────────────────────────────────────────────────────────────────────
export const signup      = (d: { name: string; email: string; password: string; role: string; inviteCode?: string }) => req('POST', '/auth/signup', d);
export const login       = (d: { email: string; password: string }) => req('POST', '/auth/login', d);
export const verifyToken = (token: string) => req('GET', '/auth/verify', undefined, token);
export const logout      = (token: string) => req('POST', '/auth/logout', undefined, token);

// ──── Profile ─────────────────────────────────────────────────────────────────
export const getProfile    = (token: string) => req('GET', '/profile', undefined, token);
export const updateProfile = (token: string, d: any) => req('PUT', '/profile', d, token);

// ──── Plan ────────────────────────────────────────────────────────────────────
export const upgradePlan = (token: string, plan: string) => req('POST', '/plan/upgrade', { plan }, token);

// ──── Onboarding ────────────────────────────────────────────────────────────
export const completeOnboarding = (token: string, d: any) => req('POST', '/onboarding/complete', d, token);

// ──── Releases ────────────────────────────────────────────────────────────────
export const getReleases    = (token: string) => req('GET', '/releases', undefined, token);
export const createRelease  = (token: string, d: any) => req('POST', '/releases', d, token);
export const updateRelease  = (token: string, id: string, d: any) => req('PUT', `/releases/${id}`, d, token);
export const deleteRelease  = (token: string, id: string) => req('DELETE', `/releases/${id}`, undefined, token);

// ──── Campaigns ───────────────────────────────────────────────────────────────
export const getCampaigns   = (token: string) => req('GET', '/campaigns', undefined, token);
export const createCampaign = (token: string, d: any) => req('POST', '/campaigns', d, token);
export const updateCampaign = (token: string, id: string, d: any) => req('PUT', `/campaigns/${id}`, d, token);

// ──── Works ──────────────────────────────────────────────────────────────────
export const getWorks   = (token: string) => req('GET', '/works', undefined, token);
export const createWork = (token: string, d: any) => req('POST', '/works', d, token);
export const updateWork = (token: string, id: string, d: any) => req('PUT', `/works/${id}`, d, token);

// ──── Splits ──────────────────────────────────────────────────────────────────
export const getSplits   = (token: string) => req('GET', '/splits', undefined, token);
export const createSplit = (token: string, d: any) => req('POST', '/splits', d, token);
export const updateSplit = (token: string, id: string, d: any) => req('PUT', `/splits/${id}`, d, token);

// ──── Smart Page ──────────────────────────────────────────────────────────────
export const getSmartPage      = (token: string) => req('GET', '/smart-page', undefined, token);
export const updateSmartPage   = (token: string, d: any) => req('PUT', '/smart-page', d, token);
export const getSmartPageStats = (token: string) => req('GET', '/smart-page/stats', undefined, token);

// ──── Credits ────────────────────────────────────────────────────────────────
export const getCredits           = (token: string) => req('GET', '/credits', undefined, token);
export const purchaseCredits      = (token: string, d: { amount: number; packageName: string }) => req('POST', '/credits/purchase', d, token);
export const createStripeCheckout = (token: string, d: { packageId: string; successUrl: string; cancelUrl: string }) => req('POST', '/credits/create-checkout', d, token);

// ──── Stripe / Plan Subscriptions ─────────────────────────────────────────────
/** Create a Stripe Checkout session in subscription mode for a plan upgrade */
export const subscribePlan     = (token: string, d: { planId: string; successUrl?: string; cancelUrl?: string }) => req('POST', '/plan/subscribe', d, token);
/** Open the Stripe Customer Portal so the user can manage/cancel their subscription */
export const getStripePortal   = (token: string, d?: { returnUrl?: string }) => req('POST', '/plan/portal', d || {}, token);
/** Get current subscription status from KV (enriched with live Stripe data if available) */
export const getSubscription   = (token: string) => req('GET', '/plan/subscription', undefined, token);
/** Check Stripe configuration and available payment methods */
export const getStripeHealth   = () => req('GET', '/stripe/health');

// ──── Tickets ─────────────────────────────────────────────────────────────────
export const getTickets  = (token: string) => req('GET', '/tickets', undefined, token);
export const createTicket = (token: string, d: any) => req('POST', '/tickets', d, token);
export const getMessages = (token: string, ticketId: string) => req('GET', `/tickets/${ticketId}/messages`, undefined, token);
export const sendMessage = (token: string, ticketId: string, d: any) => req('POST', `/tickets/${ticketId}/messages`, d, token);

// ──── Analytics ───────────────────────────────────────────────────────────────
export const getAnalytics     = (token: string) => req('GET', '/analytics', undefined, token);
export const refreshAnalytics = (token: string) => req('POST', '/analytics/refresh', {}, token);

// ──── Playlist Marketplace ────────────────────────────────────────────────────
export const getMarketplaceCurators = (token: string) => req('GET', '/marketplace/curators', undefined, token);
export const getMyPitches           = (token: string) => req('GET', '/pitches', undefined, token);
export const getReceivedPitches     = (token: string) => req('GET', '/pitches/received', undefined, token);
export const submitPitch            = (token: string, d: any) => req('POST', '/pitches', d, token);
export const updatePitch            = (token: string, id: string, d: any) => req('PUT', `/pitches/${id}`, d, token);

// ──── Team (Label) ────────────────────────────────────────────────────────────
export const getTeam          = (token: string) => req('GET', '/team', undefined, token);
export const inviteTeamMember = (token: string, email: string, artistName: string) => req('POST', '/team/invite', { email, artistName }, token);
export const removeTeamMember = (token: string, memberId: string) => req('DELETE', `/team/${memberId}`, undefined, token);

// ───��� Admin ───────────────────────────────────────────────────────────────────
export const adminBootstrap      = (email: string, adminSecret: string) => req('POST', '/admin/bootstrap', { email, adminSecret });
export const adminGetStats       = (token: string) => req('GET', '/admin/stats', undefined, token);
export const adminGetTickets     = (token: string) => req('GET', '/admin/tickets', undefined, token);
export const adminUpdateTicket   = (token: string, id: string, d: any) => req('PUT', `/admin/tickets/${id}`, d, token);
export const adminReplyTicket    = (token: string, id: string, d: { content: string }) => req('POST', `/admin/tickets/${id}/reply`, d, token);
export const adminGetMessages    = (token: string, ticketId: string) => req('GET', `/tickets/${ticketId}/messages`, undefined, token);
export const adminGetCampaigns      = (token: string) => req('GET', '/admin/campaigns', undefined, token);
export const adminUpdateCampaign    = (token: string, id: string, d: any) => req('PUT', `/admin/campaigns/${id}`, d, token);
export const adminApproveCampaign   = (token: string, id: string, d?: { adminNotes?: string }) => req('POST', `/admin/campaigns/${id}/approve`, d || {}, token);
export const adminRejectCampaign    = (token: string, id: string, d: { reason: string; adminNotes?: string }) => req('POST', `/admin/campaigns/${id}/reject`, d, token);
export const adminRequestInfo       = (token: string, id: string, d: { message: string }) => req('POST', `/admin/campaigns/${id}/request-info`, d, token);
export const adminGetUsers           = (token: string) => req('GET', '/admin/users', undefined, token);
export const adminAdjustCredits      = (token: string, userId: string, d: { amount: number; reason: string }) => req('PUT', `/admin/users/${userId}/credits`, d, token);
export const adminUpdateUser         = (token: string, userId: string, d: any) => req('PUT', `/admin/users/${userId}`, d, token);
export const adminGetReleases        = (token: string) => req('GET', '/admin/releases', undefined, token);
export const adminUpdateRelease      = (token: string, id: string, d: any) => req('PUT', `/admin/releases/${id}`, d, token);
export const adminGetNotifications   = (token: string) => req('GET', '/admin/notifications', undefined, token);
export const adminReadNotifications  = (token: string, ids?: string[]) => req('POST', '/admin/notifications/read', { ids: ids || [] }, token);
export const adminDeleteNotification = (token: string, notifId: string) => req('DELETE', `/admin/notifications/${notifId}`, undefined, token);

// ──── User Notifications ───────────────────────────────────────────────────────
export const getNotifications  = (token: string) => req('GET', '/notifications', undefined, token);
export const readNotifications = (token: string, ids?: string[]) => req('POST', '/notifications/read', { ids: ids || [] }, token);

// ──── Album Art Generator ─────────────────────────────────────────────────────
export const getAlbumArtStatus = (token: string) => req('GET', '/album-art/status', undefined, token);
export const generateAlbumArt  = (token: string) => req('POST', '/album-art/generate', {}, token);

// ──── Daily SEO Manager ───────────────────────────────────────────────────────
export const seoGetCycles    = (token: string) => req('GET', '/admin/seo/cycles', undefined, token);
export const seoGetCycle     = (token: string, id: string) => req('GET', `/admin/seo/cycles/${id}`, undefined, token);
export const seoGetLatest    = (token: string) => req('GET', '/admin/seo/latest', undefined, token);
export const seoRunCycle     = (token: string, focus?: string) => req('POST', '/admin/seo/run-cycle', { focus }, token);

// ──── Blog (admin publish / unpublish) ────────────────────────────────────────
export const blogPublish     = (token: string, post: any) => req('POST', '/admin/seo/blog/publish', post, token);
export const blogUnpublish   = (token: string, slug: string) => req('DELETE', `/admin/seo/blog/${slug}`, undefined, token);

// ──── Blog (public — no token) ────────────────────────────────────────────────
export const blogGetPosts    = () => req('GET', '/blog/posts');
export const blogGetPost     = (slug: string) => req('GET', `/blog/posts/${slug}`);

// ──── Feature 1: Referral ────────────────────────────────────────────────────
export const getReferral         = (token: string) => req('GET', '/referral', undefined, token);
export const getReferralLeaderboard = (token: string) => req('GET', '/referral/leaderboard', undefined, token);
export const claimReferral       = (code: string, newUserId: string) => req('POST', '/referral/claim', { code, newUserId });

// ──── Feature 2: Pay-per-campaign ────────────────────────────────────────────
export const getCampaignPackages = () => req('GET', '/checkout/campaign-packages');
export const campaignCheckout    = (token: string, packageId: string, successUrl?: string, cancelUrl?: string) => req('POST', '/checkout/campaign-one-time', { packageId, successUrl, cancelUrl }, token);

// ──── Feature 3: Trial ───────────────────────────────────────────────────────
export const getTrialStatus   = (token: string) => req('GET', '/trial/status', undefined, token);
export const activateTrial    = (token: string) => req('POST', '/trial/activate', {}, token);

// ──── Feature 7: Content ID ──────────────────────────────────────────────────
export const getContentID     = (token: string) => req('GET', '/content-id', undefined, token);
export const registerContentID = (token: string, data: any) => req('POST', '/content-id/register', data, token);
export const deleteContentID  = (token: string, trackId: string) => req('DELETE', `/content-id/${trackId}`, undefined, token);

// ──── Feature 8: Demographics ────────────────────────────────────────────────
export const getDemographics  = (token: string) => req('GET', '/analytics/demographics', undefined, token);

// ──── Feature 9: Competitor SEO ──────────────────────────────────────────────
export const getCompetitors   = (token: string) => req('GET', '/admin/seo/competitors', undefined, token);

// ──── Feature 10: A/B Tests ──────────────────────────────────────────────────
export const getABTests       = (token: string) => req('GET', '/admin/ab-tests', undefined, token);
export const createABTest     = (token: string, data: any) => req('POST', '/admin/ab-tests', data, token);
export const updateABTest     = (token: string, id: string, data: any) => req('PUT', `/admin/ab-tests/${id}`, data, token);
export const recordABEvent    = (testId: string, variant: string, event: string) => req('POST', '/ab-tests/event', { testId, variant, event });

// ──── Feature 11: Community ─────────────────────────────────────────────────
export const getCommunityPosts   = (token: string) => req('GET', '/community/posts', undefined, token);
export const createCommunityPost = (token: string, data: any) => req('POST', '/community/posts', data, token);
export const likePost            = (token: string, postId: string) => req('POST', `/community/posts/${postId}/like`, {}, token);
export const deletePost          = (token: string, postId: string) => req('DELETE', `/community/posts/${postId}`, undefined, token);

// ──── Feature 12: Curators ───────────────────────────────────────────────────
export const getCurators      = (token: string, genre?: string, tier?: string) => req('GET', `/curators${genre || tier ? '?' + new URLSearchParams({ ...(genre ? { genre } : {}), ...(tier ? { tier } : {}) }).toString() : ''}`, undefined, token);
export const directPitch      = (token: string, data: any) => req('POST', '/curators/direct-pitch', data, token);

// ──── Feature 13: Academy ────────────────────────────────────────────────────
export const getAcademyProgress  = (token: string) => req('GET', '/academy/progress', undefined, token);
export const completeLesson      = (token: string, lessonId: string, xpEarned: number) => req('POST', '/academy/progress', { lessonId, xpEarned }, token);

// ──── Feature 14: Status ─────────────────────────────────────────────────────
export const getStatus           = () => req('GET', '/status');

// ──── Feature 15: Verification ───────────────────────────────────────────────
export const getVerificationStatus = (token: string) => req('GET', '/verification/status', undefined, token);
export const applyVerification     = (token: string, data: any) => req('POST', '/verification/apply', data, token);
export const adminVerifyUser       = (token: string, userId: string, verified: boolean, badge?: string) => req('PUT', `/admin/users/${userId}/verify`, { verified, badge }, token);

// ──── Feature 16: 2FA ────────────────────────────────────────────────────────
export const get2FAStatus    = (token: string) => req('GET', '/auth/2fa/status', undefined, token);
export const setup2FA        = (token: string) => req('POST', '/auth/2fa/setup', {}, token);
export const confirm2FA      = (token: string, code: string) => req('POST', '/auth/2fa/confirm', { code }, token);
export const disable2FA      = (token: string, code: string) => req('DELETE', '/auth/2fa/disable', { code }, token);

// ──── Feature 18: Win Notifications ───────────────���─────────────────────────
export const checkMilestones = (token: string, totalStreams: number) => req('POST', '/campaigns/check-milestones', { totalStreams }, token);

// ──── Admin Ops: Orders Queue ─────────────────────────────────────────────────
export const adminGetOrders         = (token: string) => req('GET', '/admin/orders', undefined, token);
export const adminGetOrderChecklist = (token: string, id: string) => req('GET', `/admin/orders/${id}/checklist`, undefined, token);
export const adminUpdateChecklist   = (token: string, id: string, d: any) => req('PUT', `/admin/orders/${id}/checklist`, d, token);
export const adminGetActivity       = (token: string, id: string) => req('GET', `/admin/orders/${id}/activity`, undefined, token);
export const adminLogActivity       = (token: string, id: string, d: any) => req('POST', `/admin/orders/${id}/activity`, d, token);

// ──── Admin Ops: Pitches ──────────────────────────────────────────────────────
export const adminGetAllPitches    = (token: string) => req('GET', '/admin/pitches', undefined, token);
export const adminUpdatePitchStatus = (token: string, id: string, d: any) => req('PUT', `/admin/pitches/${id}`, d, token);

// ──── Admin Ops: Curator Network ──────────────────────────────────────────────
export const adminGetCuratorsNetwork    = (token: string) => req('GET', '/admin/curators-network', undefined, token);
export const adminAddCuratorNetwork     = (token: string, d: any) => req('POST', '/admin/curators-network', d, token);
export const adminUpdateCuratorNetwork  = (token: string, id: string, d: any) => req('PUT', `/admin/curators-network/${id}`, d, token);
export const adminDeleteCuratorNetwork  = (token: string, id: string) => req('DELETE', `/admin/curators-network/${id}`, undefined, token);

// ──── Admin Ops: Placements ───────────────────────────────────────────────────
export const adminGetPlacements    = (token: string) => req('GET', '/admin/placements', undefined, token);
export const adminCreatePlacement  = (token: string, d: any) => req('POST', '/admin/placements', d, token);

// ──── Admin Ops: Announcements ────────────────────────────────────────────────
export const adminGetAnnouncements    = (token: string) => req('GET', '/admin/announcements', undefined, token);
export const adminCreateAnnouncement  = (token: string, d: any) => req('POST', '/admin/announcements', d, token);
export const adminUpdateAnnouncement  = (token: string, id: string, d: any) => req('PUT', `/admin/announcements/${id}`, d, token);
export const adminDeleteAnnouncement  = (token: string, id: string) => req('DELETE', `/admin/announcements/${id}`, undefined, token);
export const getActiveAnnouncement    = () => req('GET', '/announcements/active');

// ──── Admin Ops: Promo Codes ──────────────────────────────────────────────────
export const adminGetPromoCodes    = (token: string) => req('GET', '/admin/promo-codes', undefined, token);
export const adminCreatePromoCode  = (token: string, d: any) => req('POST', '/admin/promo-codes', d, token);
export const adminDeletePromoCode  = (token: string, code: string) => req('DELETE', `/admin/promo-codes/${code}`, undefined, token);
export const validatePromoCode     = (code: string) => req('GET', `/promo-codes/${code}/validate`);

// ──── Admin Ops: Website Content ──────────────────────────────────────────────
export const adminGetWebsiteContent    = (token: string) => req('GET', '/admin/website-content', undefined, token);
export const adminUpdateWebsiteContent = (token: string, d: any) => req('PUT', '/admin/website-content', d, token);
export const getWebsiteContent         = () => req('GET', '/website-content');

// ──── Admin Ops: Client Reports ───────────────────────────────────────────────
export const adminGetReports    = (token: string) => req('GET', '/admin/reports', undefined, token);
export const adminCreateReport  = (token: string, d: any) => req('POST', '/admin/reports', d, token);
export const adminGetReport     = (token: string, id: string) => req('GET', `/admin/reports/${id}`, undefined, token);
export const adminSendReport    = (token: string, id: string) => req('POST', `/admin/reports/${id}/send`, {}, token);
export const getPublicReport    = (shareToken: string) => req('GET', `/reports/${shareToken}`);

// ──── Admin Ops: Marketing Email ──────────────────────────────────────────────
export const adminSendMarketingEmail = (token: string, d: any) => req('POST', '/admin/marketing/email', d, token);

// ──── Admin Ops: Revenue ──────────────────────────────────────────────────────
export const adminGetRevenue = (token: string) => req('GET', '/admin/revenue', undefined, token);

// ──── Admin Ops: Push Notify ──────────────────────────────────────────────────
export const adminPushNotify = (token: string, d: any) => req('POST', '/admin/notify', d, token);

// ──── Admin: Creator Network (multi-platform) ──────────────────────────────
export const adminGetCreatorNetwork    = (token: string) => req('GET', '/admin/creator-network', undefined, token);
export const adminAddCreator           = (token: string, d: any) => req('POST', '/admin/creator-network', d, token);
export const adminUpdateCreator        = (token: string, id: string, d: any) => req('PUT', `/admin/creator-network/${id}`, d, token);
export const adminDeleteCreator        = (token: string, id: string) => req('DELETE', `/admin/creator-network/${id}`, undefined, token);

// ──── Admin: Ad Campaign Runner ──────────────────────────────────────────
export const adminGetAdCampaigns        = (token: string) => req('GET', '/admin/ad-campaigns', undefined, token);
export const adminCreateAdCampaign      = (token: string, d: any) => req('POST', '/admin/ad-campaigns', d, token);
export const adminUpdateAdCampaign      = (token: string, id: string, d: any) => req('PUT', `/admin/ad-campaigns/${id}`, d, token);
export const adminUpdateAdPerformance   = (token: string, id: string, d: any) => req('PUT', `/admin/ad-campaigns/${id}/performance`, d, token);
export const adminDeleteAdCampaign      = (token: string, id: string) => req('DELETE', `/admin/ad-campaigns/${id}`, undefined, token);

// ──── Spotify API (admin only) ─────────────────────────────────────────────
export const spotifySearch              = (token: string, q: string, limit = 20, offset = 0, market = 'US') =>
  req('GET', `/spotify/search?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}&market=${market}`, undefined, token);
export const spotifyGetPlaylist         = (token: string, id: string) =>
  req('GET', `/spotify/playlist/${encodeURIComponent(id)}`, undefined, token);
export const spotifyGetUserPlaylists    = (token: string, userId: string, limit = 50, offset = 0) =>
  req('GET', `/spotify/user/${encodeURIComponent(userId)}/playlists?limit=${limit}&offset=${offset}`, undefined, token);
export const spotifyGetCategories       = (token: string, country = 'US') =>
  req('GET', `/spotify/categories?country=${country}&limit=50`, undefined, token);
export const spotifyGetCategoryPlaylists= (token: string, categoryId: string, limit = 20, offset = 0, country = 'US') =>
  req('GET', `/spotify/category/${encodeURIComponent(categoryId)}/playlists?country=${country}&limit=${limit}&offset=${offset}`, undefined, token);
export const spotifyImport              = (token: string, playlists: any[], overrideCostPerPlacement = 0) =>
  req('POST', '/spotify/import', { playlists, overrideCostPerPlacement }, token);
export const spotifyRefreshCreator      = (token: string, creatorId: string) =>
  req('PUT', `/spotify/refresh/${creatorId}`, {}, token);

// ──── Admin: Enhanced User Management ─────────────────────────────────────────
export const adminGetUserProfile     = (token: string, userId: string) => req('GET', `/admin/users/${userId}/profile`, undefined, token);
export const adminSuspendUser        = (token: string, userId: string, d: { suspended: boolean; reason?: string }) => req('PUT', `/admin/users/${userId}/suspend`, d, token);
export const adminChangeUserPlan     = (token: string, userId: string, d: { plan: string; reason?: string }) => req('PUT', `/admin/users/${userId}/plan`, d, token);
export const adminDeleteUser         = (token: string, userId: string) => req('DELETE', `/admin/users/${userId}`, undefined, token);
export const adminEmailUser          = (token: string, userId: string, d: { subject: string; message: string }) => req('POST', `/admin/users/${userId}/email`, d, token);
export const adminAddUserNote        = (token: string, userId: string, d: { note: string; tag?: string }) => req('POST', `/admin/users/${userId}/note`, d, token);
export const adminExportUsers        = (token: string) => req('GET', '/admin/users/export', undefined, token);

// ──── Admin: Release Detail & Notes ───────────────────────────────────────────
export const adminGetRelease        = (token: string, releaseId: string) => req('GET', `/admin/releases/${releaseId}`, undefined, token);
export const adminAddReleaseNote    = (token: string, releaseId: string, d: { text: string; tag?: string }) => req('POST', `/admin/releases/${releaseId}/note`, d, token);
export const adminUpdateReleaseAmp  = (token: string, releaseId: string, ampsuite: any) => req('PUT', `/admin/releases/${releaseId}`, { ampsuite }, token);

// ──── Admin: Global Search ────────────────────────────────────────────────────
export const adminGlobalSearch       = (token: string, q: string) => req('GET', `/admin/search?q=${encodeURIComponent(q)}`, undefined, token);

// ──���─ Admin: Audit Log ───────────────────────────────────────────────────────
export const adminGetAuditLog        = (token: string) => req('GET', '/admin/audit-log', undefined, token);
export const adminLogAction          = (token: string, d: { action: string; meta?: any }) => req('POST', '/admin/audit-log', d, token);

// ──── Admin: Platform Settings ────────────────────────────────────────────────
export const adminGetPlatformSettings   = (token: string) => req('GET', '/admin/platform-settings', undefined, token);
export const adminUpdatePlatformSettings = (token: string, d: any) => req('PUT', '/admin/platform-settings', d, token);

// ──── Admin: System Health ────────────────────────────────────────────────────
export const adminGetSystemHealth    = (token: string) => req('GET', '/admin/system-health', undefined, token);