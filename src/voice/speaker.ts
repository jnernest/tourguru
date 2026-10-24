import * as Speech from 'expo-speech';

import { speechTimeoutMs } from './speechTimeout';

export type SpeakOutcome = 'done' | 'stopped' | 'error' | 'timeout';

export interface VoiceOptions {
  rate?: number;
  voiceId?: string | null;
}

export interface Speaker {
  speak(text: string, locale: string, voice?: VoiceOptions): Promise<SpeakOutcome>;
  stop(): Promise<void>;
}

export const expoSpeaker: Speaker = {
  speak(text, locale, voice = {}) {
    const rate = voice.rate ?? 1;
    return new Promise((resolve) => {
      // Some devices never fire onDone (e.g. no voice for the locale); never wait forever.
      const timer = setTimeout(() => {
        void Speech.stop();
        resolve('timeout');
      }, speechTimeoutMs(text) / Math.min(rate, 1));
      const finish = (outcome: SpeakOutcome) => () => {
        clearTimeout(timer);
        resolve(outcome);
      };
      Speech.speak(text, {
        language: locale,
        rate,
        ...(voice.voiceId ? { voice: voice.voiceId } : {}),
        onDone: finish('done'),
        onStopped: finish('stopped'),
        onError: finish('error'),
      });
    });
  },
  stop() {
    return Speech.stop();
  },
};
