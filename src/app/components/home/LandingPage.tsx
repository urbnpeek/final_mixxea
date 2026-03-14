// ─────────────────────────────────────────────────────────────────────────────
//  MIXXEA Landing Page
//  VideoShowcase, CreativeStudio, and BlogPreviewSection are intentionally
//  inlined here to avoid git-tracking gaps with separately-created files.
// ─────────────────────────────────────────────────────────────────────────────
import { useRef, useEffect, useState } from "react";
import { Link } from "react-router";
import {
  motion,
  AnimatePresence,
  useInView,
} from "motion/react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  ArrowRight,
  Instagram,
  Youtube,
  Facebook,
  Music2,
  Sparkles,
  CalendarDays,
  Link2,
  Wand2,
  Zap,
  Image as ImageIcon,
  Hash,
  Video,
  CheckCircle,
  Clock,
  BookOpen,
  ChevronRight,
} from "lucide-react";

import { NavBar } from "./NavBar";
import { Hero } from "./Hero";
import { PlatformMarquee } from "./PlatformMarquee";
import { Benefits } from "./Benefits";
import { DistributeGlobally } from "./DistributeGlobally";
import { Curators } from "./Curators";
import { Publishing } from "./Publishing";
import { PublicPages } from "./PublicPages";
import { AgencyServices } from "./AgencyServices";
import { Pricing } from "./Pricing";
import { FAQ } from "./FAQ";
import { FinalCTA } from "./FinalCTA";
import { Footer } from "./Footer";
import { HomeStructuredData } from "../seo/StructuredData";
import { GlowButton } from "../mixxea/GlowButton";
import * as api from "../dashboard/api";

// ─── VideoShowcase ────────────────────────────────────────────────────────────

const VS_CLIPS = [
  {
    src: "https://videos.pexels.com/video-files/2278095/2278095-hd_1920_1080_24fps.mp4",
    label: "Stage Performance",
    caption: "Artists performing live to sold-out crowds",
    color: "#7B5FFF",
  },
  {
    src: "https://videos.pexels.com/video-files/1739506/1739506-hd_1920_1080_25fps.mp4",
    label: "Concert Energy",
    caption: "Connecting artists with thousands of fans",
    color: "#D63DF6",
  },
  {
    src: "https://videos.pexels.com/video-files/3571264/3571264-hd_1920_1080_25fps.mp4",
    label: "Studio Sessions",
    caption: "Where hit records are born and crafted",
    color: "#00C4FF",
  },
  {
    src: "https://videos.pexels.com/video-files/856963/856963-hd_1920_1080_25fps.mp4",
    label: "Music Promotion",
    caption: "Agency-grade campaigns that drive results",
    color: "#FF5252",
  },
];

const VS_HIGHLIGHTS = [
  { stat: "10M+", label: "Streams Influenced" },
  { stat: "500+", label: "Campaigns Executed" },
  { stat: "150+", label: "Countries Reached" },
  { stat: "5K+", label: "Artists Launched" },
];

