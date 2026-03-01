import { motion } from 'motion/react';
import { Link } from 'react-router';
import { Home, Music, ArrowLeft } from 'lucide-react';

export function NotFound() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#7B5FFF]/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#D63DF6]/8 rounded-full blur-[120px] pointer-events-none" />
      {/* Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:80px_80px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 text-center max-w-lg"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', damping: 15 }}
          className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8"
          style={{ background: 'linear-gradient(135deg, #7B5FFF20, #D63DF620)', border: '1px solid rgba(123,95,255,0.2)' }}
        >
          <Music size={40} className="text-[#7B5FFF]" />
        </motion.div>

        {/* 404 */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-8xl font-black text-white mb-4 tracking-tighter"
          style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6, #FF5252)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
        >
          404
        </motion.h1>

        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="text-2xl font-bold text-white mb-3"
        >
          Page Not Found
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-white/40 text-base mb-10 leading-relaxed"
        >
          Looks like this track doesn't exist. The page you're looking for may have been moved, deleted, or never existed.
        </motion.p>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full font-semibold text-white text-sm transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #7B5FFF, #D63DF6)' }}
          >
            <Home size={16} /> Back to Home
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full font-semibold text-white/70 text-sm border border-white/10 hover:border-white/25 hover:text-white hover:bg-white/[0.05] transition-all"
          >
            <ArrowLeft size={16} /> Go to Dashboard
          </Link>
        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 pt-8 border-t border-white/[0.06]"
        >
          <p className="text-white/25 text-xs">
            MIXXEA · Music Distribution & Marketing Platform
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
