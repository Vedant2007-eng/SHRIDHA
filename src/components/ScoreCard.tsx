import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Users, Stethoscope, Pill, LucideIcon } from 'lucide-react';

interface ScoreCardProps {
  categoryKey: 'cleanliness' | 'staffBehaviour' | 'doctorTreatment' | 'medicineSupport';
  name: string;
  score: number;
}

const CATEGORY_CONFIG: Record<
  string,
  { icon: LucideIcon; color: string; bgGradient: string }
> = {
  cleanliness: {
    icon: Sparkles,
    color: 'text-hospital-accent',
    bgGradient: 'from-hospital-burgundy/80 to-hospital-dark/80',
  },
  staffBehaviour: {
    icon: Users,
    color: 'text-hospital-warm',
    bgGradient: 'from-hospital-burgundy/80 to-hospital-dark/80',
  },
  doctorTreatment: {
    icon: Stethoscope,
    color: 'text-hospital-accentGlow',
    bgGradient: 'from-hospital-burgundy/80 to-hospital-dark/80',
  },
  medicineSupport: {
    icon: Pill,
    color: 'text-hospital-amber',
    bgGradient: 'from-hospital-burgundy/80 to-hospital-dark/80',
  },
};

export const ScoreCard: React.FC<ScoreCardProps> = ({
  categoryKey,
  name,
  score,
}) => {
  const config = CATEGORY_CONFIG[categoryKey] || CATEGORY_CONFIG.cleanliness;
  const Icon = config.icon;

  return (
    <motion.div
      whileHover={{ y: -3 }}
      className={`glass-panel p-5 rounded-2xl border border-hospital-border/40 shadow-glow-sm relative overflow-hidden bg-gradient-to-br ${config.bgGradient}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-hospital-burgundy border border-hospital-border flex items-center justify-center shadow-inner">
            <Icon className={`w-5 h-5 ${config.color}`} />
          </div>
          <div>
            <h4 className="font-heading font-bold text-sm sm:text-base text-hospital-textLight">
              {name}
            </h4>
            <span className="text-[11px] text-hospital-textMuted font-medium">
              Category Metric
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="font-heading font-extrabold text-2xl sm:text-3xl text-white">
            {score}
          </span>
          <span className="text-xs text-hospital-textMuted block -mt-1 font-semibold">
            / 100
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="w-full h-2 rounded-full bg-hospital-darker/80 overflow-hidden border border-white/5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
            className="h-full rounded-full bg-gradient-to-r from-hospital-crimson via-hospital-accent to-hospital-warm shadow-glow-sm"
          />
        </div>
      </div>
    </motion.div>
  );
};
