/**
 * Narration languages. The code doubles as the Wikipedia subdomain ({code}.wikipedia.org);
 * places may also come from other (local) Wikipedias, see pois/localLanguage.ts.
 * Phrases use `{title}` as the only placeholder.
 */
export const LANGUAGES = {
  en: {
    label: 'English',
    englishName: 'English',
    ttsLocale: 'en-US',
    noInfo: "I don't have much information about {title}.",
    otherLanguage:
      "Wikipedia only describes {title} in another language, and I can't translate it right now.",
  },
  de: {
    label: 'Deutsch',
    englishName: 'German',
    ttsLocale: 'de-DE',
    noInfo: 'Über {title} weiß ich leider nicht viel.',
    otherLanguage:
      'Wikipedia beschreibt {title} nur in einer anderen Sprache, und ich kann es gerade nicht übersetzen.',
  },
  fr: {
    label: 'Français',
    englishName: 'French',
    ttsLocale: 'fr-FR',
    noInfo: "Je n'ai pas beaucoup d'informations sur {title}.",
    otherLanguage:
      "Wikipédia ne décrit {title} que dans une autre langue, et je ne peux pas le traduire pour l'instant.",
  },
  es: {
    label: 'Español',
    englishName: 'Spanish',
    ttsLocale: 'es-ES',
    noInfo: 'No tengo mucha información sobre {title}.',
    otherLanguage:
      'Wikipedia solo describe {title} en otro idioma, y ahora mismo no puedo traducirlo.',
  },
  it: {
    label: 'Italiano',
    englishName: 'Italian',
    ttsLocale: 'it-IT',
    noInfo: 'Non ho molte informazioni su {title}.',
    otherLanguage:
      "Wikipedia descrive {title} solo in un'altra lingua, e al momento non posso tradurlo.",
  },
  hi: {
    label: 'हिन्दी',
    englishName: 'Hindi',
    ttsLocale: 'hi-IN',
    noInfo: '{title} के बारे में मेरे पास ज़्यादा जानकारी नहीं है।',
    otherLanguage:
      'विकिपीडिया {title} के बारे में केवल दूसरी भाषा में बताता है, और मैं अभी इसका अनुवाद नहीं कर सकता।',
  },
} as const;

export type LanguageCode = keyof typeof LANGUAGES;

export const LANGUAGE_CODES = Object.keys(LANGUAGES) as LanguageCode[];

export function phrase(
  lang: LanguageCode,
  key: 'noInfo' | 'otherLanguage',
  title: string,
): string {
  return LANGUAGES[lang][key].replace('{title}', title);
}
