import { motion } from 'motion/react';
import { ReactNode, useRef, useState } from 'react';

interface MagicCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  onClick?: () => void;
}

export function MagicCard({ children, className = '', glowColor = '#7B5FFF', onClick }: MagicCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      className={`relative group ${className}`}
    >
      {/* Glow effect */}
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, ${glowColor}40, transparent 40%)`,
        }}
      />
      
      {/* Card content with border */}
      <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f0f0f]/80 backdrop-blur-sm transition-all duration-300 group-hover:border-white/20">
        {children}
      </div>
    </div>
  );
}