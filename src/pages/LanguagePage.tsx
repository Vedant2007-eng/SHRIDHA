
import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import { Header } from '../components/Header';
import { ProgressTracker } from '../components/ProgressTracker';
import { LanguageCard } from '../components/LanguageCard';

import { LANGUAGES } from '../data/questionsData';
import { useFeedback } from '../context/FeedbackContext';

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Languages as LanguagesIcon,
  Loader2,
  RefreshCw,
} from 'lucide-react';

import type { SupportedLanguage } from '../types/feedback';

export const LanguagePage: React.FC = () => {
  const navigate = useNavigate();

  const {
    selectedLanguage,
    setLanguage,
  } = useFeedback();

  const [isCreatingSession, setIsCreatingSession] =
    useState<boolean>(false);

  const [sessionReady, setSessionReady] =
    useState<boolean>(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  // Ignore outdated responses when the user changes languages quickly.
  const requestId = useRef<number>(0);

  const handleSelectLanguage = async (
    langObj: { id: SupportedLanguage }
  ): Promise<void> => {
    const currentRequest = ++requestId.current;

    setIsCreatingSession(true);
    setSessionReady(false);
    setErrorMessage(null);

    try {
      const success = await setLanguage(langObj.id);

      // Ignore the result if a newer selection was made.
      if (currentRequest !== requestId.current) {
        return;
      }

      if (!success) {
        setErrorMessage(
          'Unable to create a feedback session. Check that the backend is running, then try again.'
        );
        return;
      }

      setSessionReady(true);
    } catch (error) {
      if (currentRequest !== requestId.current) {
        return;
      }

      console.error(
        'Feedback session creation failed:',
        error
      );

      setErrorMessage(
        'An error occurred while creating your session. Please try again.'
      );
    } finally {
      if (currentRequest === requestId.current) {
        setIsCreatingSession(false);
      }
    }
  };

  const handleBack = (): void => {
    // Cancel any pending selection response from this page.
    requestId.current += 1;
    navigate('/');
  };

  const handleContinue = async (): Promise<void> => {
    if (isCreatingSession) {
      return;
    }

    setErrorMessage(null);

    // If the user has not selected a language yet, or session creation
    // previously failed, attempt to create a real backend session now.
    if (!sessionReady) {
      const currentRequest = ++requestId.current;

      setIsCreatingSession(true);

      try {
        const success = await setLanguage(selectedLanguage);

        if (currentRequest !== requestId.current) {
          return;
        }

        if (!success) {
          setErrorMessage(
            'The backend did not create your session. Please check the backend and try again.'
          );
          return;
        }

        setSessionReady(true);

        // Navigate only after the session has been confirmed.
        navigate('/feedback');
      } catch (error) {
        if (currentRequest !== requestId.current) {
          return;
        }

        console.error(
          'Unable to initialize feedback session:',
          error
        );

        setErrorMessage(
          'Could not connect to the feedback service. Please try again.'
        );
      } finally {
        if (currentRequest === requestId.current) {
          setIsCreatingSession(false);
        }
      }

      return;
    }

    // A backend session already exists for the selected language.
    navigate('/feedback');
  };

  return (
    <div className="min-h-screen flex flex-col bg-hospital-bg text-hospital-textLight">
      <Header showLanguageBadge={true} />

      <ProgressTracker currentStep="language" />

      <main className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        {/* Header section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-2xl mx-auto mb-8 space-y-3"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-hospital-burgundy/80 border border-hospital-accent/30 text-hospital-warm text-xs font-semibold tracking-wider uppercase shadow-glow-sm">
            <LanguagesIcon className="w-3.5 h-3.5 text-hospital-accent" />
            <span>Voice Language Setting</span>
          </div>

          <h2 className="font-heading font-extrabold text-3xl sm:text-5xl text-white tracking-tight">
            Choose Your{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-hospital-accent via-hospital-warm to-hospital-gold text-glow">
              Language
            </span>
          </h2>

          <p className="text-sm sm:text-base text-hospital-textMuted leading-relaxed">
            Please select the language in which you would like to
            give your feedback. Your choice will be used to create
            the feedback session and process your responses.
          </p>
        </motion.div>

        {/* Language selection grid */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full mb-6"
        >
          {LANGUAGES.map((lang) => (
            <LanguageCard
              key={lang.id}
              language={lang}
              isSelected={selectedLanguage === lang.id}
              onSelect={handleSelectLanguage}
            />
          ))}
        </motion.div>

        {/* Backend session status */}
        {isCreatingSession && (
          <div
            role="status"
            aria-live="polite"
            className="w-full max-w-2xl mb-6 flex items-center justify-center gap-3 rounded-xl border border-hospital-accent/30 bg-hospital-burgundy/30 px-4 py-3 text-sm text-hospital-textLight"
          >
            <Loader2 className="w-5 h-5 animate-spin text-hospital-warm" />
            Creating your feedback session. Please wait...
          </div>
        )}

        {sessionReady && !isCreatingSession && !errorMessage && (
          <div
            role="status"
            className="w-full max-w-2xl mb-6 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-center text-sm text-emerald-300"
          >
            Feedback session created successfully. You can continue.
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="w-full max-w-2xl mb-6 rounded-xl border border-red-500/40 bg-red-950/30 p-4"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />

              <div className="flex-1">
                <p className="text-sm font-semibold text-red-300">
                  Session creation failed
                </p>

                <p className="text-sm text-red-200/90 mt-1">
                  {errorMessage}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    handleSelectLanguage({
                      id: selectedLanguage,
                    })
                  }
                  disabled={isCreatingSession}
                  className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-red-200 hover:text-white disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry session creation
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 w-full max-w-3xl pt-6 border-t border-hospital-border/40"
        >
          <motion.button
            type="button"
            whileHover={{ scale: 1.02, x: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleBack}
            disabled={isCreatingSession}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-hospital-dark border border-hospital-border/60 text-hospital-textLight hover:text-white hover:border-hospital-accent text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </motion.button>

          <motion.button
            type="button"
            whileHover={
              !isCreatingSession
                ? {
                  scale: 1.04,
                  boxShadow: '0 0 30px rgba(230, 57, 70, 0.5)',
                }
                : undefined
            }
            whileTap={!isCreatingSession ? { scale: 0.98 } : undefined}
            onClick={handleContinue}
            disabled={isCreatingSession}
            className="w-full sm:w-auto px-10 py-3.5 rounded-xl bg-gradient-to-r from-hospital-crimson via-hospital-accent to-hospital-warm text-white font-heading font-bold text-base tracking-wide flex items-center justify-center gap-2.5 shadow-glow-md border border-white/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isCreatingSession ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating Session...
              </>
            ) : (
              <>
                <span>Continue to Feedback</span>
                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </>
            )}
          </motion.button>
        </motion.div>
      </main>
    </div>
  );
};
