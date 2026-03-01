import { motion } from 'motion/react';
import { GlowButton } from '../mixxea/GlowButton';
import { Music2 } from 'lucide-react';

export function Curators() {
  return (
    <section className="relative py-40 bg-[#0a0a0a]">
      <div className="max-w-[1240px] mx-auto px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
              <Music2 className="h-4 w-4" style={{ color: '#7B5FFF' }} />
              <span className="text-sm font-semibold" style={{ color: '#7B5FFF' }}>PLAYLIST PITCHING</span>
            </div>

            <h2 className="text-[56px] leading-[1.1] font-bold text-white mb-6">
              Connect with
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #7B5FFF, #FF5252)' }}
              >
                Curators
              </span>
            </h2>

            <p className="text-lg text-[#B5B5B5] leading-relaxed mb-8">
              Get your music in front of Spotify editorial teams and thousands of independent playlist curators. 
              Our proven pitching strategies have secured placements for over 10,000 tracks.
            </p>

            <ul className="space-y-4 mb-10">
              {[
                'Direct pitching to Spotify editorial',
                'Network of 5,000+ independent curators',
                'Genre-specific targeting & optimization',
                'Detailed campaign performance reports',
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
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: 'linear-gradient(135deg, #7B5FFF, #FF5252)' }}
                  />
                  <span className="text-white">{item}</span>
                </motion.li>
              ))}
            </ul>

            <GlowButton variant="primary" size="lg" href="/auth">
              Start Pitching
            </GlowButton>
          </motion.div>

          {/* Right: Playlist Card Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative group"
          >
            <div className="relative rounded-3xl overflow-hidden bg-[#121212] border border-white/5 p-8 shadow-2xl hover:border-white/10 transition-all duration-500 hover:-translate-y-2">
              {/* Playlist mockup */}
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #7B5FFF, #FF5252)' }}
                  >
                    <Music2 className="h-10 w-10 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold text-white">Indie Hits 2026</h3>
                      <span className="px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 text-xs text-green-400 font-semibold">
                        Only on Spotify
                      </span>
                    </div>
                    <p className="text-sm text-[#B5B5B5]">248K followers • 120 songs</p>
                  </div>
                </div>

                {/* Track list */}
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((track) => (
                    <div
                      key={track}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div
                        className="w-10 h-10 rounded-lg"
                        style={{ background: `linear-gradient(135deg, hsl(${260 + track * 20}, 80%, 60%), hsl(${300 + track * 15}, 80%, 60%))` }}
                      />
                      <div className="flex-1">
                        <div className="h-3 w-32 bg-white/10 rounded mb-1.5" />
                        <div className="h-2 w-20 bg-white/5 rounded" />
                      </div>
                      <div className="h-2 w-8 bg-white/5 rounded" />
                    </div>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex gap-4 pt-4 border-t border-white/5">
                  <div>
                    <p className="text-2xl font-bold text-white">12.4M</p>
                    <p className="text-xs text-[#B5B5B5]">Monthly listeners</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">94%</p>
                    <p className="text-xs text-[#B5B5B5]">Save rate</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Glow effect */}
            <div
              className="absolute -inset-4 blur-3xl opacity-0 group-hover:opacity-50 transition-opacity duration-500 -z-10"
              style={{ background: 'linear-gradient(135deg, rgba(123,95,255,0.2), rgba(255,82,82,0.2))' }}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}