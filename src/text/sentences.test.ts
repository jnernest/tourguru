import { describe, expect, it } from 'vitest';

import { splitSentences } from './sentences';

const split = (text: string) => splitSentences(text).map((s) => s.trim());

describe('splitSentences', () => {
  it('splits on full stops, question and exclamation marks', () => {
    expect(split('One here. Two there? Three!')).toEqual(['One here.', 'Two there?', 'Three!']);
  });

  it('does not split German ordinals or regnal numbers', () => {
    expect(split('Die Anlage wurde ab 1695 unter Leopold I. errichtet. Sie stammt aus dem 17. Jahrhundert.')).toEqual([
      'Die Anlage wurde ab 1695 unter Leopold I. errichtet.',
      'Sie stammt aus dem 17. Jahrhundert.',
    ]);
  });

  it('still ends a sentence after a four-digit year', () => {
    expect(split('It was built in 1695. Later it grew.')).toEqual(['It was built in 1695.', 'Later it grew.']);
  });

  it('does not split initials or common abbreviations', () => {
    expect(split('J. S. Bach played at St. Thomas. Dr. Weber spoke, z. B. about art.')).toEqual([
      'J. S. Bach played at St. Thomas.',
      'Dr. Weber spoke, z. B. about art.',
    ]);
  });

  it('keeps an unterminated trailing sentence and Devanagari dandas', () => {
    expect(split('यह मंदिर है। यह पुराना है। Last words')).toEqual(['यह मंदिर है।', 'यह पुराना है।', 'Last words']);
  });
});
