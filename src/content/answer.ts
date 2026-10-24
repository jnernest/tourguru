import { proseOnly, splitSentences, stripParentheticals } from '../text/sentences';

const K1 = 1.2;
const B = 0.75;
const MAX_ANSWER_SENTENCES = 2;
const QUESTION_WORDS = new Set([
  'what', 'who', 'whom', 'when', 'where', 'why', 'how', 'which', 'the', 'did', 'was', 'were', 'are', 'and', 'does', 'this', 'that', 'there', 'about', 'tell', 'place', 'here',
  'wer', 'was', 'wann', 'wo', 'warum', 'wie', 'welche', 'der', 'die', 'das', 'ist', 'hat', 'hier',
  'quoi', 'qui', 'quand', 'où', 'pourquoi', 'comment', 'les', 'est', 'qué', 'quién', 'cuándo', 'dónde', 'por', 'cómo', 'los', 'las',
  'cosa', 'chi', 'quando', 'dove', 'perché', 'come', 'gli', 'क्या', 'कौन', 'कब', 'कहाँ', 'क्यों', 'कैसे',
]);

// Short words like "war" matter in questions, so this keeps 3+ letters and drops question words.
function terms(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{M}]+/gu) ?? []).filter((w) => w.length >= 3 && !QUESTION_WORDS.has(w));
}

function sentencesOf(article: string): string[] {
  return splitSentences(stripParentheticals(proseOnly(article)))
    .map((s) => s.trim())
    .filter((s) => s.length >= 30);
}

/** BM25 over the article's sentences; the best one or two in reading order, or '' if nothing matches. */
export function answerFromArticle(question: string, article: string): string {
  const sentences = sentencesOf(article);
  const query = [...new Set(terms(question))];
  if (sentences.length === 0 || query.length === 0) return '';
  const docs = sentences.map(terms);
  const avgLen = docs.reduce((sum, d) => sum + d.length, 0) / docs.length;
  const df = new Map(query.map((t) => [t, docs.filter((d) => d.includes(t)).length]));
  const scores = docs.map((doc) =>
    query.reduce((sum, t) => {
      const tf = doc.filter((w) => w === t).length;
      if (tf === 0) return sum;
      const idf = Math.log(1 + (docs.length - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5));
      return sum + (idf * tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * doc.length) / avgLen));
    }, 0),
  );
  return scores
    .map((score, i) => ({ score, i }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_ANSWER_SENTENCES)
    .sort((a, b) => a.i - b.i)
    .map((s) => sentences[s.i])
    .join(' ');
}
