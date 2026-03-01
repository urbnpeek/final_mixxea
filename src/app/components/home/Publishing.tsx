import { motion } from 'motion/react';
import { GlowButton } from '../mixxea/GlowButton';
import { BookOpen, Music, DollarSign, Mic2, FileSignature, Globe2, TrendingUp, ShieldCheck } from 'lucide-react';

const features = [
  { icon: FileSignature, label: 'Copyright Registration', desc: 'US Copyright Office & international' },
  { icon: Mic2, label: 'PRO Affiliation', desc: 'ASCAP, BMI, SESAC, PRS setup' },
  { icon: DollarSign, label: 'Mechanical Royalties', desc: 'Collection from all licensees' },
  { icon: Globe2, label: 'Sync Licensing', desc: 'Film, TV, advertising placements' },
  { icon: TrendingUp, label: 'Publishing Splits', desc: 'Auto-split among collaborators' },
  { icon: ShieldCheck, label: 'Neighboring Rights', desc: 'Master recording performance royalties' },
];

const splitDemo = [
  { name: 'Main Artist', role: 'Composer', percent: 50, color: '#7B5FFF' },
  { name: 'Co-Producer', role: 'Producer', percent: 30, color: '#D63DF6' },
  { name: 'Featured Artist', role: 'Lyricist', percent: 20, color: '#FF5252' },
];

const royaltyTypes = [
  { label: 'Performance Royalties', amount: '$1,240', source: 'via ASCAP/BMI' },
  { label: 'Mechanical Royalties', amount: '$876', source: 'via streaming' },
  { label: 'Sync Licensing', amount: '$3,500', source: 'Film placement' },
];

export function Publishing() {
  return (
    <section id="publishing" className="relative py-40 bg-[#0a0a0a]">
      <div className="max-w-[1240px] mx-auto px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">

          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
              <BookOpen className="h-4 w-4" style={{ color: '#7B5FFF' }} />
              <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#7B5FFF' }}>Publishing Admin</span>
            </div>

            <h2 className="text-[56px] leading-[1.1] font-bold text-white mb-6">
              Own every royalty.
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #7B5FFF, #D63DF6, #FF5252)' }}
              >
                Keep every right.
              </span>
            </h2>

            <p className="text-lg text-[#B5B5B5] leading-relaxed mb-10">
              MIXXEA handles every aspect of publishing administration — from copyright registration and PRO affiliation to royalty collection and sync licensing. Never leave money on the table again.
            </p>

            {/* Feature grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 + index * 0.08 }}
                    className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 hover:bg-white/[0.05] transition-all duration-300 group"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 border"
                      style={{
                        background: 'linear-gradient(135deg, rgba(123,95,255,0.2), rgba(214,61,246,0.1))',
                        borderColor: 'rgba(123,95,255,0.2)',
                      }}
                    >
                      <Icon className="h-4 w-4" style={{ color: '#7B5FFF' }} />
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold mb-0.5">{feature.label}</p>
                      <p className="text-[#666] text-xs">{feature.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <GlowButton variant="primary" size="lg" href="/auth">
              Explore Publishing Tools
            </GlowButton>
          </motion.div>

          {/* Right: Publishing Dashboard Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="relative rounded-3xl bg-[#111] border border-white/8 overflow-hidden shadow-2xl">
              {/* Dashboard header */}
              <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Music className="h-5 w-5" style={{ color: '#7B5FFF' }} />
                  <div>
                    <p className="text-white text-sm font-bold">Midnight Dreams</p>
                    <p className="text-[#555] text-xs">Publishing Administration</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold">
                  Registered
                </span>
              </div>

              <div className="p-6 space-y-6">
                {/* Copyright info row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Copyright', value: '© 2026', sub: 'US Registered' },
                    { label: 'PRO', value: 'ASCAP', sub: 'Active' },
                    { label: 'ISRC', value: 'US-MXX-26-00001', sub: 'Generated' },
                  ].map((item, i) => (
                    <div key={i} className="p-3 rounded-xl bg-white/[0.04] border border-white/5 text-center">
                      <p className="text-[#555] text-[10px] uppercase tracking-wider mb-1">{item.label}</p>
                      <p className="text-white text-xs font-bold mb-0.5">{item.value}</p>
                      <p className="text-[10px]" style={{ color: '#D63DF6' }}>{item.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Royalty splits */}
                <div>
                  <p className="text-[#555] text-xs uppercase tracking-wider font-semibold mb-3">Publishing Splits</p>
                  <div className="space-y-3">
                    {splitDemo.map((split, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: 0.6 + index * 0.12 }}
                        className="flex items-center gap-3"
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: `${split.color}30`, border: `1px solid ${split.color}40` }}
                        >
                          {split.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-white text-xs font-semibold truncate">{split.name}</p>
                            <p className="text-white text-xs font-bold ml-2">{split.percent}%</p>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              whileInView={{ width: `${split.percent}%` }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.8, delay: 0.8 + index * 0.15, ease: 'easeOut' }}
                              className="h-full rounded-full"
                              style={{ background: split.color }}
                            />
                          </div>
                          <p className="text-[#555] text-[10px] mt-0.5">{split.role}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Royalty streams */}
                <div>
                  <p className="text-[#555] text-xs uppercase tracking-wider font-semibold mb-3">Royalty Streams — Q1 2026</p>
                  <div className="space-y-2">
                    {royaltyTypes.map((royalty, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: 0.9 + index * 0.1 }}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors"
                      >
                        <div>
                          <p className="text-white text-xs font-semibold">{royalty.label}</p>
                          <p className="text-[#555] text-[10px]">{royalty.source}</p>
                        </div>
                        <p className="text-sm font-bold" style={{ color: '#D63DF6' }}>{royalty.amount}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Total payout */}
                <div
                  className="flex items-center justify-between p-4 rounded-2xl border"
                  style={{
                    background: 'linear-gradient(135deg, rgba(123,95,255,0.1), rgba(255,82,82,0.05))',
                    borderColor: 'rgba(123,95,255,0.2)',
                  }}
                >
                  <div>
                    <p className="text-[#B5B5B5] text-xs mb-0.5">Total Q1 Royalties</p>
                    <p className="text-white text-2xl font-bold">$5,616.00</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                    <TrendingUp className="h-3.5 w-3.5 text-green-400" />
                    <span className="text-green-400 text-xs font-bold">+28%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Glow */}
            <div
              className="absolute -inset-4 blur-3xl opacity-40 -z-10"
              style={{ background: 'linear-gradient(135deg, rgba(123,95,255,0.15), rgba(255,82,82,0.15))' }}
            />

            {/* Floating PRO badge */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -right-4 top-20 bg-[#1a1a1a] border border-white/10 rounded-2xl px-4 py-3 shadow-xl backdrop-blur-xl"
            >
              <p className="text-[#555] text-[10px] uppercase tracking-wider mb-1">PRO Collection</p>
              <p className="text-white text-sm font-bold">ASCAP Active</p>
              <div className="flex items-center gap-1 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <p className="text-green-400 text-[10px] font-semibold">Auto-collecting</p>
              </div>
            </motion.div>

            {/* Floating sync badge */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, delay: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -left-4 bottom-24 bg-[#1a1a1a] border border-white/10 rounded-2xl px-4 py-3 shadow-xl backdrop-blur-xl"
            >
              <p className="text-[#555] text-[10px] uppercase tracking-wider mb-1">Sync Deal</p>
              <p className="text-white text-sm font-bold">Netflix • S2 Ep04</p>
              <p className="text-xs font-semibold" style={{ color: '#D63DF6' }}>$3,500 cleared</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}