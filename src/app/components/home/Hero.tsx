import { motion } from 'motion/react';
import { GlowButton } from '../mixxea/GlowButton';
import { Play, ArrowRight } from 'lucide-react';

const floatingCards = [
  {
    // Hip-hop rapper studio portrait
    image: 'https://images.unsplash.com/photo-1746960854622-cf413c68eea7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoaXAlMjBob3AlMjByYXBwZXIlMjBzdHVkaW8lMjBwb3J0cmFpdCUyMGRhcmt8ZW58MXx8fHwxNzcyMzU4NTU1fDA&ixlib=rb-4.1.0&q=80&w=1080',
    rotation: -8, delay: 0, x: -30, y: -40, width: 240, height: 330,
  },
  {
    // DJ turntable neon performance
    image: 'https://images.unsplash.com/photo-1559775013-167fe8842c27?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxESiUyMHR1cm50YWJsZSUyMHBlcmZvcm1hbmNlJTIwbmVvbiUyMGxpZ2h0c3xlbnwxfHx8fDE3NzIzNTg1NTZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
    rotation: 6, delay: 0.4, x: 60, y: 50, width: 210, height: 280,
  },
  {
    // Music producer headphones studio
    image: 'https://images.unsplash.com/photo-1642177398844-06d28a8f973a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNpYyUyMHByb2R1Y2VyJTIwaGVhZHBob25lcyUyMHN0dWRpbyUyMHJlY29yZGluZ3xlbnwxfHx8fDE3NzIyNzUzOTN8MA&ixlib=rb-4.1.0&q=80&w=1080',
    rotation: -5, delay: 0.7, x: -70, y: 60, width: 220, height: 300,
  },
  {
    // R&B singer microphone performance
    image: 'https://images.unsplash.com/photo-1719437364589-17a545612428?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxSJTI2QiUyMHNpbmdlciUyMG1pY3JvcGhvbmUlMjBzdGFnZSUyMHBlcmZvcm1hbmNlfGVufDF8fHx8MTc3MjM1ODU1N3ww&ixlib=rb-4.1.0&q=80&w=1080',
    rotation: 9, delay: 0.2, x: 40, y: -50, width: 230, height: 310,
  },
  {
    // Hip-hop urban street artist portrait
    image: 'https://images.unsplash.com/photo-1759720107956-1cbad755e952?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoaXAlMjBob3AlMjBhcnRpc3QlMjB1cmJhbiUyMHN0cmVldCUyMHBvcnRyYWl0fGVufDF8fHx8MTc3MjM1ODU1N3ww&ixlib=rb-4.1.0&q=80&w=1080',
    rotation: -7, delay: 0.9, x: -25, y: 30, width: 200, height: 270,
  },
];

