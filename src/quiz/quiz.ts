import type { LanguageCode } from '../i18n/languages';

export interface Quiz {
  question: string;
  options: string[];
  answerIndex: number;
}

const BUILT_QUESTION: Record<LanguageCode, string> = {
  en: 'Quiz: when was {name} built?',
  de: 'Quiz: Wann wurde {name} erbaut?',
  fr: 'Quiz : quand {name} a-t-il été construit ?',
  es: 'Pregunta: ¿cuándo se construyó {name}?',
  it: 'Quiz: quando è stato costruito {name}?',
  hi: 'प्रश्न: {name} कब बना था?',
};

const OFFSETS = [-120, -60, -40, 40, 60, 120];

function seeded(seed: string): () => number {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    return (h % 1000) / 1000;
  };
}

/** Three-option year question; the same place always gets the same quiz. */
export function builtYearQuiz(lang: LanguageCode, name: string, year: number, seed: string): Quiz {
  const random = seeded(seed);
  const wrong = [...OFFSETS].sort(() => random() - 0.5).slice(0, 2).map((d) => year + d);
  const options = [year, ...wrong].sort(() => random() - 0.5);
  return {
    question: BUILT_QUESTION[lang].replace('{name}', name),
    options: options.map(String),
    answerIndex: options.indexOf(year),
  };
}

/** Parses an AI quiz reply; null if it is not exactly one question with 3 options and a valid answer. */
export function parseQuizJson(text: string): Quiz | null {
  try {
    const json = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, '')) as Partial<Quiz>;
    const ok =
      typeof json.question === 'string' &&
      Array.isArray(json.options) &&
      json.options.length === 3 &&
      json.options.every((o) => typeof o === 'string') &&
      Number.isInteger(json.answerIndex) &&
      (json.answerIndex as number) >= 0 &&
      (json.answerIndex as number) < 3;
    return ok ? (json as Quiz) : null;
  } catch {
    return null;
  }
}
