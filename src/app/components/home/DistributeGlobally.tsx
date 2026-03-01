import { motion } from 'motion/react';
import { GlowButton } from '../mixxea/GlowButton';
import { Globe } from 'lucide-react';

const countries = [
  { name: 'US', flag: '🇺🇸', x: 24, y: 24 },
  { name: 'UK', flag: '🇬🇧', x: 220, y: 40 },
  { name: 'JP', flag: '🇯🇵', x: 160, y: 130 },
  { name: 'BR', flag: '🇧🇷', x: 48, y: 160 },
  { name: 'DE', flag: '🇩🇪', x: 260, y: 100 },
];

export function DistributeGlobally() {
  return (
    <section id="distribution" className="relative py-40 bg-black">
      <div className="max-w-[1240px] mx-auto px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Calendar UI with floating badges */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-[#121212] border border-white/5 shadow-2xl">
              {/* Calendar mockup */}
              <img
                src="https://images.unsplash.com/photo-1686563520343-4827d8ad3ede?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYWxlbmRhciUyMHNjaGVkdWxlJTIwcGxhbm5pbmclMjBpbnRlcmZhY2V8ZW58MXx8fHwxNzcyMjEyMjUxfDA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Distribution Calendar"
                className="w-full h-full object-cover opacity-40"
              />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(135deg, rgba(123,95,255,0.1) 0%, transparent 60%)' }}
              />

              {/* Floating country badges */}
              {countries.map((country, index) => (
                <motion.div
                  key={country.name}
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.6 + index * 0.12 }}
                  animate={{ y: [0, -10, 0] }}
                  className="absolute"
                  style={{ left: country.x, top: country.y }}
                >
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{
                      duration: 4 + index * 0.5,
                      delay: index * 0.4,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="px-3 py-2 rounded-full bg-[#121212] border border-white/10 backdrop-blur-xl shadow-lg flex items-center gap-2"
                  >
                    <span className="text-2xl">{country.flag}</span>
                    <span className="text-xs font-semibold text-white">{country.name}</span>
                  </motion.div>
                </motion.div>
              ))}
            </div>

            {/* Glow effect */}
            <div
              className="absolute -inset-4 blur-3xl opacity-50 -z-10"
              style={{ background: 'linear-gradient(135deg, rgba(123,95,255,0.2), rgba(255,82,82,0.2))' }}
            />
          </motion.div>

          {/* Right: Content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
              <Globe className="h-4 w-4" style={{ color: '#7B5FFF' }} />
              <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#7B5FFF' }}>Global Reach</span>
            </div>

            <h2 className="text-[56px] leading-[1.1] font-bold text-white mb-6">
              Distribute
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #7B5FFF, #FF5252)' }}
              >
                Globally
              </span>
            </h2>

            <p className="text-lg text-[#B5B5B5] leading-relaxed mb-8">
              Get your music on Spotify, Apple Music, YouTube, TikTok, and 70+ platforms worldwide.
              Schedule releases, manage metadata, and track delivery status in real-time.
            </p>

            <ul className="space-y-4 mb-10">
              {[
                'Release to all major DSPs simultaneously',
                'Pre-save & pre-order campaign tools',
                'UPC/ISRC code generation included',
                'Territory-specific release scheduling',
              ].map((item, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #7B5FFF, #FF5252)' }}
                  />
                  <span className="text-white">{item}</span>
                </motion.li>
              ))}
            </ul>

            <GlowButton variant="primary" size="lg" href="/auth">
              Get Started Free
            </GlowButton>
          </motion.div>
        </div>
      </div>
    </section>
  );
}