function VideoShowcase() {
  const [activeClip, setActiveClip] = useState(0);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const intervalRef = useRef<ReturnType<
    typeof setInterval
  > | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(
      () => setActiveClip((p) => (p + 1) % VS_CLIPS.length),
      8000,
    );
    return () => {
      if (intervalRef.current)
        clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    v.src = VS_CLIPS[activeClip].src;
    v.load();
    if (playing) v.play().catch(() => {});
  }, [activeClip]); // eslint-disable-line

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) {
      v.pause();
      setPlaying(false);
    } else {
      v.play().catch(() => {});
      setPlaying(true);
    }
  };

  const handleClipSelect = (i: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setActiveClip(i);
    intervalRef.current = setInterval(
      () => setActiveClip((p) => (p + 1) % VS_CLIPS.length),
      8000,
    );
  };

  const clip = VS_CLIPS[activeClip];

  return (
    <section className="relative bg-black overflow-hidden">
      <div
        className="relative w-full"
        style={{ height: "88vh", minHeight: 540 }}
      >
        <video
          ref={videoRef}
          src={clip.src}
          muted={muted}
          loop
          playsInline
          autoPlay
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "brightness(0.55)" }}
          onError={(e) => {
            const v = e.currentTarget;
            v.src =
              VS_CLIPS[(activeClip + 1) % VS_CLIPS.length].src;
            v.play().catch(() => {});
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/50" />
        <motion.div
          key={activeClip}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 60% 40% at 20% 80%, ${clip.color}18 0%, transparent 70%)`,
          }}
        />

        <div className="relative h-full flex flex-col justify-between px-8 md:px-16 py-10 max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm"
            >
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: clip.color }}
              />
              <span className="text-sm font-semibold uppercase tracking-widest text-white/70">
                {clip.label}
              </span>
            </motion.div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMuted((m) => !m)}
                className="w-10 h-10 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all"
              >
                {muted ? (
                  <VolumeX size={16} />
                ) : (
                  <Volume2 size={16} />
                )}
              </button>
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all"
              >
                {playing ? (
                  <Pause size={16} />
                ) : (
                  <Play size={16} />
                )}
              </button>
            </div>
          </div>

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
                  <p
                    className="text-base font-semibold uppercase tracking-widest mb-4"
                    style={{ color: clip.color }}
                  >
                    {clip.caption}
                  </p>
                  <h2 className="text-[56px] md:text-[80px] leading-[1.05] font-[800] text-white mb-8 tracking-tight">
                    Built for Artists
                    <br />
                    <span
                      className="bg-clip-text text-transparent"
                      style={{
                        backgroundImage: `linear-gradient(135deg, ${clip.color}, #FF5252)`,
                      }}
                    >
                      Who Perform.
                    </span>
                  </h2>
                </motion.div>
              </AnimatePresence>
              <GlowButton
                variant="primary"
                size="lg"
                href="/auth"
              >
                Start Your Journey{" "}
                <ArrowRight className="ml-2 h-5 w-5" />
              </GlowButton>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-end justify-between gap-8">
            <div className="flex items-center gap-8 flex-wrap">
              {VS_HIGHLIGHTS.map((h, i) => (
                <motion.div
                  key={h.stat}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="text-center"
                >
                  <p className="text-3xl md:text-4xl font-black text-white leading-none">
                    {h.stat}
                  </p>
                  <p className="text-xs text-white/50 uppercase tracking-widest mt-1 font-semibold">
                    {h.label}
                  </p>
                </motion.div>
              ))}
            </div>
            <div className="flex items-center gap-3 flex-wrap justify-end">
              {VS_CLIPS.map((c, i) => (
                <button
                  key={i}
                  onClick={() => handleClipSelect(i)}
                  className="group relative flex flex-col items-center gap-1.5"
                >
                  <div
                    className={`relative w-16 h-1 rounded-full overflow-hidden transition-all duration-300 ${i === activeClip ? "bg-white/30" : "bg-white/10 hover:bg-white/20"}`}
                  >
                    {i === activeClip && (
                      <motion.div
                        className="absolute top-0 left-0 h-full rounded-full"
                        style={{ background: clip.color }}
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{
                          duration: 8,
                          ease: "linear",
                        }}
                      />
                    )}
                  </div>
                  <span
                    className="text-[9px] font-semibold uppercase tracking-widest transition-colors"
                    style={{
                      color:
                        i === activeClip
                          ? c.color
                          : "rgba(255,255,255,0.35)",
                    }}
                  >
                    {c.label.split(" ")[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none" />
      </div>

      <div
        className="relative border-y border-white/[0.05]"
        style={{
          background:
            "linear-gradient(180deg,#060606 0%,#000 100%)",
        }}
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
              {
                number: "10M+",
                label: "Streams Influenced",
                color: "#7B5FFF",
              },
              {
                number: "500+",
                label: "Campaigns Executed",
                color: "#D63DF6",
              },
              {
                number: "70+",
                label: "Stores Delivered",
                color: "#00C4FF",
              },
              {
                number: "100%",
                label: "Rights Retained",
                color: "#FF5252",
              },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.12,
                }}
                className="text-center group"
              >
                <p
                  className="text-6xl md:text-7xl font-black text-white mb-3"
                  style={{
                    textShadow: `0 0 40px ${stat.color}30`,
                  }}
                >
                  {stat.number}
                </p>
                <div
                  className="w-10 h-0.5 rounded-full mx-auto mb-2 transition-all duration-500 group-hover:w-20"
                  style={{ background: stat.color }}
                />
                <p className="text-[#777] text-sm">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── CreativeStudio ───────────────────────────────────────────────────────────

const CS_PLATFORMS = [
  { icon: Instagram, label: "Instagram", color: "#E1306C" },
  { icon: Music2, label: "TikTok", color: "#FF0050" },
  { icon: Facebook, label: "Facebook", color: "#1877F2" },
  { icon: Youtube, label: "YouTube", color: "#FF0000" },
];

const CS_AI_TOOLS = [
  {
    icon: Sparkles,
    label: "Caption Generator",
    desc: "Platform-optimized captions in seconds",
    color: "#7B5FFF",
  },
  {
    icon: Hash,
    label: "Hashtag Engine",
    desc: "25-tag sets with popularity scoring",
    color: "#00C4FF",
  },
  {
    icon: ImageIcon,
    label: "AI Image Creator",
    desc: "DALL-E 3 promo graphics & lyric cards",
    color: "#D63DF6",
  },
  {
    icon: Video,
    label: "Video Script Writer",
    desc: "Scene-by-scene scripts for Reels & TikTok",
    color: "#FF5252",
  },
  {
    icon: CalendarDays,
    label: "Content Calendar",
    desc: "AI-planned 7-day release campaigns",
    color: "#F59E0B",
  },
];

const CS_FEATURES = [
  {
    icon: Link2,
    title: "One-Click Social Linking",
    description:
      "Connect Instagram, TikTok, YouTube, and Facebook in seconds. Manage all accounts from one dashboard.",
    gradient: "from-[#7B5FFF] to-[#5B3FDF]",
    highlights: [
      "OAuth secure connection",
      "Auto token refresh",
      "Account health monitoring",
    ],
  },
  {
    icon: Wand2,
    title: "AI Content Engine",
    description:
      "GPT-4o generates platform-perfect captions, hashtag sets, video scripts, and full release campaign plans.",
    gradient: "from-[#D63DF6] to-[#9B1DD6]",
    highlights: [
      "Platform-specific tone",
      "Genre-aware generation",
      "Release-linked context",
    ],
  },
  {
    icon: CalendarDays,
    title: "Smart Scheduling",
    description:
      "Schedule weeks of content in minutes with our calendar view. Post to multiple platforms simultaneously.",
    gradient: "from-[#00C4FF] to-[#0080CC]",
    highlights: [
      "Visual calendar view",
      "Multi-platform publish",
      "Optimal time suggestions",
    ],
  },
];

function CSMockCard() {
  return (
    <div className="relative w-full max-w-sm mx-auto">
      <div
        className="absolute inset-0 blur-[60px] opacity-30 rounded-full"
        style={{
          background:
            "linear-gradient(135deg,#7B5FFF,#D63DF6,#00C4FF)",
        }}
      />
      <div
        className="relative rounded-2xl border overflow-hidden"
        style={{
          background: "#0D0D0D",
          borderColor: "rgba(255,255,255,0.12)",
        }}
      >
        <div
          className="flex items-center gap-3 px-4 py-3 border-b"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg,#7B5FFF,#D63DF6)",
            }}
          >
            <Wand2 size={13} className="text-white" />
          </div>
          <p className="text-white text-sm font-semibold">
            Creative Studio
          </p>
          <span
            className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold"
            style={{
              background: "rgba(0,196,255,0.15)",
              color: "#00C4FF",
            }}
          >
            AI
          </span>
        </div>
        <div
          className="px-4 py-3 border-b"
          style={{ borderColor: "rgba(255,255,255,0.05)" }}
        >
          <p className="text-white/40 text-[10px] mb-2 uppercase tracking-wider">
            Platforms
          </p>
          <div className="flex gap-2">
            {CS_PLATFORMS.map((p, i) => {
              const PIcon = p.icon;
              const active = i < 2;
              return (
                <motion.div
                  key={p.label}
                  animate={
                    active ? { scale: [1, 1.05, 1] } : {}
                  }
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.5,
                  }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
                  style={{
                    background: active
                      ? `${p.color}20`
                      : "rgba(255,255,255,0.04)",
                    border: active
                      ? `1px solid ${p.color}50`
                      : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <PIcon
                    size={15}
                    style={{
                      color: active
                        ? p.color
                        : "rgba(255,255,255,0.25)",
                    }}
                  />
                </motion.div>
              );
            })}
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/40 text-[10px] uppercase tracking-wider">
              AI Caption
            </p>
            <motion.div
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full"
              style={{ background: "rgba(123,95,255,0.2)" }}
            >
              <Sparkles size={9} style={{ color: "#7B5FFF" }} />
              <span
                className="text-[9px] font-semibold"
                style={{ color: "#C4AEFF" }}
              >
                Generating
              </span>
            </motion.div>
          </div>
          <div className="space-y-1.5">
            {[100, 75, 55].map((w, i) => (
              <motion.div
                key={i}
                className="h-2.5 rounded-full"
                style={{
                  width: `${w}%`,
                  background: "rgba(255,255,255,0.07)",
                }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
              />
            ))}
          </div>
        </div>
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {[
            "newmusic",
            "hiphop",
            "independentartist",
            "spotify",
          ].map((tag, i) => (
            <motion.span
              key={tag}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="px-2 py-0.5 rounded-full text-[10px] font-medium"
              style={{
                background: "rgba(0,196,255,0.1)",
                color: "#00C4FF",
                border: "1px solid rgba(0,196,255,0.2)",
              }}
            >
              #{tag}
            </motion.span>
          ))}
        </div>
        <div className="px-4 pb-4">
          <div className="flex gap-2">
            <div
              className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <Clock size={11} className="text-white/30" />
              <p className="text-white/40 text-xs">
                Fri, 6:00 PM
              </p>
            </div>
            <button
              className="px-4 py-2 rounded-xl text-xs font-bold text-white"
              style={{
                background:
                  "linear-gradient(135deg,#7B5FFF,#D63DF6)",
              }}
            >
              Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreativeStudio() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, {
    once: true,
    margin: "-100px",
  });
  return (
    <section
      id="creative"
      ref={sectionRef}
      className="relative py-32 bg-black overflow-hidden"
    >
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute left-1/3 top-1/4 w-[700px] h-[500px] rounded-full blur-[180px] opacity-[0.06]"
          style={{
            background:
              "linear-gradient(135deg,#7B5FFF,#D63DF6,#00C4FF)",
          }}
        />
        <div
          className="absolute right-0 bottom-0 w-[400px] h-[300px] rounded-full blur-[150px] opacity-[0.04]"
          style={{ background: "#FF5252" }}
        />
      </div>
      <div className="relative max-w-[1240px] mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="flex justify-center mb-8"
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border"
            style={{
              background: "rgba(123,95,255,0.08)",
              borderColor: "rgba(123,95,255,0.25)",
            }}
          >
            <Wand2 size={14} style={{ color: "#7B5FFF" }} />
            <span
              className="text-sm font-bold uppercase tracking-widest"
              style={{ color: "#7B5FFF" }}
            >
              New — Creative Studio
            </span>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-center mb-6"
        >
          <h2 className="text-[52px] lg:text-[72px] leading-[1.05] font-bold text-white mb-4">
            Create.&nbsp;
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg,#7B5FFF 0%,#D63DF6 50%,#FF5252 100%)",
              }}
            >
              Schedule.
            </span>
            <br />
            Go Viral.
          </h2>
          <p className="text-xl text-white/50 max-w-xl mx-auto leading-relaxed">
            Everything you need to dominate social media —
            AI-powered content creation, multi-platform
            scheduling, and real publishing.
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex justify-center items-center gap-4 mb-16"
        >
          {CS_PLATFORMS.map((p, i) => {
            const PIcon = p.icon;
            return (
              <motion.div
                key={p.label}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={
                  isInView ? { opacity: 1, scale: 1 } : {}
                }
                transition={{
                  duration: 0.4,
                  delay: 0.3 + i * 0.08,
                }}
                className="flex flex-col items-center gap-1.5"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{
                    background: `${p.color}15`,
                    border: `1px solid ${p.color}30`,
                  }}
                >
                  <PIcon size={22} style={{ color: p.color }} />
                </div>
                <p className="text-white/30 text-[11px] font-medium">
                  {p.label}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          <div className="space-y-5">
            {CS_FEATURES.map((feature, i) => {
              const FIcon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -30 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{
                    duration: 0.6,
                    delay: 0.4 + i * 0.12,
                  }}
                  className="flex gap-4 p-5 rounded-2xl border hover:-translate-y-0.5 transition-all"
                  style={{
                    background: "#0D0D0D",
                    borderColor: "rgba(255,255,255,0.07)",
                  }}
                >
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${feature.gradient}`}
                  >
                    <FIcon size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-white/45 text-sm leading-relaxed mb-3">
                      {feature.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {feature.highlights.map((h) => (
                        <span
                          key={h}
                          className="flex items-center gap-1 text-[11px] text-white/40"
                        >
                          <CheckCircle
                            size={10}
                            className="text-green-400 flex-shrink-0"
                          />{" "}
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.4 }}
          >
            <CSMockCard />
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mb-16"
        >
          <div className="text-center mb-10">
            <h3 className="text-3xl lg:text-4xl font-bold text-white mb-3">
              5 AI Tools Built for{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg,#00C4FF,#7B5FFF)",
                }}
              >
                Musicians
              </span>
            </h3>
            <p className="text-white/40 text-lg">
              Generate a week of content in under 5 minutes
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {CS_AI_TOOLS.map((tool, i) => {
              const TIcon = tool.icon;
              return (
                <motion.div
                  key={tool.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{
                    duration: 0.5,
                    delay: 0.6 + i * 0.08,
                  }}
                  className="p-5 rounded-2xl border text-center hover:-translate-y-1 transition-all duration-300"
                  style={{
                    background: "#0D0D0D",
                    borderColor: "rgba(255,255,255,0.07)",
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{
                      background: `${tool.color}18`,
                      border: `1px solid ${tool.color}30`,
                    }}
                  >
                    <TIcon
                      size={20}
                      style={{ color: tool.color }}
                    />
                  </div>
                  <p className="font-bold text-white text-sm mb-1">
                    {tool.label}
                  </p>
                  <p className="text-white/35 text-xs leading-relaxed">
                    {tool.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="text-center"
        >
          <h3 className="text-3xl font-bold text-white mb-4">
            Start creating today
          </h3>
          <p className="text-white/40 mb-8">
            All plans include Creative Studio. No extra
            subscriptions.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <GlowButton
              variant="primary"
              size="lg"
              href="/auth"
            >
              Get Started Free{" "}
              <ArrowRight size={16} className="ml-2" />
            </GlowButton>
            <GlowButton
              variant="secondary"
              size="lg"
              href="#pricing"
            >
              Compare Plans
            </GlowButton>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── BlogPreviewSection ────────────────────────────────────────────────────────

const BLOG_PLACEHOLDERS = [
  {
    slug: "music-distribution-for-independent-artists-2026",
    title:
      "Music Distribution for Independent Artists: The Complete 2026 Guide",
    metaDescription:
      "Everything independent artists need to know about music distribution in 2026. Distribute to 150+ platforms with MIXXEA.",
    category: "Music Distribution",
    wordCount: 1580,
    publishedAt: "2026-03-01T00:00:00.000Z",
    accentColor: "#00C4FF",
  },
  {
    slug: "spotify-playlist-pitching-guide-independent-artists",
    title:
      "Spotify Playlist Pitching: The Complete Guide for Independent Artists (2026)",
    metaDescription:
      "How to pitch your music to Spotify editorial and independent playlists. Land playlist placements and grow your streams.",
    category: "Spotify Growth",
    wordCount: 1620,
    publishedAt: "2026-03-04T00:00:00.000Z",
    accentColor: "#1DB954",
  },
  {
    slug: "music-marketing-agency-for-independent-artists",
    title:
      "Music Marketing Agency for Independent Artists: The 2026 Selection Guide",
    metaDescription:
      "How to choose the right music marketing agency. TikTok campaigns, Spotify promotion, YouTube ads, and PR for independent artists.",
    category: "Music Marketing Agency",
    wordCount: 1640,
    publishedAt: "2026-03-07T00:00:00.000Z",
    accentColor: "#D63DF6",
  },
];

function blogCatColor(cat: string) {
  if (cat?.includes("Distribution")) return "#00C4FF";
  if (cat?.includes("Spotify")) return "#1DB954";
  if (cat?.includes("TikTok")) return "#FF0050";
  if (cat?.includes("Publishing")) return "#D63DF6";
  if (cat?.includes("Marketing") || cat?.includes("Agency"))
    return "#FF5252";
  if (cat?.includes("Playlist")) return "#7B5FFF";
  return "#F59E0B";
}
function readTime(words: number) {
  return `${Math.max(1, Math.round(words / 200))} min read`;
}
function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function BlogPreviewSection() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (api as any)
      .blogGetPosts?.()
      .then((res: any) =>
        setPosts((res.posts || []).slice(0, 3)),
      )
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  const displayPosts =
    !loading && posts.length > 0 ? posts : BLOG_PLACEHOLDERS;

  return (
    <section className="py-28 px-5 bg-black relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] opacity-[0.06]"
          style={{
            background:
              "radial-gradient(ellipse, #7B5FFF 0%, transparent 70%)",
          }}
        />
      </div>
      <div className="max-w-7xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-14"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#7B5FFF]/30 bg-[#7B5FFF]/10 mb-5">
              <BookOpen size={13} className="text-[#7B5FFF]" />
              <span className="text-xs font-semibold text-[#7B5FFF] uppercase tracking-widest">
                Music Industry Blog
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-[1.1]">
              Latest From{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #7B5FFF, #D63DF6)",
                }}
              >
                the Blog
              </span>
            </h2>
            <p className="text-white/40 text-base mt-3 max-w-lg leading-relaxed">
              Expert guides on music distribution, Spotify
              growth, TikTok promotion, and publishing
              administration for independent artists.
            </p>
          </div>
          <Link
            to="/blog"
            className="group inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold border border-white/10 text-white/70 hover:text-white hover:border-[#7B5FFF]/40 transition-all duration-200 flex-shrink-0"
          >
            View all articles{" "}
            <ArrowRight
              size={15}
              className="group-hover:translate-x-0.5 transition-transform"
            />
          </Link>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {displayPosts.map((post, i) => {
            const color =
              post.accentColor || blogCatColor(post.category);
            return (
              <motion.div
                key={post.slug}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Link
                  to={`/blog/${post.slug}`}
                  className="group block h-full"
                >
                  <div
                    className="h-full relative rounded-2xl border border-white/[0.07] p-6 flex flex-col overflow-hidden transition-all duration-300 hover:border-white/[0.14] hover:-translate-y-0.5"
                    style={{ background: "#0A0A0A" }}
                  >
                    <div
                      className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl"
                      style={{
                        background: `linear-gradient(90deg, ${color}, transparent)`,
                      }}
                    />
                    <div className="flex items-center justify-between mb-4">
                      <span
                        className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
                        style={{
                          color,
                          background: `${color}18`,
                        }}
                      >
                        {post.category || "Music Industry"}
                      </span>
                      <span className="text-[10px] text-white/25">
                        {fmtDate(post.publishedAt)}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white leading-snug mb-3 flex-1 group-hover:text-[#00C4FF] transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-xs text-white/40 leading-relaxed mb-5 line-clamp-2">
                      {post.metaDescription}
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t border-white/[0.05]">
                      <div className="flex items-center gap-1.5 text-[10px] text-white/30">
                        <Clock size={10} />
                        {readTime(post.wordCount || 1500)}
                      </div>
                      <span
                        className="flex items-center gap-1 text-[10px] font-semibold group-hover:gap-2 transition-all"
                        style={{ color }}
                      >
                        Read article <ChevronRight size={11} />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-10 text-center"
        >
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white/40 hover:text-white/70 transition-colors"
          >
            Explore all music industry guides on the MIXXEA blog{" "}
            <ArrowRight size={14} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

// ─── LandingPage (root export) ────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="min-h-screen bg-black overflow-x-hidden">
      <HomeStructuredData />
      <NavBar />
      <Hero />
      <PlatformMarquee />
      <Benefits />
      <DistributeGlobally />
      <Curators />
      <Publishing />
      <PublicPages />
      <AgencyServices />
      <CreativeStudio />
      <VideoShowcase />
      <Pricing />
      <FAQ />
      <BlogPreviewSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}