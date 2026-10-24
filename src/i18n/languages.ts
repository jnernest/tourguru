export const LANGUAGES = {
  en: {
    label: 'English',
    englishName: 'English',
    storyIntro: 'Here is the story of {title}.',
    funFact: 'Fun fact: {title}',
    noHistory: 'I do not know much more about the history of {title}.',
    noAnswer: "I don't know the answer to that about {title}.",
    ttsLocale: 'en-US',
    noInfo: "I don't have much information about {title}.",
    otherLanguage:
      "Wikipedia only describes {title} in another language, and I can't translate it right now.",
  },
  de: {
    label: 'Deutsch',
    englishName: 'German',
    storyIntro: 'Hier ist die Geschichte von {title}.',
    funFact: 'Übrigens: {title}',
    noHistory: 'Über die Geschichte von {title} weiß ich leider nicht mehr.',
    noAnswer: 'Darauf weiß ich bei {title} leider keine Antwort.',
    ttsLocale: 'de-DE',
    noInfo: 'Über {title} weiß ich leider nicht viel.',
    otherLanguage:
      'Wikipedia beschreibt {title} nur in einer anderen Sprache, und ich kann es gerade nicht übersetzen.',
  },
  fr: {
    label: 'Français',
    englishName: 'French',
    storyIntro: 'Voici l’histoire de {title}.',
    funFact: 'Le saviez-vous ? {title}',
    noHistory: 'Je n’en sais pas plus sur l’histoire de {title}.',
    noAnswer: 'Je ne connais pas la réponse à cette question sur {title}.',
    ttsLocale: 'fr-FR',
    noInfo: "Je n'ai pas beaucoup d'informations sur {title}.",
    otherLanguage:
      "Wikipédia ne décrit {title} que dans une autre langue, et je ne peux pas le traduire pour l'instant.",
  },
  es: {
    label: 'Español',
    englishName: 'Spanish',
    storyIntro: 'Esta es la historia de {title}.',
    funFact: 'Curiosidad: {title}',
    noHistory: 'No sé mucho más sobre la historia de {title}.',
    noAnswer: 'No sé la respuesta a eso sobre {title}.',
    ttsLocale: 'es-ES',
    noInfo: 'No tengo mucha información sobre {title}.',
    otherLanguage:
      'Wikipedia solo describe {title} en otro idioma, y ahora mismo no puedo traducirlo.',
  },
  it: {
    label: 'Italiano',
    englishName: 'Italian',
    storyIntro: 'Ecco la storia di {title}.',
    funFact: 'Curiosità: {title}',
    noHistory: 'Non so molto di più sulla storia di {title}.',
    noAnswer: 'Non conosco la risposta a questa domanda su {title}.',
    ttsLocale: 'it-IT',
    noInfo: 'Non ho molte informazioni su {title}.',
    otherLanguage:
      "Wikipedia descrive {title} solo in un'altra lingua, e al momento non posso tradurlo.",
  },
  hi: {
    label: 'हिन्दी',
    englishName: 'Hindi',
    storyIntro: 'यह है {title} की कहानी।',
    funFact: 'रोचक तथ्य: {title}',
    noHistory: '{title} के इतिहास के बारे में मुझे और ज़्यादा नहीं पता।',
    noAnswer: '{title} के बारे में इस सवाल का जवाब मुझे नहीं पता।',
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
  key: 'noInfo' | 'otherLanguage' | 'storyIntro' | 'funFact' | 'noHistory' | 'noAnswer',
  title: string,
): string {
  return LANGUAGES[lang][key].replace('{title}', title);
}
