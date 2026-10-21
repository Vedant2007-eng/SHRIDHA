

import type {

  FeedbackAnswer,

  FeedbackReport,

  SupportedLanguage,

} from '../types/feedback';

// Backend URL. Override with VITE_API_BASE_URL in your .env file if needed.

const API_BASE_URL = (

  import.meta.env.VITE_API_BASE_URL || 'https://shridha-mauve.vercel.app'

).replace(/\/+$/, '');

interface ApiEnvelope<T> {

  success?: boolean;

  data?: T;

  error?: unknown;

  message?: string;

  detail?: string;

}

export interface StartSessionResponse {

  feedback_id: string;

  language: string;

}

export interface QuestionApiModel {

  id: number;

  text: string;

  category: string;

  categories?: string[];

}

interface BackendCategoryScores {

  cleanliness_facilities: number;

  staff_behaviour: number;

  medicine_timeliness: number;

  doctor_treatment: number;

  overall_service?: number;

}

interface BackendReport {

  feedback_id: string;

  overall_score: number;

  status: string;

  category_scores: BackendCategoryScores;

  overall_sentiment?: string;

  positive_feedback?: string[];

  negative_feedback?: string[];

  key_issues?: string[];

  improvement_areas?: string[];

  patient_suggestions?: string[];

  appreciated_staff?: string[];

  dissatisfied_staff?: string[];

  summary?: string;

  created_at?: string;

}

const getErrorMessage = (body: ApiEnvelope<unknown>): string => {

  if (typeof body.message === 'string' && body.message.trim()) {

    return body.message;

  }

  if (typeof body.detail === 'string' && body.detail.trim()) {

    return body.detail;

  }

  if (typeof body.error === 'string' && body.error.trim()) {

    return body.error;

  }

  return 'The backend request failed.';

};

const readJson = async <T>(

  response: Response

): Promise<ApiEnvelope<T>> => {

  let body: ApiEnvelope<T>;

  try {

    body = (await response.json()) as ApiEnvelope<T>;

  } catch {

    throw new Error(

      `The backend returned an invalid response (HTTP ${response.status}).`

    );

  }

  if (!response.ok) {

    throw new Error(

      getErrorMessage(body as ApiEnvelope<unknown>)

    );

  }

  return body;

};

const getStringArray = (value: unknown): string[] => {

  if (!Array.isArray(value)) {

    return [];

  }

  return value.filter(

    (item): item is string =>

      typeof item === 'string' && item.trim().length > 0

  ).map((item) => item.trim());

};

const validateScore = (

  value: unknown,

  fieldName: string

): number => {

  if (

    value === null ||

    value === undefined ||

    value === '' ||

    typeof value === 'boolean'

  ) {

    throw new Error(

      `The backend did not return a valid ${fieldName} score.`

    );

  }

  const score = Number(value);

  if (!Number.isFinite(score) || score < 0 || score > 100) {

    throw new Error(

      `The backend returned an invalid ${fieldName} score: ${String(value)}.`

    );

  }

  return score;

};

const validateAnswers = (answers: FeedbackAnswer[]): void => {

  const requiredIds = [1, 2, 3, 4];

  if (!Array.isArray(answers) || answers.length !== 4) {

    throw new Error(

      'Exactly four patient answers are required before analysis.'

    );

  }

  const ids = answers.map((answer) => answer.questionId);

  for (const id of requiredIds) {

    if (ids.filter((candidate) => candidate === id).length !== 1) {

      throw new Error(

        `Question ${id} is missing or duplicated. Please review all four answers.`

      );

    }

  }

  for (const answer of answers) {

    if (

      typeof answer.transcript !== 'string' ||

      !answer.transcript.trim()

    ) {

      throw new Error(

        `Please provide an answer to Question ${answer.questionId}.`

      );

    }

  }

};

const getReportDateTime = (

  createdAt?: string

): { date: string; time: string } => {

  const parsedDate = createdAt ? new Date(createdAt) : new Date();

  const reportDate = Number.isNaN(parsedDate.getTime())

    ? new Date()

    : parsedDate;

  return {

    date: reportDate.toLocaleDateString('en-GB', {

      day: '2-digit',

      month: 'short',

      year: 'numeric',

    }),

    time: reportDate.toLocaleTimeString('en-US', {

      hour: '2-digit',

      minute: '2-digit',

      hour12: true,

    }),

  };

};

const normalizeReportStatus = (status: string): FeedbackReport['status'] => {
  const normalized = status
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

  switch (normalized) {
    case 'excellent':
      return 'EXCELLENT';
    case 'good':
      return 'GOOD';
    case 'needs attention':
    case 'needs improvement':
      return 'NEEDS_ATTENTION';
    case 'poor':
      return 'POOR';
    default:
      throw new Error(`The backend returned an unsupported report status: ${status}`);
  }
};

