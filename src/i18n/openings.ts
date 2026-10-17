import type { Direction } from '../geo/geo';
import type { LanguageCode } from './languages';

/**
 * How a guide points a place out: where to look, not a fixed "Nearby:". `{name}` is the
 * place (with its description when known); `{distance}` a spoken distance.
 */
export type OpeningKind = Direction | 'near' | 'far';

type Openings = Record<OpeningKind, string[]> & { metres: string; kilometres: string };

const OPENINGS: Record<LanguageCode, Openings> = {
  en: {
    ahead: ['Just ahead of you is {name}.', 'Coming up ahead: {name}.', 'Straight ahead you can see {name}.'],
    right: ['On your right is {name}.', 'Look to your right: {name}.'],
    left: ['On your left is {name}.', 'Look to your left: {name}.'],
    behind: ['You have just passed {name}.', 'Behind you is {name}.'],
    near: ['Right here is {name}.', 'Close by is {name}.'],
    far: ['About {distance} from here is {name}.'],
    metres: '{n} metres',
    kilometres: '{n} kilometres',
  },
  de: {
    ahead: ['Direkt vor dir liegt {name}.', 'Gleich vor dir: {name}.'],
    right: ['Rechts von dir ist {name}.', 'Schau nach rechts: {name}.'],
    left: ['Links von dir ist {name}.', 'Schau nach links: {name}.'],
    behind: ['Du bist gerade an {name} vorbeigegangen.', 'Hinter dir liegt {name}.'],
    near: ['Hier ganz in der Nähe ist {name}.', 'Direkt bei dir: {name}.'],
    far: ['Etwa {distance} von hier liegt {name}.'],
    metres: '{n} Meter',
    kilometres: '{n} Kilometer',
  },
  fr: {
    ahead: ['Juste devant vous se trouve {name}.', 'Droit devant : {name}.'],
    right: ['Sur votre droite se trouve {name}.', 'Regardez à droite : {name}.'],
    left: ['Sur votre gauche se trouve {name}.', 'Regardez à gauche : {name}.'],
    behind: ['Vous venez de passer devant {name}.', 'Derrière vous se trouve {name}.'],
    near: ['Tout près d’ici se trouve {name}.', 'Juste ici : {name}.'],
    far: ['À environ {distance} d’ici se trouve {name}.'],
    metres: '{n} mètres',
    kilometres: '{n} kilomètres',
  },
  es: {
    ahead: ['Justo delante de ti está {name}.', 'Más adelante: {name}.'],
    right: ['A tu derecha está {name}.', 'Mira a la derecha: {name}.'],
    left: ['A tu izquierda está {name}.', 'Mira a la izquierda: {name}.'],
    behind: ['Acabas de pasar junto a {name}.', 'Detrás de ti está {name}.'],
    near: ['Aquí mismo está {name}.', 'Muy cerca está {name}.'],
    far: ['A unos {distance} de aquí está {name}.'],
    metres: '{n} metros',
    kilometres: '{n} kilómetros',
  },
  it: {
    ahead: ['Proprio davanti a te c’è {name}.', 'Più avanti: {name}.'],
    right: ['Alla tua destra c’è {name}.', 'Guarda a destra: {name}.'],
    left: ['Alla tua sinistra c’è {name}.', 'Guarda a sinistra: {name}.'],
    behind: ['Hai appena superato {name}.', 'Dietro di te c’è {name}.'],
    near: ['Proprio qui c’è {name}.', 'Qui vicino c’è {name}.'],
    far: ['A circa {distance} da qui c’è {name}.'],
    metres: '{n} metri',
    kilometres: '{n} chilometri',
  },
  hi: {
    ahead: ['आपके ठीक सामने {name} है।', 'आगे {name} है।'],
    right: ['आपके दाईं ओर {name} है।', 'दाईं ओर देखिए: {name}।'],
    left: ['आपके बाईं ओर {name} है।', 'बाईं ओर देखिए: {name}।'],
    behind: ['आप अभी {name} के पास से गुज़रे हैं।', 'आपके पीछे {name} है।'],
    near: ['यहीं पास में {name} है।', 'बिल्कुल पास में {name} है।'],
    far: ['यहाँ से लगभग {distance} दूर {name} है।'],
    metres: '{n} मीटर',
    kilometres: '{n} किलोमीटर',
  },
};

/** Beyond this the place is not "here"; say how far instead (e.g. tapped in the list). */
export const FAR_THRESHOLD_M = 250;

export interface OpeningContext {
  /** Distance to the place, or null when unknown. */
  distanceM: number | null;
  /** Where to look, or null when the walker's heading is unknown (standing still). */
  direction: Direction | null;
}

export function openingKind({ distanceM, direction }: OpeningContext): OpeningKind {
  if (distanceM !== null && distanceM > FAR_THRESHOLD_M) return 'far';
  return direction ?? 'near';
}

export function spokenDistance(lang: LanguageCode, metres: number): string {
  const o = OPENINGS[lang];
  if (metres >= 1_000) {
    return o.kilometres.replace('{n}', (Math.round(metres / 100) / 10).toLocaleString(lang));
  }
  return o.metres.replace('{n}', String(Math.round(metres / 10) * 10));
}

/** Stable small hash so the same place always gets the same wording, but places differ. */
function variantIndex(seed: string, count: number): number {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % count;
}

export function opening(lang: LanguageCode, ctx: OpeningContext, name: string, seed: string): string {
  const kind = openingKind(ctx);
  const variants = OPENINGS[lang][kind];
  const distance = ctx.distanceM === null ? '' : spokenDistance(lang, ctx.distanceM);
  return variants[variantIndex(seed, variants.length)].replace('{distance}', distance).replace('{name}', name);
}

/**
 * Joins a place name and its Wikidata description for speech: "Schönbrunn Palace, a palace
 * in Vienna, Austria". Only English gets an article; elsewhere gender makes it unreliable.
 */
export function nameWithDescription(lang: LanguageCode, name: string, description: string | null): string {
  if (!description) return name;
  if (lang === 'en' && /^[a-z]/.test(description)) {
    // "a university", "a one-way street": these vowels are spoken as consonants.
    const vowelSound = /^[aeiou]/.test(description) && !/^(?:uni|use|usu|eu|one|once)/.test(description);
    const article = vowelSound ? 'an' : 'a';
    return `${name}, ${article} ${description}`;
  }
  return `${name}, ${description}`;
}
