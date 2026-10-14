import React, { useState } from 'react';
import { MessageSquareText, Sparkles, Trash2, Edit3, Check } from 'lucide-react';

interface LiveTranscriptProps {
  transcript: string;
  onClear?: () => void;
  onTranscriptChange?: (text: string) => void;
  isRecording?: boolean;
}

export const LiveTranscript: React.FC<LiveTranscriptProps> = ({
  transcript,
  onClear,
  onTranscriptChange,
  isRecording = false,
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);

  return (
    <div className="w-full glass-panel rounded-2xl p-5 border border-hospital-border/40 shadow-glow-sm">
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-hospital-border/30">
        <div className="flex items-center gap-2">
          <MessageSquareText className="w-4 h-4 text-hospital-warm" />
          <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-hospital-textLight">
            Live Voice Transcript
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {onTranscriptChange && transcript && (
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-1 text-[11px] text-hospital-textMuted hover:text-hospital-warm transition-colors cursor-pointer"
              title="Edit transcript text"
            >
              {isEditing ? <Check className="w-3 h-3 text-emerald-400" /> : <Edit3 className="w-3 h-3" />}
              <span>{isEditing ? 'Done' : 'Edit'}</span>
            </button>
          )}

          {transcript && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="flex items-center gap-1 text-[11px] text-hospital-textMuted hover:text-hospital-accent transition-colors cursor-pointer"
              title="Clear transcript"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      <div className="min-h-[110px] max-h-[180px] overflow-y-auto p-3.5 rounded-xl bg-hospital-darker/60 border border-hospital-border/20 relative">
        {isEditing && onTranscriptChange ? (
          <textarea
            value={transcript}
            onChange={(e) => onTranscriptChange(e.target.value)}
            rows={3}
            className="w-full text-xs sm:text-sm bg-transparent border-0 text-hospital-textLight focus:outline-none resize-none"
            placeholder="Edit transcript text here..."
            autoFocus
          />
        ) : transcript.trim() ? (
          <p className="text-xs sm:text-sm text-hospital-textLight leading-relaxed font-normal">
            "{transcript}"
            {isRecording && (
              <span className="inline-block w-1.5 h-3.5 ml-1 bg-hospital-accent animate-pulse align-middle" />
            )}
          </p>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center py-5 text-hospital-textMuted/70">
            <Sparkles className="w-5 h-5 mb-1.5 text-hospital-border/60 animate-pulse" />
            <p className="text-xs font-medium">
              Your voice response will appear here in real time...
            </p>
            <p className="text-[11px] text-hospital-textMuted/50 mt-1">
              Tap the large red microphone to speak
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
