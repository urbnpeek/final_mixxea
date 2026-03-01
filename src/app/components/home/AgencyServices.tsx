import { motion } from 'motion/react';
import { MagicCard } from '../mixxea/MagicCard';
import { GlowButton } from '../mixxea/GlowButton';
import { Music2, ListMusic, Video, Youtube, FileText, BarChart3, ClipboardList, Lightbulb, Rocket } from 'lucide-react';

const services = [
  {
    icon: Music2,
    title: 'Spotify Growth',
    description: 'Algorithm optimization, follower campaigns, and Spotify for Artists strategy to maximize discovery reach.',
    badge: 'Most Popular',
  },
  {
    icon: ListMusic,
    title: 'Playlist Pitching',
    description: 'Direct editorial pitching + access to our curated network of 5,000+ independent playlist curators.',
    badge: null,
  },
  {
    icon: Video,
    title: 'TikTok / IG Creator Campaigns',
    description: 'UGC creator network, sound seeding, and viral strategy across TikTok and Instagram Reels.',
    badge: 'Trending',
  },
  {
    icon: Youtube,
    title: 'YouTube Ads',
    description: 'Pre-roll video campaigns, music video discovery ads, and full content strategy for YouTube growth.',
    badge: null,
  },
  {
    icon: FileText,
    title: 'PR & Press',
    description: 'Blog features, music magazine placements, and radio outreach — building your media presence.',
    badge: null,
  },
  {
    icon: BarChart3,
    title: 'Meta & Google Ads',
    description: 'Full-funnel paid media campaigns with pixel tracking, conversion optimization, and detailed reporting.',
    badge: null,
  },
];

const steps = [
  {
    icon: ClipboardList,
    number: '01',
    title: 'Brief',
    description: 'You submit your goals, budget, and target audience. We create a tailored campaign brief.',
  },
  {
    icon: Lightbulb,
    number: '02',
    title: 'Strategy',
    description: 'Our team crafts a data-driven promotional strategy across the best channels for your sound.',
  },
  {
    icon: Rocket,
    number: '03',
    title: 'Execution & Reporting',
    description: 'We execute, monitor performance live, and deliver weekly KPI reports with full transparency.',
  },
];

export function AgencyServices() {
  return (
    <section id="promotions" className="relative py-40 bg-[#0a0a0a]">
      <div className="max-w-[1240px] mx-auto px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
            <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#7B5FFF' }}>Agency Services</span>
          </div>
          <h2 className="text-[64px] leading-[1.1] font-bold text-white mb-6">
            Agency-grade promotion,
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #7B5FFF, #D63DF6, #FF5252)' }}
            >
              powered by your data
            </span>
          </h2>
          <p className="text-xl text-[#B5B5B5] max-w-2xl mx-auto leading-relaxed">
            Full-service marketing execution with data-driven strategies and transparent reporting — no guesswork, just results.
          </p>
        </motion.div>

        {/* Services grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-28">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className="group"
              >
                <MagicCard>
                  <div className="p-8 bg-[#121212] rounded-2xl h-full hover:bg-[#181818] transition-colors duration-300">
                    {/* Icon + Badge */}
                    <div className="flex items-start justify-between mb-6">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border"
                        style={{
                          background: 'linear-gradient(135deg, rgba(123,95,255,0.2), rgba(214,61,246,0.2))',
                          borderColor: 'rgba(123,95,255,0.3)',
                        }}
                      >
                        <Icon className="h-7 w-7" style={{ color: '#7B5FFF' }} />
                      </div>
                      {service.badge && (
                        <span
                          className="px-3 py-1 rounded-full text-xs font-semibold border"
                          style={{
                            background: 'rgba(123,95,255,0.15)',
                            borderColor: 'rgba(123,95,255,0.3)',
                            color: '#D63DF6',
                          }}
                        >
                          {service.badge}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">{service.title}</h3>
                    <p className="text-[#B5B5B5] leading-relaxed">{service.description}</p>
                  </div>
                </MagicCard>
              </motion.div>
            );
          })}
        </div>

        {/* How it works strip */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative rounded-3xl overflow-hidden border border-white/10 bg-[#111]"
        >
          {/* Glow behind strip */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(135deg, rgba(123,95,255,0.05) 0%, transparent 50%, rgba(255,82,82,0.05) 100%)' }}
          />

          <div className="relative p-12">
            <div className="text-center mb-12">
              <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: '#7B5FFF' }}>How it Works</p>
              <h3 className="text-4xl font-bold text-white">
                From brief to results in 3 steps
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Connector lines */}
              <div
                className="hidden md:block absolute top-10 left-1/3 right-1/3 h-px"
                style={{ background: 'linear-gradient(90deg, rgba(123,95,255,0.3), rgba(214,61,246,0.5), rgba(255,82,82,0.3))' }}
              />

              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 + index * 0.15 }}
                    className="text-center relative"
                  >
                    <div
                      className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#1a1a1a] border mb-6 mx-auto"
                      style={{ borderColor: 'rgba(123,95,255,0.3)' }}
                    >
                      <Icon className="h-8 w-8" style={{ color: '#7B5FFF' }} />
                      <span
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #7B5FFF, #FF5252)' }}
                      >
                        {index + 1}
                      </span>
                    </div>
                    <h4 className="text-xl font-bold text-white mb-3">{step.title}</h4>
                    <p className="text-[#B5B5B5] leading-relaxed max-w-xs mx-auto">{step.description}</p>
                  </motion.div>
                );
              })}
            </div>

            <div className="text-center mt-12">
              <GlowButton variant="primary" size="lg" href="/auth">
                Request a Campaign Brief
              </GlowButton>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}