import { projectId, publicAnonKey } from '/utils/supabase/info';

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

// ──── Onboarding ─────────────────────────────────────────────────────────���───
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

// ──── Works ─────────────────────────────────────────────────────────────���─────
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

// ──── Credits ─────────────────────────────────────────────────────────────────
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

// ──── Admin ───────────────────────────────────────────────────────────────────
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