import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { ProgressTracker } from '../components/ProgressTracker';
import { 
  HeartHandshake, 
  Building2, 
  Users2, 
  ShieldCheck, 
  ArrowRight, 
  Mic2,
  Sparkles
} from 'lucide-react';

export const WelcomePage: React.FC = () => {
  const navigate = useNavigate();

  const featureCards = [
    {
      icon: HeartHandshake,
      title: 'Better Patient Care',
      desc: 'Help us provide compassionate, personalized medical care and attentiveness.',
      gradient: 'from-hospital-burgundy/80 to-hospital-dark/90',
      iconColor: 'text-hospital-accent',
    },
    {
      icon: Building2,
      title: 'Improved Facilities',
      desc: 'Ensure comfortable waiting areas, clean wards, and modern hospital amenities.',
      gradient: 'from-hospital-burgundy/80 to-hospital-dark/90',
      iconColor: 'text-hospital-warm',
    },
    {
      icon: Users2,
      title: 'Supportive Staff Environment',
      desc: 'Recognize outstanding staff members and build an empathetic healthcare team.',
      gradient: 'from-hospital-burgundy/80 to-hospital-dark/90',
      iconColor: 'text-hospital-amber',
    },
    {
      icon: ShieldCheck,
      title: 'Safer & Cleaner Hospital',
      desc: 'Uphold the highest standards of cleanliness, sanitization, and patient safety.',
      gradient: 'from-hospital-burgundy/80 to-hospital-dark/90',
      iconColor: 'text-emerald-400',
    },
  ];

  const handleStart = () => {
    navigate('/language');
  };

  return (
    <div className="min-h-screen flex flex-col bg-hospital-bg text-hospital-textLight">
      <Header showLanguageBadge={false} />
      <ProgressTracker currentStep="welcome" />

      <main className="flex-1 flex flex-col items-center justify-center max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto space-y-4"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-hospital-burgundy/80 border border-hospital-accent/30 text-hospital-warm text-xs font-semibold tracking-wider uppercase shadow-glow-sm">
            <Mic2 className="w-3.5 h-3.5 text-hospital-accent animate-pulse" />
            <span>AI Voice-First Patient Kiosk</span>
          </div>

          <h1 className="font-heading font-extrabold text-4xl sm:text-6xl text-white tracking-tight leading-tight">
            Your Voice <span className="text-transparent bg-clip-text bg-gradient-to-r from-hospital-accent via-hospital-warm to-hospital-gold text-glow">Matters</span>
          </h1>

          <p className="text-base sm:text-lg text-hospital-textMuted max-w-2xl mx-auto leading-relaxed">
            Help us improve our services by sharing your experience.
            This short voice feedback will take just a few minutes.
          </p>
        </motion.div>

        {/* Feature Cards 2x2 Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full my-8 sm:my-10"
        >
          {featureCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                whileHover={{ y: -4, scale: 1.01 }}
                transition={{ duration: 0.2 }}
                className={`glass-panel glass-panel-hover p-6 rounded-2xl border border-hospital-border/40 shadow-glow-sm bg-gradient-to-br ${card.gradient} flex items-start gap-4`}
              >
                <div className="w-12 h-12 rounded-xl bg-hospital-darker/70 border border-hospital-border flex items-center justify-center flex-shrink-0 shadow-inner">
                  <Icon className={`w-6 h-6 ${card.iconColor}`} />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base sm:text-lg text-white mb-1">
                    {index + 1}. {card.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-hospital-textMuted leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Primary CTA Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col items-center gap-3 w-full max-w-md mx-auto"
        >
          <motion.button
            type="button"
            whileHover={{ scale: 1.04, boxShadow: '0 0 35px rgba(230, 57, 70, 0.6)' }}
            whileTap={{ scale: 0.97 }}
            onClick={handleStart}
            className="w-full py-4 sm:py-5 px-8 rounded-2xl bg-gradient-to-r from-hospital-crimson via-hospital-accent to-hospital-warm text-white font-heading font-bold text-lg sm:text-xl tracking-wide flex items-center justify-center gap-3 shadow-glow-lg border-2 border-white/20 transition-all cursor-pointer"
          >
            <span>Start Feedback</span>
            <ArrowRight className="w-6 h-6 stroke-[2.5] animate-pulse" />
          </motion.button>

          <p className="text-[11px] text-hospital-textMuted tracking-wider uppercase flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-hospital-warm" />
            <span>Voice recognition enabled in Hindi, Marathi, English & regional languages</span>
          </p>
        </motion.div>
      </main>

      {/* Hospital Kiosk Footer note */}
      <footer className="w-full py-4 text-center text-xs text-hospital-textMuted/60 border-t border-hospital-border/20">
        CareVoice Kiosk Interface • Touch & Voice Enabled • Patient Confidentiality Assured
      </footer>
    </div>
  );
};
