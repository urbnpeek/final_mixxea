You are working in the existing MIXXEA Vite + React + TypeScript + Tailwind repo.

CRITICAL:
- Do NOT break or restyle existing UI system.
- Reuse existing components: MagicCard, GlowButton, StatusChip, and existing background effects from VISUAL_EFFECT_MAP.md.
- Keep dark background, premium spacing, modern 2026 style.
- Replace any blue gradients/glows with MIXXEA orange gradient/glow: #FF5F1F → #FF8A3D.
- Focus homepage messaging heavily on Marketing/Promotion campaigns (agency + portal), while still including Distribution + Publishing.
- Create a polished $90k landing page feel: big type, generous spacing, cinematic collage hero.
- Do NOT remove existing routes; only add/replace the public home page content.

TASKS:

1) Locate the current public home page route (e.g. src/app/pages/public/LandingPage.tsx or HomePage.tsx).
   - If it exists, refactor content to use new section components without changing global layout wrappers.
   - If it doesn't exist, create src/app/pages/public/HomePage.tsx and wire it to the existing "/" route in routes.tsx.

2) Create section components under:
   src/app/components/home/
   - HomeNavBar.tsx
   - HomeHeroCollage.tsx
   - HomeMarqueePlatforms.tsx
   - HomeBenefits.tsx
   - HomeSectionSplit.tsx
   - HomeMarketingFocus.tsx
   - HomeProofStats.tsx
   - HomeTestimonials.tsx
   - HomePricing.tsx
   - HomeFAQ.tsx
   - HomeFooter.tsx

3) Visual style requirements (MatchMusic-like but MIXXEA):
   - Background: black/near-black
   - Big bold headings (use existing font stack)
   - CTA buttons: GlowButton with MIXXEA orange gradient
   - Cards: MagicCard with subtle border and hover lift (scale 1.02–1.03)
   - Use VisualEffectsLayer variant="public" behind Hero and subtle on page (do not double-render)
   - Add hero collage of tilted rounded image cards (placeholders in /public/home/*):
     /public/home/artist-1.jpg ... artist-6.jpg
     Use transform rotate(-8deg..+8deg) and translate for a diagonal rail similar to the reference screenshots.

4) HERO content:
   - Eyebrow: “MIXXEA PLATFORM + AGENCY”
   - Headline: “Launch. Promote. Distribute. Monetize.”
   - Subhead: “Premium music growth platform + agency campaigns. We run Spotify growth, playlist pitching, TikTok/IG creator campaigns, YouTube ads, PR — and deliver releases worldwide.”
   - CTA primary: “Request Access”
   - CTA secondary: “Watch Demo” (scroll to video section or open modal placeholder)

5) Benefits section (3 large MagicCards like reference):
   - “Split Royalties” (auto splits, collaborators)
   - “Track Releases” (delivery status + live links)
   - “Grow Your Streams” (campaign dashboard + KPIs)

6) Alternating sections using HomeSectionSplit:
   - “Distribute Globally” with calendar/territory mock (simple UI mock box inside card)
   - “Connect with Curators” with curator card mock (dark card, chips, “Only on Spotify” badge)
   - “Public Pages” with smart-link style mock (artist profile card + event cards)

7) Marketing focus section (make this the strongest):
   Title: “Agency-grade promotion, powered by your data”
   Grid (6 cards):
   - Spotify Growth (followers, algorithm reach)
   - Playlist Pitching (editorial + independent)
   - TikTok / IG UGC (creator network)
   - YouTube Ads (music video + discovery)
   - PR & Press (blogs, magazines, radio)
   - Meta/Google Ads (pixel + conversion tracking)
   Under it add “How it works” 3-step strip:
   Brief → Strategy → Execution & Reporting

8) Proof stats row:
   - “10M+ streams influenced”
   - “500+ campaigns executed”
   - “70+ stores delivered”
   - “100% rights retained”
   (numbers are placeholders; keep copy editable)

9) Pricing section (MatchMusic-like structure but MIXXEA):
   Create 3 plan cards (Starter/Growth/Pro) with “monthly” label and included “credits”.
   - Starter: distribution + basic promo credits
   - Growth: more credits + playlist pitching bundle + verification
   - Pro: multi-artist/label tools + priority support + advanced promo credits
   Add note: “Promotion credits can be topped up” and “Access is reviewed”
   Add a “Compare plans” small table or bullet list, keep minimal.

10) FAQ section:
   6–8 Qs:
   - How does distribution work?
   - What are promotion credits?
   - Do you take royalties?
   - How do approvals work?
   - Can labels manage multiple artists?
   - What’s included in campaigns?
   - Publishing splits?
   - Support & onboarding?

11) Footer (fill fully):
   Columns:
   - Platform: Distribution, Marketing Portal, Publishing, Analytics, Smart Pages
   - Services: Spotify Growth, Playlist Pitching, TikTok/IG UGC, YouTube Ads, PR & Press, Meta/Google Ads
   - Company: About, Case Studies, Blog, Careers, Contact
   - Legal: Terms, Privacy, Cookies, Refund Policy
   Add social icons: Instagram, X/Twitter, YouTube, Spotify (use existing icon set)
   Add a small compliance line and copyright.

12) Assets:
   - If /public/home does not exist, create it and add placeholder references (no need to add actual files).
   - Ensure images fail gracefully with gradient placeholders (do not crash build).

13) No layout break:
   - Preserve existing app shell and routes.
   - Only modify/replace public home page content.
   - Keep all Tailwind classes consistent with existing code style.

OUTPUT:
- New/updated components
- Updated route to point "/" to HomePage
- Any new helper constants in a small file src/app/components/home/homeContent.ts (copy only)