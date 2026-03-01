import { motion, useInView } from 'motion/react';
import { useRef, useState, useEffect } from 'react';

const stats = [
  { number: '10M+', label: 'Streams Influenced', suffix: '' },
  { number: '500+', label: 'Campaigns Executed', suffix: '' },
  { number: '70+', label: 'Stores Delivered', suffix: '' },
  { number: '100%', label: 'Rights Retained', suffix: '' },
];

function AnimatedNumber({ target, suffix }: { target: string; suffix: string }) {
  const [display, setDisplay] = useState('0');
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    const numericStr = target.replace(/[^0-9.]/g, '');
    const end = parseFloat(numericStr);
    const nonNumericSuffix = target.replace(/[0-9.]/g, '');
    if (isNaN(end)) { setDisplay(target); return; }

    let startTime: number;
    const duration = 2000;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(eased * end);
      setDisplay(current + nonNumericSuffix);
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }, [isInView, target]);

  return <span ref={ref}>{display}</span>;
}

export function Stats() {
  return (
    <section className="relative py-32 bg-black border-y border-white/5 overflow-hidden">
      {/* Brand gradient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] rounded-full blur-[140px] opacity-[0.08]"
          style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6, #FF5252)' }}
        />
      </div>

      <div className="relative max-w-[1240px] mx-auto px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#7B5FFF' }}>By the Numbers</p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.12 }}
              className="text-center group"
            >
              <div className="relative inline-block">
                <p className="text-6xl md:text-7xl font-bold text-white mb-3">
                  <AnimatedNumber target={stat.number} suffix={stat.suffix} />
                </p>
                <div
                  className="absolute -bottom-1 left-0 right-0 h-[2px] scale-x-0 group-hover:scale-x-100 transition-transform duration-500"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(123,95,255,0.6), rgba(255,82,82,0.6), transparent)' }}
                />
              </div>
              <p className="text-[#B5B5B5] text-base mt-2">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
