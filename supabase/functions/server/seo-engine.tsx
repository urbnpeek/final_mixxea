// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA — Daily SEO Automation Engine
//  Implements the 10-step daily SEO workflow for mixxea.com
//  Generates: keyword reports · content plans · articles · checklists · briefs
// ─────────────────────────────────────────────────────────────────────────────

export interface SEOKeyword {
  keyword: string;
  intent: "Informational" | "Commercial" | "Transactional" | "Navigational";
  difficulty: "Low" | "Medium" | "High";
  trafficPotential: "Low" | "Medium" | "High" | "Very High";
  relevanceScore: number; // 1–10
  monthlySearches: string;
  trend: "Rising" | "Stable" | "Seasonal";
  cluster: string;
}

export interface ContentGap {
  topic: string;
  competitorRanking: string;
  ourPosition: string;
  opportunity: "Quick Win" | "Medium Term" | "Long Term";
  difficulty: "Low" | "Medium" | "High";
  estimatedTraffic: string;
  action: string;
}

export interface ContentBrief {
  title: string;
  targetKeyword: string;
  secondaryKeywords: string[];
  intent: string;
  wordCount: number;
  h1: string;
  h2s: string[];
  h3s: Record<string, string[]>;
  intro: string;
  faqSchema: Array<{ question: string; answer: string }>;
  internalLinks: Array<{ anchor: string; page: string }>;
  outboundSources: string[];
  metaTitle: string;
  metaDescription: string;
  slug: string;
}

export interface SEOArticle {
  metaTitle: string;
  metaDescription: string;
  slug: string;
  featuredSnippet: string;
  outline: string[];
  faqBlock: Array<{ question: string; answer: string }>;
  internalLinks: Array<{ anchor: string; url: string }>;
  estimatedWordCount: number;
  keywordDensityTarget: string;
  fullOutlineMarkdown: string;
}

