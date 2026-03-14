import { useRef, useEffect } from 'react';
import { motion, useInView } from 'motion/react';
import { GlowButton } from '../mixxea/GlowButton';
import {
  Instagram, Youtube, Facebook, Music2, Sparkles, CalendarDays,
  Link2, Wand2, Zap, Image as ImageIcon, Hash, Video,
  CheckCircle, ArrowRight, Clock, Play,
} from 'lucide-react';

const PLATFORMS = [
  { icon: Instagram, label: 'Instagram', color: '#E1306C' },
  { icon: Music2,    label: 'TikTok',    color: '#FF0050' },
  { icon: Facebook,  label: 'Facebook',  color: '#1877F2' },
  { icon: Youtube,   label: 'YouTube',   color: '#FF0000' },
];

const AI_TOOLS = [
  { icon: Sparkles,    label: 'Caption Generator',   desc: 'Platform-optimized captions in seconds',         color: '#7B5FFF' },
  { icon: Hash,        label: 'Hashtag Engine',       desc: '25-tag sets with popularity scoring',            color: '#00C4FF' },
  { icon: ImageIcon,   label: 'AI Image Creator',     desc: 'DALL-E 3 promo graphics & lyric cards',          color: '#D63DF6' },
  { icon: Video,       label: 'Video Script Writer',  desc: 'Scene-by-scene scripts for Reels & TikTok',      color: '#FF5252' },
  { icon: CalendarDays,label: 'Content Calendar',     desc: 'AI-planned 7-day release campaigns',             color: '#F59E0B' },
];

const FEATURES = [
  {
    icon: Link2,
    title: 'One-Click Social Linking',
    description: 'Connect Instagram, TikTok, YouTube, and Facebook in seconds. Manage all accounts from one dashboard.',
    gradient: 'from-[#7B5FFF] to-[#5B3FDF]',
    highlights: ['OAuth secure connection', 'Auto token refresh', 'Account health monitoring'],
  },
  {
    icon: Wand2,
    title: 'AI Content Engine',
    description: 'GPT-4o generates platform-perfect captions, hashtag sets, video scripts, and full release campaign plans.',
    gradient: 'from-[#D63DF6] to-[#9B1DD6]',
    highlights: ['Platform-specific tone', 'Genre-aware generation', 'Release-linked context'],
  },
  {
    icon: CalendarDays,
    title: 'Smart Scheduling',
    description: 'Schedule weeks of content in minutes with our calendar view. Post to multiple platforms simultaneously.',
    gradient: 'from-[#00C4FF] to-[#0080CC]',
    highlights: ['Visual calendar view', 'Multi-platform publish', 'Optimal time suggestions'],
  },
];

