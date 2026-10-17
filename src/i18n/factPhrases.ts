import type { LanguageCode } from './languages';

/** Spoken templates for structured facts; `{x}` is the value. */
export interface FactPhrases {
  built: string;
  opened: string;
  designedBy: string;
  foundedBy: string;
  style: string;
  heritage: string;
  height: string;
  namedAfter: string;
  /** Joins two names: "A and B". */
  and: string;
}

export type FactKind = Exclude<keyof FactPhrases, 'and'>;

export const FACT_PHRASES: Record<LanguageCode, FactPhrases> = {
  en: {
    built: 'Built in {x}.',
    opened: 'Opened in {x}.',
    designedBy: 'Designed by {x}.',
    foundedBy: 'Founded by {x}.',
    style: 'Its style is {x}.',
    heritage: 'Heritage status: {x}.',
    height: 'It is {x} metres tall.',
    namedAfter: 'Named after {x}.',
    and: ' and ',
  },
  de: {
    built: 'Erbaut {x}.',
    opened: 'Eröffnet {x}.',
    designedBy: 'Entworfen von {x}.',
    foundedBy: 'Gegründet von {x}.',
    style: 'Stil: {x}.',
    heritage: 'Denkmalstatus: {x}.',
    height: 'Es ist {x} Meter hoch.',
    namedAfter: 'Benannt nach {x}.',
    and: ' und ',
  },
  fr: {
    built: 'Construit en {x}.',
    opened: 'Ouvert en {x}.',
    designedBy: 'Conçu par {x}.',
    foundedBy: 'Fondé par {x}.',
    style: 'Style : {x}.',
    heritage: 'Statut patrimonial : {x}.',
    height: 'Il mesure {x} mètres de haut.',
    namedAfter: 'Nommé d’après {x}.',
    and: ' et ',
  },
  es: {
    built: 'Construido en {x}.',
    opened: 'Inaugurado en {x}.',
    designedBy: 'Diseñado por {x}.',
    foundedBy: 'Fundado por {x}.',
    style: 'Estilo: {x}.',
    heritage: 'Patrimonio: {x}.',
    height: 'Mide {x} metros de altura.',
    namedAfter: 'Lleva el nombre de {x}.',
    and: ' y ',
  },
  it: {
    built: 'Costruito nel {x}.',
    opened: 'Aperto nel {x}.',
    designedBy: 'Progettato da {x}.',
    foundedBy: 'Fondato da {x}.',
    style: 'Stile: {x}.',
    heritage: 'Tutela: {x}.',
    height: 'È alto {x} metri.',
    namedAfter: 'Prende il nome da {x}.',
    and: ' e ',
  },
  hi: {
    built: '{x} में बना।',
    opened: '{x} में खुला।',
    designedBy: '{x} द्वारा डिज़ाइन किया गया।',
    foundedBy: '{x} द्वारा स्थापित।',
    style: 'शैली: {x}।',
    heritage: 'धरोहर स्थिति: {x}।',
    height: 'यह {x} मीटर ऊँचा है।',
    namedAfter: '{x} के नाम पर रखा गया।',
    and: ' और ',
  },
};

export function factPhrase(lang: LanguageCode, kind: FactKind, values: string[]): string {
  const phrases = FACT_PHRASES[lang];
  return phrases[kind].replace('{x}', values.join(phrases.and));
}
