import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Award, CheckCircle } from 'lucide-react';

interface ScoreCircleProps {
  score: number;
  maxScore?: number;
  status: 'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION' | 'POOR';
  statusDescription: string;
}

export const ScoreCircle: React.FC<ScoreCircleProps> = ({
  score,
  maxScore = 100,
  status,
  statusDescription,
}) => {
  const [animatedScore, setAnimatedScore] = useState<number>(0);

  useEffect(() => {
    let start = 0;
    const duration = 1500; // ms
    const stepTime = 20;
    const steps = duration / stepTime;
    const increment = score / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= score) {
        setAnimatedScore(score);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.floor(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [score]);

  // SVG circle calculation
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / maxScore) * circumference;

  const statusColors = {
    EXCELLENT: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40',
    GOOD: 'text-hospital-warm bg-hospital-warm/20 border-hospital-warm/40',
    NEEDS_ATTENTION: 'text-amber-400 bg-amber-500/20 border-amber-500/40',
    POOR: 'text-red-400 bg-red-500/20 border-red-500/40',
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <div className="relative w-52 h-52 flex items-center justify-center">
        {/* Glow ambient */}
        <div className="absolute inset-4 rounded-full bg-hospital-accent/20 blur-xl pointer-events-none" />

        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            className="text-hospital-dark/80 stroke-current"
            strokeWidth="14"
            fill="transparent"
          />
          {/* Animated gradient progress circle */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            stroke="url(#hospitalScoreGradient)"
            strokeWidth="14"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-300 ease-out"
          />
          <defs>
            <linearGradient id="hospitalScoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8C1D28" />
              <stop offset="50%" stopColor="#E63946" />
              <stop offset="100%" stopColor="#FF6B4A" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center score details */}
        <div className="absolute flex flex-col items-center justify-center">
          <span className="font-heading font-extrabold text-5xl sm:text-6xl text-white tracking-tight drop-shadow-md">
            {animatedScore}
          </span>
          <span className="text-xs uppercase font-bold text-hospital-textMuted tracking-widest mt-0.5">
            OUT OF {maxScore}
          </span>
        </div>
      </div>

      {/* Status Badge */}
      <div className="mt-4 flex flex-col items-center">
        <span
          className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest border shadow-glow-sm ${
            statusColors[status] || statusColors.GOOD
          }`}
        >
          {status.replace('_', ' ')}
        </span>
        <p className="text-sm text-hospital-textMuted max-w-md mt-2.5 leading-relaxed">
          {statusDescription}
        </p>
      </div>
    </div>
  );
};
