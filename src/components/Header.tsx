import React from 'react';
import { Heart, Activity, Globe } from 'lucide-react';
import { useFeedback } from '../context/FeedbackContext';

interface HeaderProps {
  showLanguageBadge?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ showLanguageBadge = true }) => {
  const { selectedLanguage } = useFeedback();

  return (
    <header className="w-full border-b border-hospital-border/40 bg-hospital-dark/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left: Brand / Logo */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-hospital-crimson to-hospital-burgundy border border-hospital-accent/40 shadow-glow-sm">
            <Activity className="w-5 h-5 text-hospital-textLight animate-pulse" />
            <div className="absolute inset-0 rounded-xl border border-hospital-accent/20 animate-ping opacity-25" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-extrabold text-xl tracking-wider text-hospital-textLight">
                CARE<span className="text-hospital-accent">VOICE</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-hospital-accent/20 text-hospital-accent border border-hospital-accent/30 tracking-widest">
                KIOSK AI
              </span>
            </div>
            <p className="text-[11px] font-medium text-hospital-textMuted tracking-wider uppercase">
              Hospital Voice Feedback System
            </p>
          </div>
        </div>

        {/* Right: Hospital Message & Language Badge */}
        <div className="flex items-center gap-4">
          {showLanguageBadge && selectedLanguage && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-hospital-burgundy/60 border border-hospital-border/60 text-xs text-hospital-textLight">
              <Globe className="w-3.5 h-3.5 text-hospital-warm" />
              <span>Language: <strong className="text-white font-semibold">{selectedLanguage}</strong></span>
            </div>
          )}

          <div className="flex items-center gap-2.5 pl-3 border-l border-hospital-border/30 text-right">
            <div className="hidden lg:block text-right">
              <p className="text-xs font-semibold text-hospital-textLight leading-tight">
                Your Feedback
              </p>
              <p className="text-[10px] text-hospital-warm font-medium">
                Builds a Better Tomorrow
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-hospital-crimson/30 border border-hospital-accent/40 flex items-center justify-center shadow-glow-sm">
              <Heart className="w-4 h-4 text-hospital-accent fill-hospital-accent/30 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
