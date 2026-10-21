
import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';

import type {
  FeedbackAnswer,
  FeedbackReport,
  SupportedLanguage,
} from '../types/feedback';

import { QUESTIONS } from '../data/questionsData';
import { generateReportPDF } from '../services/pdfService';
import { stopSpeech } from '../services/ttsService';
import { apiService } from '../services/apiService';

interface FeedbackContextType {
  feedbackId: string;
  selectedLanguage: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => Promise<boolean>;

  currentQuestion: number;
  setCurrentQuestion: (q: number) => void;

  answers: FeedbackAnswer[];
  saveAnswer: (
    questionId: number,
    transcript: string,
    isTyped?: boolean
  ) => void;

  getAnswer: (questionId: number) => string;
  nextQuestion: () => boolean;
  previousQuestion: () => boolean;
  resetFeedback: () => void;

  processingProgress: number;
  setProcessingProgress: (p: number) => void;

  report: FeedbackReport | null;
  runAnalysis: () => Promise<FeedbackReport>;

  generatePDF: (elementId?: string) => Promise<boolean>;
  isGeneratingPDF: boolean;
}

const FeedbackContext = createContext<
  FeedbackContextType | undefined
>(undefined);

const REQUIRED_QUESTION_IDS = [1, 2, 3, 4];

const createEmptyAnswers = (
  language: SupportedLanguage
): FeedbackAnswer[] =>
  QUESTIONS.map((question) => ({
    questionId: question.id,
    question:
      question.question[language] ||
      question.question.English ||
      '',
    transcript: '',
  }));

