import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  Square, 
  Volume2, 
  VolumeX, 
  Keyboard, 
  AlertCircle, 
  Zap,
  Loader2,
  Check
} from 'lucide-react';
import type { MicState, SupportedLanguage } from '../types/feedback';
import { AudioWaveform } from './AudioWaveform';
import { speakQuestion, stopSpeech, isSpeechSynthesisSupported } from '../services/ttsService';
import { apiService } from '../services/apiService';

interface VoiceRecorderProps {
  questionText: string;
  language: SupportedLanguage;
  transcript: string;
  onTranscriptChange: (text: string, isTyped?: boolean) => void;
  questionId: number;
}

const LANGUAGE_RECOGNITION_CODES: Record<SupportedLanguage, string> = {
  English: 'en-US',
  Hindi: 'hi-IN',
  Marathi: 'mr-IN',
  Telugu: 'te-IN',
  Tamil: 'ta-IN',
  Kannada: 'kn-IN',
  Bengali: 'bn-IN',
  Other: 'en-US',
};

const SAMPLE_PRESETS: Record<number, Record<SupportedLanguage, string>> = {
  1: {
    English: 'The hospital facilities were very clean and well maintained, but the second floor washroom needs more frequent sanitization.',
    Hindi: 'अस्पताल के वार्ड और सुविधाएं बहुत साफ-सुथरी थीं, लेकिन वॉशरूम की नियमित सफाई की जरूरत है।',
    Marathi: 'रुग्णालयातील स्वच्छता आणि सुविधा खूप चांगल्या होत्या, परंतु स्वच्छतागृहांची अधिक नियमित स्वच्छता हवी.',
    Telugu: 'ఆసుపత్రి చాలా శుభ్రంగా ఉంది, కానీ వాష్‌రూమ్‌లను మరింత క్రమం తప్పకుండా శుభ్రం చేయాలి.',
    Tamil: 'மருத்துவமனை வசதிகள் மிகவும் சுத்தமாக இருந்தன, ஆனால் கழிப்பறைகளை அடிக்கடி சுத்தம் செய்ய வேண்டும்.',
    Kannada: 'ಆಸ್ಪತ್ರೆಯ ಸೌಲಭ್ಯಗಳು ತುಂಬಾ ಸ್ವಚ್ಛವಾಗಿದ್ದವು, ಆದರೆ ಶೌಚಾಲಯಗಳನ್ನು ನಿಯಮಿತವಾಗಿ ಸ್ವಚ್ಛಗೊಳಿಸಬೇಕು.',
    Bengali: 'হাসপাতালের পরিবেশ খুব পরিষ্কার ছিল, তবে বাথরুমগুলি আরও নিয়মিত পরিষ্কার করা দরকার।',
    Other: 'The hospital was clean and modern with good facilities.',
  },
  2: {
    English: 'The nursing staff was polite and helpful, though afternoon medicine was slightly delayed.',
    Hindi: 'नर्सिंग स्टाफ का व्यवहार बहुत विनम्र था, हालांकि दोपहर की दवाई में थोड़ी देरी हुई।',
    Marathi: 'कर्मचाऱ्यांचे वर्तन अतिशय नम्र होते, औषधे वेळेवर देण्यात आली.',
    Telugu: 'సిబ్బంది ప్రవర్తన బాగుంది, మందులు సకాలంలో అందించారు.',
    Tamil: 'பணியாளர்கள் மிகவும் அன்பாக இருந்தனர், மருந்துகள் சரியான நேரத்தில் வழங்கப்பட்டன.',
    Kannada: 'ಸಿಬ್ಬಂದಿ ತುಂಬಾ ಸಹಕಾರಿಯಾಗಿದ್ದರು, ಔಷಧಿಗಳನ್ನು ಸರಿಯಾದ ಸಮಯಕ್ಕೆ ನೀಡಲಾಯಿತು.',
    Bengali: 'কর্মীদের আচরণ খুব ভালো ছিল, ওষুধ সময়মতো দেওয়া হয়েছিল।',
    Other: 'The staff was attentive and kind throughout.',
  },
  3: {
    English: 'Doctor treatment was exceptional, thorough, and all procedures were clearly explained.',
    Hindi: 'डॉक्टर का इलाज बहुत बढ़िया था, उन्होंने सभी जांच और दवाइयों के बारे में अच्छी तरह समझाया।',
    Marathi: 'डॉक्टरांचे उपचार उत्कृष्ट होते आणि त्यांनी सर्व माहिती सविस्तरपणे समजावून सांगितली.',
    Telugu: 'వైద్యుల చిकीత్స అద్భుతంగా ఉంది మరియు వివరంగా వివరించారు.',
    Tamil: 'மருத்துவர் சிகிச்சை சிறப்பாக இருந்தது மற்றும் விவரங்களை தெளிவாக விளக்கினார்.',
    Kannada: 'ವೈದ್ಯರ ಚಿಕಿತ್ಸೆ ಅತ್ಯುತ್ತಮವಾಗಿತ್ತು ಮತ್ತು ವಿವರಗಳನ್ನು ಸ್ಪಷ್ಟವಾಗಿ ವಿವರಿಸಿದರು.',
    Bengali: 'ডাক্তারের চিকিৎসা খুব ভালো ছিল এবং সবকিছু সুন্দরভাবে বুঝিয়ে দিয়েছেন।',
    Other: 'The doctors provided outstanding medical care and guidance.',
  },
  4: {
    English: 'I really appreciated Sister Priya in ward 4. Suggest adding a digital token display in the pharmacy.',
    Hindi: 'वार्ड 4 में सिस्टर प्रिया का काम बहुत सराहनीय था। फार्मेसी में डिजिटल टोकन सिस्टम होना चाहिए।',
    Marathi: 'वॉर्ड ४ मधील सिस्टर प्रिया यांचे काम खूप कौतुकास्पद होते. फार्मसीमध्ये डिजिटल टोकन असावे.',
    Telugu: 'వార్డు 4లోని నర్సింగ్ సిబ్బంది సేవలు బాగున్నాయి. ఫార్మసీలో డిజిటల్ టోకెన్లు ఏర్పాటు చేయండి.',
    Tamil: 'வார்டு 4ல் உள்ள செவிலியரின் சேவை பாராட்டுக்குரியது. பார்மசியில் டோக்கன் முறை தேவை.',
    Kannada: 'ವಾರ್ಡ್ 4 ರ ನರ್ಸಿಂಗ್ ಸಿಬ್ಬಂದಿ ಸೇವೆ ಶ್ಲಾಘನೀಯ. ಫಾರ್ಮಸಿಯಲ್ಲಿ ಡಿಜಿಟಲ್ ಟೋಕನ್ ಸಿಸ್ಟಮ್ ಇರಬೇಕು.',
    Bengali: 'ওয়ার্ড ৪-এর নার্সिंग কর্মীদের কাজ খুব প্রশংসনীয় ছিল। ডিজিটাল টোকেন ব্যবস্থা চালু করা হোক।',
    Other: 'Appreciated the nursing team. Suggest adding more seating in the waiting lobby.',
  },
};

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  questionText,
  language,
  transcript,
  onTranscriptChange,
  questionId,
}) => {
  const [micState, setMicState] = useState<MicState>(() => (transcript ? 'ANSWER_CAPTURED' : 'READY'));
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState<boolean>(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [showTypeFallback, setShowTypeFallback] = useState<boolean>(false);
  const [micVolume, setMicVolume] = useState<number>(0);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const accumulatedTranscriptRef = useRef<string>('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Sync state with incoming transcript and auto-speak question
  useEffect(() => {
    stopSpeech();
    accumulatedTranscriptRef.current = transcript || '';
    if (transcript && transcript.trim()) {
      setMicState('ANSWER_CAPTURED');
    } else {
      setMicState('READY');
    }

    const timer = setTimeout(() => {
      handleSpeak();
    }, 400);

    return () => {
      clearTimeout(timer);
      stopSpeech();
      stopListening();
      closeAudioContext();
    };
  }, [questionId, language, questionText]);

  const closeAudioContext = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    setMicVolume(0);
  };

  const handleSpeak = () => {
    if (!isSpeechSynthesisSupported()) return;
    setIsSpeaking(true);
    speakQuestion(
      questionText,
      language,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false),
      () => setIsSpeaking(false)
    );
  };

  const stopSpeakingNow = () => {
    stopSpeech();
    setIsSpeaking(false);
  };

  const setupAudioVolumeAnalyzer = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!isListeningRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setMicVolume(Math.min(100, Math.round((avg / 128) * 100)));
        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (e) {
      console.warn('Audio analyzer error:', e);
    }
  };

  const startListening = async () => {
    setInfoMessage(null);
    stopSpeech();
    setIsSpeaking(false);
    audioChunksRef.current = [];
    isListeningRef.current = true;
    setMicState('RECORDING');

    // 1. Start local MediaRecorder with Audio Level Analyzer
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        setupAudioVolumeAnalyzer(stream);

        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        mediaRecorder.start(250);
      } catch (err) {
        console.warn('Microphone access denied:', err);
        setInfoMessage(
          'Microphone permission blocked. Please allow mic permissions in your browser URL bar or type your feedback below.'
        );
        setShowTypeFallback(true);
        setMicState('READY');
        isListeningRef.current = false;
        return;
      }
    }

    // 2. Start Live Web Speech Recognition
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      try {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort();
          } catch {}
        }

        const recognition = new SpeechRecognitionAPI();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = LANGUAGE_RECOGNITION_CODES[language] || 'en-US';

        recognition.onstart = () => {
          setMicState('RECORDING');
        };

        recognition.onresult = (event: any) => {
          let accumulated = '';
          for (let i = 0; i < event.results.length; i++) {
            accumulated += event.results[i][0].transcript + ' ';
          }
          const clean = accumulated.trim();
          if (clean) {
            accumulatedTranscriptRef.current = clean;
            onTranscriptChange(clean, false);
            setMicState('RECORDING');
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech event error:', event.error);
          // Don't kill audio capture on network event
          if (event.error === 'not-allowed') {
            setInfoMessage('Microphone access blocked. Please allow mic permissions.');
            setShowTypeFallback(true);
          }
        };

        recognition.onend = () => {
          // If the user hasn't clicked Stop yet, auto-restart to continue listening
          if (isListeningRef.current) {
            try {
              recognition.start();
            } catch {}
          }
        };

        recognition.start();
      } catch (e) {
        console.warn('Speech recognition init error:', e);
      }
    }
  };

  const stopListening = async () => {
    isListeningRef.current = false;
    closeAudioContext();

    // 1. Stop Speech Recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    // 2. Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }

    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch {}
      mediaStreamRef.current = null;
    }

    // 3. If speech recognition already transcribed words, keep them!
    const currentText = accumulatedTranscriptRef.current || transcript;
    if (currentText && currentText.trim()) {
      onTranscriptChange(currentText.trim(), false);
      setMicState('ANSWER_CAPTURED');
      return;
    }

    // 4. If speech recognition was silent or blocked, attempt backend Whisper audio transcription
    if (audioChunksRef.current.length > 0) {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      if (audioBlob.size > 2000) {
        setIsTranscribingAudio(true);
        try {
          const backendText = await apiService.transcribeAudio(audioBlob, language);
          if (backendText && backendText.trim()) {
            onTranscriptChange(backendText.trim(), false);
            accumulatedTranscriptRef.current = backendText.trim();
            setMicState('ANSWER_CAPTURED');
            return;
          }
        } catch {
        } finally {
          setIsTranscribingAudio(false);
        }
      }
    }

    // If still no speech detected, open typing fallback so patient can easily type
    setShowTypeFallback(true);
    setMicState('READY');
  };

  const toggleListening = () => {
    if (micState === 'RECORDING' || isListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  };

  const applySamplePreset = () => {
    const sample =
      SAMPLE_PRESETS[questionId]?.[language] ||
      SAMPLE_PRESETS[questionId]?.['English'] ||
      'Good hospital experience and helpful staff.';
    accumulatedTranscriptRef.current = sample;
    onTranscriptChange(sample, true);
    setMicState('ANSWER_CAPTURED');
    setInfoMessage(null);
  };

  const isRecording = micState === 'RECORDING' || isListeningRef.current;

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto py-2">
      {/* Audio Question Announcer Bar */}
      <div className="w-full flex items-center justify-between mb-3 px-4 py-2.5 rounded-xl bg-hospital-burgundy/40 border border-hospital-border/40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          {isSpeaking ? (
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-4 bg-hospital-warm animate-pulse rounded-full" />
              <span className="w-1.5 h-6 bg-hospital-accent animate-pulse delay-75 rounded-full" />
              <span className="w-1.5 h-3 bg-hospital-warm animate-pulse delay-150 rounded-full" />
            </div>
          ) : (
            <Volume2 className="w-4 h-4 text-hospital-warm" />
          )}
          <span className="text-xs font-semibold text-hospital-textLight">
            {isSpeaking ? 'Voice Assistant Reading Question...' : 'Voice Assistant (TTS)'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isSpeaking ? (
            <button
              type="button"
              onClick={stopSpeakingNow}
              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-hospital-crimson/40 hover:bg-hospital-crimson text-white transition-colors border border-hospital-accent/30 cursor-pointer"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Mute</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSpeak}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-lg bg-hospital-accent/20 hover:bg-hospital-accent/40 text-hospital-textLight transition-all border border-hospital-accent/30 shadow-glow-sm cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5 text-hospital-warm" />
              <span>🔊 Replay Question</span>
            </button>
          )}
        </div>
      </div>

      {/* Large Microphone Kiosk Interface */}
      <div className="relative flex flex-col items-center justify-center my-3">
        {/* Animated Ripple Rings when recording */}
        {isRecording && (
          <>
            <motion.div
              animate={{ scale: [1, 1.35 + micVolume * 0.005, 1.7 + micVolume * 0.008], opacity: [0.8, 0.4, 0] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: 'easeOut' }}
              className="absolute w-36 h-36 rounded-full bg-hospital-accent/35 border border-hospital-accent/60 -z-0"
            />
            <motion.div
              animate={{ scale: [1, 1.2 + micVolume * 0.003, 1.45 + micVolume * 0.005], opacity: [0.9, 0.5, 0] }}
              transition={{ repeat: Infinity, duration: 1.6, delay: 0.4, ease: 'easeOut' }}
              className="absolute w-36 h-36 rounded-full bg-hospital-crimson/45 border border-hospital-warm/40 -z-0"
            />
          </>
        )}

        {/* Main Microphone Button */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.94 }}
          onClick={toggleListening}
          className={`relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-glass cursor-pointer ${
            isRecording
              ? 'bg-gradient-to-tr from-hospital-crimson via-hospital-accent to-hospital-warm ring-8 ring-hospital-accent/40 shadow-glow-lg border-2 border-white'
              : micState === 'ANSWER_CAPTURED'
              ? 'bg-gradient-to-tr from-hospital-burgundy to-hospital-crimson ring-4 ring-emerald-500/30 border-2 border-emerald-400/80 shadow-glow-sm'
              : 'bg-gradient-to-tr from-hospital-dark via-hospital-burgundy to-hospital-crimson border-2 border-hospital-borderHover shadow-glow-md hover:border-hospital-accent'
          }`}
        >
          {isTranscribingAudio ? (
            <Loader2 className="w-10 h-10 sm:w-11 sm:h-11 text-white animate-spin" />
          ) : isRecording ? (
            <Square className="w-10 h-10 sm:w-11 sm:h-11 text-white fill-white animate-pulse" />
          ) : micState === 'ANSWER_CAPTURED' ? (
            <Check className="w-11 h-11 sm:w-12 sm:h-12 text-emerald-300 stroke-[2.5]" />
          ) : (
            <Mic className="w-11 h-11 sm:w-12 sm:h-12 text-hospital-textLight transition-transform group-hover:scale-110" />
          )}

          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white mt-1 drop-shadow">
            {isTranscribingAudio
              ? 'TRANSCRIBING...'
              : isRecording
              ? 'TAP TO STOP'
              : micState === 'ANSWER_CAPTURED'
              ? 'TAP TO RE-RECORD'
              : 'TAP TO SPEAK'}
          </span>
        </motion.button>
      </div>

      {/* Dynamic Status Pill with Live Volume Signal */}
      <div className="my-2 flex flex-col items-center text-center">
        <div
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all ${
            isTranscribingAudio
              ? 'bg-hospital-warm text-white shadow-glow-warm animate-pulse'
              : isRecording
              ? 'bg-hospital-accent text-white shadow-glow-md'
              : micState === 'ANSWER_CAPTURED'
              ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40'
              : 'bg-hospital-dark border border-hospital-border/40 text-hospital-textMuted'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isRecording || isTranscribingAudio
                ? 'bg-white animate-ping'
                : micState === 'ANSWER_CAPTURED'
                ? 'bg-emerald-400'
                : 'bg-hospital-warm'
            }`}
          />
          <span>
            {isTranscribingAudio
              ? '⚡ Transcribing Audio...'
              : isRecording
              ? `🎙️ Recording... Speak now ${micVolume > 5 ? `(Level: ${micVolume}%)` : ''}`
              : micState === 'ANSWER_CAPTURED'
              ? '✓ Response Captured'
              : 'Microphone Ready — Tap To Speak'}
          </span>
        </div>

        {/* Audio Waveform Animation */}
        <AudioWaveform isRecording={isRecording} />
      </div>

      {/* Info Notification */}
      <AnimatePresence>
        {infoMessage && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full mt-2 p-3 rounded-xl bg-hospital-burgundy/80 border border-hospital-accent/40 flex items-start gap-2.5 text-xs text-hospital-textLight"
          >
            <AlertCircle className="w-4 h-4 text-hospital-warm flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p>{infoMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Actions (1-Click Sample Feedback + Type Fallback Toggle) */}
      <div className="mt-3 w-full flex flex-wrap items-center justify-between gap-2 px-2">
        <button
          type="button"
          onClick={applySamplePreset}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-hospital-card hover:bg-hospital-burgundy text-hospital-warm border border-hospital-border/60 hover:border-hospital-accent transition-all cursor-pointer shadow-sm"
        >
          <Zap className="w-3.5 h-3.5 text-hospital-warm" />
          <span>Quick Sample Voice Response</span>
        </button>

        <button
          type="button"
          onClick={() => setShowTypeFallback((prev) => !prev)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-hospital-textMuted hover:text-hospital-textLight transition-colors cursor-pointer underline underline-offset-4 decoration-hospital-border"
        >
          <Keyboard className="w-3.5 h-3.5 text-hospital-warm" />
          <span>{showTypeFallback ? 'Hide Keyboard Box' : '⌨️ Type Response Instead'}</span>
        </button>
      </div>

      {/* Keyboard Fallback Input Area */}
      <AnimatePresence>
        {showTypeFallback && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full mt-3 overflow-hidden"
          >
            <div className="p-4 rounded-xl bg-hospital-dark/90 border border-hospital-border/50">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-hospital-textLight">
                  Type or edit your response in {language}:
                </label>
                {transcript && (
                  <button
                    type="button"
                    onClick={() => {
                      accumulatedTranscriptRef.current = '';
                      onTranscriptChange('', false);
                    }}
                    className="text-[11px] text-hospital-accent hover:underline cursor-pointer"
                  >
                    Clear text
                  </button>
                )}
              </div>
              <textarea
                value={transcript}
                onChange={(e) => {
                  accumulatedTranscriptRef.current = e.target.value;
                  onTranscriptChange(e.target.value, true);
                }}
                placeholder={`Type here your feedback for this question in ${language}...`}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-lg bg-hospital-burgundy/40 border border-hospital-border/60 text-white placeholder-hospital-textMuted/60 text-sm focus:outline-none focus:ring-2 focus:ring-hospital-accent resize-none"
              />
              <div className="flex justify-between items-center mt-2 text-[11px] text-hospital-textMuted">
                <span>{transcript.length} characters</span>
                <span className="text-emerald-400 font-medium">✓ Real-time sync</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
