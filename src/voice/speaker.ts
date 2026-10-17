import * as Speech from 'expo-speech';

import { speechTimeoutMs } from './speechTimeout';

export type SpeakOutcome = 'done' | 'stopped' | 'error' | 'timeout';

export interface Speaker {
  /** Resolves when speech finishes, is stopped, fails, or takes far longer than it should. */
  speak(text: string, locale: string): Promise<SpeakOutcome>;
  stop(): Promise<void>;
}

export const expoSpeaker: Speaker = {
  speak(text, locale) {
    return new Promise((resolve) => {
      // Some browsers/devices never fire onDone (e.g. no voice installed for the locale);
      // without this the guide would wait forever.
      const timer = setTimeout(() => {
        void Speech.stop();
        resolve('timeout');
      }, speechTimeoutMs(text));
      const finish = (outcome: SpeakOutcome) => () => {
        clearTimeout(timer);
        resolve(outcome);
      };
      Speech.speak(text, {
        language: locale,
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