// ── Animated mock UI card ─────────────────────────────────────────────────────
function MockUICard() {
  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* Glow blob */}
      <div className="absolute inset-0 blur-[60px] opacity-30 rounded-full"
        style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6,#00C4FF)' }} />

      <div className="relative rounded-2xl border overflow-hidden" style={{ background: '#0D0D0D', borderColor: 'rgba(255,255,255,0.12)' }}>
        {/* Header bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
            <Wand2 size={13} className="text-white" />
          </div>
          <p className="text-white text-sm font-semibold">Creative Studio</p>
          <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(0,196,255,0.15)', color: '#00C4FF' }}>AI</span>
        </div>

        {/* Platform selector */}
        <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <p className="text-white/40 text-[10px] mb-2 uppercase tracking-wider">Platforms</p>
          <div className="flex gap-2">
            {PLATFORMS.map((p, i) => {
              const PIcon = p.icon;
              const active = i < 2;
              return (
                <motion.div key={p.label}
                  animate={active ? { scale: [1, 1.05, 1] } : {}}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
                  style={{ background: active ? `${p.color}20` : 'rgba(255,255,255,0.04)', border: active ? `1px solid ${p.color}50` : '1px solid rgba(255,255,255,0.08)' }}>
                  <PIcon size={15} style={{ color: active ? p.color : 'rgba(255,255,255,0.25)' }} />
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* AI generating animation */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/40 text-[10px] uppercase tracking-wider">AI Caption</p>
            <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: 'rgba(123,95,255,0.2)' }}>
              <Sparkles size={9} style={{ color: '#7B5FFF' }} />
              <span className="text-[9px] font-semibold" style={{ color: '#C4AEFF' }}>Generating</span>
            </motion.div>
          </div>
          <div className="space-y-1.5">
            {[100, 75, 55].map((w, i) => (
              <motion.div key={i} className="h-2.5 rounded-full" style={{ width: `${w}%`, background: 'rgba(255,255,255,0.07)' }}
                animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }} />
            ))}
          </div>
        </div>

        {/* Hashtags */}
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {['newmusic','hiphop','independentartist','spotify'].map((tag, i) => (
            <motion.span key={tag} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 + i * 0.1 }}
              className="px-2 py-0.5 rounded-full text-[10px] font-medium"
              style={{ background: 'rgba(0,196,255,0.1)', color: '#00C4FF', border: '1px solid rgba(0,196,255,0.2)' }}>
              #{tag}
            </motion.span>
          ))}
        </div>

        {/* Schedule bar */}
        <div className="px-4 pb-4">
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <Clock size={11} className="text-white/30" />
              <p className="text-white/40 text-xs">Fri, 6:00 PM</p>
            </div>
            <button className="px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6)' }}>
              Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function CreativeStudio() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section id="creative" ref={sectionRef} className="relative py-32 bg-black overflow-hidden">
      {/* Background ambience */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/3 top-1/4 w-[700px] h-[500px] rounded-full blur-[180px] opacity-[0.06]"
          style={{ background: 'linear-gradient(135deg,#7B5FFF,#D63DF6,#00C4FF)' }} />
        <div className="absolute right-0 bottom-0 w-[400px] h-[300px] rounded-full blur-[150px] opacity-[0.04]"
          style={{ background: '#FF5252' }} />
      </div>

      <div className="relative max-w-[1240px] mx-auto px-6 lg:px-8">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }}
          className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border" style={{ background: 'rgba(123,95,255,0.08)', borderColor: 'rgba(123,95,255,0.25)' }}>
            <Wand2 size={14} style={{ color: '#7B5FFF' }} />
            <span className="text-sm font-bold uppercase tracking-widest" style={{ color: '#7B5FFF' }}>New — Creative Studio</span>
          </div>
        </motion.div>

        {/* Hero headline */}
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7, delay: 0.1 }}
          className="text-center mb-6">
          <h2 className="text-[52px] lg:text-[72px] leading-[1.05] font-bold text-white mb-4">
            Create.&nbsp;
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg,#7B5FFF 0%,#D63DF6 50%,#FF5252 100%)' }}>
              Schedule.
            </span>
            <br />Go Viral.
          </h2>
          <p className="text-xl text-white/50 max-w-xl mx-auto leading-relaxed">
            Everything you need to dominate social media — AI-powered content creation, multi-platform scheduling, and real publishing.
          </p>
        </motion.div>

        {/* Platform logos */}
        <motion.div
          initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ duration: 0.6, delay: 0.2 }}
          className="flex justify-center items-center gap-4 mb-16">
          {PLATFORMS.map((p, i) => {
            const PIcon = p.icon;
            return (
              <motion.div key={p.label}
                initial={{ opacity: 0, scale: 0.7 }} animate={isInView ? { opacity: 1, scale: 1 } : {}} transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
                className="flex flex-col items-center gap-1.5">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${p.color}15`, border: `1px solid ${p.color}30` }}>
                  <PIcon size={22} style={{ color: p.color }} />
                </div>
                <p className="text-white/30 text-[11px] font-medium">{p.label}</p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* 2-col: features + mock UI */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          {/* Features */}
          <div className="space-y-5">
            {FEATURES.map((feature, i) => {
              const FIcon = feature.icon;
              return (
                <motion.div key={feature.title}
                  initial={{ opacity: 0, x: -30 }} animate={isInView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.6, delay: 0.4 + i * 0.12 }}
                  className="flex gap-4 p-5 rounded-2xl border hover:-translate-y-0.5 transition-all"
                  style={{ background: '#0D0D0D', borderColor: 'rgba(255,255,255,0.07)' }}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${feature.gradient}`}>
                    <FIcon size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-1">{feature.title}</h3>
                    <p className="text-white/45 text-sm leading-relaxed mb-3">{feature.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {feature.highlights.map(h => (
                        <span key={h} className="flex items-center gap-1 text-[11px] text-white/40">
                          <CheckCircle size={10} className="text-green-400 flex-shrink-0" /> {h}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Mock UI */}
          <motion.div
            initial={{ opacity: 0, x: 30 }} animate={isInView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.7, delay: 0.4 }}>
            <MockUICard />
          </motion.div>
        </div>

        {/* AI Tools grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7, delay: 0.5 }}
          className="mb-16">
          <div className="text-center mb-10">
            <h3 className="text-3xl lg:text-4xl font-bold text-white mb-3">
              5 AI Tools Built for{' '}
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg,#00C4FF,#7B5FFF)' }}>
                Musicians
              </span>
            </h3>
            <p className="text-white/40 text-lg">Generate a week of content in under 5 minutes</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {AI_TOOLS.map((tool, i) => {
              const TIcon = tool.icon;
              return (
                <motion.div key={tool.label}
                  initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: 0.6 + i * 0.08 }}
                  className="p-5 rounded-2xl border text-center hover:-translate-y-1 transition-all duration-300"
                  style={{ background: '#0D0D0D', borderColor: 'rgba(255,255,255,0.07)' }}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: `${tool.color}18`, border: `1px solid ${tool.color}30` }}>
                    <TIcon size={20} style={{ color: tool.color }} />
                  </div>
                  <p className="font-bold text-white text-sm mb-1">{tool.label}</p>
                  <p className="text-white/35 text-xs leading-relaxed">{tool.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Plan tiers comparison */}
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7, delay: 0.6 }}
          className="rounded-3xl border overflow-hidden mb-16"
          style={{ background: 'linear-gradient(180deg,#0D0D0D 0%,#080808 100%)', borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="grid grid-cols-4 divide-x" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="p-5">
              <p className="text-white/30 text-xs font-semibold uppercase tracking-wider">Feature</p>
            </div>
            {[
              { name: 'Starter', price: '$19', color: '#6B7280', highlight: false },
              { name: 'Growth', price: '$49', color: '#7B5FFF', highlight: true },
              { name: 'Pro', price: '$119', color: '#D63DF6', highlight: false },
            ].map(plan => (
              <div key={plan.name} className="p-5 text-center" style={plan.highlight ? { background: 'rgba(123,95,255,0.06)' } : {}}>
                {plan.highlight && <div className="text-[10px] font-bold mb-1" style={{ color: '#7B5FFF' }}>⭐ MOST POPULAR</div>}
                <p className="font-bold text-white text-sm">{plan.name}</p>
                <p className="text-lg font-bold" style={{ color: plan.color }}>{plan.price}</p>
              </div>
            ))}
          </div>
          {[
            ['Social Accounts', '3', '8', 'Unlimited'],
            ['Posts / Month', '20', '80', 'Unlimited'],
            ['AI Captions', '20/mo', '100/mo', 'Unlimited'],
            ['AI Images', '5/mo', '25/mo', '80/mo'],
            ['Video Scripts', '3/mo', '15/mo', '50/mo'],
            ['Video Posting', '❌', '✅', '✅'],
            ['AI Calendar', 'Monthly', 'Weekly', 'Weekly + AI'],
          ].map(([feature, s, g, p], i) => (
            <div key={feature} className="grid grid-cols-4 divide-x border-t" style={{ borderColor: 'rgba(255,255,255,0.05)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
              <div className="p-4 flex items-center"><p className="text-white/55 text-sm">{feature}</p></div>
              <div className="p-4 text-center"><p className="text-white/70 text-sm">{s}</p></div>
              <div className="p-4 text-center" style={{ background: 'rgba(123,95,255,0.04)' }}><p className="text-white text-sm font-medium">{g}</p></div>
              <div className="p-4 text-center"><p className="text-white/70 text-sm">{p}</p></div>
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.7 }}
          className="text-center">
          <h3 className="text-3xl font-bold text-white mb-4">Start creating today</h3>
          <p className="text-white/40 mb-8">All plans include Creative Studio. No extra subscriptions.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <GlowButton variant="primary" size="lg" href="/auth">
              Get Started Free <ArrowRight size={16} className="ml-2" />
            </GlowButton>
            <GlowButton variant="secondary" size="lg" href="#pricing">
              Compare Plans
            </GlowButton>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
