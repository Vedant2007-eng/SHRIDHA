export type SupportedLanguage = 
  | 'English' 
  | 'Hindi' 
  | 'Marathi' 
  | 'Telugu' 
  | 'Tamil' 
  | 'Kannada' 
  | 'Bengali'
  | 'Other';

export interface LanguageOption {
  id: SupportedLanguage;
  name: string;
  nativeName: string;
  code: string; // e.g. 'en-IN', 'hi-IN', 'mr-IN'
  description: string;
  flagEmoji?: string;
}

export interface QuestionData {
  id: number;
  shortTitle: string;
  question: {
    [key in SupportedLanguage]?: string;
  } & { English: string };
  category: 'cleanliness' | 'staffBehaviour' | 'doctorTreatment' | 'medicineSupport' | 'general';
  hint: string;
}

export interface FeedbackAnswer {
  questionId: number;
  question: string;
  transcript: string;
  audioTimestamp?: string;
  isTypedFallback?: boolean;
}

export interface CategoryScores {
  cleanliness: number;
  staffBehaviour: number;
  doctorTreatment: number;
  medicineSupport: number;
  overallService?: number;
}

export interface FeedbackReport {
  feedbackId: string;
  date: string;
  time: string;
  language: SupportedLanguage;
  overallScore: number;
  status: 'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION' | 'POOR';
  statusDescription: string;
  categories: CategoryScores;
  radarData: Array<{
    subject: string;
    score: number;
    benchmark: number;
    fullMark: number;
  }>;
  positiveFeedback: string[];
  issues: string[];
  suggestions: string[];
  patientAnswers: FeedbackAnswer[];
}

export type MicState = 'READY' | 'LISTENING' | 'RECORDING' | 'ANSWER_CAPTURED' | 'ERROR';
