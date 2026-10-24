import { createContext, useContext, useState, type ReactNode } from 'react';

import type { LanguageCode } from '../i18n/languages';
import { useQuiz } from '../quiz/useQuiz';
import { useWalkDiary } from '../walk/useWalkDiary';
import { useGuide } from './useGuide';

function useGuideState() {
  const [lang, setLang] = useState<LanguageCode>('en');
  const guide = useGuide(lang);
  const quiz = useQuiz(() => guide.settings.aiEnabled);
  const diary = useWalkDiary(guide.snapshot, guide.walking);
  return { lang, setLang, guide, quiz, diary };
}

export type GuideState = ReturnType<typeof useGuideState>;

const GuideContext = createContext<GuideState | null>(null);

export function GuideProvider({ children }: { children: ReactNode }) {
  return <GuideContext.Provider value={useGuideState()}>{children}</GuideContext.Provider>;
}

export function useGuideContext(): GuideState {
  const state = useContext(GuideContext);
  if (!state) throw new Error('useGuideContext needs a GuideProvider');
  return state;
}
