import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { ProgressTracker } from '../components/ProgressTracker';
import { QuestionSidebar } from '../components/QuestionSidebar';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { LiveTranscript } from '../components/LiveTranscript';
import { TipsCard } from '../components/TipsCard';
import { QUESTIONS } from '../data/questionsData';
import { useFeedback } from '../context/FeedbackContext';
import { ArrowLeft, ArrowRight, Sparkles, FileText, CheckCircle2 } from 'lucide-react';

export const VoiceFeedbackPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    selectedLanguage,
    currentQuestion,
    answers,
    saveAnswer,
    getAnswer,
    nextQuestion,
    previousQuestion,
  } = useFeedback();

  const currentQData = QUESTIONS.find((q) => q.id === currentQuestion) || QUESTIONS[0];
  const localizedQuestionText =
    currentQData.question[selectedLanguage] || currentQData.question.English;

  const currentTranscript = getAnswer(currentQuestion);

  const handleTranscriptUpdate = (text: string, isTyped = false) => {
    saveAnswer(currentQuestion, text, isTyped);
  };

  const handleClearTranscript = () => {
    saveAnswer(currentQuestion, '', false);
  };

  const handlePrev = () => {
    const canGoBackInQuestions = previousQuestion();
    if (!canGoBackInQuestions) {
      // If at Question 1, return to language selection
      navigate('/language');
    }
  };

  const handleNext = () => {
    const isFinished = nextQuestion();
    if (isFinished) {
      // Completed all 4 questions, navigate to processing
      navigate('/processing');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-hospital-bg text-hospital-textLight">
      <Header showLanguageBadge={true} />
      <ProgressTracker currentStep="feedback" />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-6">
        {/* Main 3-Column Kiosk Layout */}
        <div className="flex flex-col lg:flex-row items-start gap-6">
          {/* Left Column: Questions Sidebar */}
          <QuestionSidebar />

          {/* Center Column: Active Dynamic Question & Mic Area */}
          <div className="flex-1 w-full">
            <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-hospital-border/40 shadow-glow-sm min-h-[520px] flex flex-col justify-between relative overflow-hidden">
              {/* Question Header & Content with Smooth Framer Motion Transition */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuestion}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                  className="space-y-4"
                >
                  {/* Question Number & Category Pill */}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-hospital-burgundy text-hospital-warm text-xs font-bold uppercase tracking-wider border border-hospital-accent/30 shadow-glow-sm">
                      <Sparkles className="w-3.5 h-3.5 text-hospital-accent" />
                      Question {currentQuestion} of 4
                    </span>

                    <span className="text-xs text-hospital-textMuted font-medium">
                      Category: <strong className="text-hospital-textLight">{currentQData.shortTitle}</strong>
                    </span>
                  </div>

                  {/* Main Question Text */}
                  <div className="py-2">
                    <h2 className="font-heading font-bold text-2xl sm:text-3xl text-white leading-snug tracking-tight">
                      {localizedQuestionText}
                    </h2>

                    {selectedLanguage !== 'English' && currentQData.question.English && (
                      <p className="text-xs sm:text-sm text-hospital-textMuted/80 mt-1.5 italic">
                        "{currentQData.question.English}"
                      </p>
                    )}

                    <p className="text-xs text-hospital-textMuted mt-2 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-hospital-warm" />
                      Please share your experience freely. You can speak in your selected language ({selectedLanguage}).
                    </p>
                  </div>

                  {/* Center Large Microphone & Controls */}
                  <VoiceRecorder
                    questionId={currentQuestion}
                    questionText={localizedQuestionText}
                    language={selectedLanguage}
                    transcript={currentTranscript}
                    onTranscriptChange={handleTranscriptUpdate}
                  />
                </motion.div>
              </AnimatePresence>

              {/* Bottom Navigation Buttons */}
              <div className="pt-6 mt-6 border-t border-hospital-border/40 flex items-center justify-between gap-4">
                {/* Previous Button */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02, x: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePrev}
                  className="px-5 py-3 rounded-xl bg-hospital-dark border border-hospital-border/60 text-hospital-textLight hover:text-white hover:border-hospital-accent text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>
                    {currentQuestion === 1 ? '← Back to Language' : `← Previous (Q${currentQuestion - 1})`}
                  </span>
                </motion.button>

                {/* Next / Generate Report Button */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03, boxShadow: '0 0 30px rgba(230, 57, 70, 0.5)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNext}
                  className={`px-8 py-3.5 rounded-xl font-heading font-bold text-sm sm:text-base flex items-center gap-2.5 shadow-glow-md border border-white/20 transition-all cursor-pointer ${
                    currentQuestion === 4
                      ? 'bg-gradient-to-r from-hospital-crimson via-hospital-accent to-emerald-600 text-white shadow-glow-lg animate-pulse'
                      : 'bg-gradient-to-r from-hospital-crimson via-hospital-accent to-hospital-warm text-white'
                  }`}
                >
                  {currentQuestion === 4 ? (
                    <>
                      <span>Generate Report</span>
                      <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                    </>
                  ) : (
                    <>
                      <span>Next Question</span>
                      <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Transcript & Tips */}
          <div className="w-full lg:w-80 flex flex-col gap-4 flex-shrink-0">
            <LiveTranscript
              transcript={currentTranscript}
              onClear={handleClearTranscript}
              onTranscriptChange={handleTranscriptUpdate}
              isRecording={false}
            />
            <TipsCard />
          </div>
        </div>
      </main>
    </div>
  );
};
