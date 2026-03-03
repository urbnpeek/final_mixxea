import { motion } from 'motion/react';
import { ArrowRight, Mail, MessageCircle, MapPin } from 'lucide-react';
import mixxeaLogo from 'figma:asset/d262559c0b7675722d6c420c935f7d8c758fea4f.png';

// ─── Social Icons (inline SVGs to avoid lucide naming mismatch) ──────────────

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}
function SpotifyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const footerLinks = {
  Platform: [
    { label: 'Distribution',     href: '#distribution' },
    { label: 'Marketing Portal', href: '#promotions' },
    { label: 'Publishing Admin', href: '#publishing' },
    { label: 'Analytics',        href: '/auth' },
    { label: 'Smart Pages',      href: '/auth' },
    { label: 'Royalty Splits',   href: '/auth' },
  ],
  Services: [
    { label: 'Spotify Growth',      href: '#promotions' },
    { label: 'Playlist Pitching',   href: '#promotions' },
    { label: 'TikTok / IG UGC',    href: '#promotions' },
    { label: 'YouTube Ads',         href: '#promotions' },
    { label: 'PR & Press Coverage', href: '#promotions' },
    { label: 'Meta / Google Ads',   href: '#promotions' },
    { label: 'Sync Licensing',      href: '#promotions' },
  ],
  Company: [
    { label: 'About MIXXEA',  href: '#platform' },
    { label: 'Case Studies',  href: '#platform' },
    { label: 'Blog & Insights', href: '#platform' },
    { label: 'Careers',       href: 'mailto:onboarding@mixxea.com' },
    { label: 'Press Kit',     href: 'mailto:onboarding@mixxea.com' },
    { label: 'Contact Us',    href: 'mailto:onboarding@mixxea.com' },
  ],
  Legal: [
    { label: 'Terms of Service', href: '/auth' },
    { label: 'Privacy Policy',   href: '/auth' },
    { label: 'Cookie Policy',    href: '/auth' },
    { label: 'Refund Policy',    href: '/auth' },
    { label: 'DMCA Policy',      href: '/auth' },
  ],
};

const socialLinks = [
  { Icon: InstagramIcon, href: 'https://instagram.com/mixxea', label: 'Instagram' },
  { Icon: XIcon, href: 'https://x.com/mixxea', label: 'X / Twitter' },
  { Icon: YouTubeIcon, href: 'https://youtube.com/@mixxea', label: 'YouTube' },
  { Icon: SpotifyIcon, href: 'https://open.spotify.com', label: 'Spotify' },
];

const contactInfo = [
  { icon: Mail, label: 'onboarding@mixxea.com', href: 'mailto:onboarding@mixxea.com' },
  { icon: MessageCircle, label: 'onboarding@mixxea.com', href: 'mailto:onboarding@mixxea.com' },
  { icon: MapPin, label: 'London, UK · Los Angeles, CA', href: '#' },
];

const badges = [
  'Music Distribution',
  'Publishing Admin',
  'Spotify Growth',
  'Playlist Pitching',
  'TikTok Campaigns',
];

// ─── Component ────────────────────────────────────────────────────────────────

export function Footer() {
  return (
    <footer className="relative bg-black border-t border-white/5">

      {/* Newsletter + Contact bar */}
      <div className="border-b border-white/5 bg-[#080808]">
        <div className="max-w-[1240px] mx-auto px-8 py-12">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10">
            {/* Left: newsletter */}
            <div className="flex-1">
              <p className="text-white font-bold text-2xl mb-2">Stay ahead of the industry.</p>
              <p className="text-[#B5B5B5] text-sm">
                Platform updates, campaign guides, and music industry insights — delivered weekly.
              </p>
            </div>
            {/* Right: email input */}
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <input
                type="email"
                placeholder="Enter your email address"
                className="flex-1 lg:w-80 px-5 py-3.5 rounded-full bg-white/5 border border-white/10 text-white placeholder:text-[#555] text-sm focus:outline-none focus:border-[#7B5FFF]/50 transition-colors"
              />
              <button className="flex-shrink-0 px-6 py-3.5 rounded-full text-white text-sm font-semibold transition-colors flex items-center gap-2"
                style={{ background: 'linear-gradient(135deg, #7B5FFF, #FF5252)' }}
              >
                Subscribe <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Contact row */}
          <div className="flex flex-wrap gap-6 mt-8 pt-8 border-t border-white/5">
            {contactInfo.map((item, i) => {
              const Icon = item.icon;
              return (
                <a
                  key={i}
                  href={item.href}
                  className="flex items-center gap-2 text-[#B5B5B5] hover:text-[#D63DF6] transition-colors text-sm group"
                >
                  <Icon className="h-4 w-4 text-[#7B5FFF] group-hover:text-[#D63DF6] transition-colors" />
                  {item.label}
                </a>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main footer grid */}
      <div className="max-w-[1240px] mx-auto px-8 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 mb-16">

          {/* Brand column */}
          <div className="lg:col-span-2">
            <a href="/" className="flex items-center gap-3 mb-5">
              <img src={mixxeaLogo} alt="MIXXEA" className="h-9 w-9" />
              <span className="text-xl font-bold text-white tracking-tight">MIXXEA</span>
            </a>
            <p className="text-[#B5B5B5] leading-relaxed mb-6 text-sm">
              Premium music distribution, agency-grade promotion, and full publishing
              administration — built for serious artists, producers, and labels worldwide.
            </p>

            {/* Social icons */}
            <div className="flex gap-2 mb-8">
              {socialLinks.map(({ Icon, href, label }) => (
                <motion.a
                  key={label}
                  href={href}
                  aria-label={label}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center transition-all duration-300 group border border-white/8"
                  style={{ background: undefined }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, #7B5FFF, #FF5252)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
                  }}
                >
                  <span className="text-[#B5B5B5] group-hover:text-white transition-colors">
                    <Icon />
                  </span>
                </motion.a>
              ))}
            </div>

            {/* Feature badges */}
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => (
                <span
                  key={badge}
                  className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/8 text-[#555] text-xs"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-white font-semibold mb-5 text-sm tracking-wide uppercase">{title}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-[#666] hover:text-[#D63DF6] transition-colors text-sm"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-white/5 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            {/* Copyright + compliance */}
            <div className="space-y-1">
              <p className="text-[#444] text-xs">
                © 2026 MIXXEA Ltd. All rights reserved. Company registered in England & Wales.
              </p>
              <p className="text-[#333] text-xs">
                MIXXEA is not affiliated with Spotify, Apple Inc., YouTube, TikTok, or any DSP. All trademarks belong to their respective owners.
                Music distributed through MIXXEA remains 100% the property of the rights holder.
              </p>
            </div>
            {/* Legal links */}
            <div className="flex items-center gap-5 flex-shrink-0">
              {['Terms', 'Privacy', 'Cookies', 'DMCA'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="text-[#444] hover:text-[#B5B5B5] text-xs transition-colors"
                >
                  {item}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}