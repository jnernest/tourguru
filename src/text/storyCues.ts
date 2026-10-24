const STORY_CUES: string[] = [
  'legend', 'according to', 'is said', 'was said', 'are said', 'reputedly', 'rumour', 'rumor', 'myth', 'ghost',
  'nicknamed', 'anecdote', 'curse', 'devil', 'secret',
  'legende', 'sage', 'soll ', 'sollen ', 'angeblich', 'überlieferung', 'spitzname', 'teufel', 'mythos', 'geheim',
  'légende', 'dit-on', 'surnommé', 'surnom', 'diable', 'mystère',
  'leyenda', 'se dice', 'apodo', 'apodado', 'diablo', 'misterio',
  'leggenda', 'si dice', 'soprannome', 'diavolo', 'mistero',
  'किंवदंती', 'कहा जाता', 'मान्यता',
];

const RECORD_CUES: string[] = [
  'largest', 'oldest', 'tallest', 'highest', 'longest', 'smallest', 'biggest', 'world record',
  'größte', 'älteste', 'höchste', 'längste', 'kleinste',
  'plus grand', 'plus grande', 'plus ancien', 'plus ancienne', 'plus haut', 'plus haute',
  'más grande', 'más antiguo', 'más antigua', 'más alto', 'más alta',
  'più grande', 'più antico', 'più antica', 'più alto', 'più alta',
  'सबसे बड़ा', 'सबसे पुराना', 'सबसे ऊँचा',
];

const WEAK_CUES: string[] = [
  'famous', 'first', 'only', 'unique', 'record', 'tradition',
  'berühmt', 'erste', 'einzige', 'célèbre', 'premier', 'première', 'unique',
  'famoso', 'famosa', 'primer', 'primera', 'único', 'única', 'primo', 'prima', 'unico', 'unica',
  'प्रसिद्ध', 'पहला', 'एकमात्र',
];

const LETTER = /[\p{L}\p{M}]/u;

function startsWord(text: string, cue: string): boolean {
  for (let i = text.indexOf(cue); i !== -1; i = text.indexOf(cue, i + 1)) {
    if (i === 0 || !LETTER.test(text[i - 1])) return true;
  }
  return false;
}

const hits = (lower: string, cues: string[]) => cues.filter((cue) => startsWord(lower, cue)).length;

export function storyBonus(sentence: string): number {
  const lower = sentence.toLowerCase();
  const strong = hits(lower, STORY_CUES) + hits(lower, RECORD_CUES);
  const weak = hits(lower, WEAK_CUES);
  return 1 + Math.min(strong * 0.5 + weak * 0.25, 1);
}

export function isFunFact(sentence: string): boolean {
  const lower = sentence.toLowerCase();
  return hits(lower, STORY_CUES) + hits(lower, RECORD_CUES) > 0;
}

const DANGLING_START = /^(?:it|its|they|their|this|these|those|he|she|his|her|another|also|however|but|furthermore|es|sie|er|ihr|ihre|dies|diese|auch|jedoch|aber|il|elle|ils|elles|ce|cette|ces|aussi|cependant|él|ella|ellos|esta|este|estos|esto|también|lui|lei|loro|questo|questa|questi|anche)\b/i;

export function standsAlone(sentence: string): boolean {
  return !DANGLING_START.test(sentence.trim());
}
