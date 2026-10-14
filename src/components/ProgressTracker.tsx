import React from 'react';
import { Check, Dot } from 'lucide-react';
import { useFeedback } from '../context/FeedbackContext';

export type FlowStep = 'welcome' | 'language' | 'feedback' | 'processing' | 'report';

interface ProgressTrackerProps {
  currentStep: FlowStep;
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({ currentStep }) => {
  const { currentQuestion } = useFeedback();

  const steps: { id: FlowStep; label: string; sublabel?: string }[] = [
    { id: 'welcome', label: 'Welcome' },
    { id: 'language', label: 'Language' },
    { 
      id: 'feedback', 
      label: 'Questions', 
      sublabel: currentStep === 'feedback' ? `Q ${currentQuestion}/4` : '4 Questions' 
    },
    { id: 'processing', label: 'Processing' },
    { id: 'report', label: 'Report' },
  ];

  const stepOrder: Record<FlowStep, number> = {
    welcome: 1,
    language: 2,
    feedback: 3,
    processing: 4,
    report: 5,
  };

  const currentIndex = stepOrder[currentStep];

  return (
    <div className="w-full py-4 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between relative">
          {/* Background Connecting Line */}
          <div className="absolute top-4 left-6 right-6 h-0.5 bg-hospital-burgundy/60 -z-0" />
          
          {/* Active Colored Progress Line */}
          <div 
            className="absolute top-4 left-6 h-0.5 bg-gradient-to-r from-hospital-crimson to-hospital-accent transition-all duration-500 -z-0"
            style={{
              width: `${Math.max(0, Math.min(100, ((currentIndex - 1) / (steps.length - 1)) * 100))}%`,
            }}
          />

          {steps.map((step, idx) => {
            const stepNum = idx + 1;
            const isCompleted = stepNum < currentIndex;
            const isCurrent = stepNum === currentIndex;
            const isPending = stepNum > currentIndex;

            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-semibold text-xs transition-all duration-300 ${
                    isCompleted
                      ? 'bg-hospital-accent text-white shadow-glow-sm border border-hospital-accent'
                      : isCurrent
                      ? 'bg-hospital-crimson text-white ring-4 ring-hospital-accent/30 shadow-glow-md border-2 border-white'
                      : 'bg-hospital-dark text-hospital-textMuted border border-hospital-border/40'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : isCurrent ? (
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                    </span>
                  ) : (
                    <span>{stepNum}</span>
                  )}
                </div>

                <div className="mt-2 text-center">
                  <p
                    className={`text-xs sm:text-sm font-medium transition-colors ${
                      isCurrent
                        ? 'text-white font-bold text-glow'
                        : isCompleted
                        ? 'text-hospital-textLight'
                        : 'text-hospital-textMuted/60'
                    }`}
                  >
                    {step.label}
                  </p>
                  {step.sublabel && isCurrent && (
                    <span className="hidden sm:inline-block text-[10px] text-hospital-warm font-semibold">
                      {step.sublabel}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
