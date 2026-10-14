import React from 'react';
import { motion } from 'framer-motion';
import { Home, Download, RotateCcw, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFeedback } from '../context/FeedbackContext';

interface ReportActionsProps {
  onDownloadPDF: () => void;
  isDownloading?: boolean;
}

export const ReportActions: React.FC<ReportActionsProps> = ({
  onDownloadPDF,
  isDownloading = false,
}) => {
  const navigate = useNavigate();
  const { resetFeedback } = useFeedback();

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleSubmitAnother = () => {
    resetFeedback();
    navigate('/language');
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-hospital-border/40 w-full">
      {/* Back to Home */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.02, x: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleBackToHome}
        className="w-full sm:w-auto px-5 py-3 rounded-xl bg-hospital-dark border border-hospital-border/50 text-hospital-textLight hover:text-white hover:border-hospital-accent text-sm font-semibold flex items-center justify-center gap-2 transition-all"
      >
        <Home className="w-4 h-4 text-hospital-textMuted" />
        <span>← Back to Home</span>
      </motion.button>

      {/* Center / Primary Action: Download PDF */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onDownloadPDF}
        disabled={isDownloading}
        className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-hospital-crimson via-hospital-accent to-hospital-warm text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-glow-md border border-white/20 transition-all hover:shadow-glow-lg disabled:opacity-50"
      >
        {isDownloading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Generating PDF...</span>
          </>
        ) : (
          <>
            <Download className="w-5 h-5 stroke-[2.5]" />
            <span>Download Report (PDF)</span>
          </>
        )}
      </motion.button>

      {/* Submit Another Feedback */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.02, x: 2 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleSubmitAnother}
        className="w-full sm:w-auto px-5 py-3 rounded-xl bg-hospital-burgundy/80 hover:bg-hospital-burgundy border border-hospital-accent/40 text-hospital-textLight hover:text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-glow-sm"
      >
        <RotateCcw className="w-4 h-4 text-hospital-warm" />
        <span>Submit Another Feedback →</span>
      </motion.button>
    </div>
  );
};
