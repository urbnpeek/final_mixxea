import { motion } from 'motion/react';
import { GlowButton } from '../mixxea/GlowButton';
import { ArrowRight, Shield, Clock, Star } from 'lucide-react';

const trustItems = [
  { icon: Shield, text: '100% rights retained' },
  { icon: Clock, text: 'Approved within 24h' },
  { icon: Star, text: 'No credit card required' },
];

export function FinalCTA() {
  return (
    <section className="relative py-48 bg-black overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <motion.div
          animate={{
            background: [
              'radial-gradient(ellipse 60% 60% at 30% 50%, rgba(123, 95, 255, 0.22) 0%, transparent 60%)',
              'radial-gradient(ellipse 60% 60% at 70% 50%, rgba(214, 61, 246, 0.22) 0%, transparent 60%)',
              'radial-gradient(ellipse 60% 60% at 50% 70%, rgba(255, 82, 82, 0.18) 0%, transparent 60%)',
              'radial-gradient(ellipse 60% 60% at 30% 50%, rgba(123, 95, 255, 0.22) 0%, transparent 60%)',
            ],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0"
        />
        {/* Noise texture */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Floating brand orbs */}
      <motion.div
        animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.35, 0.2] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-[10%] top-[20%] w-80 h-80 rounded-full blur-[120px]"
        style={{ background: '#7B5FFF' }}
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.28, 0.15] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        className="absolute right-[10%] bottom-[20%] w-64 h-64 rounded-full blur-[100px]"
        style={{ background: '#FF5252' }}
      />
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
        className="absolute left-[50%] bottom-[10%] w-48 h-48 rounded-full blur-[80px]"
        style={{ background: '#D63DF6' }}
      />

      <div className="relative z-10 max-w-[1240px] mx-auto px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9 }}
        >
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-sm font-semibold uppercase tracking-widest mb-6"
            style={{ color: '#7B5FFF' }}
          >
            Ready to Scale?
          </motion.p>

          <h2 className="text-[72px] md:text-[88px] leading-[1.05] font-bold text-white mb-8">
            Your music deserves
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #00C4FF, #7B5FFF, #D63DF6, #FF5252)' }}
            >
              premium treatment.
            </span>
          </h2>

          <p className="text-xl text-[#B5B5B5] max-w-2xl mx-auto mb-12 leading-relaxed">
            Join thousands of artists and labels who trust MIXXEA to distribute their music worldwide and run campaigns that deliver real results.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10">
            <GlowButton variant="primary" size="lg" href="/auth">
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </GlowButton>
            <GlowButton variant="secondary" size="lg" href="#pricing">
              View Pricing
            </GlowButton>
          </div>

          {/* Trust items */}
          <div className="flex flex-wrap items-center justify-center gap-8">
            {trustItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" style={{ color: '#7B5FFF' }} />
                  <span className="text-sm text-[#B5B5B5]">{item.text}</span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}