/**
 * Words that mark the sentences a guide would tell: legends, anecdotes, records, firsts.
 * One list for all supported languages: a sentence is matched whatever language it is in,
 * and false matches across languages are rare and harmless (they only add a bonus).
 */
const CUES: string[] = [
  // English
  'legend', 'according to', 'is said', 'was said', 'believed', 'rumour', 'rumor', 'myth', 'ghost',
  'nicknamed', 'famous', 'tradition', 'story', 'anecdote', 'largest', 'oldest', 'tallest', 'highest',
  'longest', 'smallest', 'first', 'only', 'unique', 'record', 'secret', 'curse',
  // German
  'legende', 'sage', 'soll ', 'sollen ', 'angeblich', 'überlieferung', 'berühmt', 'spitzname',
  'größte', 'älteste', 'höchste', 'längste', 'kleinste', 'erste', 'einzige', 'geheim', 'mythos',
  // French
  // (Romance languages: both genders, e.g. "más antiguo" / "más antigua".)
  'légende', 'selon', 'dit-on', 'célèbre', 'surnommé', 'surnom', 'plus grand', 'plus ancien',
  'plus haut', 'premier', 'première', 'unique', 'mystère',
  // Spanish
  'leyenda', 'según', 'se dice', 'famoso', 'famosa', 'apodo', 'apodado', 'más grande', 'más antiguo',
  'más antigua', 'más alto', 'más alta', 'primer', 'primera', 'único', 'única', 'misterio',
  // Italian
  'leggenda', 'secondo', 'si dice', 'famoso', 'famosa', 'soprannome', 'più grande', 'più antico',
  'più antica', 'più alto', 'più alta', 'primo', 'prima', 'unico', 'unica', 'mistero',
  // Hindi
  'किंवदंती', 'कहा जाता', 'मान्यता', 'प्रसिद्ध', 'सबसे बड़ा', 'सबसे पुराना', 'सबसे ऊँचा', 'पहला', 'एकमात्र',
];

const LETTER = /[\p{L}\p{M}]/u;

/** True if `cue` occurs at the start of a word ("sage" in "die Sage", not in "passage"). */
function startsWord(text: string, cue: string): boolean {
  for (let i = text.indexOf(cue); i !== -1; i = text.indexOf(cue, i + 1)) {
    if (i === 0 || !LETTER.test(text[i - 1])) return true;
  }
  return false;
}

/** Story-likeness of a sentence: 1 for plain facts, up to 2 for legends, records, anecdotes. */
export function storyBonus(sentence: string): number {
  const lower = sentence.toLowerCase();
  const hits = CUES.filter((cue) => startsWord(lower, cue)).length;
  return 1 + Math.min(hits, 2) * 0.5;
}
