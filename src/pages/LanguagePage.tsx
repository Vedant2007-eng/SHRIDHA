import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { ProgressTracker } from '../components/ProgressTracker';
import { LanguageCard } from '../components/LanguageCard';
import { LANGUAGES } from '../data/questionsData';
import { useFeedback } from '../context/FeedbackContext';
import { ArrowLeft, ArrowRight, Languages as LanguagesIcon, Volume2 } from 'lucide-react';
import { SupportedLanguage } from '../types/feedback';

export const LanguagePage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedLanguage, setLanguage } = useFeedback();

  const handleSelectLanguage = (langObj: { id: SupportedLanguage }) => {
    setLanguage(langObj.id);
  };

  const handleBack = () => {
    navigate('/');
  };

  const handleContinue = () => {
    navigate('/feedback');
  };

  return (
    <div className="min-h-screen flex flex-col bg-hospital-bg text-hospital-textLight">
      <Header showLanguageBadge={true} />
      <ProgressTracker currentStep="language" />

      <main className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        {/* Header Section */}
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
            Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-hospital-accent via-hospital-warm to-hospital-gold text-glow">Language</span>
          </h2>

          <p className="text-sm sm:text-base text-hospital-textMuted leading-relaxed">
            Please select the language in which you would like to give your feedback.
            The AI voice assistant and speech recognition will adapt to your choice.
          </p>
        </motion.div>

        {/* Languages Grid */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full mb-10"
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

        {/* Action Buttons */}
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
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-hospital-dark border border-hospital-border/60 text-hospital-textLight hover:text-white hover:border-hospital-accent text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>← Back</span>
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ scale: 1.04, boxShadow: '0 0 30px rgba(230, 57, 70, 0.5)' }}
            whileTap={{ scale: 0.98 }}
            onClick={handleContinue}
            className="w-full sm:w-auto px-10 py-3.5 rounded-xl bg-gradient-to-r from-hospital-crimson via-hospital-accent to-hospital-warm text-white font-heading font-bold text-base tracking-wide flex items-center justify-center gap-2.5 shadow-glow-md border border-white/20 transition-all cursor-pointer"
          >
            <span>Continue to Feedback</span>
            <ArrowRight className="w-5 h-5 stroke-[2.5]" />
          </motion.button>
        </motion.div>
      </main>
    </div>
  );
};
