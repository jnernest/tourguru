import { contentWords, splitSentences, stripParentheticals } from '../text/sentences';
import { storyBonus } from '../text/storyCues';

/** Roughly 30–40 s of speech. */
export const TARGET_CHARS = 450;
export const MAX_SENTENCES = 4;
/** Later sections (references, see-also, long lists) add noise, not substance. */
const MAX_INPUT_CHARS = 8_000;
/** Filters fragments ("Ibid.", "See below.") from later sentences; the first is always kept. */
const MIN_SENTENCE_CHARS = 10;
const MAX_SENTENCE_CHARS = 350;
/** Sentences shorter than this get proportionally less weight. */
const FULL_WEIGHT_CHARS = 60;

/** Drops headings and list items, which plain-text Wikipedia extracts keep as bare lines. */
function proseOnly(text: string): string {
  return text
    .split('\n')
    .filter((line) => /[.!?।。]["'”’)\]]*\s*$/.test(line.trim()))
    .join(' ');
}

function wordFrequencies(sentences: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const word of sentences.flatMap(contentWords)) {
    freq.set(word, (freq.get(word) ?? 0) + 1);
  }
  return freq;
}

/**
 * Frequency-based extractive score: sentences built from the article's recurring words are
 * the ones about its main subject. Earlier sentences and ones naming the place get a bonus.
 */
function scoreSentence(sentence: string, index: number, freq: Map<string, number>, titleWords: Set<string>): number {
  const words = [...new Set(contentWords(sentence))];
  if (words.length === 0) return 0;
  const centrality = words.reduce((sum, w) => sum + (freq.get(w) ?? 0), 0) / Math.sqrt(words.length);
  const mentionsPlace = words.some((w) => titleWords.has(w)) ? 1.3 : 1;
  const position = 1 / (1 + index * 0.1);
  // Short fragments ("Fishponds were also excavated.") carry little; they win only if nothing else does.
  const substance = Math.min(1, sentence.length / FULL_WEIGHT_CHARS);
  // Legends, records and anecdotes are what visitors remember; dry facts come second.
  return centrality * mentionsPlace * position * substance * storyBonus(sentence);
}

/** Article sentences (index 0 = the defining first sentence) with indices ranked best first. */
function rankSentences(text: string, title: string): { sentences: string[]; ranked: { i: number }[] } {
  const sentences = splitSentences(stripParentheticals(proseOnly(text.slice(0, MAX_INPUT_CHARS))))
    .map((s) => s.trim())
    .filter((s, i) => (i === 0 ? s.length > 0 : s.length >= MIN_SENTENCE_CHARS && s.length <= MAX_SENTENCE_CHARS));
  const freq = wordFrequencies(sentences);
  const titleWords = new Set(contentWords(title));
  const ranked = sentences
    .map((s, i) => ({ i, score: i === 0 ? Number.POSITIVE_INFINITY : scoreSentence(s, i, freq, titleWords) }))
    .sort((a, b) => b.score - a.score);
  return { sentences, ranked };
}

/** Longest highlight worth adding after the key facts (~10 s of speech). */
const MAX_HIGHLIGHT_CHARS = 220;

/**
 * The single most informative sentence beyond the definition, to add colour after the key
 * facts. Empty when the article has nothing substantial enough.
 */
export function highlight(text: string, title: string): string {
  const { sentences, ranked } = rankSentences(text, title);
  const best = ranked.find(
    ({ i }) => i > 0 && sentences[i].length >= FULL_WEIGHT_CHARS && sentences[i].length <= MAX_HIGHLIGHT_CHARS,
  );
  return best ? sentences[best.i] : '';
}

/**
 * Picks the most informative sentences of a Wikipedia article, offline and without a model.
 * The first sentence (which defines the place) is always kept; output stays in reading order.
 */
export function summarize(text: string, title: string): string {
  const { sentences, ranked } = rankSentences(text, title);
  if (sentences.length === 0) {
    return '';
  }

  const chosen: number[] = [];
  let chars = 0;
  for (const { i } of ranked) {
    if (chosen.length >= MAX_SENTENCES) break;
    if (chosen.length > 0 && chars + sentences[i].length > TARGET_CHARS) continue;
    // Three good sentences beat three plus a fragment that merely fits the remaining budget.
    if (chosen.length >= 2 && sentences[i].length < FULL_WEIGHT_CHARS) continue;
    chosen.push(i);
    chars += sentences[i].length + 1;
  }
  return chosen
    .sort((a, b) => a - b)
    .map((i) => sentences[i])
    .join(' ');
}
