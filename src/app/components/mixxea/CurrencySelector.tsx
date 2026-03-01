import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check } from 'lucide-react';
import { useCurrency, CURRENCIES } from './CurrencyContext';

interface CurrencySelectorProps {
  /** 'dark' = dashboard, 'nav' = landing page navbar */
  variant?: 'dark' | 'nav';
}

export function CurrencySelector({ variant = 'nav' }: CurrencySelectorProps) {
  const { currency, setCurrencyCode } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const triggerClass =
    variant === 'nav'
      ? 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border border-white/10 hover:border-white/25 text-white/70 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-all'
      : 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-white/[0.08] hover:border-white/20 text-white/60 hover:text-white bg-white/[0.04] hover:bg-white/[0.07] transition-all';

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className={triggerClass} title="Change currency">
        <span className="text-sm leading-none">{currency.flag}</span>
        <span className="tracking-wide">{currency.code}</span>
        <ChevronDown
          size={10}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-full mt-2 w-56 bg-[#161616] border border-white/[0.10] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] z-[300] overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-white/[0.06]">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Currency</p>
            </div>

            {/* List */}
            <div className="max-h-64 overflow-y-auto py-1.5 scrollbar-thin">
              {CURRENCIES.map(c => {
                const isActive = currency.code === c.code;
                return (
                  <button
                    key={c.code}
                    onClick={() => { setCurrencyCode(c.code); setOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2 text-xs transition-all ${
                      isActive
                        ? 'bg-[#7B5FFF]/10 text-white'
                        : 'text-white/55 hover:bg-white/[0.04] hover:text-white'
                    }`}
                  >
                    <span className="text-base flex-shrink-0 w-5 text-center">{c.flag}</span>
                    <span className="flex-1 text-left font-medium">{c.name}</span>
                    <span
                      className={`text-[10px] font-bold tracking-wide flex-shrink-0 ${
                        isActive ? 'text-[#7B5FFF]' : 'text-white/25'
                      }`}
                    >
                      {c.code}
                    </span>
                    {isActive && <Check size={10} className="text-[#7B5FFF] flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Footer note */}
            <div className="px-4 py-2 border-t border-white/[0.06]">
              <p className="text-[9px] text-white/20 leading-relaxed">
                Approximate rates · Billing processed in USD
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
