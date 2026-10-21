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
  Check,
} from 'lucide-react';
import type { MicState, SupportedLanguage } from '../types/feedback';
import { AudioWaveform } from './AudioWaveform';
import {
  speakQuestion,
  stopSpeech,
  isSpeechSynthesisSupported,
} from '../services/ttsService';
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
    English:
      'The hospital facilities were very clean and well maintained, but the second floor washroom needs more frequent sanitization.',
    Hindi:
      'अस्पताल के वार्ड और सुविधाएं बहुत साफ-सुथरी थीं, लेकिन वॉशरूम की नियमित सफाई की जरूरत है।',
    Marathi:
      'रुग्णालयातील स्वच्छता आणि सुविधा खूप चांगल्या होत्या, परंतु स्वच्छतागृहांची अधिक नियमित स्वच्छता हवी.',
    Telugu:
      'ఆసుపత్రి చాలా శుభ్రంగా ఉంది, కానీ వాష్‌రూమ్‌లను మరింత క్రమం తప్పకుండా శుభ్రం చేయాలి.',
    Tamil:
      'மருத்துவமனை வசதிகள் மிகவும் சுத்தமாக இருந்தன, ஆனால் கழிப்பறைகளை அடிக்கடி சுத்தம் செய்ய வேண்டும்.',
    Kannada:
      'ಆಸ್ಪತ್ರೆಯ ಸೌಲಭ್ಯಗಳು ತುಂಬಾ ಸ್ವಚ್ಛವಾಗಿದ್ದವು, ಆದರೆ ಶೌಚಾಲಯಗಳನ್ನು ನಿಯಮಿತವಾಗಿ ಸ್ವಚ್ಛಗೊಳಿಸಬೇಕು.',
    Bengali:
      'হাসপাতালের পরিবেশ খুব পরিষ্কার ছিল, তবে বাথরুমগুলি আরও নিয়মিত পরিষ্কার করা দরকার।',
    Other: 'The hospital was clean and modern with good facilities.',
  },
  2: {
    English:
      'The nursing staff was polite and helpful, though afternoon medicine was slightly delayed.',
    Hindi:
      'नर्सिंग स्टाफ का व्यवहार बहुत विनम्र था, हालांकि दोपहर की दवाई में थोड़ी देरी हुई।',
    Marathi:
      'कर्मचाऱ्यांचे वर्तन अतिशय नम्र होते, औषधे वेळेवर देण्यात आली.',
    Telugu: 'సిబ్బంది ప్రవర్తన బాగుంది, మందులు సకాలంలో అందించారు.',
    Tamil:
      'பணியாளர்கள் மிகவும் அன்பாக இருந்தனர், மருந்துகள் சரியான நேரத்தில் வழங்கப்பட்டன.',
    Kannada:
      'ಸಿಬ್ಬంది ತುಂಬಾ ಸಹಕಾರಿಯಾಗಿದ್ದರು, ಔಷಧಿಗಳನ್ನು ಸರಿಯಾದ ಸಮಯಕ್ಕೆ ನೀಡಲಾಯಿತು.',
    Bengali:
      'কর্মীদের আচরণ খুব ভালো ছিল, ওষুধ সময়মতো দেওয়া হয়েছিল।',
    Other: 'The staff was attentive and kind throughout.',
  },
  3: {
    English:
      'Doctor treatment was exceptional, thorough, and all procedures were clearly explained.',
    Hindi:
      'डॉक्टर का इलाज बहुत बढ़िया था, उन्होंने सभी जांच और दवाइयों के बारे में अच्छी तरह समझाया।',
    Marathi:
      'डॉक्टरांचे उपचार उत्कृष्ट होते आणि त्यांनी सर्व माहिती सविस्तरपणे समजावून सांगितली.',
    Telugu:
      'వైద్యుల చికిత్స అద్భుతంగా ఉంది మరియు వివరంగా వివరించారు.',
    Tamil:
      'மருத்துவர் சிகிச்சை சிறப்பாக இருந்தது மற்றும் விவரங்களை தெளிவாக விளக்கினார்.',
    Kannada:
      'ವೈದ್ಯರ ಚಿಕಿತ್ಸೆ ಅತ್ಯುತ್ತಮವಾಗಿತ್ತು ಮತ್ತು ವಿವರಗಳನ್ನು ಸ್ಪಷ್ಟವಾಗಿ ವಿವರಿಸಿದರು.',
    Bengali:
      'ডাক্তারের চিকিৎসা খুব ভালো ছিল এবং সবকিছু সুন্দরভাবে বুঝিয়ে দিয়েছেন।',
    Other: 'The doctors provided outstanding medical care and guidance.',
  },
  4: {
    English:
      'I really appreciated Sister Priya in ward 4. Suggest adding a digital token display in the pharmacy.',
    Hindi:
      'वार्ड 4 में सिस्टर प्रिया का काम बहुत सराहनीय था। फार्मेसी में डिजिटल टोकन सिस्टम होना चाहिए।',
    Marathi:
      'वॉर्ड ४ मधील सिस्टर प्रिया यांचे काम खूप कौतुकास्पद होते. फार्मसीमध्ये डिजिटल टोकन असावे.',
    Telugu:
      'వార్డు 4లోని నర్సింగ్ సిబ్బంది సేవలు బాగున్నాయి. ఫార్మసీలో డిజిటల్ టోకెన్లు ఏర్పాటు చేయండి.',
    Tamil:
      'வார்டு 4ல் உள்ள செவிலியரின் சேவை பாராட்டுக்குரியது. பார்மசியில் டோக்கன் முறை தேவை.',
    Kannada:
      'ವಾರ್ಡ್ 4 ರ ನರ್ಸಿಂಗ್ ಸಿಬ್ಬಂದಿ ಸೇವೆ ಶ್ಲಾಘನೀಯ. ಫಾರ್ಮಸಿಯಲ್ಲಿ ಡಿಜಿಟಲ್ ಟೋಕನ್ ಸಿಸ್ಟಮ್ ಇರಬೇಕು.',
    Bengali:
      'ওয়ার্ড ৪-এর নার্সিং কর্মীদের কাজ খুব প্রশংসনীয় ছিল। ডিজিটাল টোকেন ব্যবস্থা চালু করা হোক।',
    Other:
      'Appreciated the nursing team. Suggest adding more seating in the waiting lobby.',
  },
};

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  questionText,
  language,
  transcript,
  onTranscriptChange,
  questionId,
}) => {
  const [micState, setMicState] = useState<MicState>(() =>
    transcript ? 'ANSWER_CAPTURED' : 'READY'
  );
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isTranscribingAudio, setIsTranscribingAudio] =
    useState<boolean>(false);
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
  const stopInProgressRef = useRef<boolean>(false);

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
      void stopListening();
      closeAudioContext();
    };
  }, [questionId, language, questionText]);

  const closeAudioContext = () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        void audioContextRef.current.close();
      } catch {
        // Audio context may already be closed.
      }
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
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;

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
    } catch (error) {
      console.warn('Audio analyzer error:', error);
    }
  };

  const startListening = async () => {
    if (isListeningRef.current || isTranscribingAudio) return;

    setInfoMessage(null);
    setShowTypeFallback(false);

    stopSpeech();
    setIsSpeaking(false);

    accumulatedTranscriptRef.current = '';
    audioChunksRef.current = [];
    stopInProgressRef.current = false;

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (
      !navigator.mediaDevices?.getUserMedia ||
      !window.MediaRecorder
    ) {
      setInfoMessage(
        'Audio recording is not supported by this browser. Please type your feedback instead.'
      );
      setShowTypeFallback(true);
      setMicState('READY');
      return;
    }

    let stream: MediaStream;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
    } catch (error) {
      console.error('Microphone access failed:', error);

      setInfoMessage(
        'Could not access the microphone. Check browser permissions and try again, or type your feedback below.'
      );

      setShowTypeFallback(true);
      setMicState('READY');
      isListeningRef.current = false;
      return;
    }

    mediaStreamRef.current = stream;
    setupAudioVolumeAnalyzer(stream);

    try {
      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ];

      const mimeType = preferredTypes.find((type) =>
        MediaRecorder.isTypeSupported?.(type)
      );

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);

        setInfoMessage(
          'The browser encountered an audio recording error. Please try again.'
        );
      };

      recorder.start(250);

      isListeningRef.current = true;
      setMicState('RECORDING');
    } catch (error) {
      console.error('Could not start MediaRecorder:', error);

      stream.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;

      isListeningRef.current = false;

      setInfoMessage(
        'Could not start audio recording. Please try again or type your feedback.'
      );

      setShowTypeFallback(true);
      setMicState('READY');
      return;
    }

    // Browser recognition is optional. We also save audio for backend
    // transcription so recording and transcription can be checked separately.
    if (SpeechRecognitionAPI) {
      try {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.onend = null;
            recognitionRef.current.abort();
          } catch {
            // Ignore an already-stopped recognition instance.
          }
        }

        const recognition = new SpeechRecognitionAPI();

        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang =
          LANGUAGE_RECOGNITION_CODES[language] || 'en-US';

        recognition.onstart = () => {
          if (isListeningRef.current) {
            setMicState('RECORDING');
          }
        };

        recognition.onresult = (event: any) => {
          let finalText = '';
          let interimText = '';

          for (let i = 0; i < event.results.length; i++) {
            const result = event.results[i];
            const text = result?.[0]?.transcript?.trim();

            if (!text) continue;

            if (result.isFinal) {
              finalText += `${text} `;
            } else {
              interimText += `${text} `;
            }
          }

          const combined = `${finalText}${interimText}`.trim();

          if (combined) {
            accumulatedTranscriptRef.current = combined;
            onTranscriptChange(combined, false);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn(
            'Browser speech recognition error:',
            event?.error
          );

          if (event?.error === 'not-allowed') {
            setInfoMessage(
              'Browser speech recognition permission was blocked. Saved audio may still be transcribed after you stop.'
            );
          } else if (event?.error === 'network') {
            setInfoMessage(
              'Browser speech recognition has a network issue. The app will still try to transcribe the saved audio when you stop.'
            );
          }
        };

        recognition.onend = () => {
          if (
            isListeningRef.current &&
            recognitionRef.current === recognition
          ) {
            try {
              recognition.start();
            } catch {
              // The browser may already be restarting recognition.
            }
          }
        };

        recognition.start();
      } catch (error) {
        console.warn(
          'Browser speech recognition could not start:',
          error
        );
      }
    } else {
      setInfoMessage(
        'Live browser transcription is not supported here. The saved audio will be transcribed after you stop.'
      );
    }
  };

  const finalizeRecording = (
    recorder: MediaRecorder,
    stream: MediaStream | null
  ): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const chunks = audioChunksRef.current;

      const cleanupStream = () => {
        stream?.getTracks().forEach((track) => track.stop());

        if (mediaStreamRef.current === stream) {
          mediaStreamRef.current = null;
        }
      };

      if (recorder.state === 'inactive') {
        const mimeType =
          recorder.mimeType ||
          chunks.find((chunk) => chunk.type)?.type ||
          'audio/webm';

        const blob = new Blob(chunks, { type: mimeType });

        cleanupStream();

        if (blob.size > 0) {
          resolve(blob);
        } else {
          reject(
            new Error(
              'The recording is empty. No audio data was captured.'
            )
          );
        }

        return;
      }

      recorder.addEventListener(
        'stop',
        () => {
          const mimeType =
            recorder.mimeType ||
            chunks.find((chunk) => chunk.type)?.type ||
            'audio/webm';

          const blob = new Blob(chunks, { type: mimeType });

          cleanupStream();

          if (blob.size === 0) {
            reject(
              new Error(
                'The recording is empty. No audio data was captured.'
              )
            );
            return;
          }

          console.info('[VoiceRecorder] Audio finalized:', {
            sizeBytes: blob.size,
            mimeType: blob.type,
            chunks: chunks.length,
          });

          resolve(blob);
        },
        { once: true }
      );

      recorder.addEventListener(
        'error',
        () => {
          cleanupStream();
          reject(
            new Error('The browser failed while recording audio.')
          );
        },
        { once: true }
      );

      try {
        recorder.stop();
      } catch (error) {
        cleanupStream();

        reject(
          error instanceof Error
            ? error
            : new Error('Could not stop audio recording.')
        );
      }
    });

  const stopListening = async () => {
    if (stopInProgressRef.current) return;

    stopInProgressRef.current = true;
    isListeningRef.current = false;

    closeAudioContext();

    const recognition = recognitionRef.current;
    recognitionRef.current = null;

    if (recognition) {
      try {
        recognition.onend = null;
        recognition.stop();
      } catch {
        try {
          recognition.abort();
        } catch {
          // Ignore an already-stopped recognition instance.
        }
      }
    }

    const recorder = mediaRecorderRef.current;
    const stream = mediaStreamRef.current;

    mediaRecorderRef.current = null;

    let audioBlob: Blob | null = null;

    if (recorder) {
      try {
        audioBlob = await finalizeRecording(recorder, stream);
      } catch (error) {
        console.error(
          '[VoiceRecorder] Audio finalization failed:',
          error
        );

        setInfoMessage(
          error instanceof Error
            ? error.message
            : 'Could not finalize the audio recording.'
        );
      }
    } else if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    const browserText =
      accumulatedTranscriptRef.current.trim();

    // Prefer backend transcription when an audio recording exists.
    if (audioBlob && audioBlob.size > 0) {
      console.info(
        '[VoiceRecorder] Sending audio for transcription:',
        {
          sizeBytes: audioBlob.size,
          mimeType: audioBlob.type,
          language,
        }
      );

      setIsTranscribingAudio(true);
      setInfoMessage('Audio recorded. Transcribing your response…');

      try {
        const backendText =
          await apiService.transcribeAudio(audioBlob, language);

        if (
          typeof backendText === 'string' &&
          backendText.trim()
        ) {
          const cleanText = backendText.trim();

          accumulatedTranscriptRef.current = cleanText;
          onTranscriptChange(cleanText, false);

          setInfoMessage('Transcription completed successfully.');
          setMicState('ANSWER_CAPTURED');
          setShowTypeFallback(false);

          return;
        }

        throw new Error(
          'The transcription service returned an empty transcript.'
        );
      } catch (error) {
        console.error(
          '[VoiceRecorder] Backend transcription failed:',
          error
        );

        if (browserText) {
          accumulatedTranscriptRef.current = browserText;
          onTranscriptChange(browserText, false);

          setInfoMessage(
            'Backend transcription failed; showing the browser transcript instead. Please verify the text before submitting.'
          );

          setMicState('ANSWER_CAPTURED');
          return;
        }

        setInfoMessage(
          error instanceof Error
            ? `Transcription failed: ${error.message}. You can retry or type your response.`
            : 'Transcription failed. You can retry or type your response.'
        );

        setShowTypeFallback(true);
        setMicState('READY');

        return;
      } finally {
        setIsTranscribingAudio(false);
        stopInProgressRef.current = false;
      }
    }

    // If there is no usable audio, retain browser text if available.
    if (browserText) {
      onTranscriptChange(browserText, false);
      setMicState('ANSWER_CAPTURED');

      setInfoMessage(
        'No audio file was available; using the browser transcript. Please verify it.'
      );
    } else {
      setInfoMessage(
        'No audio was captured and no transcript was detected. Please try again or type your response.'
      );

      setShowTypeFallback(true);
      setMicState('READY');
    }

    stopInProgressRef.current = false;
  };

  const toggleListening = () => {
    if (isTranscribingAudio || stopInProgressRef.current) {
      return;
    }

    if (
      micState === 'RECORDING' ||
      isListeningRef.current
    ) {
      void stopListening();
    } else {
      void startListening();
    }
  };

  const applySamplePreset = () => {
    const sample =
      SAMPLE_PRESETS[questionId]?.[language] ||
      SAMPLE_PRESETS[questionId]?.English ||
      'Good hospital experience and helpful staff.';

    accumulatedTranscriptRef.current = sample;

    onTranscriptChange(sample, true);

    setMicState('ANSWER_CAPTURED');
    setInfoMessage(null);
  };

  const isRecording =
    micState === 'RECORDING' || isListeningRef.current;

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
            {isSpeaking
              ? 'Voice Assistant Reading Question...'
              : 'Voice Assistant (TTS)'}
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
        {isRecording && (
          <>
            <motion.div
              animate={{
                scale: [
                  1,
                  1.35 + micVolume * 0.005,
                  1.7 + micVolume * 0.008,
                ],
                opacity: [0.8, 0.4, 0],
              }}
              transition={{
                repeat: Infinity,
                duration: 1.6,
                ease: 'easeOut',
              }}
              className="absolute w-36 h-36 rounded-full bg-hospital-accent/35 border border-hospital-accent/60 -z-0"
            />

            <motion.div
              animate={{
                scale: [
                  1,
                  1.2 + micVolume * 0.003,
                  1.45 + micVolume * 0.005,
                ],
                opacity: [0.9, 0.5, 0],
              }}
              transition={{
                repeat: Infinity,
                duration: 1.6,
                delay: 0.4,
                ease: 'easeOut',
              }}
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
          disabled={isTranscribingAudio}
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
                ? `🎙️ Recording... Speak now ${
                    micVolume > 5 ? `(Level: ${micVolume}%)` : ''
                  }`
                : micState === 'ANSWER_CAPTURED'
                  ? '✓ Response Captured'
                  : 'Microphone Ready — Tap To Speak'}
          </span>
        </div>

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

      {/* Quick Actions */}
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
          <span>
            {showTypeFallback
              ? 'Hide Keyboard Box'
              : '⌨️ Type Response Instead'}
          </span>
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
                onChange={(event) => {
                  accumulatedTranscriptRef.current = event.target.value;
                  onTranscriptChange(event.target.value, true);
                }}
                placeholder={`Type here your feedback for this question in ${language}...`}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-lg bg-hospital-burgundy/40 border border-hospital-border/60 text-white placeholder-hospital-textMuted/60 text-sm focus:outline-none focus:ring-2 focus:ring-hospital-accent resize-none"
              />

              <div className="flex justify-between items-center mt-2 text-[11px] text-hospital-textMuted">
                <span>{transcript.length} characters</span>
                <span className="text-emerald-400 font-medium">
                  ✓ Real-time sync
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};