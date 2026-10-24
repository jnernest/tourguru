import { useCallback, useState } from 'react';

import { log } from '../diagnostics/log';
import { aiProvider, describePlace, loadArticle } from '../guide/services';
import type { LanguageCode } from '../i18n/languages';
import type { Poi } from '../pois/types';
import { readJson, writeJson } from '../storage/kv';
import type { Quiz } from './quiz';
import { createQuizMaker, scoreAnswer, type QuizScore } from './quizMaker';

const SCORE_KEY = 'tourguide.quizScore';

export interface QuizState {
  poiId: string;
  quiz: Quiz;
  chosen: number | null;
}

export function useQuiz(aiEnabled: () => boolean) {
  const [state, setState] = useState<QuizState | null>(null);
  const [score, setScore] = useState<QuizScore>(() => readJson(SCORE_KEY, { answered: 0, correct: 0 }));
  const [message, setMessage] = useState<string | null>(null);

  const makeQuiz = useCallback(
    async (poi: Poi, lang: LanguageCode) => {
      setMessage('Thinking of a question…');
      const make = createQuizMaker({ complete: aiProvider?.complete ?? null, aiEnabled, loadText: loadArticle, describe: describePlace });
      const quiz = await make(poi, lang);
      setMessage(quiz ? null : 'No quiz question for this place, sorry.');
      setState(quiz ? { poiId: poi.id, quiz, chosen: null } : null);
      log('info', `Quiz for "${poi.title}": ${quiz ? quiz.question : 'none'}`);
    },
    [aiEnabled],
  );

  const answer = useCallback(
    (index: number) => {
      if (!state || state.chosen !== null) return;
      setState({ ...state, chosen: index });
      const next = scoreAnswer(score, index === state.quiz.answerIndex);
      setScore(next);
      writeJson(SCORE_KEY, next);
    },
    [state, score],
  );

  const close = useCallback(() => setState(null), []);

  return { quiz: state, score, quizMessage: message, makeQuiz, answer, closeQuiz: close };
}
