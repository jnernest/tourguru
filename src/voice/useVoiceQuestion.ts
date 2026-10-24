import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useCallback, useState } from 'react';

import { log } from '../diagnostics/log';

const SILENT_ERRORS = new Set(['no-speech', 'aborted', 'speech-timeout']);

export function useVoiceQuestion(locale: string, onQuestion: (question: string) => void) {
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  useSpeechRecognitionEvent('start', () => setListening(true));
  useSpeechRecognitionEvent('end', () => setListening(false));
  useSpeechRecognitionEvent('result', (event) => {
    const question = event.results[0]?.transcript.trim();
    if (event.isFinal && question) onQuestion(question);
  });
  useSpeechRecognitionEvent('error', (event) => {
    setListening(false);
    log('warn', `Speech recognition: ${event.error} ${event.message}`);
    if (!SILENT_ERRORS.has(event.error)) setVoiceError(`I could not listen: ${event.message || event.error}`);
  });

  const listen = useCallback(async () => {
    if (listening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }
    setVoiceError(null);
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      setVoiceError('Speech recognition is not available on this device.');
      return;
    }
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      setVoiceError('Microphone permission was not granted.');
      return;
    }
    ExpoSpeechRecognitionModule.start({ lang: locale, interimResults: false });
  }, [listening, locale]);

  return { listening, voiceError, listen };
}
