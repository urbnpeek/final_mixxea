import { motion } from 'motion/react';

const platforms = [
  'Spotify', 'Apple Music', 'YouTube Music', 'TikTok', 'Amazon Music',
  'Deezer', 'Tidal', 'SoundCloud', 'Pandora', 'Beatport',
  'Audiomack', 'Boomplay', 'iHeartRadio', 'Napster', 'Anghami',
];

// Duplicate for seamless loop
const allPlatforms = [...platforms, ...platforms];

export function PlatformMarquee() {
  return (
    <div className="relative py-10 bg-[#080808] border-y border-white/5 overflow-hidden">
      {/* Fade masks */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#080808] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#080808] to-transparent z-10 pointer-events-none" />

      <motion.div
        className="flex items-center gap-10 whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        {allPlatforms.map((platform, index) => (
          <div key={index} className="flex items-center gap-3 flex-shrink-0">
            <div
              className="w-1.5 h-1.5 rounded-full opacity-60"
              style={{ background: 'linear-gradient(135deg, #7B5FFF, #FF5252)' }}
            />
            <span className="text-[#555] text-sm font-semibold tracking-wide hover:text-[#B5B5B5] transition-colors">
              {platform}
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