const trustLogos = [
  { name: 'Spotify', color: '#1DB954' },
  { name: 'Apple Music', color: '#FC3C44' },
  { name: 'YouTube Music', color: '#FF0000' },
  { name: 'TikTok', color: '#69C9D0' },
  { name: 'Amazon Music', color: '#00A8E0' },
  { name: 'Deezer', color: '#A238FF' },
];

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black pt-20">
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <motion.div
          animate={{
            background: [
              'radial-gradient(ellipse 80% 50% at 20% 60%, rgba(123, 95, 255, 0.18) 0%, transparent 60%)',
              'radial-gradient(ellipse 80% 50% at 80% 40%, rgba(214, 61, 246, 0.18) 0%, transparent 60%)',
              'radial-gradient(ellipse 80% 50% at 50% 80%, rgba(255, 82, 82, 0.12) 0%, transparent 60%)',
              'radial-gradient(ellipse 80% 50% at 20% 60%, rgba(123, 95, 255, 0.18) 0%, transparent 60%)',
            ],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0"
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)`,
            backgroundSize: '80px 80px',
          }}
        />
      </div>

      {/* Floating artist cards — LEFT rail */}
      <div className="absolute left-0 top-0 bottom-0 w-[380px] hidden lg:block pointer-events-none">
        {floatingCards.slice(0, 3).map((card, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.85, y: 40 }}
            animate={{
              opacity: [0, 0.75, 0.55, 0.75],
              y: [card.y + 40, card.y, card.y - 18, card.y],
              rotate: [card.rotation - 2, card.rotation, card.rotation + 1.5, card.rotation],
            }}
            transition={{
              opacity: { duration: 7, delay: card.delay, repeat: Infinity, ease: 'easeInOut' },
              y: { duration: 8, delay: card.delay, repeat: Infinity, ease: 'easeInOut' },
              rotate: { duration: 10, delay: card.delay, repeat: Infinity, ease: 'easeInOut' },
            }}
            className="absolute rounded-[28px] overflow-hidden shadow-2xl"
            style={{
              width: card.width,
              height: card.height,
              left: `calc(50% + ${card.x * 2.8}px)`,
              top: `calc(50% - ${card.height / 2}px + ${card.y}px)`,
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(123,95,255,0.08)',
            }}
          >
            <img src={card.image} alt="" className="w-full h-full object-cover object-center" />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
            {/* Accent glow edge */}
            <div
              className="absolute inset-0 rounded-[28px]"
              style={{ boxShadow: 'inset 0 0 40px rgba(123,95,255,0.08)' }}
            />
          </motion.div>
        ))}
      </div>

      {/* Floating artist cards — RIGHT rail */}
      <div className="absolute right-0 top-0 bottom-0 w-[380px] hidden lg:block pointer-events-none">
        {floatingCards.slice(3).map((card, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.85, y: 40 }}
            animate={{
              opacity: [0, 0.75, 0.55, 0.75],
              y: [card.y + 40, card.y, card.y - 20, card.y],
              rotate: [card.rotation + 2, card.rotation, card.rotation - 1.5, card.rotation],
            }}
            transition={{
              opacity: { duration: 9, delay: card.delay, repeat: Infinity, ease: 'easeInOut' },
              y: { duration: 10, delay: card.delay, repeat: Infinity, ease: 'easeInOut' },
              rotate: { duration: 12, delay: card.delay, repeat: Infinity, ease: 'easeInOut' },
            }}
            className="absolute rounded-[28px] overflow-hidden shadow-2xl"
            style={{
              width: card.width,
              height: card.height,
              right: `calc(50% + ${Math.abs(card.x) * 1.8}px)`,
              top: `calc(50% - ${card.height / 2}px + ${card.y}px)`,
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(214,61,246,0.08)',
            }}
          >
            <img src={card.image} alt="" className="w-full h-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
            <div
              className="absolute inset-0 rounded-[28px]"
              style={{ boxShadow: 'inset 0 0 40px rgba(214,61,246,0.08)' }}
            />
          </motion.div>
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-[900px] mx-auto px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2 }}
        >
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-[#7B5FFF]/30 mb-10"
          >
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#7B5FFF' }} />
            <span className="text-sm font-semibold tracking-widest uppercase" style={{ color: '#D63DF6' }}>
              MIXXEA Platform + Agency
            </span>
          </motion.div>

          {/* Headline */}
          <h1 className="text-[80px] md:text-[96px] leading-[1.02] font-[800] text-white mb-7 tracking-tight">
            Launch.{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #7B5FFF, #FF5252)' }}
            >
              Promote.
            </span>
            <br />
            Distribute.{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #00C4FF, #7B5FFF, #FF5252)' }}
            >
              Monetize.
            </span>
          </h1>

          {/* Subhead */}
          <p className="text-xl text-[#B5B5B5] max-w-2xl mx-auto mb-12 leading-relaxed">
            Premium music growth platform + agency campaigns. We run Spotify growth, playlist pitching, TikTok/IG creator campaigns, YouTube ads, PR — and deliver releases worldwide.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <GlowButton variant="primary" size="lg" href="/auth">
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </GlowButton>
            <GlowButton variant="secondary" size="lg" href="#promotions">
              <Play className="mr-2 h-5 w-5" />
              Explore Platform
            </GlowButton>
          </div>

          {/* Trust strip */}
          <div className="flex flex-col items-center gap-4">
            <p className="text-xs text-[#666] uppercase tracking-widest font-semibold">Delivering to all major platforms</p>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {trustLogos.map((logo) => (
                <span
                  key={logo.name}
                  className="text-sm font-semibold px-4 py-1.5 rounded-full bg-white/5 border border-white/8"
                  style={{ color: logo.color }}
                >
                  {logo.name}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black to-transparent" />
    </section>
  );
}