export const FeedbackProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [feedbackId, setFeedbackId] = useState('');
  const [selectedLanguage, setSelectedLanguage] =
    useState<SupportedLanguage>('English');

  const [currentQuestion, setCurrentQuestion] = useState(1);

  const [answers, setAnswers] = useState<FeedbackAnswer[]>(
    () => createEmptyAnswers('English')
  );

  const [processingProgress, setProcessingProgress] = useState(0);
  const [report, setReport] = useState<FeedbackReport | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  /*
   * Refs provide the latest values immediately, without waiting for
   * React to render again after a state update.
   */
  const feedbackIdRef = useRef('');
  const languageRef = useRef<SupportedLanguage>('English');
  const answersRef = useRef<FeedbackAnswer[]>(
    createEmptyAnswers('English')
  );

  const sessionRequestNumber = useRef(0);

  const sessionCreationPromiseRef =
    useRef<Promise<string | null> | null>(null);

  const sessionCreationLanguageRef =
    useRef<SupportedLanguage | null>(null);

  const analysisPromiseRef =
    useRef<Promise<FeedbackReport> | null>(null);

  const updateFeedbackId = useCallback((id: string) => {
    feedbackIdRef.current = id;
    setFeedbackId(id);
  }, []);

  /*
   * Create a real session for the selected language.
   * Do not create client-generated session IDs.
   */
  const setLanguage = useCallback(
    async (lang: SupportedLanguage): Promise<boolean> => {
      const requestNumber = ++sessionRequestNumber.current;

      stopSpeech();

      languageRef.current = lang;
      setSelectedLanguage(lang);

      updateFeedbackId('');

      const emptyAnswers = createEmptyAnswers(lang);
      answersRef.current = emptyAnswers;
      setAnswers(emptyAnswers);

      setCurrentQuestion(1);
      setProcessingProgress(0);
      setReport(null);

      sessionCreationLanguageRef.current = lang;

      const sessionPromise = apiService.startSession(lang);
      sessionCreationPromiseRef.current = sessionPromise;

      try {
        const backendId = await sessionPromise;

        if (requestNumber !== sessionRequestNumber.current) {
          return false;
        }

        if (
          typeof backendId !== 'string' ||
          !backendId.trim()
        ) {
          updateFeedbackId('');
          return false;
        }

        updateFeedbackId(backendId.trim());
        return true;
      } catch (error) {
        console.error(
          'Failed to create the backend feedback session:',
          error
        );

        if (requestNumber === sessionRequestNumber.current) {
          updateFeedbackId('');
        }

        return false;
      } finally {
        if (
          sessionCreationPromiseRef.current === sessionPromise
        ) {
          sessionCreationPromiseRef.current = null;
          sessionCreationLanguageRef.current = null;
        }
      }
    },
    [updateFeedbackId]
  );

  /*
   * Save the exact transcript from the patient.
   * Changing any answer invalidates the in-memory report.
   */
  const saveAnswer = useCallback(
    (
      questionId: number,
      transcript: string,
      isTyped = false
    ): void => {
      const updatedAnswers = answersRef.current.map((answer) =>
        answer.questionId === questionId
          ? {
            ...answer,
            transcript,
            isTypedFallback: isTyped,
            timestamp: new Date().toISOString(),
          }
          : answer
      );

      answersRef.current = updatedAnswers;
      setAnswers(updatedAnswers);
      setReport(null);
      setProcessingProgress(0);
    },
    []
  );

  const getAnswer = useCallback((questionId: number): string => {
    return (
      answersRef.current.find(
        (answer) => answer.questionId === questionId
      )?.transcript ?? ''
    );
  }, []);

  const nextQuestion = useCallback((): boolean => {
    stopSpeech();

    if (currentQuestion < 4) {
      setCurrentQuestion((previous) => previous + 1);
      return false;
    }

    return true;
  }, [currentQuestion]);

  const previousQuestion = useCallback((): boolean => {
    stopSpeech();

    if (currentQuestion > 1) {
      setCurrentQuestion((previous) => previous - 1);
      return true;
    }

    return false;
  }, [currentQuestion]);

  /*
   * Reset all local session data.
   * The next session must be created by the backend.
   */
  const resetFeedback = useCallback((): void => {
    sessionRequestNumber.current += 1;

    sessionCreationPromiseRef.current = null;
    sessionCreationLanguageRef.current = null;
    analysisPromiseRef.current = null;

    stopSpeech();

    updateFeedbackId('');

    const emptyAnswers = createEmptyAnswers(
      languageRef.current
    );

    answersRef.current = emptyAnswers;
    setAnswers(emptyAnswers);

    setCurrentQuestion(1);
    setProcessingProgress(0);
    setReport(null);
    setIsGeneratingPDF(false);
  }, [updateFeedbackId]);

  /*
   * Ensure that a backend session exists without clearing answers.
   * This handles cases where processing starts before session creation
   * has finished on the language-selection page.
   */
  const ensureBackendSession = useCallback(async (): Promise<string> => {
    const existingId = feedbackIdRef.current.trim();

    if (existingId) {
      return existingId;
    }

    const language = languageRef.current;

    let sessionPromise = sessionCreationPromiseRef.current;

    if (
      !sessionPromise ||
      sessionCreationLanguageRef.current !== language
    ) {
      const requestNumber = ++sessionRequestNumber.current;

      sessionCreationLanguageRef.current = language;

      sessionPromise = apiService.startSession(language);
      sessionCreationPromiseRef.current = sessionPromise;

      try {
        const createdId = await sessionPromise;

        if (requestNumber !== sessionRequestNumber.current) {
          throw new Error(
            'Session creation was superseded. Please try again.'
          );
        }

        if (
          typeof createdId !== 'string' ||
          !createdId.trim()
        ) {
          throw new Error(
            'The backend could not create a feedback session. ' +
            'Check that the backend is running and try again.'
          );
        }

        updateFeedbackId(createdId.trim());

        return createdId.trim();
      } finally {
        if (
          sessionCreationPromiseRef.current === sessionPromise
        ) {
          sessionCreationPromiseRef.current = null;
          sessionCreationLanguageRef.current = null;
        }
      }
    }

    try {
      const createdId = await sessionPromise;

      if (
        languageRef.current !== language ||
        sessionCreationLanguageRef.current !== language
      ) {
        // The matching session may already have been finalized
        // by setLanguage, so the stored ID is checked again below.
        const activeId = feedbackIdRef.current.trim();

        if (activeId) {
          return activeId;
        }

        throw new Error(
          'The selected language changed during session creation.'
        );
      }

      const activeId = feedbackIdRef.current.trim();

      if (activeId) {
        return activeId;
      }

      if (
        typeof createdId !== 'string' ||
        !createdId.trim()
      ) {
        throw new Error(
          'The backend returned no feedback session ID.'
        );
      }

      updateFeedbackId(createdId.trim());

      return createdId.trim();
    } catch (error) {
      console.error('Session recovery failed:', error);
      throw error;
    }
  }, [updateFeedbackId]);

  /*
   * Analyse only saved, non-empty patient answers.
   * Multiple simultaneous calls share one in-flight request.
   * There is no local demo-analysis fallback.
   */
  const runAnalysis = useCallback((): Promise<FeedbackReport> => {
    if (analysisPromiseRef.current) {
      return analysisPromiseRef.current;
    }

    setReport(null);
    setProcessingProgress(0);

    const analysisTask = (async (): Promise<FeedbackReport> => {
      const activeFeedbackId = await ensureBackendSession();

      const submittedAnswers = answersRef.current.map((answer) => ({
        ...answer,
        transcript: answer.transcript.trim(),
      }));

      if (submittedAnswers.length !== 4) {
        throw new Error(
          'Exactly four patient answers are required.'
        );
      }

      for (const questionId of REQUIRED_QUESTION_IDS) {
        const matchingAnswers = submittedAnswers.filter(
          (answer) => answer.questionId === questionId
        );

        if (
          matchingAnswers.length !== 1 ||
          !matchingAnswers[0].transcript
        ) {
          throw new Error(
            `Question ${questionId} is missing or has an empty answer. ` +
            'Please return to the feedback page and complete all four questions.'
          );
        }
      }

      const result = await apiService.analyzeFeedback(
        activeFeedbackId,
        submittedAnswers,
        languageRef.current
      );

      if (!result) {
        throw new Error(
          'The backend did not return a valid report. ' +
          'Check the backend terminal for the actual error. ' +
          'No sample report was generated.'
        );
      }

      if (result.feedbackId !== activeFeedbackId) {
        throw new Error(
          'The backend returned a report belonging to a different session.'
        );
      }

      if (
        !Number.isFinite(result.overallScore) ||
        result.overallScore < 0 ||
        result.overallScore > 100
      ) {
        throw new Error(
          'The backend returned an invalid overall score.'
        );
      }

      setReport(result);
      setProcessingProgress(100);

      return result;
    })();

    analysisPromiseRef.current = analysisTask;

    // Clear the in-flight request when it finishes so a retry is possible.
    void analysisTask.then(
      () => {
        if (analysisPromiseRef.current === analysisTask) {
          analysisPromiseRef.current = null;
        }
      },
      () => {
        if (analysisPromiseRef.current === analysisTask) {
          analysisPromiseRef.current = null;
        }
      }
    );

    return analysisTask;
  }, [ensureBackendSession]);

  /*
   * Generate the PDF only from an existing validated report.
   */
  const generatePDF = useCallback(
    async (elementId?: string): Promise<boolean> => {
      if (!report) {
        console.error(
          'Cannot generate PDF: no valid report is available.'
        );
        return false;
      }

      setIsGeneratingPDF(true);

      try {
        return await generateReportPDF(report, elementId);
      } catch (error) {
        console.error('PDF generation failed:', error);
        return false;
      } finally {
        setIsGeneratingPDF(false);
      }
    },
    [report]
  );

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
    throw new Error(
      'useFeedback must be used within a FeedbackProvider'
    );
  }

  return context;
};
