import type { FeedbackAnswer, FeedbackReport, SupportedLanguage } from '../types/feedback';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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

export const apiService = {
  /**
   * Health Check
   */
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/health`);
      const json = await res.json();
      return json.success && json.data?.status === 'ok';
    } catch {
      return false;
    }
  },

  /**
   * Start a new anonymous feedback session
   */
  async startSession(language: SupportedLanguage): Promise<string | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/feedback/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      });
      const json = await res.json();
      if (json.success && json.data?.feedback_id) {
        return json.data.feedback_id;
      }
      return null;
    } catch (err) {
      console.warn('Backend unavailable, using client session ID:', err);
      return null;
    }
  },

  /**
   * Transcribe audio blob via backend Whisper API
   */
  async transcribeAudio(audioBlob: Blob, language: SupportedLanguage): Promise<string | null> {
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice_response.webm');
      formData.append('language', language);

      const res = await fetch(`${API_BASE_URL}/api/feedback/transcribe`, {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (json.success && json.data?.transcript) {
        return json.data.transcript;
      }
      return null;
    } catch (err) {
      console.warn('Backend audio transcription error:', err);
      return null;
    }
  },

  /**
   * Save all 4 answers
   */
  async saveAnswers(feedbackId: string, answers: FeedbackAnswer[]): Promise<boolean> {
    try {
      const formattedAnswers = answers.map((a) => ({
        question_id: a.questionId,
        transcript: a.transcript,
        question: a.question,
        timestamp: a.audioTimestamp || new Date().toISOString(),
      }));

      const res = await fetch(`${API_BASE_URL}/api/feedback/${feedbackId}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: formattedAnswers }),
      });
      const json = await res.json();
      return json.success === true;
    } catch (err) {
      console.warn('Backend save answers error:', err);
      return false;
    }
  },

  /**
   * Trigger AI analysis on backend
   */
  async analyzeFeedback(
    feedbackId: string,
    answers: FeedbackAnswer[],
    language: SupportedLanguage
  ): Promise<FeedbackReport | null> {
    try {
      // First ensure answers are saved
      await this.saveAnswers(feedbackId, answers);

      const res = await fetch(`${API_BASE_URL}/api/feedback/${feedbackId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();

      if (json.success && json.data) {
        const d = json.data;
        const now = new Date();
        const dateFormatted = now.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
        const timeFormatted = now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });

        // Map backend report model to frontend format
        const report: FeedbackReport = {
          feedbackId: d.feedback_id,
          date: dateFormatted,
          time: timeFormatted,
          language: language,
          overallScore: d.overall_score,
          status: d.status.toUpperCase(),
          statusDescription:
            d.status === 'Excellent'
              ? 'Outstanding patient experience across all hospital departments.'
              : d.status === 'Good'
              ? 'High patient satisfaction with minor areas for quality enhancement.'
              : d.status === 'Needs Improvement'
              ? 'Several service and operational bottlenecks were noted.'
              : 'Critical concerns identified requiring immediate administrative attention.',
          categories: {
            cleanliness: d.category_scores.cleanliness_facilities,
            staffBehaviour: d.category_scores.staff_behaviour,
            doctorTreatment: d.category_scores.doctor_treatment,
            medicineSupport: d.category_scores.medicine_timeliness,
          },
          radarData: [
            {
              subject: 'Cleanliness',
              score: d.category_scores.cleanliness_facilities,
              benchmark: 80,
              fullMark: 100,
            },
            {
              subject: 'Staff Timeliness',
              score: d.category_scores.staff_behaviour,
              benchmark: 80,
              fullMark: 100,
            },
            {
              subject: 'Doctor Care',
              score: d.category_scores.doctor_treatment,
              benchmark: 80,
              fullMark: 100,
            },
            {
              subject: 'Medicine Support',
              score: d.category_scores.medicine_timeliness,
              benchmark: 80,
              fullMark: 100,
            },
          ],
          positiveFeedback: d.positive_feedback || [],
          issues: d.key_issues || [],
          suggestions: d.patient_suggestions || [],
          patientAnswers: answers,
        };

        return report;
      }
      return null;
    } catch (err) {
      console.warn('Backend analysis error, falling back to local analysis:', err);
      return null;
    }
  },
};
