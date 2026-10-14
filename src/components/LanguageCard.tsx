import React from 'react';
import { motion } from 'framer-motion';
import { Check, Mic } from 'lucide-react';
import { LanguageOption } from '../types/feedback';

interface LanguageCardProps {
  language: LanguageOption;
  isSelected: boolean;
  onSelect: (lang: LanguageOption) => void;
}

export const LanguageCard: React.FC<LanguageCardProps> = ({
  language,
  isSelected,
  onSelect,
}) => {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.025, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(language)}
      className={`w-full text-left p-5 rounded-2xl transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[120px] ${
        isSelected
          ? 'glass-panel-active ring-2 ring-hospital-accent shadow-glow-md'
          : 'glass-panel glass-panel-hover'
      }`}
    >
      {/* Glow highlight background on active */}
      {isSelected && (
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-hospital-accent/20 rounded-full blur-2xl pointer-events-none" />
      )}

      <div className="flex items-start justify-between w-full">
        <div>
          <span className="text-2xl font-bold text-white tracking-wide block font-heading">
            {language.nativeName}
          </span>
          <span className="text-xs uppercase font-medium text-hospital-warm tracking-wider mt-0.5 block">
            {language.name}
          </span>
        </div>

        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
            isSelected
              ? 'bg-hospital-accent text-white shadow-glow-sm scale-110'
              : 'border border-hospital-border/40 text-transparent'
          }`}
        >
          <Check className="w-4 h-4 stroke-[3]" />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-xs text-hospital-textMuted">
        <Mic className={`w-3.5 h-3.5 ${isSelected ? 'text-hospital-accent animate-pulse' : 'text-hospital-textMuted'}`} />
        <span>{language.description}</span>
      </div>
    </motion.button>
  );
};
