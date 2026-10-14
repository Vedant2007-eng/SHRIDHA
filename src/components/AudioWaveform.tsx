import React from 'react';
import { motion } from 'framer-motion';

interface AudioWaveformProps {
  isRecording: boolean;
  barCount?: number;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  isRecording,
  barCount = 18,
}) => {
  return (
    <div className="flex items-center justify-center gap-1.5 h-12 px-4 py-2">
      {Array.from({ length: barCount }).map((_, index) => {
        const heightPattern = [12, 24, 38, 28, 44, 32, 20, 36, 48, 30, 22, 40, 34, 18, 28, 42, 26, 14];
        const baseHeight = heightPattern[index % heightPattern.length];

        return (
          <motion.span
            key={index}
            className="w-1.5 rounded-full bg-gradient-to-t from-hospital-crimson via-hospital-accent to-hospital-warm"
            animate={
              isRecording
                ? {
                    height: [
                      `${Math.max(6, baseHeight * 0.3)}px`,
                      `${Math.min(48, baseHeight * 1.2)}px`,
                      `${Math.max(8, baseHeight * 0.4)}px`,
                    ],
                    opacity: [0.6, 1, 0.7],
                  }
                : {
                    height: '6px',
                    opacity: 0.3,
                  }
            }
            transition={
              isRecording
                ? {
                    repeat: Infinity,
                    duration: 0.8 + (index % 5) * 0.15,
                    ease: 'easeInOut',
                    delay: (index * 0.05) % 0.4,
                  }
                : { duration: 0.3 }
            }
          />
        );
      })}
    </div>
  );
};
