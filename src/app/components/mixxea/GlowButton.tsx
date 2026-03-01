import { motion } from 'motion/react';
import { ReactNode } from 'react';
import { Link } from 'react-router';

interface GlowButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  href?: string;
  target?: string;
  rel?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

const baseStyles = 'relative inline-flex items-center justify-center font-semibold transition-all duration-300 rounded-full cursor-pointer';

const sizeStyles = {
  sm: 'px-6 py-2.5 text-sm',
  md: 'px-8 py-3.5 text-base',
  lg: 'px-10 py-4 text-lg',
};

const variantStyles = {
  primary: 'text-white shadow-lg shadow-[#7B5FFF]/30 hover:shadow-[#7B5FFF]/50',
  secondary: 'bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:border-white/30 backdrop-blur-sm',
  ghost: 'text-white hover:bg-white/10',
};

const MotionLink = motion.create(Link);

export function GlowButton({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  onClick,
  href,
  target,
  rel,
  type = 'button',
  disabled = false,
}: GlowButtonProps) {
  const combinedClass = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`;
  const style = variant === 'primary' ? { background: 'linear-gradient(135deg, #7B5FFF 0%, #D63DF6 50%, #FF5252 100%)' } : undefined;

  if (href) {
    // External links (http/https/mailto) use a plain anchor
    const isExternal = href.startsWith('http') || href.startsWith('mailto') || href.startsWith('//');
    if (isExternal) {
      return (
        <motion.a
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          href={href}
          target={target}
          rel={rel || (target === '_blank' ? 'noopener noreferrer' : undefined)}
          className={combinedClass}
          style={style}
          onClick={onClick}
        >
          {children}
        </motion.a>
      );
    }
    // Internal links use react-router Link to avoid full page reloads
    return (
      <MotionLink
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        to={href}
        target={target}
        rel={rel}
        className={combinedClass}
        style={style}
        onClick={onClick}
      >
        {children}
      </MotionLink>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      type={type}
      disabled={disabled}
      className={combinedClass}
      style={style}
    >
      {children}
    </motion.button>
  );
}