const getStatusDescription = (status: string): string => {
  const normalized = status.trim().toLowerCase().replace(/[_-]+/g, ' ');

  switch (normalized) {
    case 'excellent':
      return 'The calculated score falls in the configured Excellent range. Review the individual category scores and patient comments.';
    case 'good':
      return 'The calculated score falls in the configured Good range. Review the individual category scores and any reported concerns.';
    case 'needs improvement':
    case 'needs attention':
      return 'The calculated score falls in the configured Needs Improvement range. Review the patient concerns and suggestions.';
    case 'poor':
      return 'The calculated score falls in the configured Poor range. Review the reported concerns promptly.';
    default:
      return 'Review the calculated scores and the patient responses before drawing conclusions.';
  }
};

export const apiService = {

  async checkHealth(): Promise<boolean> {

    try {

      const response = await fetch(`${API_BASE_URL}/api/health`, {

        method: 'GET',

        cache: 'no-store',

      });

      const json =

        await readJson<{ status?: string }>(response);

      return (

        json.success === true &&

        json.data?.status === 'ok'

      );

    } catch (error) {

      console.error('Backend health check failed:', error);

      return false;

    }

  },

  async startSession(
    language: SupportedLanguage
  ): Promise<string | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/feedback/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ language }),
        cache: 'no-store',
      });

      // Read the response once and support the response envelopes that the
      // backend may return (for example { data: { feedback_id: "..." } } or
      // { feedback_id: "..." }). This avoids incorrectly rejecting a valid
      // session just because it is wrapped differently.
      const responseText = await response.text();
      let body: unknown;

      try {
        body = responseText ? JSON.parse(responseText) : null;
      } catch {
        body = responseText.trim();
      }

      const isRecord = (
        value: unknown
      ): value is Record<string, unknown> =>
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value);

      const root = isRecord(body) ? body : null;

      if (!response.ok) {
        const errorMessage = root
          ? getErrorMessage(root as ApiEnvelope<unknown>)
          : typeof body === 'string' && body
            ? body
            : `Session creation failed (HTTP ${response.status}).`;
        throw new Error(errorMessage);
      }

      if (root?.success === false) {
        throw new Error(
          getErrorMessage(root as ApiEnvelope<unknown>)
        );
      }

      const data = isRecord(root?.data) ? root.data : null;
      const candidateId =
        typeof body === 'string'
          ? body
          : typeof root?.feedback_id === 'string'
            ? root.feedback_id
            : typeof root?.session_id === 'string'
              ? root.session_id
              : typeof root?.sessionId === 'string'
                ? root.sessionId
                : typeof root?.data === 'string'
                  ? root.data
                  : typeof data?.feedback_id === 'string'
                    ? data.feedback_id
                    : typeof data?.session_id === 'string'
                      ? data.session_id
                      : typeof data?.sessionId === 'string'
                        ? data.sessionId
                        : typeof data?.id === 'string'
                          ? data.id
                          : null;

      if (typeof candidateId !== 'string' || !candidateId.trim()) {
        console.error(
          'Session creation response did not contain a feedback/session ID.',
          body
        );
        return null;
      }

      return candidateId.trim();
    } catch (error) {
      console.error('Could not create a backend feedback session:', error);
      return null;
    }
  },

  async transcribeAudio(

    audioBlob: Blob,

    language: SupportedLanguage

  ): Promise<string | null> {

    try {

      if (audioBlob.size === 0) {

        throw new Error('The recorded audio is empty.');

      }

      const formData = new FormData();

      formData.append(

        'file',

        audioBlob,

        'voice_response.webm'

      );

      formData.append('language', language);

      const response = await fetch(

        `${API_BASE_URL}/api/feedback/transcribe`,

        {

          method: 'POST',

          body: formData,

          cache: 'no-store',

        }

      );

      const json = await readJson<{

        transcript?: string;

      }>(response);

      const transcript = json.data?.transcript;

      if (

        json.success !== true ||

        typeof transcript !== 'string' ||

        !transcript.trim()

      ) {

        console.error(

          'The backend did not return a valid transcription.'

        );

        return null;

      }

      return transcript.trim();

    } catch (error) {

      console.error('Audio transcription failed:', error);

      return null;

    }

  },

  async saveAnswers(

    feedbackId: string,

    answers: FeedbackAnswer[]

  ): Promise<boolean> {

    try {

      if (!feedbackId.trim()) {

        throw new Error('A valid feedback session ID is required.');

      }

      validateAnswers(answers);

      const formattedAnswers = answers.map((answer) => ({

        question_id: answer.questionId,

        transcript: answer.transcript.trim(),

        question: answer.question,

        timestamp:

          answer.audioTimestamp ||

          new Date().toISOString(),

      }));

      const response = await fetch(

        `${API_BASE_URL}/api/feedback/${encodeURIComponent(feedbackId)}/answers`,

        {

          method: 'POST',

          headers: {

            'Content-Type': 'application/json',

          },

          body: JSON.stringify({

            answers: formattedAnswers,

          }),

          cache: 'no-store',

        }

      );

      const json =

        await readJson<unknown>(response);

      if (json.success !== true) {

        console.error(

          'The backend did not confirm that the answers were saved.',

          json.error

        );

        return false;

      }

      return true;

    } catch (error) {

      console.error('Saving patient answers failed:', error);

      return false;

    }

  },

  async analyzeFeedback(

    feedbackId: string,

    answers: FeedbackAnswer[],

    language: SupportedLanguage

  ): Promise<FeedbackReport | null> {

    try {

      if (!feedbackId.trim()) {

        throw new Error(

          'No backend feedback session exists. Start a new session first.'

        );

      }

      validateAnswers(answers);

      // Do not analyse old or incomplete answers if saving fails.

      const answersSaved = await this.saveAnswers(

        feedbackId,

        answers

      );

      if (!answersSaved) {

        throw new Error(

          'The answers could not be saved. Analysis was not started.'

        );

      }

      const response = await fetch(

        `${API_BASE_URL}/api/feedback/${encodeURIComponent(feedbackId)}/analyze`,

        {

          method: 'POST',

          headers: {

            'Content-Type': 'application/json',

          },

          cache: 'no-store',

        }

      );

      const json =

        await readJson<BackendReport>(response);

      if (json.success !== true || !json.data) {

        throw new Error(

          getErrorMessage(json as ApiEnvelope<unknown>)

        );

      }

      const data = json.data;

      // Make sure the report belongs to this patient's session.

      if (data.feedback_id !== feedbackId) {

        throw new Error(

          'The backend returned a report for a different feedback session.'

        );

      }

      if (

        !data.category_scores ||

        typeof data.category_scores !== 'object'

      ) {

        throw new Error(

          'The backend report is missing its category scores.'

        );

      }

      // Validate scores rather than inventing missing values.

      const overallScore = validateScore(

        data.overall_score,

        'overall'

      );

      const cleanliness = validateScore(

        data.category_scores.cleanliness_facilities,

        'cleanliness and facilities'

      );

      const staffBehaviour = validateScore(

        data.category_scores.staff_behaviour,

        'staff behaviour'

      );

      const doctorTreatment = validateScore(

        data.category_scores.doctor_treatment,

        'doctor treatment'

      );

      const medicineSupport = validateScore(

        data.category_scores.medicine_timeliness,

        'medicine timeliness'

      );

      if (

        typeof data.status !== 'string' ||

        !data.status.trim()

      ) {

        throw new Error(

          'The backend report is missing its status.'

        );

      }

      const { date, time } = getReportDateTime(

        data.created_at

      );

      // Map only the backend's report fields. Do not create

      // generic positive feedback or sample suggestions here.

      const report: FeedbackReport = {

        feedbackId: data.feedback_id,

        date,

        time,

        language,

        overallScore,

        status: normalizeReportStatus(data.status),

        statusDescription: getStatusDescription(data.status),

        categories: {

          cleanliness,

          staffBehaviour,

          doctorTreatment,

          medicineSupport,

        },

        radarData: [

          {

            subject: 'Cleanliness',

            score: cleanliness,

            benchmark: 80,

            fullMark: 100,

          },

          {

            subject: 'Staff Behaviour',

            score: staffBehaviour,

            benchmark: 80,

            fullMark: 100,

          },

          {

            subject: 'Doctor Treatment',

            score: doctorTreatment,

            benchmark: 80,

            fullMark: 100,

          },

          {

            subject: 'Medicine Support',

            score: medicineSupport,

            benchmark: 80,

            fullMark: 100,

          },

        ],

        positiveFeedback: getStringArray(

          data.positive_feedback

        ),

        issues: getStringArray(

          data.key_issues

        ),

        suggestions: getStringArray(

          data.patient_suggestions

        ),

        patientAnswers: answers.map((answer) => ({

          ...answer,

          transcript: answer.transcript.trim(),

        })),

      };

      return report;

    } catch (error) {

      console.error(

        'Backend analysis failed. No fallback report was created:',

        error

      );

      return null;

    }

  },

};
