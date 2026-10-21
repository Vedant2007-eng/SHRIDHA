
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  Sparkles,
  BrainCircuit,
  FileCheck2,
  BarChart3,
  Search,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

import { Header } from '../components/Header';
import { ProgressTracker } from '../components/ProgressTracker';
import { useFeedback } from '../context/FeedbackContext';
import type { FeedbackReport } from '../types/feedback';

export const ProcessingPage: React.FC = () => {
  const navigate = useNavigate();

  const {
    runAnalysis,
    processingProgress,
    setProcessingProgress,
  } = useFeedback();

  const [currentStageIndex, setCurrentStageIndex] =
    useState<number>(0);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [retryCount, setRetryCount] = useState<number>(0);

  // Keep the same analysis promise if React Strict Mode reruns
  // the effect during development.
  const analysisPromiseRef =
    useRef<Promise<FeedbackReport> | null>(null);

  const stages = [
    {
      label: 'Validating patient answers',
      icon: Search,
    },
    {
      label: 'Saving responses to backend',
      icon: FileCheck2,
    },
    {
      label: 'Analyzing patient feedback',
      icon: BrainCircuit,
    },
    {
      label: 'Validating report results',
      icon: BarChart3,
    },
    {
      label: 'Preparing your report',
      icon: Sparkles,
    },
  ];

  useEffect(() => {
    let active = true;
    let progress = 0;
    let navigationTimer: ReturnType<typeof setTimeout> | undefined;

    setErrorMessage(null);
    setProcessingProgress(0);
    setCurrentStageIndex(0);

    // This progress animation is indicative only. The backend does not
    // expose individual processing-stage completion events.
    const progressInterval = setInterval(() => {
      if (!active) return;

      progress = Math.min(progress + 2, 90);

      setProcessingProgress(progress);

      // Keep the final stage incomplete until analysis succeeds.
      const stage = Math.min(
        3,
        Math.floor(progress / 25)
      );

      setCurrentStageIndex(stage);
    }, 100);

    // Create one analysis request per attempt.
    if (!analysisPromiseRef.current) {
      analysisPromiseRef.current = runAnalysis();
    }

    const analysisTask = analysisPromiseRef.current;

    analysisTask
      .then((generatedReport) => {
        if (!active) return;

        if (!generatedReport) {
          throw new Error(
            'The backend did not return a valid report.'
          );
        }

        clearInterval(progressInterval);

        setProcessingProgress(100);
        setCurrentStageIndex(4);
        setErrorMessage(null);

        // Navigate only after a successful analysis.
        navigationTimer = setTimeout(() => {
          if (active) {
            navigate('/report', { replace: true });
          }
        }, 500);
      })
      .catch((error: unknown) => {
        if (!active) return;

        clearInterval(progressInterval);

        // Do not show a completed progress bar on failure.
        setProcessingProgress(progress);

        const message =
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred while generating your report.';

        setErrorMessage(message);

        console.error(
          'Patient feedback analysis failed:',
          error
        );
      });

    return () => {
      active = false;
      clearInterval(progressInterval);

      if (navigationTimer !== undefined) {
        clearTimeout(navigationTimer);
      }
    };
  }, [
    navigate,
    retryCount,
    runAnalysis,
    setProcessingProgress,
  ]);

  const handleRetry = () => {
    // Allow the next effect to create a new request.
    analysisPromiseRef.current = null;

    setErrorMessage(null);
    setProcessingProgress(0);
    setCurrentStageIndex(0);

    setRetryCount((previous) => previous + 1);
  };

  const handleGoBack = () => {
    navigate(-1);
  };

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
          {/* Ambient glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-hospital-accent/15 rounded-full blur-3xl pointer-events-none" />

          {/* Processing icon */}
          <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
            {!errorMessage && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  repeat: Infinity,
                  duration: 8,
                  ease: 'linear',
                }}
                className="absolute inset-0 rounded-2xl border-2 border-dashed border-hospital-accent/50"
              />
            )}

            <div
              className={`w-16 h-16 rounded-2xl border flex items-center justify-center ${errorMessage
                  ? 'bg-red-950/50 border-red-500/60'
                  : 'bg-gradient-to-tr from-hospital-crimson via-hospital-burgundy to-hospital-dark border-hospital-accent shadow-glow-sm'
                }`}
            >
              {errorMessage ? (
                <AlertCircle className="w-8 h-8 text-red-400" />
              ) : (
                <BrainCircuit className="w-8 h-8 text-hospital-warm animate-pulse" />
              )}
            </div>
          </div>

          {/* Heading */}
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-white tracking-tight mb-2">
            {errorMessage ? (
              'Report Generation Failed'
            ) : (
              <>
                Analyzing Your{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-hospital-accent to-hospital-warm text-glow">
                  Feedback
                </span>
              </>
            )}
          </h2>

          <p className="text-sm sm:text-base text-hospital-textMuted max-w-lg mb-8 leading-relaxed">
            {errorMessage
              ? 'A reliable report could not be generated from the backend. No replacement sample report has been displayed.'
              : 'Your submitted responses are being sent for analysis. The report will open after the backend returns a valid result.'}
          </p>

          {/* Error panel */}
          {errorMessage && (
            <div
              role="alert"
              className="w-full max-w-md mb-8 rounded-xl border border-red-500/40 bg-red-950/30 p-4 text-left"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />

                <div>
                  <h3 className="text-sm font-bold text-red-300 mb-1">
                    What went wrong?
                  </h3>

                  <p className="text-sm text-red-200/90 break-words">
                    {errorMessage}
                  </p>

                  <p className="text-xs text-hospital-textMuted mt-3">
                    Check the backend terminal for additional details.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Progress percentage and bar */}
          <div className="w-full max-w-md mb-8">
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider mb-2">
              <span className="text-hospital-textMuted">
                {errorMessage
                  ? 'Processing stopped'
                  : 'Processing'}
              </span>

              <span
                className={`font-heading text-base ${errorMessage
                    ? 'text-red-400'
                    : 'text-hospital-warm'
                  }`}
              >
                {processingProgress}%
              </span>
            </div>

            <div className="w-full h-3 rounded-full bg-hospital-darker/90 border border-white/5 overflow-hidden p-0.5 shadow-inner">
              <motion.div
                className={`h-full rounded-full transition-all duration-100 ease-out ${errorMessage
                    ? 'bg-red-500'
                    : 'bg-gradient-to-r from-hospital-crimson via-hospital-accent to-hospital-warm shadow-glow-sm'
                  }`}
                animate={{
                  width: `${processingProgress}%`,
                }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </div>

          {/* Processing stages */}
          <div className="w-full max-w-md space-y-3 text-left">
            {stages.map((stage, index) => {
              const isDone =
                !errorMessage &&
                processingProgress === 100;

              const isCurrent =
                !errorMessage &&
                index === currentStageIndex &&
                !isDone;

              const isPending =
                !errorMessage &&
                index > currentStageIndex &&
                !isDone;

              const StageIcon = stage.icon;

              return (
                <motion.div
                  key={stage.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all duration-300 ${isDone
                      ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                      : isCurrent
                        ? 'bg-hospital-burgundy/80 border-hospital-accent text-white shadow-glow-sm'
                        : errorMessage
                          ? 'bg-red-950/10 border-red-500/10 text-hospital-textMuted/50'
                          : isPending
                            ? 'bg-hospital-darker/40 border-white/5 text-hospital-textMuted/40'
                            : 'bg-hospital-darker/40 border-white/5 text-hospital-textMuted/40'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${isDone
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : isCurrent
                            ? 'bg-hospital-accent text-white'
                            : 'bg-white/5 text-hospital-textMuted'
                        }`}
                    >
                      <StageIcon className="w-3.5 h-3.5" />
                    </div>

                    <span className="text-xs sm:text-sm font-semibold">
                      {stage.label}
                    </span>
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

          {/* Actions after an error */}
          {errorMessage ? (
            <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full max-w-md">
              <button
                type="button"
                onClick={handleRetry}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-hospital-accent px-5 py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Analysis
              </button>

              <button
                type="button"
                onClick={handleGoBack}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-hospital-border px-5 py-3 text-sm font-semibold text-hospital-textLight hover:bg-white/5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </button>
            </div>
          ) : (
            <p className="mt-8 text-xs text-hospital-textMuted/70 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-hospital-accent animate-ping" />
              Please wait for backend analysis to complete. The report will open automatically when a valid result is returned.
            </p>
          )}
        </motion.div>
      </main>
    </div>
  );
};
