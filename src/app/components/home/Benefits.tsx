import { motion } from 'motion/react';
import { MagicCard } from '../mixxea/MagicCard';
import { DollarSign, TrendingUp, BarChart3 } from 'lucide-react';

const benefits = [
  {
    icon: DollarSign,
    title: 'Split Royalties',
    description: 'Automatically split and pay collaborators with 100% accuracy. No disputes, no delays.',
    mockup: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbmFseXRpY3MlMjBkYXNoYm9hcmQlMjBkYXJrJTIwc2NyZWVufGVufDF8fHx8MTc3MjIwOTI2OHww&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    icon: BarChart3,
    title: 'Track Releases',
    description: 'Monitor your music across 150+ platforms with real-time delivery status and analytics.',
    mockup: 'https://images.unsplash.com/photo-1720962158812-d16549f1e5a3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNpYyUyMGRhc2hib2FyZCUyMGFuYWx5dGljcyUyMHNjcmVlbnxlbnwxfHx8fDE3NzIyMTEyMDd8MA&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    icon: TrendingUp,
    title: 'Grow Your Streams',
    description: 'Agency-grade campaigns for Spotify, TikTok, and YouTube. Proven strategies that deliver results.',
    mockup: 'https://images.unsplash.com/photo-1669459881627-06c2a4948e33?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25jZXJ0JTIwc3RhZ2UlMjBwZXJmb3JtYW5jZSUyMGxpZ2h0c3xlbnwxfHx8fDE3NzIxNzk3Nzl8MA&ixlib=rb-4.1.0&q=80&w=1080',
  },
];

const avatars = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop',
];

export function Benefits() {
  return (
    <section id="platform" className="relative py-40 bg-black">
      <div className="max-w-[1240px] mx-auto px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <h2 className="text-[64px] leading-[1.1] font-bold text-white mb-6">
            Everything You Need to
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #7B5FFF, #D63DF6, #FF5252)' }}
            >
              Scale Your Music
            </span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
              >
                <MagicCard className="h-full group cursor-pointer" onClick={() => window.location.href = '/auth'}>
                  <div className="p-8 h-full flex flex-col bg-[#121212] rounded-3xl">
                    {/* UI Mockup */}
                    <div className="relative h-48 rounded-2xl overflow-hidden mb-6 bg-[#181818]">
                      <img
                        src={benefit.mockup}
                        alt=""
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#121212] to-transparent" />
                      
                      {/* Floating avatars */}
                      <div className="absolute bottom-4 left-4 flex -space-x-2">
                        {avatars.map((avatar, i) => (
                          <div
                            key={i}
                            className="w-8 h-8 rounded-full border-2 border-[#121212] overflow-hidden"
                          >
                            <img src={avatar} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Icon */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 border"
                      style={{
                        background: 'linear-gradient(135deg, rgba(123,95,255,0.2), rgba(214,61,246,0.1))',
                        borderColor: 'rgba(123,95,255,0.3)',
                      }}
                    >
                      <Icon className="h-6 w-6" style={{ color: '#7B5FFF' }} />
                    </div>

                    {/* Content */}
                    <h3 className="text-2xl font-bold text-white mb-3">
                      {benefit.title}
                    </h3>
                    <p className="text-[#B5B5B5] leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </MagicCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}