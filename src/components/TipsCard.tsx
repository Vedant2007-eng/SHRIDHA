import React from 'react';
import { Info, CheckCircle2 } from 'lucide-react';

export const TipsCard: React.FC = () => {
  const tips = [
    { num: 1, text: 'Speak naturally at your normal pace' },
    { num: 2, text: 'You can take your time to express yourself' },
    { num: 3, text: 'Answer in the language you selected' },
    { num: 4, text: 'Click Next Question when you are done' },
  ];

  return (
    <div className="w-full glass-panel rounded-2xl p-5 border border-hospital-border/40 shadow-glow-sm">
      <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-hospital-border/30">
        <Info className="w-4 h-4 text-hospital-warm" />
        <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-hospital-textLight">
          Kiosk Voice Tips
        </h3>
      </div>

      <ul className="space-y-2.5">
        {tips.map((tip) => (
          <li key={tip.num} className="flex items-start gap-2.5 text-xs text-hospital-textMuted">
            <span className="w-4 h-4 rounded-full bg-hospital-burgundy text-hospital-warm border border-hospital-border/50 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
              {tip.num}
            </span>
            <span className="leading-snug text-hospital-textLight/90">{tip.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
