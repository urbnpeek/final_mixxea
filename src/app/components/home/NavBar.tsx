import { motion, AnimatePresence } from 'motion/react';
import { GlowButton } from '../mixxea/GlowButton';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Link } from 'react-router';
import mixxeaLogo from '../../../assets/d262559c0b7675722d6c420c935f7d8c758fea4f.png';
import { CurrencySelector } from '../mixxea/CurrencySelector';

const navLinks = [
  { label: 'Platform',     href: '#platform' },
  { label: 'Distribution', href: '#distribution' },
  { label: 'Promotions',   href: '#promotions' },
  { label: 'Publishing',   href: '#publishing' },
  { label: 'Pricing',      href: '#pricing' },
];

function smoothScroll(href: string) {
  if (href.startsWith('#')) {
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return true;
    }
  }
  return false;
}

export function NavBar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      smoothScroll(href);
      setMobileMenuOpen(false);
    }
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-black/95 backdrop-blur-xl border-b border-white/[0.08] shadow-2xl shadow-black/50' : 'bg-black/80 backdrop-blur-xl border-b border-white/5'}`}
    >
      <div className="max-w-[1240px] mx-auto px-8 py-5">
        <div className="flex items-center justify-between">
          {/* Logo — uses Link for SPA navigation */}
          <Link to="/" className="flex items-center gap-3 flex-shrink-0">
            <img src={mixxeaLogo} alt="MIXXEA" className="h-9 w-9" />
            <span className="text-xl font-bold text-white tracking-tight">MIXXEA</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="text-sm font-medium text-[#B5B5B5] hover:text-white transition-colors relative group"
              >
                {link.label}
                <span className="absolute -bottom-0.5 left-0 right-0 h-px bg-gradient-to-r from-[#7B5FFF] to-[#D63DF6] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              </a>
            ))}
            <Link
              to="/auth"
              className="text-sm font-medium text-[#B5B5B5] hover:text-white transition-colors"
            >
              Sign In
            </Link>
          </div>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-3">
            <CurrencySelector variant="nav" />
            <Link to="/auth?tab=login" className="text-sm font-medium text-[#B5B5B5] hover:text-white transition-colors px-4 py-2 rounded-full border border-white/10 hover:border-white/20">
              Login
            </Link>
            <GlowButton variant="primary" size="sm" href="/auth">
              Get Started Free
            </GlowButton>
          </div>

          {/* Mobile menu button */}
          <button
            className="lg:hidden text-white p-1"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden overflow-hidden"
            >
              <div className="pt-6 pb-8 space-y-2 border-t border-white/[0.06] mt-5">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.href)}
                    className="flex items-center px-4 py-3 rounded-xl text-[#B5B5B5] hover:text-white hover:bg-white/[0.05] transition-all"
                  >
                    {link.label}
                  </a>
                ))}
                <div className="h-px bg-white/[0.06] my-2" />
                <Link
                  to="/auth"
                  className="flex items-center px-4 py-3 rounded-xl text-[#B5B5B5] hover:text-white hover:bg-white/[0.05] transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                {/* Mobile currency selector */}
                <div className="px-4 py-3">
                  <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2">Currency</p>
                  <CurrencySelector variant="nav" />
                </div>
                <div className="pt-2 px-4">
                  <GlowButton variant="primary" size="md" className="w-full" href="/auth">
                    Get Started Free
                  </GlowButton>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}
