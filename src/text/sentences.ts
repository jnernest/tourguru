const SENTENCE_PATTERN = /[^.!?।。]+[.!?।。]+["'”’)\]]*\s*|[^.!?।。]+$/g;

const NON_TERMINAL_ENDING =
  /(?:\b\d{1,2}|\b[IVX]{1,4}|\b\p{Lu}|(?:^|[^\p{L}])\p{Ll}|\b(?:St|Dr|Mr|Mrs|Ms|Prof|Nr|Jh|bzw|ca|vgl|usw|evtl|inkl|ggf|Chr|Sr|Jr|vs|approx|no|cf))\.\s*$/u;

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

export function proseOnly(text: string): string {
  return text
    .split('\n')
    .filter((line) => /[.!?।。]["'”’)\]]*\s*$/.test(line.trim()))
    .join(' ');
}

// Parentheticals are usually pronunciations or life dates, which TTS reads badly.
export function stripParentheticals(text: string): string {
  return text.replace(/\s*\([^()]*\)/g, '').replace(/[ \t]{2,}/g, ' ');
}

export function contentWords(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{M}]+/gu) ?? []).filter((w) => w.length >= 4);
}
