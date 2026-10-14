import React, { createContext, useContext, useState, useEffect } from 'react';
import type { FeedbackAnswer, FeedbackReport, SupportedLanguage } from '../types/feedback';
import { QUESTIONS } from '../data/questionsData';
import { analyzeFeedback as analyzeFeedbackService } from '../services/aiAnalysisService';
import { generateReportPDF } from '../services/pdfService';
import { stopSpeech } from '../services/ttsService';
import { apiService } from '../services/apiService';

interface FeedbackContextType {
  feedbackId: string;
  selectedLanguage: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  currentQuestion: number;
  setCurrentQuestion: (q: number) => void;
  answers: FeedbackAnswer[];
  saveAnswer: (questionId: number, transcript: string, isTyped?: boolean) => void;
  getAnswer: (questionId: number) => string;
  nextQuestion: () => boolean; // returns true if reached end of questions
  previousQuestion: () => boolean; // returns true if can go back
  resetFeedback: () => void;
  processingProgress: number;
  setProcessingProgress: (p: number) => void;
  report: FeedbackReport | null;
  runAnalysis: () => Promise<FeedbackReport>;
  generatePDF: (elementId?: string) => Promise<boolean>;
  isGeneratingPDF: boolean;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [feedbackId, setFeedbackId] = useState<string>(() => {
    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `CV${dateStr}${rand}`;
  });

  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('English');
  const [currentQuestion, setCurrentQuestion] = useState<number>(1);
  const [answers, setAnswers] = useState<FeedbackAnswer[]>(() => {
    return QUESTIONS.map((q) => ({
      questionId: q.id,
      question: q.question.English,
      transcript: '',
    }));
  });
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [report, setReport] = useState<FeedbackReport | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);

  // Initialize session with backend on language change
  const setLanguage = async (lang: SupportedLanguage) => {
    setSelectedLanguage(lang);
    // update questions in answers
    setAnswers((prev) =>
      prev.map((a) => {
        const qData = QUESTIONS.find((q) => q.id === a.questionId);
        const localizedQ = qData?.question[lang] || qData?.question.English || a.question;
        return {
          ...a,
          question: localizedQ,
        };
      })
    );

    // Call backend start API
    const backendId = await apiService.startSession(lang);
    if (backendId) {
      setFeedbackId(backendId);
    }
  };

  const saveAnswer = (questionId: number, transcript: string, isTyped = false) => {
    setAnswers((prev) =>
      prev.map((a) =>
        a.questionId === questionId
          ? {
              ...a,
              transcript,
              isTypedFallback: isTyped,
              timestamp: new Date().toISOString(),
            }
          : a
      )
    );
  };

  const getAnswer = (questionId: number): string => {
    const found = answers.find((a) => a.questionId === questionId);
    return found ? found.transcript : '';
  };

  const nextQuestion = (): boolean => {
    stopSpeech();
    if (currentQuestion < 4) {
      setCurrentQuestion((prev) => prev + 1);
      return false;
    }
    return true; // Finished question 4
  };

  const previousQuestion = (): boolean => {
    stopSpeech();
    if (currentQuestion > 1) {
      setCurrentQuestion((prev) => prev - 1);
      return true;
    }
    return false; // at Question 1
  };

  const resetFeedback = () => {
    stopSpeech();
    setCurrentQuestion(1);
    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    setFeedbackId(`CV${dateStr}${rand}`);
    setAnswers(
      QUESTIONS.map((q) => ({
        questionId: q.id,
        question: q.question.English,
        transcript: '',
      }))
    );
    setProcessingProgress(0);
    setReport(null);
  };

  const runAnalysis = async (): Promise<FeedbackReport> => {
    // Attempt backend analysis first
    let result = await apiService.analyzeFeedback(feedbackId, answers, selectedLanguage);

    // Fallback to local heuristic analyzer if backend is offline
    if (!result) {
      result = await analyzeFeedbackService(answers, selectedLanguage);
    }

    setReport(result);
    return result;
  };

  const generatePDF = async (elementId?: string): Promise<boolean> => {
    if (!report) return false;
    setIsGeneratingPDF(true);
    try {
      const success = await generateReportPDF(report, elementId);
      return success;
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <FeedbackContext.Provider
      value={{
        feedbackId,
        selectedLanguage,
        setLanguage,
        currentQuestion,
        setCurrentQuestion,
        answers,
        saveAnswer,
        getAnswer,
        nextQuestion,
        previousQuestion,
        resetFeedback,
        processingProgress,
        setProcessingProgress,
        report,
        runAnalysis,
        generatePDF,
        isGeneratingPDF,
      }}
    >
      {children}
    </FeedbackContext.Provider>
  );
};

export const useFeedback = (): FeedbackContextType => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
};
