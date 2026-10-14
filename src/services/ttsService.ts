import { SupportedLanguage } from '../types/feedback';
import { LANGUAGES } from '../data/questionsData';

const LANGUAGE_VOICE_MAP: Record<SupportedLanguage, string> = {
  English: 'en-IN',
  Hindi: 'hi-IN',
  Marathi: 'mr-IN',
  Telugu: 'te-IN',
  Tamil: 'ta-IN',
  Kannada: 'kn-IN',
  Bengali: 'bn-IN',
  Other: 'en-US',
};

export const isSpeechSynthesisSupported = (): boolean => {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
};

export const stopSpeech = (): void => {
  if (isSpeechSynthesisSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn('Error cancelling speech synthesis:', e);
    }
  }
};

export const speakQuestion = (
  text: string,
  language: SupportedLanguage = 'English',
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: any) => void
): void => {
  if (!isSpeechSynthesisSupported()) {
    console.warn('Speech synthesis is not supported in this environment.');
    if (onError) onError('Speech synthesis not supported');
    return;
  }

  stopSpeech();

  try {
    const utterance = new SpeechSynthesisUtterance(text);
    const targetLangCode = LANGUAGE_VOICE_MAP[language] || 'en-IN';
    utterance.lang = targetLangCode;
    utterance.rate = 0.92; // slightly slower for hospital clarity
    utterance.pitch = 1.0;

    // Try finding matching voice
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const matchedVoice = voices.find(
        (v) => v.lang.toLowerCase().replace('_', '-') === targetLangCode.toLowerCase()
      ) || voices.find((v) => v.lang.startsWith(targetLangCode.split('-')[0]));
      
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
    }

    utterance.onstart = () => {
      if (onStart) onStart();
    };

    utterance.onend = () => {
      if (onEnd) onEnd();
    };

    utterance.onerror = (event) => {
      console.warn('Speech synthesis error event:', event);
      if (onError) onError(event);
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  } catch (error) {
    console.warn('Speech synthesis invocation failed:', error);
    if (onError) onError(error);
  }
};
