import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { ProgressTracker } from '../components/ProgressTracker';
import { useFeedback } from '../context/FeedbackContext';
import { 
  Check, 
  Loader2, 
  Sparkles, 
  BrainCircuit, 
  FileCheck2, 
  BarChart3, 
  Search,
  CheckCircle2
} from 'lucide-react';

export const ProcessingPage: React.FC = () => {
  const navigate = useNavigate();
  const { runAnalysis, processingProgress, setProcessingProgress } = useFeedback();

  const [currentStageIndex, setCurrentStageIndex] = useState<number>(0);

  const stages = [
    { label: 'Transcribing your responses', icon: Search },
    { label: 'Analyzing feedback content', icon: BrainCircuit },
    { label: 'Calculating hospital scores', icon: BarChart3 },
    { label: 'Identifying key issues & suggestions', icon: Sparkles },
    { label: 'Generating your report', icon: FileCheck2 },
  ];

  useEffect(() => {
    let progress = 0;
    setProcessingProgress(0);

    // Run the AI analysis
    runAnalysis();

    // 5-second smooth progression timer
    const interval = setInterval(() => {
      progress += 2;
      if (progress > 100) progress = 100;
      setProcessingProgress(progress);

      const stage = Math.min(4, Math.floor(progress / 20));
      setCurrentStageIndex(stage);

      if (progress >= 100) {
        clearInterval(interval);
        // Small delay at 100% before transitioning to /report
        setTimeout(() => {
          navigate('/report');
        }, 600);
      }
    }, 90); // ~4.5-5 seconds total

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-hospital-bg text-hospital-textLight">
      <Header showLanguageBadge={true} />
      <ProgressTracker currentStep="processing" />

      <main className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full px-4 sm:px-6 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full glass-panel rounded-3xl p-8 sm:p-12 border border-hospital-border/40 shadow-glow-md flex flex-col items-center text-center relative overflow-hidden"
        >
          {/* Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-hospital-accent/15 rounded-full blur-3xl pointer-events-none" />

          {/* AI Processor Pulsing Icon */}
          <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
              className="absolute inset-0 rounded-2xl border-2 border-dashed border-hospital-accent/50"
            />
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-hospital-crimson via-hospital-burgundy to-hospital-dark border border-hospital-accent flex items-center justify-center shadow-glow-sm">
              <BrainCircuit className="w-8 h-8 text-hospital-warm animate-pulse" />
            </div>
          </div>

          {/* Headings */}
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-white tracking-tight mb-2">
            Analyzing Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-hospital-accent to-hospital-warm text-glow">Feedback</span>
          </h2>

          <p className="text-sm sm:text-base text-hospital-textMuted max-w-lg mb-8 leading-relaxed">
            Please wait while our AI system processes your voice responses and generates the comprehensive hospital report.
          </p>

          {/* Progress Percentage & Bar */}
          <div className="w-full max-w-md mb-8">
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider mb-2">
              <span className="text-hospital-textMuted">AI Processing</span>
              <span className="text-hospital-warm font-heading text-base">{processingProgress}%</span>
            </div>

            <div className="w-full h-3 rounded-full bg-hospital-darker/90 border border-white/5 overflow-hidden p-0.5 shadow-inner">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-hospital-crimson via-hospital-accent to-hospital-warm shadow-glow-sm transition-all duration-100 ease-out"
                style={{ width: `${processingProgress}%` }}
              />
            </div>
          </div>

          {/* 5 Animated Processing Stages */}
          <div className="w-full max-w-md space-y-3 text-left">
            {stages.map((stage, idx) => {
              const isDone = idx < currentStageIndex || processingProgress === 100;
              const isCurrent = idx === currentStageIndex && processingProgress < 100;
              const isPending = idx > currentStageIndex && processingProgress < 100;

              const StageIcon = stage.icon;

              return (
                <motion.div
                  key={stage.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all duration-300 ${
                    isDone
                      ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                      : isCurrent
                      ? 'bg-hospital-burgundy/80 border-hospital-accent text-white shadow-glow-sm'
                      : 'bg-hospital-darker/40 border-white/5 text-hospital-textMuted/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isDone
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : isCurrent
                          ? 'bg-hospital-accent text-white'
                          : 'bg-white/5 text-hospital-textMuted'
                      }`}
                    >
                      <StageIcon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs sm:text-sm font-semibold">{stage.label}</span>
                  </div>

                  <div>
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : isCurrent ? (
                      <Loader2 className="w-4 h-4 text-hospital-warm animate-spin" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-white/20 inline-block" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Auto transition message */}
          <p className="mt-8 text-xs text-hospital-textMuted/70 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-hospital-accent animate-ping" />
            Report generation will complete automatically in a few seconds...
          </p>
        </motion.div>
      </main>
    </div>
  );
};
