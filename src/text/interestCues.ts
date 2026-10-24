import type { Interest } from '../settings/settings';

const CUES: Record<Interest, string[]> = {
  history: ['century', 'founded', 'history', 'jahrhundert', 'gegründet', 'geschichte', 'siècle', 'fondé', 'histoire', 'siglo', 'fundado', 'historia', 'secolo', 'fondato', 'storia', 'शताब्दी', 'इतिहास'],
  architecture: ['architect', 'baroque', 'gothic', 'romanesque', 'renaissance', 'facade', 'façade', 'tower', 'dome', 'architekt', 'barock', 'gotisch', 'fassade', 'turm', 'kuppel', 'baroque', 'gothique', 'tour', 'barroco', 'gótico', 'fachada', 'torre', 'barocco', 'gotico', 'facciata', 'वास्तु'],
  art: ['painting', 'painter', 'fresco', 'sculpture', 'statue', 'artist', 'gemälde', 'maler', 'fresko', 'skulptur', 'künstler', 'peinture', 'fresque', 'sculpture', 'pintura', 'escultura', 'artista', 'dipinto', 'affresco', 'scultura', 'कला', 'मूर्ति'],
  religion: ['church', 'cathedral', 'saint', 'bishop', 'monastery', 'chapel', 'kirche', 'dom', 'heilige', 'bischof', 'kloster', 'kapelle', 'église', 'cathédrale', 'iglesia', 'catedral', 'chiesa', 'cattedrale', 'मंदिर', 'मस्जिद'],
  war: ['war', 'battle', 'siege', 'bomb', 'destroyed', 'army', 'krieg', 'schlacht', 'belagerung', 'zerstört', 'guerre', 'bataille', 'guerra', 'batalla', 'battaglia', 'युद्ध'],
  people: ['emperor', 'king', 'queen', 'duke', 'born', 'died', 'kaiser', 'könig', 'königin', 'herzog', 'geboren', 'empereur', 'roi', 'reine', 'emperador', 'rey', 'reina', 'imperatore', 're ', 'regina', 'राजा', 'रानी'],
  nature: ['park', 'garden', 'river', 'tree', 'lake', 'hill', 'garten', 'fluss', 'baum', 'see', 'jardin', 'rivière', 'jardín', 'río', 'giardino', 'fiume', 'उद्यान', 'नदी'],
};

/** 1 when no interest matches, up to 1.6 when a sentence is about the listener's interests. */
export function interestBonus(sentence: string, interests: readonly Interest[]): number {
  if (interests.length === 0) return 1;
  const lower = sentence.toLowerCase();
  const hits = interests.filter((i) => CUES[i].some((cue) => lower.includes(cue))).length;
  return 1 + Math.min(hits, 2) * 0.3;
}
