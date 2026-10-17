/** A sentence is text up to a terminator (Latin, Devanagari danda, CJK full stop). */
const SENTENCE_PATTERN = /[^.!?।。]+[.!?।。]+["'”’)\]]*\s*|[^.!?।。]+$/g;

/**
 * A full stop that does not end the sentence: ordinals ("17. Jahrhundert", "3. Mai"; years
 * like "1695." still end one), regnal numbers ("Leopold I."), initials ("J. S. Bach") and
 * common abbreviations.
 */
const NON_TERMINAL_ENDING =
  /(?:\b\d{1,2}|\b[IVX]{1,4}|\b\p{Lu}|\b(?:St|Dr|Mr|Mrs|Ms|Prof|Nr|Jh|bzw|ca|vgl|usw|evtl|inkl|ggf|z|u|d|v|Chr|Sr|Jr|vs|approx|no|cf))\.\s*$/u;

/** Splits text into sentences, keeping each sentence's trailing whitespace. */
export function splitSentences(text: string): string[] {
  const pieces = text.match(SENTENCE_PATTERN) ?? [];
  const sentences: string[] = [];
  let pending = '';
  for (const piece of pieces) {
    pending += piece;
    if (!NON_TERMINAL_ENDING.test(pending)) {
      sentences.push(pending);
      pending = '';
    }
  }
  if (pending) sentences.push(pending);
  return sentences;
}

/** Parentheticals are usually pronunciations or life dates, which TTS reads badly. */
export function stripParentheticals(text: string): string {
  return text.replace(/\s*\([^()]*\)/g, '').replace(/[ \t]{2,}/g, ' ');
}

/** Lower-cased words of 4+ letters: a crude, language-independent stand-in for stop-word removal. */
export function contentWords(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{M}]+/gu) ?? []).filter((w) => w.length >= 4);
}