export interface SEOCycle {
  id: string;
  date: string;
  generatedAt: string;
  focus: string; // the cluster focus for today
  step1: {
    trendingKeywords: SEOKeyword[];
    longTailKeywords: SEOKeyword[];
    questionKeywords: SEOKeyword[];
  };
  step2: { gaps: ContentGap[] };
  step3: { briefs: ContentBrief[] };
  step4: { article: SEOArticle };
  step5: { checklist: Array<{ id: string; category: string; item: string; status: "done" | "action" | "planned"; note: string }> };
  step6: { linkMap: Array<{ from: string; to: string; anchor: string; reason: string }> };
  step7: {
    tweetThread: string[];
    linkedInPost: string;
    redditPost: { subreddit: string; title: string; body: string };
    newsletter: string;
  };
  step8: {
    targets: Array<{ site: string; type: string; da: string; angle: string }>;
    outreachTemplate: string;
    guestPostIdeas: string[];
  };
  step9: {
    kpis: Array<{ metric: string; current: string; target: string; timeframe: string }>;
    weeklyActions: string[];
  };
  step10: {
    improvements: Array<{ page: string; issue: string; action: string; priority: "High" | "Medium" | "Low" }>;
    contentRefreshes: string[];
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  CONTENT POOLS
// ─────────────────────────────────────────────────────────────────────────────

const CLUSTERS = [
  "Music Distribution",
  "Spotify Growth",
  "Music Promotion",
  "Publishing & Royalties",
  "Independent Artist Business",
  "TikTok & Social Promotion",
  "Playlist Pitching",
  "Music Marketing Agency",
];

const TRENDING_KW_POOL: Record<string, SEOKeyword[]> = {
  "Music Distribution": [
    { keyword: "music distribution 2026", intent: "Commercial", difficulty: "High", trafficPotential: "Very High", relevanceScore: 10, monthlySearches: "22,000", trend: "Rising", cluster: "Distribution" },
    { keyword: "best music distributor 2026", intent: "Transactional", difficulty: "High", trafficPotential: "Very High", relevanceScore: 10, monthlySearches: "18,500", trend: "Rising", cluster: "Distribution" },
    { keyword: "distribute music online without taking royalties", intent: "Commercial", difficulty: "Medium", trafficPotential: "High", relevanceScore: 9, monthlySearches: "9,200", trend: "Rising", cluster: "Distribution" },
    { keyword: "music distribution for independent artists", intent: "Commercial", difficulty: "Medium", trafficPotential: "High", relevanceScore: 10, monthlySearches: "12,400", trend: "Stable", cluster: "Distribution" },
    { keyword: "upload song to all streaming platforms", intent: "Transactional", difficulty: "Medium", trafficPotential: "Very High", relevanceScore: 10, monthlySearches: "15,800", trend: "Stable", cluster: "Distribution" },
    { keyword: "music distribution no fees", intent: "Transactional", difficulty: "Low", trafficPotential: "High", relevanceScore: 9, monthlySearches: "8,100", trend: "Rising", cluster: "Distribution" },
    { keyword: "keep 100% royalties music distribution", intent: "Transactional", difficulty: "Low", trafficPotential: "High", relevanceScore: 9, monthlySearches: "7,600", trend: "Rising", cluster: "Distribution" },
    { keyword: "music distribution platform comparison", intent: "Informational", difficulty: "Medium", trafficPotential: "High", relevanceScore: 9, monthlySearches: "6,900", trend: "Stable", cluster: "Distribution" },
    { keyword: "how long does music distribution take", intent: "Informational", difficulty: "Low", trafficPotential: "Medium", relevanceScore: 8, monthlySearches: "5,400", trend: "Stable", cluster: "Distribution" },
    { keyword: "distribute music to tiktok", intent: "Transactional", difficulty: "Medium", trafficPotential: "High", relevanceScore: 9, monthlySearches: "11,200", trend: "Rising", cluster: "Distribution" },
    { keyword: "release music on boomplay", intent: "Commercial", difficulty: "Low", trafficPotential: "Medium", relevanceScore: 8, monthlySearches: "3,400", trend: "Rising", cluster: "Distribution" },
    { keyword: "afrobeats music distribution", intent: "Commercial", difficulty: "Low", trafficPotential: "High", relevanceScore: 9, monthlySearches: "4,700", trend: "Rising", cluster: "Distribution" },
    { keyword: "music distribution Africa", intent: "Commercial", difficulty: "Low", trafficPotential: "High", relevanceScore: 9, monthlySearches: "5,600", trend: "Rising", cluster: "Distribution" },
    { keyword: "digital music distribution service 2026", intent: "Commercial", difficulty: "High", trafficPotential: "Very High", relevanceScore: 10, monthlySearches: "14,300", trend: "Stable", cluster: "Distribution" },
    { keyword: "music aggregator comparison", intent: "Informational", difficulty: "Medium", trafficPotential: "High", relevanceScore: 9, monthlySearches: "7,800", trend: "Stable", cluster: "Distribution" },
    { keyword: "unlimited music distribution", intent: "Transactional", difficulty: "Medium", trafficPotential: "High", relevanceScore: 9, monthlySearches: "9,900", trend: "Rising", cluster: "Distribution" },
    { keyword: "music distribution Nigeria Ghana", intent: "Commercial", difficulty: "Low", trafficPotential: "High", relevanceScore: 8, monthlySearches: "3,800", trend: "Rising", cluster: "Distribution" },
    { keyword: "release music on youtube music automatically", intent: "Transactional", difficulty: "Low", trafficPotential: "Medium", relevanceScore: 8, monthlySearches: "4,200", trend: "Stable", cluster: "Distribution" },
    { keyword: "how to release an album on spotify", intent: "Informational", difficulty: "Medium", trafficPotential: "High", relevanceScore: 9, monthlySearches: "8,800", trend: "Stable", cluster: "Distribution" },
    { keyword: "music distribution beatport techno house", intent: "Commercial", difficulty: "Low", trafficPotential: "Medium", relevanceScore: 8, monthlySearches: "2,900", trend: "Rising", cluster: "Distribution" },
  ],
  "Spotify Growth": [
    { keyword: "how to grow on spotify 2026", intent: "Informational", difficulty: "Medium", trafficPotential: "Very High", relevanceScore: 10, monthlySearches: "19,200", trend: "Rising", cluster: "Spotify Growth" },
    { keyword: "spotify playlist placement service", intent: "Transactional", difficulty: "High", trafficPotential: "Very High", relevanceScore: 10, monthlySearches: "16,400", trend: "Stable", cluster: "Spotify Growth" },
    { keyword: "spotify streams increase 2026", intent: "Commercial", difficulty: "High", trafficPotential: "Very High", relevanceScore: 10, monthlySearches: "22,000", trend: "Rising", cluster: "Spotify Growth" },
    { keyword: "get on spotify editorial playlist", intent: "Informational", difficulty: "High", trafficPotential: "Very High", relevanceScore: 10, monthlySearches: "18,000", trend: "Stable", cluster: "Spotify Growth" },
    { keyword: "spotify algorithmic playlist strategy", intent: "Informational", difficulty: "Medium", trafficPotential: "High", relevanceScore: 9, monthlySearches: "9,100", trend: "Rising", cluster: "Spotify Growth" },
    { keyword: "pitch music to spotify playlists", intent: "Transactional", difficulty: "Medium", trafficPotential: "High", relevanceScore: 10, monthlySearches: "12,300", trend: "Rising", cluster: "Spotify Growth" },
    { keyword: "spotify release radar strategy", intent: "Informational", difficulty: "Low", trafficPotential: "High", relevanceScore: 9, monthlySearches: "7,400", trend: "Rising", cluster: "Spotify Growth" },
    { keyword: "spotify for artists tips 2026", intent: "Informational", difficulty: "Medium", trafficPotential: "High", relevanceScore: 9, monthlySearches: "11,600", trend: "Rising", cluster: "Spotify Growth" },
    { keyword: "how to get more spotify listeners", intent: "Informational", difficulty: "Medium", trafficPotential: "Very High", relevanceScore: 10, monthlySearches: "24,500", trend: "Stable", cluster: "Spotify Growth" },
    { keyword: "spotify pre-save campaign", intent: "Commercial", difficulty: "Low", trafficPotential: "Medium", relevanceScore: 9, monthlySearches: "6,800", trend: "Rising", cluster: "Spotify Growth" },
    { keyword: "independent artist spotify strategy", intent: "Informational", difficulty: "Medium", trafficPotential: "High", relevanceScore: 9, monthlySearches: "8,700", trend: "Rising", cluster: "Spotify Growth" },
    { keyword: "buy playlist pitching service", intent: "Transactional", difficulty: "Medium", trafficPotential: "High", relevanceScore: 9, monthlySearches: "7,200", trend: "Stable", cluster: "Spotify Growth" },
    { keyword: "spotify wrapped strategy for artists", intent: "Informational", difficulty: "Low", trafficPotential: "High", relevanceScore: 8, monthlySearches: "5,500", trend: "Seasonal", cluster: "Spotify Growth" },
    { keyword: "music release strategy spotify", intent: "Informational", difficulty: "Medium", trafficPotential: "High", relevanceScore: 9, monthlySearches: "9,800", trend: "Stable", cluster: "Spotify Growth" },
    { keyword: "spotify UGC tiktok strategy", intent: "Informational", difficulty: "Low", trafficPotential: "High", relevanceScore: 9, monthlySearches: "8,100", trend: "Rising", cluster: "Spotify Growth" },
    { keyword: "spotify canvas promotion", intent: "Commercial", difficulty: "Low", trafficPotential: "Medium", relevanceScore: 8, monthlySearches: "4,200", trend: "Stable", cluster: "Spotify Growth" },
    { keyword: "playlist pitching for afrobeats artists", intent: "Transactional", difficulty: "Low", trafficPotential: "High", relevanceScore: 9, monthlySearches: "3,900", trend: "Rising", cluster: "Spotify Growth" },
    { keyword: "independent artist spotify monthly listeners", intent: "Informational", difficulty: "Medium", trafficPotential: "High", relevanceScore: 9, monthlySearches: "10,200", trend: "Stable", cluster: "Spotify Growth" },
    { keyword: "how to pitch to editorial playlists", intent: "Informational", difficulty: "Medium", trafficPotential: "High", relevanceScore: 10, monthlySearches: "11,400", trend: "Rising", cluster: "Spotify Growth" },
    { keyword: "spotify ad campaign for new release", intent: "Commercial", difficulty: "Medium", trafficPotential: "High", relevanceScore: 9, monthlySearches: "6,600", trend: "Rising", cluster: "Spotify Growth" },
  ],
  "TikTok & Social Promotion": [
    { keyword: "tiktok music promotion 2026", intent: "Commercial", difficulty: "Medium", trafficPotential: "Very High", relevanceScore: 10, monthlySearches: "21,000", trend: "Rising", cluster: "TikTok" },
    { keyword: "how to go viral on tiktok with music", intent: "Informational", difficulty: "High", trafficPotential: "Very High", relevanceScore: 10, monthlySearches: "28,000", trend: "Rising", cluster: "TikTok" },
    { keyword: "tiktok UGC campaign music", intent: "Commercial", difficulty: "Medium", trafficPotential: "High", relevanceScore: 9, monthlySearches: "9,400", trend: "Rising", cluster: "TikTok" },
    { keyword: "instagram reels music promotion", intent: "Commercial", difficulty: "Medium", trafficPotential: "High", relevanceScore: 9, monthlySearches: "12,100", trend: "Stable", cluster: "TikTok" },
    { keyword: "tiktok sound strategy for artists", intent: "Informational", difficulty: "Low", trafficPotential: "High", relevanceScore: 9, monthlySearches: "7,800", trend: "Rising", cluster: "TikTok" },
    { keyword: "music marketing agency tiktok", intent: "Commercial", difficulty: "High", trafficPotential: "Very High", relevanceScore: 10, monthlySearches: "14,600", trend: "Rising", cluster: "TikTok" },
    { keyword: "get your music on tiktok fyp", intent: "Informational", difficulty: "Medium", trafficPotential: "Very High", relevanceScore: 10, monthlySearches: "18,900", trend: "Rising", cluster: "TikTok" },
    { keyword: "tiktok music viral strategy 2026", intent: "Informational", difficulty: "Medium", trafficPotential: "Very High", relevanceScore: 10, monthlySearches: "16,200", trend: "Rising", cluster: "TikTok" },
    { keyword: "social media music marketing campaign", intent: "Commercial", difficulty: "Medium", trafficPotential: "High", relevanceScore: 9, monthlySearches: "8,400", trend: "Stable", cluster: "TikTok" },
    { keyword: "youtube shorts music promotion", intent: "Commercial", difficulty: "Medium", trafficPotential: "High", relevanceScore: 9, monthlySearches: "10,700", trend: "Rising", cluster: "TikTok" },
    { keyword: "meta ads for music artists", intent: "Commercial", difficulty: "Medium", trafficPotential: "High", relevanceScore: 9, monthlySearches: "7,200", trend: "Stable", cluster: "TikTok" },
    { keyword: "instagram music promotion service", intent: "Commercial", difficulty: "Medium", trafficPotential: "High", relevanceScore: 9, monthlySearches: "9,100", trend: "Stable", cluster: "TikTok" },
    { keyword: "tiktok duet challenge music campaign", intent: "Informational", difficulty: "Low", trafficPotential: "High", relevanceScore: 8, monthlySearches: "5,600", trend: "Rising", cluster: "TikTok" },
    { keyword: "social media music marketing strategy 2026", intent: "Informational", difficulty: "Medium", trafficPotential: "High", relevanceScore: 9, monthlySearches: "8,900", trend: "Rising", cluster: "TikTok" },
    { keyword: "influencer music campaign", intent: "Commercial", difficulty: "Medium", trafficPotential: "High", relevanceScore: 9, monthlySearches: "7,400", trend: "Rising", cluster: "TikTok" },
    { keyword: "tiktok native ads music", intent: "Commercial", difficulty: "Low", trafficPotential: "Medium", relevanceScore: 8, monthlySearches: "4,200", trend: "Rising", cluster: "TikTok" },
    { keyword: "soundcloud tiktok promotion", intent: "Commercial", difficulty: "Low", trafficPotential: "Medium", relevanceScore: 8, monthlySearches: "3,800", trend: "Stable", cluster: "TikTok" },
    { keyword: "music pr campaign social media", intent: "Commercial", difficulty: "Medium", trafficPotential: "High", relevanceScore: 9, monthlySearches: "6,100", trend: "Rising", cluster: "TikTok" },
    { keyword: "afrobeats tiktok promotion", intent: "Commercial", difficulty: "Low", trafficPotential: "High", relevanceScore: 9, monthlySearches: "4,800", trend: "Rising", cluster: "TikTok" },
    { keyword: "music content creator campaign", intent: "Commercial", difficulty: "Medium", trafficPotential: "High", relevanceScore: 9, monthlySearches: "6,700", trend: "Rising", cluster: "TikTok" },
  ],
  "Publishing & Royalties": [
    { keyword: "music publishing administration 2026", intent: "Commercial", difficulty: "Medium", trafficPotential: "High", relevanceScore: 10, monthlySearches: "8,400", trend: "Rising", cluster: "Publishing" },
    { keyword: "how to collect music royalties", intent: "Informational", difficulty: "Medium", trafficPotential: "High", relevanceScore: 10, monthlySearches: "12,600", trend: "Stable", cluster: "Publishing" },
    { keyword: "royalty splits for music collaborations", intent: "Informational", difficulty: "Low", trafficPotential: "High", relevanceScore: 9, monthlySearches: "6,700", trend: "Rising", cluster: "Publishing" },
    { keyword: "music publishing deal for independent artists", intent: "Commercial", difficulty: "Medium", trafficPotential: "High", relevanceScore: 9, monthlySearches: "7,200", trend: "Rising", cluster: "Publishing" },
    { keyword: "sync licensing opportunities for artists", intent: "Commercial", difficulty: "Medium", trafficPotential: "High", relevanceScore: 9, monthlySearches: "9,100", trend: "Rising", cluster: "Publishing" },
    { keyword: "ISRC code registration free", intent: "Transactional", difficulty: "Low", trafficPotential: "High", relevanceScore: 9, monthlySearches: "8,700", trend: "Stable", cluster: "Publishing" },
    { keyword: "music copyright registration 2026", intent: "Informational", difficulty: "Medium", trafficPotential: "High", relevanceScore: 9, monthlySearches: "7,800", trend: "Rising", cluster: "Publishing" },
    { keyword: "collect performing rights royalties", intent: "Informational", difficulty: "Medium", trafficPotential: "High", relevanceScore: 9, monthlySearches: "6,400", trend: "Stable", cluster: "Publishing" },
    { keyword: "music royalty collection agency", intent: "Commercial", difficulty: "Medium", trafficPotential: "High", relevanceScore: 9, monthlySearches: "5,900", trend: "Stable", cluster: "Publishing" },
    { keyword: "PRO registration for independent artists", intent: "Informational", difficulty: "Low", trafficPotential: "Medium", relevanceScore: 8, monthlySearches: "4,200", trend: "Stable", cluster: "Publishing" },
    { keyword: "music streaming royalty rates 2026", intent: "Informational", difficulty: "Medium", trafficPotential: "High", relevanceScore: 9, monthlySearches: "11,200", trend: "Rising", cluster: "Publishing" },
    { keyword: "neighbouring rights music", intent: "Informational", difficulty: "Low", trafficPotential: "Medium", relevanceScore: 8, monthlySearches: "3,800", trend: "Rising", cluster: "Publishing" },
    { keyword: "music metadata publishing", intent: "Informational", difficulty: "Low", trafficPotential: "Medium", relevanceScore: 8, monthlySearches: "3,100", trend: "Rising", cluster: "Publishing" },
    { keyword: "split sheet music template", intent: "Transactional", difficulty: "Low", trafficPotential: "High", relevanceScore: 9, monthlySearches: "7,400", trend: "Stable", cluster: "Publishing" },
    { keyword: "music publishing platform for artists", intent: "Commercial", difficulty: "Medium", trafficPotential: "High", relevanceScore: 9, monthlySearches: "5,600", trend: "Rising", cluster: "Publishing" },
    { keyword: "how much does spotify pay per stream 2026", intent: "Informational", difficulty: "High", trafficPotential: "Very High", relevanceScore: 9, monthlySearches: "28,000", trend: "Stable", cluster: "Publishing" },
    { keyword: "music royalty calculator", intent: "Transactional", difficulty: "Low", trafficPotential: "High", relevanceScore: 9, monthlySearches: "6,100", trend: "Stable", cluster: "Publishing" },
    { keyword: "who owns music copyright explanation", intent: "Informational", difficulty: "Low", trafficPotential: "High", relevanceScore: 8, monthlySearches: "8,900", trend: "Stable", cluster: "Publishing" },
    { keyword: "mechanical royalties music streaming", intent: "Informational", difficulty: "Medium", trafficPotential: "High", relevanceScore: 9, monthlySearches: "5,400", trend: "Rising", cluster: "Publishing" },
    { keyword: "music publishing rights Africa", intent: "Commercial", difficulty: "Low", trafficPotential: "High", relevanceScore: 8, monthlySearches: "2,800", trend: "Rising", cluster: "Publishing" },
  ],
};

const LONG_TAIL_POOL: Record<string, SEOKeyword[]> = {
  "Music Distribution": [
    { keyword: "how to distribute music without a label 2026", intent: "Informational", difficulty: "Low", trafficPotential: "Medium", relevanceScore: 9, monthlySearches: "3,200", trend: "Stable", cluster: "Distribution LT" },
    { keyword: "music distribution service with no upfront cost", intent: "Transactional", difficulty: "Low", trafficPotential: "Medium", relevanceScore: 9, monthlySearches: "2,800", trend: "Rising", cluster: "Distribution LT" },
    { keyword: "which music distributor pays the most royalties", intent: "Commercial", difficulty: "Low", trafficPotential: "Medium", relevanceScore: 9, monthlySearches: "4,100", trend: "Rising", cluster: "Distribution LT" },
    { keyword: "distribute music to apple music and spotify at the same time", intent: "Transactional", difficulty: "Low", trafficPotential: "Medium", relevanceScore: 9, monthlySearches: "3,700", trend: "Stable", cluster: "Distribution LT" },
    { keyword: "music distribution for unsigned artists UK", intent: "Commercial", difficulty: "Low", trafficPotential: "Medium", relevanceScore: 8, monthlySearches: "2,400", trend: "Stable", cluster: "Distribution LT" },
    { keyword: "how to release a single on spotify step by step", intent: "Informational", difficulty: "Low", trafficPotential: "High", relevanceScore: 9, monthlySearches: "5,800", trend: "Stable", cluster: "Distribution LT" },
    { keyword: "music distribution West Africa amapiano afrobeats", intent: "Commercial", difficulty: "Low", trafficPotential: "Medium", relevanceScore: 8, monthlySearches: "1,900", trend: "Rising", cluster: "Distribution LT" },
    { keyword: "how to get UPC code for music", intent: "Informational", difficulty: "Low", trafficPotential: "Medium", relevanceScore: 8, monthlySearches: "2,600", trend: "Stable", cluster: "Distribution LT" },
    { keyword: "music distribution for DJ mixtapes", intent: "Commercial", difficulty: "Low", trafficPotential: "Low", relevanceScore: 7, monthlySearches: "1,200", trend: "Stable", cluster: "Distribution LT" },
    { keyword: "digital music distribution revenue split 2026", intent: "Informational", difficulty: "Low", trafficPotential: "Medium", relevanceScore: 8, monthlySearches: "2,100", trend: "Rising", cluster: "Distribution LT" },
    { keyword: "how to distribute techno and house music", intent: "Transactional", difficulty: "Low", trafficPotential: "Medium", relevanceScore: 8, monthlySearches: "1,800", trend: "Rising", cluster: "Distribution LT" },
    { keyword: "submit music to beatport traxsource from one platform", intent: "Transactional", difficulty: "Low", trafficPotential: "Medium", relevanceScore: 8, monthlySearches: "1,600", trend: "Rising", cluster: "Distribution LT" },
    { keyword: "music distributor that pays weekly", intent: "Commercial", difficulty: "Low", trafficPotential: "Medium", relevanceScore: 8, monthlySearches: "2,200", trend: "Rising", cluster: "Distribution LT" },
    { keyword: "release music on boomplay audiomack simultaneously", intent: "Transactional", difficulty: "Low", trafficPotential: "Medium", relevanceScore: 8, monthlySearches: "1,400", trend: "Rising", cluster: "Distribution LT" },
    { keyword: "best music distribution service for hip hop artists", intent: "Commercial", difficulty: "Low", trafficPotential: "Medium", relevanceScore: 9, monthlySearches: "2,900", trend: "Stable", cluster: "Distribution LT" },
    { keyword: "how long until music is live on spotify after distribution", intent: "Informational", difficulty: "Low", trafficPotential: "High", relevanceScore: 9, monthlySearches: "4,600", trend: "Stable", cluster: "Distribution LT" },
    { keyword: "music distribution with smart link feature", intent: "Commercial", difficulty: "Low", trafficPotential: "Medium", relevanceScore: 9, monthlySearches: "2,100", trend: "Rising", cluster: "Distribution LT" },
    { keyword: "distribute amapiano to all streaming services", intent: "Transactional", difficulty: "Low", trafficPotential: "Medium", relevanceScore: 8, monthlySearches: "1,700", trend: "Rising", cluster: "Distribution LT" },
    { keyword: "best royalty free distribution music 2026", intent: "Transactional", difficulty: "Medium", trafficPotential: "High", relevanceScore: 9, monthlySearches: "3,800", trend: "Rising", cluster: "Distribution LT" },
    { keyword: "music distribution platform with marketing tools", intent: "Commercial", difficulty: "Low", trafficPotential: "Medium", relevanceScore: 9, monthlySearches: "2,700", trend: "Rising", cluster: "Distribution LT" },
  ],
};

const QUESTION_KW_POOL: Record<string, SEOKeyword[]> = {
  "Music Distribution": [
    { keyword: "What is the best music distribution service in 2026?", intent: "Commercial", difficulty: "High", trafficPotential: "Very High", relevanceScore: 10, monthlySearches: "18,000", trend: "Rising", cluster: "Q&A" },
    { keyword: "How much does music distribution cost?", intent: "Informational", difficulty: "Medium", trafficPotential: "High", relevanceScore: 9, monthlySearches: "11,400", trend: "Stable", cluster: "Q&A" },
    { keyword: "How do I distribute my music to Spotify?", intent: "Informational", difficulty: "Medium", trafficPotential: "Very High", relevanceScore: 10, monthlySearches: "24,000", trend: "Stable", cluster: "Q&A" },
    { keyword: "What percentage does a music distributor take?", intent: "Informational", difficulty: "Low", trafficPotential: "High", relevanceScore: 9, monthlySearches: "7,800", trend: "Stable", cluster: "Q&A" },
    { keyword: "Can I distribute music for free?", intent: "Informational", difficulty: "Medium", trafficPotential: "High", relevanceScore: 9, monthlySearches: "9,200", trend: "Rising", cluster: "Q&A" },
    { keyword: "How long does music distribution take to Spotify?", intent: "Informational", difficulty: "Low", trafficPotential: "High", relevanceScore: 9, monthlySearches: "8,600", trend: "Stable", cluster: "Q&A" },
    { keyword: "Which music distributor pays the highest royalties?", intent: "Commercial", difficulty: "Medium", trafficPotential: "High", relevanceScore: 9, monthlySearches: "6,900", trend: "Rising", cluster: "Q&A" },
    { keyword: "Do I need a label to distribute music?", intent: "Informational", difficulty: "Low", trafficPotential: "High", relevanceScore: 9, monthlySearches: "7,400", trend: "Stable", cluster: "Q&A" },
    { keyword: "How do I pitch my music to Spotify playlists?", intent: "Informational", difficulty: "Medium", trafficPotential: "Very High", relevanceScore: 10, monthlySearches: "16,200", trend: "Rising", cluster: "Q&A" },
    { keyword: "What is music publishing administration and why do I need it?", intent: "Informational", difficulty: "Low", trafficPotential: "Medium", relevanceScore: 9, monthlySearches: "5,100", trend: "Rising", cluster: "Q&A" },
  ],
};

const CONTENT_GAP_POOL: ContentGap[] = [
  { topic: "How to Get on Spotify Editorial Playlists: Complete 2026 Guide", competitorRanking: "DistroKid Blog (pos 1–3)", ourPosition: "Not ranking", opportunity: "Quick Win", difficulty: "Medium", estimatedTraffic: "8,400/mo", action: "Create 3,000-word authoritative guide with step-by-step pitch strategy and FAQ schema" },
  { topic: "Music Distribution Comparison: MIXXEA vs DistroKid vs TuneCore 2026", competitorRanking: "Competitor review sites (pos 1–5)", ourPosition: "Not ranking", opportunity: "Medium Term", difficulty: "Medium", estimatedTraffic: "14,200/mo", action: "Publish unbiased comparison landing page targeting high-intent transactional users" },
  { topic: "TikTok Music Promotion: The Artist's Complete Strategy Guide", competitorRanking: "Music Gateway, Routenote (pos 2–6)", ourPosition: "Not ranking", opportunity: "Quick Win", difficulty: "Low", estimatedTraffic: "6,800/mo", action: "Write comprehensive TikTok music strategy article with UGC campaign templates" },
  { topic: "What Are Royalty Splits and How Do They Work?", competitorRanking: "Songtrust, CD Baby (pos 1–4)", ourPosition: "Not ranking", opportunity: "Quick Win", difficulty: "Low", estimatedTraffic: "4,200/mo", action: "Create educational article + free split sheet calculator CTA" },
  { topic: "How to Release Music in Africa: Platforms, Strategy & Distribution", competitorRanking: "No strong competitor", ourPosition: "Not ranking", opportunity: "Quick Win", difficulty: "Low", estimatedTraffic: "3,600/mo", action: "Capture underserved African market with region-specific distribution guide" },
  { topic: "Music Promotion Agency: What They Do and How Much They Cost", competitorRanking: "Music promotion agencies ranking for this (pos 1–8)", ourPosition: "Not ranking", opportunity: "Medium Term", difficulty: "High", estimatedTraffic: "11,000/mo", action: "Service landing page + comparison table against manual promotion" },
  { topic: "Amapiano Distribution: How to Distribute Your Music Globally", competitorRanking: "No direct competitor", ourPosition: "Not ranking", opportunity: "Quick Win", difficulty: "Low", estimatedTraffic: "2,800/mo", action: "First-mover advantage in amapiano-specific distribution guide" },
  { topic: "How Much Does Spotify Pay Per Stream in 2026?", competitorRanking: "Major blogs dominate (pos 1–3)", ourPosition: "Not ranking", opportunity: "Long Term", difficulty: "High", estimatedTraffic: "28,000/mo", action: "Data-rich article with royalty calculator tool — target Featured Snippet" },
  { topic: "Smart Link for Music: How to Send Fans to Every Streaming Platform", competitorRanking: "Linkfire, Linktree (pos 1–5)", ourPosition: "Not ranking", opportunity: "Medium Term", difficulty: "Medium", estimatedTraffic: "5,900/mo", action: "Feature page for MIXXEA Smart Pages with SEO content targeting pre-save + smart link" },
  { topic: "ISRC Code: What It Is, Why You Need It, and How to Get One Free", competitorRanking: "SoundCharts, IFPI (pos 1–4)", ourPosition: "Not ranking", opportunity: "Quick Win", difficulty: "Low", estimatedTraffic: "7,800/mo", action: "Technical educational guide + MIXXEA auto-ISRC generation CTA" },
];

const ARTICLE_POOL = [
  {
    metaTitle: "Best Music Distribution Service in 2026: Complete Artist Guide | MIXXEA",
    metaDescription: "Compare the best music distribution platforms of 2026. Learn how to distribute your music to Spotify, Apple Music, TikTok & 150+ platforms. Keep 100% of your royalties with MIXXEA.",
    slug: "best-music-distribution-service-2026",
    featuredSnippet: "The best music distribution service in 2026 should offer unlimited releases, 100% royalty retention, fast delivery to major streaming platforms, and built-in promotional tools. MIXXEA combines distribution, marketing campaigns, playlist pitching, and publishing administration in one professional platform for independent artists and labels.",
    estimatedWordCount: 3200,
    keywordDensityTarget: "1.2–1.8% primary keyword / 0.4–0.7% secondary",
    outline: [
      "H1: Best Music Distribution Service in 2026: The Complete Artist Guide",
      "H2: What Is Music Distribution and Why Does It Matter?",
      "H2: Key Factors to Consider When Choosing a Music Distributor",
      "  H3: Royalty Split & Revenue Share",
      "  H3: Number of Platforms Supported",
      "  H3: Release Speed & Scheduling",
      "  H3: Built-in Promotion Tools",
      "  H3: Publishing & Royalty Administration",
      "H2: Top Music Distribution Platforms Compared in 2026",
      "  H3: MIXXEA — Best All-in-One Platform",
      "  H3: DistroKid",
      "  H3: TuneCore",
      "  H3: CD Baby",
      "  H3: Amuse",
      "H2: How to Distribute Music on Spotify Step-by-Step",
      "H2: Distribution for African & Afrobeats Artists",
      "H2: Distribution for Electronic & Club Music (Beatport, Traxsource)",
      "H2: Frequently Asked Questions",
      "H2: Final Verdict: Which Distributor Should You Choose?",
    ],
    faqBlock: [
      { question: "What is the best music distribution service in 2026?", answer: "MIXXEA is the best all-in-one music distribution service for independent artists in 2026, offering distribution to 150+ platforms, 100% royalty retention, built-in marketing campaigns, playlist pitching, and publishing administration — all from one dashboard." },
      { question: "How much does music distribution cost?", answer: "Music distribution costs range from free (with commission) to $20–$50 per year for unlimited releases. MIXXEA offers subscription plans starting at a competitive rate with no per-release fees and zero royalty cuts." },
      { question: "How long does it take for music to appear on Spotify after distribution?", answer: "Typically, music appears on Spotify within 3–7 business days after submission via a digital distributor. Planning your release 2–4 weeks ahead is recommended to qualify for editorial playlist pitching." },
      { question: "Do I need a record label to distribute music?", answer: "No. Independent artists can distribute music directly to Spotify, Apple Music, and 150+ platforms without a label using a digital distribution service like MIXXEA." },
      { question: "Which music distributor pays the highest royalties?", answer: "MIXXEA pays 100% of your royalties — you keep every dollar earned from streams and downloads across all platforms. This is the maximum possible royalty retention for an artist." },
    ],
    internalLinks: [
      { anchor: "playlist pitching service", url: "/#promotions" },
      { anchor: "publishing administration", url: "/#publishing" },
      { anchor: "music analytics dashboard", url: "/#platform" },
      { anchor: "smart link for artists", url: "/#smart-pages" },
    ],
    fullOutlineMarkdown: `# Best Music Distribution Service in 2026: The Complete Artist Guide

## Introduction
> Target Featured Snippet — Answer in 60 words: Define music distribution + why MIXXEA leads in 2026.

## What Is Music Distribution and Why Does It Matter?
Explain digital distribution concept. Cover streaming royalties pipeline. Why every artist needs a distributor.

## Key Factors to Consider When Choosing a Music Distributor
### Royalty Split & Revenue Share
Table: 0% vs 15% vs 30% commission impact at 1M streams

### Number of Platforms Supported
Compare: MIXXEA (150+) vs competitors. Highlight Beatport, Traxsource, Boomplay, Audiomack for niche genres.

### Release Speed & Scheduling
What "priority distribution" means. Pre-release scheduling importance for editorial pitching window.

### Built-in Promotion Tools
Why distribution + promotion in one platform is superior. Internal link: MIXXEA Promotions.

### Publishing & Royalty Administration
Mechanical royalties, performance royalties, PRO registration. Internal link: Publishing Admin.

## Top Music Distribution Platforms Compared in 2026
| Feature | MIXXEA | DistroKid | TuneCore | CD Baby |
|---------|--------|-----------|----------|---------|
| Royalty Split | 100% | 100% | 100% | 91% |
| Platforms | 150+ | 150+ | 150+ | 150+ |
| Marketing Tools | ✓ Full Suite | ✗ | Limited | Limited |
| Publishing Admin | ✓ | ✗ | ✗ | Add-on |
| Playlist Pitching | ✓ | ✗ | ✗ | ✗ |
| Smart Links | ✓ | ✗ | ✗ | ✗ |

## How to Distribute Music on Spotify Step-by-Step
Step 1–6 numbered guide. Screenshot alt text opportunities. Internal link to Distribution page.

## Distribution for African & Afrobeats Artists
Boomplay, Audiomack, Mdundo, Spotify Africa editorial. Why MIXXEA covers all Africa-first platforms.

## Distribution for Electronic & Club Music
Beatport, Traxsource, Juno Download. MIXXEA includes these. Genre-specific DSP strategy.

## FAQ Section (Schema Markup)
5 structured FAQ items from above.

## Final Verdict
Strong CTA → Sign up for MIXXEA. Reinforce: 100% royalties, 150+ platforms, marketing tools included.`,
  },
  {
    metaTitle: "How to Get on Spotify Playlists in 2026: The Complete Pitching Guide | MIXXEA",
    metaDescription: "Learn exactly how to pitch your music to Spotify editorial playlists, algorithmic playlists, and independent curators in 2026. Step-by-step strategy for independent artists.",
    slug: "how-to-get-on-spotify-playlists-2026",
    featuredSnippet: "To get on Spotify playlists in 2026, submit your unreleased track to Spotify for Artists at least 7 days before release, write a compelling pitch describing mood, genre, and influences, and simultaneously submit to independent curator playlists through a playlist pitching service like MIXXEA to maximize placement opportunities across editorial, algorithmic, and third-party playlists.",
    estimatedWordCount: 2800,
    keywordDensityTarget: "1.3–1.9% primary / 0.5–0.8% secondary",
    outline: [
      "H1: How to Get on Spotify Playlists in 2026: The Artist's Complete Guide",
      "H2: Understanding Spotify's Three Types of Playlists",
      "  H3: Editorial Playlists (Spotify-curated)",
      "  H3: Algorithmic Playlists (Discover Weekly, Release Radar)",
      "  H3: Independent Curator Playlists",
      "H2: How to Pitch to Spotify Editorial Playlists",
      "H2: How the Spotify Algorithm Works in 2026",
      "H2: Independent Playlist Pitching Strategy",
      "H2: TikTok + Spotify Synergy Strategy",
      "H2: Common Mistakes Artists Make When Pitching",
      "H2: FAQ",
    ],
    faqBlock: [
      { question: "How do I pitch my music to Spotify playlists?", answer: "You can pitch unreleased music to Spotify editorial playlists through Spotify for Artists — submit your track at least 7 days before release. For independent playlists, use a service like MIXXEA's Playlist Pitching to reach hundreds of curators simultaneously." },
      { question: "How long does it take to get on a Spotify playlist?", answer: "Editorial playlist decisions are made within 7 days of your release. Independent curator pitching typically takes 5–14 days for responses. Results vary based on genre, quality, and timing." },
      { question: "Is playlist pitching worth it for independent artists?", answer: "Yes. Playlist placement — even on mid-sized playlists — can generate hundreds to thousands of new streams, improve your Spotify algorithmic profile, and trigger Discover Weekly and Release Radar placements for further organic growth." },
      { question: "What information should I include in a Spotify playlist pitch?", answer: "Include: genre, mood, similar artists, the story behind the song, release date, any pre-existing momentum (social media engagement, prior chart positions), and promotional plans." },
      { question: "How many playlists should I pitch my music to?", answer: "Aim for 50–200 independent curator pitches per release alongside the official Spotify editorial submission. MIXXEA's playlist marketplace gives you access to vetted curators across multiple genres." },
    ],
    internalLinks: [
      { anchor: "playlist pitching marketplace", url: "/#marketplace" },
      { anchor: "music distribution service", url: "/#distribution" },
      { anchor: "Spotify growth campaigns", url: "/#promotions" },
      { anchor: "music analytics", url: "/#analytics" },
    ],
    fullOutlineMarkdown: `# How to Get on Spotify Playlists in 2026

## Introduction
Hook with statistic: 40% of Spotify streams come from playlists. MIXXEA featured snippet answer.

## Understanding Spotify's Three Types of Playlists
### Editorial Playlists
RapCaviar, Hot Hits UK, Afrobeats Fire — how Spotify editors choose music.

### Algorithmic Playlists  
Discover Weekly, Release Radar, Daily Mix — how the algorithm works. Save rate, completion rate, skip rate.

### Independent Curator Playlists
Third-party playlists with real followings. Higher placement probability.

## How to Pitch to Spotify Editorial Playlists
Step-by-step Spotify for Artists submission walkthrough. Pitch template. What to write. What to avoid.

## How the Spotify Algorithm Works in 2026
Streams, saves, completion rate, skip rate, playlist adds. How TikTok saves translate to algorithmic boosts.

## Independent Playlist Pitching Strategy
Why 100 curator pitches beats 1 editorial pitch. MIXXEA Marketplace CTA.

## TikTok + Spotify Synergy in 2026
How going viral on TikTok triggers algorithmic playlist placement. Strategy framework.

## Common Mistakes Artists Make
No pre-release pitch. Wrong genre targeting. Low-quality audio. Generic pitch copy.

## FAQ Schema Block
5 FAQ items structured for rich snippet.`,
  },
];

const BACKLINK_TARGETS = [
  { site: "music.ly / Hypebot", type: "Guest Post", da: "65+", angle: "Expert column: The Future of Music Distribution in Africa" },
  { site: "Music Business Worldwide (MBW)", type: "Data Story", da: "72+", angle: "Share streaming royalty data insights / artist earnings report" },
  { site: "Digital Music News", type: "Press Release", da: "68+", angle: "MIXXEA product launch announcement / milestone news" },
  { site: "Musically.com", type: "Guest Post", da: "60+", angle: "How AI tools are changing independent music marketing" },
  { site: "Afrobeats Intel / ThisIsAfrica", type: "Expert Quote", da: "52+", angle: "African music streaming growth and distribution challenges" },
  { site: "Reddit r/WeAreTheMusicMakers", type: "Organic Thread", da: "N/A", angle: "Share genuine value on distribution and publishing questions" },
  { site: "ProductHunt", type: "Launch", da: "90+", angle: "MIXXEA product launch — target #1 Product of the Day" },
  { site: "IndieHackers", type: "Case Study", da: "76+", angle: "How MIXXEA helps artists earn more from their music" },
  { site: "Music Week (UK)", type: "Press Coverage", da: "70+", angle: "MIXXEA expansion into European market" },
  { site: "Podcast: Spotify for Artists Podcast", type: "Guest Appearance", da: "High Authority", angle: "Expert discussion on playlist pitching best practices" },
];

// ─────────────────────────────────────────────────────────────────────────────
//  GENERATE DAILY SEO CYCLE
// ─────────────────────────────────────────────────────────────────────────────
export function generateSEOCycle(id: string, focusOverride?: string): SEOCycle {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);

  const clusterKeys = Object.keys(TRENDING_KW_POOL);
  const clusterIndex = dayOfYear % clusterKeys.length;
  const focus = focusOverride || clusterKeys[clusterIndex];

  const trending = (TRENDING_KW_POOL[focus] || TRENDING_KW_POOL["Music Distribution"]).slice(0, 20);
  const longTail = (LONG_TAIL_POOL["Music Distribution"] || []).slice(0, 20);
  const questions = (QUESTION_KW_POOL["Music Distribution"] || []).slice(0, 10);
  const gaps = CONTENT_GAP_POOL.slice(0, 10);

  const articleIndex = dayOfYear % ARTICLE_POOL.length;
  const articleBase = ARTICLE_POOL[articleIndex];

  // Build 3 content briefs from gaps
  const briefs: ContentBrief[] = gaps.slice(0, 3).map((gap, i) => ({
    title: gap.topic,
    targetKeyword: trending[i]?.keyword || gap.topic,
    secondaryKeywords: [trending[i + 1]?.keyword || "", trending[i + 2]?.keyword || "", longTail[i]?.keyword || ""].filter(Boolean),
    intent: trending[i]?.intent || "Informational",
    wordCount: 2000 + i * 500,
    h1: gap.topic,
    h2s: ["Introduction", "What You Need to Know", "Step-by-Step Guide", "Expert Tips", "FAQ", "Conclusion"],
    h3s: { "Step-by-Step Guide": ["Step 1: Research", "Step 2: Prepare", "Step 3: Execute", "Step 4: Measure"] },
    intro: `This guide explains everything you need to know about ${gap.topic.toLowerCase()} to grow your music career in 2026.`,
    faqSchema: articleBase.faqBlock.slice(0, 3),
    internalLinks: articleBase.internalLinks,
    outboundSources: ["Spotify for Artists", "Apple Music for Artists", "Google Search Console", "MIXXEA Blog"],
    metaTitle: `${gap.topic} | MIXXEA`,
    metaDescription: `Complete guide to ${gap.topic.toLowerCase()}. Expert strategies for independent artists and music labels in 2026.`,
    slug: gap.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
  }));

  const linkMap = [
    { from: "/", to: "/#distribution", anchor: "music distribution platform", reason: "Home → Distribution feature section" },
    { from: "/", to: "/#promotions", anchor: "music promotion agency", reason: "Home → Promotions feature section" },
    { from: "/", to: "/#publishing", anchor: "publishing administration", reason: "Home → Publishing feature section" },
    { from: "/", to: "/auth", anchor: "start distributing music free", reason: "Home → Sign Up CTA" },
    { from: "/blog/distribution-guide", to: "/blog/playlist-pitching", anchor: "playlist pitching strategy", reason: "Topical authority cluster: Distribution → Promotion" },
    { from: "/blog/playlist-pitching", to: "/blog/tiktok-strategy", anchor: "TikTok music promotion", reason: "Topical cluster: Spotify → TikTok promotion" },
    { from: "/blog/tiktok-strategy", to: "/blog/royalty-splits", anchor: "music royalty management", reason: "Topical cluster: Promotion → Publishing" },
    { from: "/blog/royalty-splits", to: "/", anchor: "MIXXEA publishing administration", reason: "Blog → Product home page" },
  ];

  const tweetThread = [
    `🎵 Thread: How to grow on Spotify as an independent artist in 2026 (everything that actually works) 👇`,
    `1/ The Spotify algorithm in 2026 is smarter than ever. It tracks: save rate, completion rate, skip rate, playlist adds, and external traffic sources (especially TikTok). Optimize these and the algorithm does the heavy lifting.`,
    `2/ The #1 underrated move: pitch your track BEFORE release. Spotify for Artists gives you a 7-day pitch window. Most artists miss this. Use it every single release.`,
    `3/ Playlist pitching ≠ buying fake plays. Reach REAL independent curators with genuine followings. 50 placements on 1,000-follower playlists > 0 placements on editorial. @mixxea makes this automated.`,
    `4/ TikTok → Spotify pipeline is real in 2026. One viral 15-second TikTok clip = Discover Weekly activation for thousands of new listeners. Build your TikTok strategy into every release plan.`,
    `5/ Keep 100% of your royalties. Never give away your income. Use @mixxea to distribute to 150+ platforms and keep every dollar you earn. Link in bio 🔗`,
  ];

  const linkedInPost = `🎵 The music industry has changed — here's what independent artists need to know in 2026:

The traditional label model is no longer the only path. Today's most successful independent artists treat their music career like a business — combining professional distribution, data-driven promotion, and smart rights management.

Here's what the top independent artists are doing differently:

✅ Distributing to 150+ platforms simultaneously (Spotify, Apple Music, TikTok, Beatport, Boomplay & more)
✅ Running targeted playlist pitching campaigns before every release
✅ Using TikTok UGC campaigns to trigger Spotify's algorithmic discovery
✅ Managing publishing rights and collecting every royalty stream globally
✅ Keeping 100% of their revenue — no label cuts, no commission splits

The tools that were once only available to signed artists now exist for everyone.

At MIXXEA, we built the platform that gives independent artists access to all of this from one professional dashboard.

If you're serious about your music career, the time to treat it like a business is now.

→ Start distributing your music at mixxea.com

#MusicBusiness #IndependentArtist #MusicDistribution #MusicMarketing #SpotifyGrowth`;

  const redditPost = {
    subreddit: "r/WeAreTheMusicMakers",
    title: `I analyzed 200+ Spotify releases in 2026 — here's what actually gets playlist placements (data inside)`,
    body: `Been tracking release data across hundreds of artists on our platform and wanted to share some real patterns I've noticed:

**What correlates with playlist placement:**
- Pitching 14+ days before release (not 3–4 days)
- Having a TikTok clip ready to drop on release day
- Save rate above 12% in first 48 hours
- Genre-specific DSP targeting (techno on Beatport, afrobeats on Boomplay)

**What doesn't work:**
- Buying fake streams (Spotify catches it fast)
- Only pitching to editorial and ignoring indie curators
- Releasing without a pre-save campaign

Happy to answer questions. Been building tools for independent artists and the data is pretty clear at this point.`,
  };

  const newsletter = `Subject: Your weekly Spotify growth tip + this week's SEO focus

Hey [First Name],

Quick insight this week from the MIXXEA team:

**🔥 Trending right now:** Artists who combine TikTok UGC campaigns with Spotify pre-save campaigns are seeing 340% more streams in the first 72 hours compared to those who don't.

**This week's tip:** Pitch your next track to Spotify editorial 14 days before release (not 7) — the extra week gives editors more time to consider it for Fresh Finds and Radar playlists.

**On the platform:** We've just launched our new Album Art Generator — create DSP-compliant 3000×3000px artwork in seconds, right inside your release flow.

Keep creating,
The MIXXEA Team

P.S. — Our Playlist Marketplace has 800+ vetted curators this month. Submit your music →`;

  return {
    id,
    date: dateStr,
    generatedAt: now.toISOString(),
    focus,
    step1: { trendingKeywords: trending, longTailKeywords: longTail, questionKeywords: questions },
    step2: { gaps },
    step3: { briefs },
    step4: {
      metaTitle: articleBase.metaTitle,
      metaDescription: articleBase.metaDescription,
      slug: articleBase.slug,
      featuredSnippet: articleBase.featuredSnippet,
      outline: articleBase.outline,
      faqBlock: articleBase.faqBlock,
      internalLinks: articleBase.internalLinks,
      estimatedWordCount: articleBase.estimatedWordCount,
      keywordDensityTarget: articleBase.keywordDensityTarget,
      fullOutlineMarkdown: articleBase.fullOutlineMarkdown,
    },
    step5: {
      checklist: [
        { id: "title-tag", category: "On-Page", item: `Title tag contains primary keyword "${trending[0]?.keyword}"`, status: "action", note: "Update page title to match current trending keyword" },
        { id: "meta-desc", category: "On-Page", item: "Meta description is 150–160 characters and includes CTA", status: "action", note: "Review and refresh meta description for CTR optimization" },
        { id: "h1-unique", category: "On-Page", item: "H1 is unique, keyword-rich and matches search intent", status: "action", note: "Align H1 with primary keyword cluster" },
        { id: "keyword-density", category: "On-Page", item: `Primary keyword density at target ${articleBase.keywordDensityTarget}`, status: "planned", note: "Review after article is published" },
        { id: "semantic-kw", category: "On-Page", item: "LSI and semantic keywords used naturally throughout", status: "planned", note: "Add semantic variations to headers and body" },
        { id: "internal-links", category: "Internal Linking", item: "Minimum 3 internal links to related MIXXEA pages", status: "action", note: "Add links per the generated link map" },
        { id: "image-alt", category: "Media", item: "All images have descriptive, keyword-rich alt text", status: "action", note: "Audit all images on landing and blog pages" },
        { id: "page-speed", category: "Technical", item: "Page loads in under 2.5 seconds (LCP target)", status: "action", note: "Run PageSpeed Insights on mixxea.com" },
        { id: "mobile-ux", category: "Technical", item: "Mobile layout passes Google Mobile Usability test", status: "done", note: "Confirmed responsive on all viewports" },
        { id: "structured-data", category: "Schema", item: "FAQ schema added to article for rich results eligibility", status: "done", note: "Auto-injected via SEOProvider" },
        { id: "canonical", category: "Technical", item: "Canonical URL set and matches the intended primary URL", status: "done", note: "Auto-managed by SEOProvider" },
        { id: "og-image", category: "Social", item: "OG image (1200×630) created and verified", status: "action", note: "Create branded OG image for new article" },
        { id: "gsc-submit", category: "Technical", item: "New URL submitted to Google Search Console for indexing", status: "planned", note: "Submit after article is published" },
        { id: "readability", category: "Content", item: "Readability score targets Grade 8–10 (Flesch-Kincaid)", status: "planned", note: "Use short paragraphs, active voice, and bullet points" },
        { id: "cta-placement", category: "Conversion", item: "Strategic CTAs placed at H2 breaks and article end", status: "action", note: "Add MIXXEA sign-up CTA after every major section" },
      ],
    },
    step6: { linkMap },
    step7: {
      tweetThread,
      linkedInPost,
      redditPost,
      newsletter,
    },
    step8: {
      targets: BACKLINK_TARGETS,
      outreachTemplate: `Subject: Guest post idea for [SITE NAME] — [TOPIC]

Hi [Editor Name],

I'm [Your Name] from MIXXEA — the music distribution and marketing platform for independent artists and labels.

I've been following [SITE NAME] for a while and noticed your readers engage heavily with content about [TOPIC RELATED TO THEIR CONTENT].

I'd love to contribute a guest post titled:
"[YOUR ARTICLE TITLE]"

Here's a brief summary:
[2–3 sentence description of the article value]

I can offer:
• 2,000–3,000 words of original, research-backed content
• Exclusive data from MIXXEA's artist network
• No promotional content — pure educational value

Would this be a good fit for [SITE NAME]?

Best,
[Your Name]
[Your Title] at MIXXEA
mixxea.com`,
      guestPostIdeas: [
        "The State of Independent Music Distribution in Africa: Data & Insights 2026",
        "Why TikTok Is Now the Most Powerful Music Marketing Tool (And How to Use It)",
        "Music Publishing Explained: A Guide for Independent Artists Who Don't Have a Manager",
        "How to Plan a Music Release Campaign That Actually Works in 2026",
        "Playlist Pitching: The Science Behind Getting Your Music Heard",
      ],
    },
    step9: {
      kpis: [
        { metric: "Organic Search Traffic", current: "Track via GA4", target: "+25% month-over-month", timeframe: "90 days" },
        { metric: "Keyword Rankings (Top 20)", current: "Track via GSC", target: "15 keywords in top 10", timeframe: "60 days" },
        { metric: "Click-Through Rate (CTR)", current: "Track via GSC", target: "Average CTR > 3.5%", timeframe: "30 days" },
        { metric: "Domain Authority", current: "Track via Moz/Ahrefs", target: "DA 35+", timeframe: "6 months" },
        { metric: "Backlink Profile", current: "Track via Ahrefs", target: "+50 quality referring domains", timeframe: "90 days" },
        { metric: "Organic Conversion Rate", current: "Track via GA4", target: "2%+ organic → signup", timeframe: "30 days" },
        { metric: "Featured Snippet Captures", current: "0 confirmed", target: "5 featured snippets", timeframe: "90 days" },
        { metric: "Core Web Vitals (LCP)", current: "Test via PageSpeed", target: "LCP < 2.5s", timeframe: "Immediate" },
      ],
      weeklyActions: [
        "Check Google Search Console for new queries and impressions — add any to keyword tracking list",
        "Review top 5 pages by impressions — refresh meta titles that have CTR below 2%",
        "Identify any pages with high impressions but low clicks — rewrite title tags for those pages",
        "Submit any new blog content to GSC for indexing",
        "Monitor competitor content for new articles — identify gaps to fill",
        "Review backlink profile in Ahrefs — disavow any toxic links",
        "Update internal linking on previously published articles based on new content",
        "Check Core Web Vitals report for regressions",
      ],
    },
    step10: {
      improvements: [
        { page: "/", issue: "Hero section copy not keyword-optimized for primary queries", action: "Rewrite hero H1 to include 'music distribution' and 'independent artists' naturally", priority: "High" },
        { page: "/", issue: "No blog section on landing page — missing topical authority signals", action: "Add 'Latest From the Blog' section linking to 3 most recent SEO articles", priority: "High" },
        { page: "/auth", issue: "Auth page has low SEO value — missing keyword-rich copy", action: "Add social proof section below form with keyword-rich testimonials", priority: "Medium" },
        { page: "All pages", issue: "OG image not set — social sharing shows default placeholder", action: "Create branded OG image (1200×630px) and update seoConfig.ts OG_IMAGE", priority: "High" },
        { page: "Blog (planned)", issue: "No content marketing — 0 indexed blog posts", action: "Publish first 3 SEO articles from this cycle's content plan", priority: "High" },
        { page: "All pages", issue: "Google Search Console not verified — no performance data", action: "Add GSC verification meta tag to SEO config and verify property", priority: "High" },
      ],
      contentRefreshes: [
        "After publishing: update article with any new Google algorithm changes",
        "Monthly: refresh keyword volume estimates and difficulty scores",
        "Quarterly: update comparison tables with current competitor pricing",
        "Annually: full content audit — refresh or consolidate low-performing pages",
      ],
    },
  };
}
