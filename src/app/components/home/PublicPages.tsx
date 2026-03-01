import { motion } from 'motion/react';
import { GlowButton } from '../mixxea/GlowButton';
import { Users, ExternalLink } from 'lucide-react';

const events = [
  { month: 'MAR', day: '15', venue: 'The Fillmore', city: 'San Francisco', status: 'Sold Out', statusColor: 'text-red-400 bg-red-500/10 border-red-500/20' },
  { month: 'MAR', day: '22', venue: 'Brooklyn Steel', city: 'New York', status: '12 left', statusColor: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  { month: 'MAR', day: '29', venue: 'The Roxy', city: 'Los Angeles', status: 'On Sale', statusColor: 'text-[#D63DF6] bg-[#7B5FFF]/10 border-[#7B5FFF]/20' },
];

const streamingLinks = [
  { name: 'Spotify', color: '#1DB954' },
  { name: 'Apple Music', color: '#FC3C44' },
  { name: 'YouTube', color: '#FF0000' },
];

export function PublicPages() {
  return (
    <section className="relative py-40 bg-black overflow-hidden">
      <div className="max-w-[1240px] mx-auto px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Artist Profile Card Mockup */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="relative rounded-3xl overflow-hidden bg-[#121212] border border-white/5 shadow-2xl">
              {/* Cover image */}
              <div className="relative h-52 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1658843179014-e61b7a3d841e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25jZXJ0JTIwY3Jvd2QlMjBtdXNpYyUyMGZlc3RpdmFsJTIwc3RhZ2V8ZW58MXx8fHwxNzcyMjEzMzcwfDA&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="Artist Cover"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/50 to-transparent" />
              </div>

              {/* Profile content */}
              <div className="relative px-7 pb-7 -mt-14">
                {/* Avatar */}
                <div
                  className="w-20 h-20 rounded-full border-4 border-[#121212] overflow-hidden mb-4"
                  style={{ background: 'linear-gradient(135deg, #7B5FFF, #FF5252)' }}
                >
                  <img
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop"
                    alt="Artist"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Artist info */}
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">Luna Park</h3>
                    <p className="text-sm text-[#B5B5B5]">Electronic • Los Angeles</p>
                  </div>
                  <ExternalLink className="h-5 w-5 text-[#555] mt-1" />
                </div>

                {/* Stats */}
                <div className="flex gap-5 mb-6 p-4 rounded-2xl bg-white/5">
                  <div className="text-center flex-1">
                    <p className="text-xl font-bold text-white">2.4M</p>
                    <p className="text-xs text-[#B5B5B5]">Monthly listeners</p>
                  </div>
                  <div className="w-px bg-white/10" />
                  <div className="text-center flex-1">
                    <p className="text-xl font-bold text-white">342K</p>
                    <p className="text-xs text-[#B5B5B5]">Followers</p>
                  </div>
                  <div className="w-px bg-white/10" />
                  <div className="text-center flex-1">
                    <p className="text-xl font-bold text-white">48</p>
                    <p className="text-xs text-[#B5B5B5]">Tracks</p>
                  </div>
                </div>

                {/* Streaming links */}
                <div className="flex gap-2 mb-6">
                  {streamingLinks.map((link) => (
                    <div
                      key={link.name}
                      className="px-3 py-1.5 rounded-full bg-white/5 border border-white/8 text-xs font-semibold"
                      style={{ color: link.color }}
                    >
                      {link.name}
                    </div>
                  ))}
                </div>

                {/* Latest release */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4 mb-6">
                  <div
                    className="w-14 h-14 rounded-xl flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #7B5FFF, #FF5252)' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm mb-0.5">Midnight Dreams</p>
                    <p className="text-xs text-[#B5B5B5]">Latest Single • 2026</p>
                  </div>
                  <span
                    className="flex-shrink-0 px-2.5 py-1 rounded-full border"
                    style={{ background: 'rgba(123,95,255,0.2)', borderColor: 'rgba(123,95,255,0.3)' }}
                  >
                    <span className="text-xs font-bold" style={{ color: '#7B5FFF' }}>New</span>
                  </span>
                </div>

                {/* Event cards */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#666] uppercase tracking-widest mb-3">Upcoming Shows</p>
                  {events.map((event, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                      className="flex items-center gap-4 p-3 rounded-xl bg-[#181818] border border-white/5"
                    >
                      <div className="text-center w-10 flex-shrink-0">
                        <p className="text-[10px] text-[#B5B5B5] uppercase">{event.month}</p>
                        <p className="text-lg font-bold text-white leading-none">{event.day}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{event.venue}</p>
                        <p className="text-xs text-[#B5B5B5]">{event.city}</p>
                      </div>
                      <span className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full border font-semibold ${event.statusColor}`}>
                        {event.status}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Glow effect */}
            <div
              className="absolute -inset-4 blur-3xl opacity-50 -z-10"
              style={{ background: 'linear-gradient(135deg, rgba(123,95,255,0.15), rgba(255,82,82,0.15))' }}
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
              <Users className="h-4 w-4" style={{ color: '#7B5FFF' }} />
              <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#7B5FFF' }}>Public Profile</span>
            </div>

            <h2 className="text-[56px] leading-[1.1] font-bold text-white mb-6">
              Beautiful
              <br />
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #7B5FFF, #FF5252)' }}
              >
                Public Pages
              </span>
            </h2>

            <p className="text-lg text-[#B5B5B5] leading-relaxed mb-8">
              Every artist gets a stunning public profile page. Showcase your music, share tour dates,
              and connect with fans — all in one beautiful, mobile-optimized smart page.
            </p>

            <ul className="space-y-4 mb-10">
              {[
                'Customizable artist profiles & branding',
                'Integrated event calendar & ticketing',
                'Smart links to all streaming platforms',
                'Built-in fan engagement & presave tools',
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
              Create Your Smart Page
            </GlowButton>
          </motion.div>
        </div>
      </div>
    </section>
  );
}