import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glow' | 'accent' | 'subtle';
  interactive?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  variant = 'default',
  interactive = false,
  ...props
}) => {
  const variantStyles = {
    default: 'glass-panel',
    glow: 'glass-panel shadow-glow-sm border-hospital-borderHover/50',
    accent: 'bg-gradient-to-br from-hospital-burgundy/80 to-hospital-dark/90 border border-hospital-accent/30 shadow-glow-sm',
    subtle: 'bg-hospital-dark/60 backdrop-blur-md border border-hospital-border/30',
  };

  return (
    <motion.div
      className={`rounded-2xl p-6 relative overflow-hidden ${variantStyles[variant]} ${
        interactive ? 'glass-panel-hover cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
};
