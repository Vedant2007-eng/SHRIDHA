import React from 'react';
import { CheckCircle2, AlertTriangle, Lightbulb, MessageSquareQuote } from 'lucide-react';
import { FeedbackAnswer } from '../types/feedback';

interface FeedbackSectionProps {
  positiveFeedback: string[];
  issues: string[];
  suggestions: string[];
  patientAnswers?: FeedbackAnswer[];
}

export const FeedbackSection: React.FC<FeedbackSectionProps> = ({
  positiveFeedback,
  issues,
  suggestions,
  patientAnswers,
}) => {
  return (
    <div className="space-y-6">
      {/* 3-Column Grid for Positive, Issues, and Suggestions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Positive Feedback */}
        <div className="glass-panel rounded-2xl p-5 border border-emerald-500/30 shadow-glow-sm bg-gradient-to-b from-emerald-950/20 to-hospital-card">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-emerald-500/20">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <h4 className="font-heading font-bold text-sm uppercase tracking-wider text-emerald-300">
              Positive Feedback
            </h4>
          </div>
          <ul className="space-y-3">
            {positiveFeedback.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-hospital-textLight/90">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Key Issues & Improvement */}
        <div className="glass-panel rounded-2xl p-5 border border-hospital-accent/40 shadow-glow-sm bg-gradient-to-b from-hospital-burgundy/40 to-hospital-card">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-hospital-accent/20">
            <div className="w-7 h-7 rounded-lg bg-hospital-accent/20 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-hospital-accent" />
            </div>
            <h4 className="font-heading font-bold text-sm uppercase tracking-wider text-hospital-warm">
              Key Issues & Areas
            </h4>
          </div>
          <ul className="space-y-3">
            {issues.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-hospital-textLight/90">
                <span className="w-1.5 h-1.5 rounded-full bg-hospital-accent mt-1.5 flex-shrink-0" />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Patient Suggestions */}
        <div className="glass-panel rounded-2xl p-5 border border-amber-500/30 shadow-glow-sm bg-gradient-to-b from-amber-950/20 to-hospital-card">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-amber-500/20">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-amber-400" />
            </div>
            <h4 className="font-heading font-bold text-sm uppercase tracking-wider text-amber-300">
              Patient Suggestions
            </h4>
          </div>
          <ul className="space-y-3">
            {suggestions.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-hospital-textLight/90">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recorded Transcripts Accordion / Summary Box */}
      {patientAnswers && patientAnswers.length > 0 && (
        <div className="glass-panel rounded-2xl p-6 border border-hospital-border/40">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-hospital-border/30">
            <MessageSquareQuote className="w-5 h-5 text-hospital-warm" />
            <h4 className="font-heading font-bold text-sm uppercase tracking-wider text-hospital-textLight">
              Recorded Patient Responses (Verbatim Voice Transcripts)
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {patientAnswers.map((ans) => (
              <div
                key={ans.questionId}
                className="p-4 rounded-xl bg-hospital-darker/60 border border-hospital-border/30 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-hospital-warm uppercase tracking-wider">
                    Question {ans.questionId}
                  </span>
                  {ans.isTypedFallback && (
                    <span className="text-[10px] text-hospital-textMuted italic">Typed Input</span>
                  )}
                </div>
                <p className="text-xs font-semibold text-hospital-textLight leading-snug">
                  {ans.question}
                </p>
                <p className="text-xs text-hospital-textMuted bg-hospital-dark/80 p-2.5 rounded-lg border border-white/5 italic">
                  "{ans.transcript || 'No spoken or typed response recorded.'}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
