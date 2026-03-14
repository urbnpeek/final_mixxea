import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlowButton } from '../mixxea/GlowButton';
import { Play, Pause, Volume2, VolumeX, ArrowRight } from 'lucide-react';

// Cinematic clips for the showcase — stage artists, concert energy, studio work
const clips = [
  {
    src:     'https://videos.pexels.com/video-files/2278095/2278095-hd_1920_1080_24fps.mp4',
    label:   'Stage Performance',
    caption: 'Artists performing live to sold-out crowds',
    color:   '#7B5FFF',
  },
  {
    src:     'https://videos.pexels.com/video-files/1739506/1739506-hd_1920_1080_25fps.mp4',
    label:   'Concert Energy',
    caption: 'Connecting artists with thousands of fans',
    color:   '#D63DF6',
  },
  {
    src:     'https://videos.pexels.com/video-files/3571264/3571264-hd_1920_1080_25fps.mp4',
    label:   'Studio Sessions',
    caption: 'Where hit records are born and crafted',
    color:   '#00C4FF',
  },
  {
    src:     'https://videos.pexels.com/video-files/856963/856963-hd_1920_1080_25fps.mp4',
    label:   'Music Promotion',
    caption: 'Agency-grade campaigns that drive results',
    color:   '#FF5252',
  },
];

const highlights = [
  { stat: '10M+',  label: 'Streams Influenced' },
  { stat: '500+',  label: 'Campaigns Executed' },
  { stat: '150+',  label: 'Countries Reached'  },
  { stat: '5K+',   label: 'Artists Launched'   },
];

export function VideoShowcase() {
  const [activeClip, setActiveClip] = useState(0);
  const [muted, setMuted]           = useState(true);
  const [playing, setPlaying]       = useState(true);
  const videoRef    = useRef<HTMLVideoElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-advance clips
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setActiveClip(prev => (prev + 1) % clips.length);
    }, 8000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // Sync video element when clip changes
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    v.src   = clips[activeClip].src;
    v.load();
    if (playing) v.play().catch(() => {});
  }, [activeClip]);

  // Sync muted state
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) { v.pause(); setPlaying(false); }
    else         { v.play().catch(() => {}); setPlaying(true); }
  };

  const handleClipSelect = (i: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setActiveClip(i);
    intervalRef.current = setInterval(() => {
      setActiveClip(prev => (prev + 1) % clips.length);
    }, 8000);
  };

  const clip = clips[activeClip];

  return (
    <section className="relative bg-black overflow-hidden">
      {/* ── Cinematic video panel ── */}
      <div className="relative w-full" style={{ height: '88vh', minHeight: 540 }}>

        {/* Video */}
        <video
          ref={videoRef}
          src={clip.src}
          muted={muted}
          loop
          playsInline
          autoPlay
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'brightness(0.55)' }}
          onError={(e) => {
            const v = e.currentTarget;
            v.src = clips[(activeClip + 1) % clips.length].src;
            v.play().catch(() => {});
          }}
        />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/50" />

        {/* Accent colour sweep */}
        <motion.div
          key={activeClip}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 60% 40% at 20% 80%, ${clip.color}18 0%, transparent 70%)` }}
        />

        {/* ── Content overlay ── */}
        <div className="relative h-full flex flex-col justify-between px-8 md:px-16 py-10 max-w-[1400px] mx-auto">

          {/* Top eyebrow */}
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm"
            >
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: clip.color }} />
              <span className="text-sm font-semibold uppercase tracking-widest text-white/70">
                {clip.label}
              </span>
            </motion.div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMuted(m => !m)}
                className="w-10 h-10 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all"
              >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all"
              >
                {playing ? <Pause size={16} /> : <Play size={16} />}
              </button>
            </div>
          </div>

          {/* Centre headline */}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-3xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeClip}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.7 }}
                >
                  <p className="text-base font-semibold uppercase tracking-widest mb-4" style={{ color: clip.color }}>
                    {clip.caption}
                  </p>
                  <h2 className="text-[56px] md:text-[80px] leading-[1.05] font-[800] text-white mb-8 tracking-tight">
                    Built for Artists
                    <br />
                    <span
                      className="bg-clip-text text-transparent"
                      style={{ backgroundImage: `linear-gradient(135deg, ${clip.color}, #FF5252)` }}
                    >
                      Who Perform.
                    </span>
                  </h2>
                </motion.div>
              </AnimatePresence>

              <GlowButton variant="primary" size="lg" href="/auth">
                Start Your Journey
                <ArrowRight className="ml-2 h-5 w-5" />
              </GlowButton>
            </div>
          </div>

          {/* Bottom row: stat highlights + clip selectors */}
          <div className="flex flex-col md:flex-row items-end justify-between gap-8">

            {/* Highlights */}
            <div className="flex items-center gap-8 flex-wrap">
              {highlights.map((h, i) => (
                <motion.div
                  key={h.stat}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="text-center"
                >
                  <p className="text-3xl md:text-4xl font-black text-white leading-none">{h.stat}</p>
                  <p className="text-xs text-white/50 uppercase tracking-widest mt-1 font-semibold">{h.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Clip selector thumbnails */}
            <div className="flex items-center gap-3 flex-wrap justify-end">
              {clips.map((c, i) => (
                <button
                  key={i}
                  onClick={() => handleClipSelect(i)}
                  className="group relative flex flex-col items-center gap-1.5"
                >
                  <div
                    className={`relative w-16 h-1 rounded-full overflow-hidden transition-all duration-300 ${
                      i === activeClip ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    {i === activeClip && (
                      <motion.div
                        className="absolute top-0 left-0 h-full rounded-full"
                        style={{ background: clip.color }}
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 8, ease: 'linear' }}
                      />
                    )}
                  </div>
                  <span
                    className="text-[9px] font-semibold uppercase tracking-widest transition-colors"
                    style={{ color: i === activeClip ? c.color : 'rgba(255,255,255,0.35)' }}
                  >
                    {c.label.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none" />
      </div>

      {/* ── Stats bar ── */}
      <div
        className="relative border-y border-white/[0.05] bg-[#060606]"
        style={{ background: 'linear-gradient(180deg, #060606 0%, #000 100%)' }}
      >
        <div className="max-w-[1240px] mx-auto px-8 py-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-white/30">
              Trusted by independent artists worldwide
            </p>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
            {[
              { number: '10M+', label: 'Streams Influenced', color: '#7B5FFF' },
              { number: '500+', label: 'Campaigns Executed', color: '#D63DF6' },
              { number: '70+',  label: 'Stores Delivered',   color: '#00C4FF' },
              { number: '100%', label: 'Rights Retained',    color: '#FF5252' },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.12 }}
                className="text-center group"
              >
                <p
                  className="text-6xl md:text-7xl font-black text-white mb-3"
                  style={{ textShadow: `0 0 40px ${stat.color}30` }}
                >
                  {stat.number}
                </p>
                <div
                  className="w-10 h-0.5 rounded-full mx-auto mb-2 transition-all duration-500 group-hover:w-20"
                  style={{ background: stat.color }}
                />
                <p className="text-[#777] text-sm">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
