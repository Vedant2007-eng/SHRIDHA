import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Header } from '../components/Header';
import { ProgressTracker } from '../components/ProgressTracker';
import { ScoreCircle } from '../components/ScoreCircle';
import { ScoreCard } from '../components/ScoreCard';
import { HospitalRadarChart } from '../components/HospitalRadarChart';
import { FeedbackSection } from '../components/FeedbackSection';
import { ReportActions } from '../components/ReportActions';
import { useFeedback } from '../context/FeedbackContext';
import { 
  Calendar, 
  Clock, 
  Hash, 
  Award, 
  Sparkles, 
  BarChart2, 
  FileSpreadsheet,
  Globe
} from 'lucide-react';

export const ReportPage: React.FC = () => {
  const { report, runAnalysis, generatePDF, isGeneratingPDF } = useFeedback();
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  // Fallback in case patient navigated directly to /report without processing
  useEffect(() => {
    if (!report) {
      runAnalysis();
    }
  }, [report]);

  const handleDownloadPDF = async () => {
    const success = await generatePDF('report-printable-content');
    if (success) {
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    }
  };

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-hospital-bg text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-hospital-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-hospital-textMuted">Loading Report Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-hospital-bg text-hospital-textLight">
      <Header showLanguageBadge={true} />
      <ProgressTracker currentStep="report" />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Printable Report Wrapper Container */}
        <div id="report-printable-content" className="space-y-8">
          {/* Header Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel rounded-3xl p-6 sm:p-8 border border-hospital-border/40 shadow-glow-sm bg-gradient-to-r from-hospital-burgundy via-hospital-card to-hospital-dark relative overflow-hidden"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-hospital-accent/20 border border-hospital-accent/30 text-hospital-warm text-xs font-bold uppercase tracking-wider mb-2">
                  <Award className="w-3.5 h-3.5 text-hospital-accent" />
                  <span>Verified Patient Feedback Report</span>
                </div>
                <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
                  Your Feedback <span className="text-transparent bg-clip-text bg-gradient-to-r from-hospital-accent to-hospital-warm text-glow">Report</span>
                </h1>
                <p className="text-xs sm:text-sm text-hospital-textMuted mt-1">
                  Thank you for sharing your valuable experience. Here is the AI-generated analysis summary.
                </p>
              </div>

              {/* Metadata Badges (Date, Time, Feedback ID, Language) */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-hospital-dark/80 border border-hospital-border/40 text-xs text-hospital-textLight">
                  <Hash className="w-3.5 h-3.5 text-hospital-accent" />
                  <span className="font-mono font-bold text-hospital-warm">{report.feedbackId}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-hospital-dark/80 border border-hospital-border/40 text-xs text-hospital-textLight">
                  <Calendar className="w-3.5 h-3.5 text-hospital-warm" />
                  <span>{report.date}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-hospital-dark/80 border border-hospital-border/40 text-xs text-hospital-textLight">
                  <Clock className="w-3.5 h-3.5 text-hospital-warm" />
                  <span>{report.time}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-hospital-dark/80 border border-hospital-border/40 text-xs text-hospital-textLight">
                  <Globe className="w-3.5 h-3.5 text-hospital-accent" />
                  <span>{report.language}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Top Section: Overall Score + Radar Breakdown Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Score Circle (5 cols) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
              className="lg:col-span-5 glass-panel rounded-3xl p-6 border border-hospital-border/40 shadow-glow-sm flex flex-col items-center justify-center relative"
            >
              <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-hospital-textLight mb-2 self-start flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-hospital-warm" />
                Overall Hospital Score
              </h3>
              <ScoreCircle
                score={report.overallScore}
                status={report.status}
                statusDescription={report.statusDescription}
              />
            </motion.div>

            {/* Right Radar Chart (7 cols) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 }}
              className="lg:col-span-7 glass-panel rounded-3xl p-6 border border-hospital-border/40 shadow-glow-sm flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-hospital-textLight flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-hospital-accent" />
                  Performance Radar Chart
                </h3>
                <span className="text-[11px] text-hospital-textMuted">
                  Multidimensional Patient Index
                </span>
              </div>
              <HospitalRadarChart data={report.radarData} />
            </motion.div>
          </div>

          {/* Category Scores Grid (4 Cards) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="space-y-3"
          >
            <h3 className="font-heading font-bold text-base uppercase tracking-wider text-hospital-textLight flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-hospital-warm" />
              Category Breakdown Scores
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <ScoreCard
                categoryKey="cleanliness"
                name="Cleanliness & Facilities"
                score={report.categories.cleanliness}
              />
              <ScoreCard
                categoryKey="staffBehaviour"
                name="Staff Behaviour & Timeliness"
                score={report.categories.staffBehaviour}
              />
              <ScoreCard
                categoryKey="doctorTreatment"
                name="Doctor Treatment & Service"
                score={report.categories.doctorTreatment}
              />
              <ScoreCard
                categoryKey="medicineSupport"
                name="Medicine Doses & Support"
                score={report.categories.medicineSupport}
              />
            </div>
          </motion.div>

          {/* Positive, Key Issues, Suggestions & Recorded Transcripts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <FeedbackSection
              positiveFeedback={report.positiveFeedback}
              issues={report.issues}
              suggestions={report.suggestions}
              patientAnswers={report.patientAnswers}
            />
          </motion.div>
        </div>

        {/* Success Toast for Download */}
        {downloadSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-sm font-semibold text-center shadow-glow-sm"
          >
            ✓ CareVoice Hospital Feedback Report PDF downloaded successfully!
          </motion.div>
        )}

        {/* Bottom Actions */}
        <ReportActions
          onDownloadPDF={handleDownloadPDF}
          isDownloading={isGeneratingPDF}
        />
      </main>
    </div>
  );
};
