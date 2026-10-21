
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import { Header } from '../components/Header';
import { ProgressTracker } from '../components/ProgressTracker';
import { ScoreCircle } from '../components/ScoreCircle';
import { ScoreCard } from '../components/ScoreCard';
import { HospitalRadarChart } from '../components/HospitalRadarChart';
import { FeedbackSection } from '../components/FeedbackSection';
import { ReportActions } from '../components/ReportActions';

import { useFeedback } from '../context/FeedbackContext';

import {
  AlertCircle,
  ArrowLeft,
  Award,
  BarChart2,
  Calendar,
  Clock,
  FileSpreadsheet,
  Globe,
  Hash,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export const ReportPage: React.FC = () => {
  const navigate = useNavigate();

  const {
    report,
    generatePDF,
    isGeneratingPDF,
  } = useFeedback();

  const [downloadSuccess, setDownloadSuccess] =
    useState<boolean>(false);

  const [downloadError, setDownloadError] =
    useState<string | null>(null);

  const notificationTimer =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up the notification timer when leaving the page.
  useEffect(() => {
    return () => {
      if (notificationTimer.current) {
        clearTimeout(notificationTimer.current);
      }
    };
  }, []);

  const showNotification = (
    type: 'success' | 'error',
    message?: string
  ) => {
    if (notificationTimer.current) {
      clearTimeout(notificationTimer.current);
    }

    setDownloadSuccess(type === 'success');
    setDownloadError(
      type === 'error'
        ? message || 'The PDF could not be generated.'
        : null
    );

    notificationTimer.current = setTimeout(() => {
      setDownloadSuccess(false);
      setDownloadError(null);
    }, 5000);
  };

  const handleDownloadPDF = async (): Promise<void> => {
    if (!report) {
      showNotification(
        'error',
        'No valid report is available to download.'
      );
      return;
    }

    try {
      setDownloadError(null);
      setDownloadSuccess(false);

      const success = await generatePDF(
        'report-printable-content'
      );

      if (success) {
        showNotification('success');
      } else {
        showNotification(
          'error',
          'The PDF could not be generated. Please try again.'
        );
      }
    } catch (error) {
      console.error('PDF generation failed:', error);

      showNotification(
        'error',
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred while generating the PDF.'
      );
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  /*
   * IMPORTANT:
   * Do not automatically call runAnalysis() here.
   * ProcessingPage is responsible for running analysis.
   * This page only displays the result already returned
   * by the backend and stored in FeedbackContext.
   */
  if (!report) {
    return (
      <div className="min-h-screen flex flex-col bg-hospital-bg text-hospital-textLight">
        <Header showLanguageBadge={true} />

        <ProgressTracker currentStep="report" />

        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg glass-panel rounded-3xl border border-hospital-border/40 shadow-glow-sm p-8 text-center"
          >
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/40 bg-red-950/30">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>

            <h1 className="font-heading text-2xl font-extrabold text-white mb-3">
              Report Not Available
            </h1>

            <p
              role="alert"
              className="text-sm leading-relaxed text-hospital-textMuted mb-6"
            >
              No completed report is available for this session.
              The report page will not generate sample results or
              invent patient feedback. Please return to the previous
              step and complete the analysis.
            </p>

            <button
              type="button"
              onClick={handleGoBack}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-hospital-accent px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </button>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-hospital-bg text-hospital-textLight">
      <Header showLanguageBadge={true} />

      <ProgressTracker currentStep="report" />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Printable report content */}
        <div
          id="report-printable-content"
          className="space-y-8"
        >
          {/* Report header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel rounded-3xl p-6 sm:p-8 border border-hospital-border/40 shadow-glow-sm bg-gradient-to-r from-hospital-burgundy via-hospital-card to-hospital-dark relative overflow-hidden"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-hospital-accent/20 border border-hospital-accent/30 text-hospital-warm text-xs font-bold uppercase tracking-wider mb-2">
                  <Award className="w-3.5 h-3.5 text-hospital-accent" />
                  <span>Patient Feedback Report</span>
                </div>

                <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
                  Your Feedback{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-hospital-accent to-hospital-warm text-glow">
                    Report
                  </span>
                </h1>

                <p className="text-xs sm:text-sm text-hospital-textMuted mt-1">
                  This report displays the analysis returned for
                  the selected feedback session.
                </p>
              </div>

              {/* Report metadata */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-hospital-dark/80 border border-hospital-border/40 text-xs text-hospital-textLight">
                  <Hash className="w-3.5 h-3.5 text-hospital-accent" />
                  <span className="font-mono font-bold text-hospital-warm">
                    {report.feedbackId}
                  </span>
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

          {/* Overall score and category radar chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
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

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 }}
              className="lg:col-span-7 glass-panel rounded-3xl p-6 border border-hospital-border/40 shadow-glow-sm flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2 gap-3">
                <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-hospital-textLight flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-hospital-accent" />
                  Category Score Chart
                </h3>

                <span className="text-[11px] text-hospital-textMuted">
                  Patient feedback analysis
                </span>
              </div>

              <HospitalRadarChart data={report.radarData} />
            </motion.div>
          </div>

          {/* Category scores */}
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
                name="Staff Behaviour"
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

          {/* Patient feedback, issues and suggestions */}
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

        {/* PDF download success */}
        {downloadSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            role="status"
            className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-sm font-semibold text-center"
          >
            PDF downloaded successfully.
          </motion.div>
        )}

        {/* PDF download error */}
        {downloadError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="p-4 rounded-xl bg-red-950/50 border border-red-500/50 text-red-200 text-sm font-semibold text-center"
          >
            {downloadError}
          </motion.div>
        )}

        {/* Report actions */}
        <ReportActions
          onDownloadPDF={handleDownloadPDF}
          isDownloading={isGeneratingPDF}
        />
      </main>
    </div>
  );
};
