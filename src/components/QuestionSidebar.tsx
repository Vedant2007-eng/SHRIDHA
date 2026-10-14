import React from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles, HelpCircle } from 'lucide-react';
import { QUESTIONS } from '../data/questionsData';
import { useFeedback } from '../context/FeedbackContext';

export const QuestionSidebar: React.FC = () => {
  const { currentQuestion, setCurrentQuestion, answers } = useFeedback();

  return (
    <div className="w-full lg:w-72 flex-shrink-0">
      <div className="glass-panel rounded-2xl p-5 border border-hospital-border/40 shadow-glow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-hospital-border/30">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-hospital-warm" />
            <h3 className="font-heading font-bold text-sm tracking-wider uppercase text-hospital-textLight">
              Feedback Questions
            </h3>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-hospital-burgundy text-hospital-warm font-semibold border border-hospital-border/40">
            {currentQuestion}/4
          </span>
        </div>

        <div className="space-y-2.5">
          {QUESTIONS.map((q) => {
            const isCurrent = q.id === currentQuestion;
            const hasAnswer = Boolean(answers.find((a) => a.questionId === q.id)?.transcript.trim());
            const isCompleted = hasAnswer && q.id < currentQuestion;
            const isPending = q.id > currentQuestion;

            return (
              <motion.button
                key={q.id}
                type="button"
                whileHover={!isPending ? { x: 3 } : {}}
                whileTap={!isPending ? { scale: 0.98 } : {}}
                onClick={() => {
                  if (q.id <= currentQuestion || hasAnswer) {
                    setCurrentQuestion(q.id);
                  }
                }}
                disabled={isPending && !hasAnswer}
                className={`w-full text-left p-3.5 rounded-xl transition-all duration-300 flex items-start gap-3 relative overflow-hidden ${
                  isCurrent
                    ? 'glass-panel-active ring-1 ring-hospital-accent shadow-glow-sm bg-gradient-to-r from-hospital-burgundy to-hospital-card'
                    : isCompleted
                    ? 'bg-hospital-dark/80 border border-hospital-border/30 hover:border-hospital-border'
                    : 'bg-hospital-darker/40 border border-white/5 opacity-50 cursor-not-allowed'
                }`}
              >
                {/* Active Indicator bar */}
                {isCurrent && (
                  <motion.div
                    layoutId="activeSidebarIndicator"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-hospital-warm to-hospital-accent shadow-glow-sm"
                  />
                )}

                {/* Question Number Badge */}
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 transition-colors ${
                    isCurrent
                      ? 'bg-hospital-accent text-white shadow-glow-sm'
                      : isCompleted
                      ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40'
                      : 'bg-white/5 text-hospital-textMuted'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : q.id}
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs sm:text-sm font-semibold truncate leading-tight ${
                      isCurrent
                        ? 'text-white text-glow'
                        : isCompleted
                        ? 'text-hospital-textLight'
                        : 'text-hospital-textMuted'
                    }`}
                  >
                    {q.shortTitle}
                  </p>
                  <p className="text-[10px] text-hospital-textMuted truncate mt-0.5">
                    {q.hint}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-5 pt-3.5 border-t border-hospital-border/20 flex items-center gap-2 text-[11px] text-hospital-textMuted">
          <HelpCircle className="w-3.5 h-3.5 text-hospital-warm flex-shrink-0" />
          <span>Tap any completed question to review or update your answer.</span>
        </div>
      </div>
    </div>
  );
};
