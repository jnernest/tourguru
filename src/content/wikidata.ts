import { factPhrase, type FactKind } from '../i18n/factPhrases';
import type { LanguageCode } from '../i18n/languages';
import { WIKIMEDIA_HEADERS, type FetchLike } from '../pois/wikipediaSource';

export interface EntityText {
  label: string | null;
  description: string | null;
  facts: string[];
  builtYear?: number | null;
}

type FactSource = 'entity' | 'year' | 'metres';
interface FactSpec {
  kind: FactKind;
  prop: string;
  source: FactSource;
  maxValues: number;
  allowed?: ReadonlySet<string>;
}

const WORLD_HERITAGE = new Set(['Q9259', 'Q43113623']);

const FACT_SPECS: FactSpec[] = [
  { kind: 'built', prop: 'P571', source: 'year', maxValues: 1 },
  { kind: 'opened', prop: 'P1619', source: 'year', maxValues: 1 },
  { kind: 'designedBy', prop: 'P84', source: 'entity', maxValues: 2 },
  { kind: 'foundedBy', prop: 'P112', source: 'entity', maxValues: 2 },
  { kind: 'style', prop: 'P149', source: 'entity', maxValues: 2 },
  { kind: 'heritage', prop: 'P1435', source: 'entity', maxValues: 1, allowed: WORLD_HERITAGE },
  { kind: 'height', prop: 'P2048', source: 'metres', maxValues: 1 },
  { kind: 'namedAfter', prop: 'P138', source: 'entity', maxValues: 1 },
];
export const MAX_FACTS = 4;
const YEAR_PRECISION = 9;
const METRE_UNIT = /\/Q11573$/;
const WIKIDATA_ID = /^Q\d+$/;
const LANG_CODE = /^[a-z]{2,3}$/;

interface DataValue {
  type: string;
  value: { id?: string; time?: string; precision?: number; amount?: string; unit?: string };
}
interface Claim {
  mainsnak: { datavalue?: DataValue };
}
interface Entity {
  labels?: Record<string, { value: string }>;
  descriptions?: Record<string, { value: string }>;
  claims?: Record<string, Claim[]>;
}
interface EntitiesResponse {
  entities?: Record<string, Entity>;
}

interface RawFact {
  kind: FactKind;
  values: ({ entityId: string } | { text: string })[];
}

function builtYearOf(raw: RawFact[]): number | null {
  const fact = raw.find((f) => f.kind === 'built') ?? raw.find((f) => f.kind === 'opened');
  const value = fact?.values[0];
  return value && 'text' in value ? Number(value.text) : null;
}

export function buildEntityUrl(ids: string[], lang: string, props: string): string {
  if (ids.length === 0 || !ids.every((id) => WIKIDATA_ID.test(id)) || !LANG_CODE.test(lang)) {
    throw new Error(`Invalid Wikidata request: ${ids.join('|')} / ${lang}`);
  }
  const languages = lang === 'en' ? 'en' : `${lang}|en`;
  const params = `action=wbgetentities&format=json&origin=*&props=${encodeURIComponent(props)}&ids=${ids.join('%7C')}&languages=${encodeURIComponent(languages)}`;
  return `https://www.wikidata.org/w/api.php?${params}`;
}

function rawValue(dv: DataValue | undefined, source: FactSource): RawFact['values'][number] | null {
  if (!dv) return null;
  if (source === 'entity') return dv.value.id ? { entityId: dv.value.id } : null;
  if (source === 'year') {
    const year = /^\+(\d{3,4})-/.exec(dv.value.time ?? '')?.[1];
    return year && (dv.value.precision ?? 0) >= YEAR_PRECISION ? { text: String(Number(year)) } : null;
  }
  const metres = Number(dv.value.amount);
  return METRE_UNIT.test(dv.value.unit ?? '') && metres > 0 ? { text: String(Math.round(metres)) } : null;
}

export function extractRawFacts(claims: Record<string, Claim[]>): RawFact[] {
  return FACT_SPECS.map((spec) => ({
    kind: spec.kind,
    values: (claims[spec.prop] ?? [])
      .map((c) => rawValue(c.mainsnak.datavalue, spec.source))
      .filter((v): v is RawFact['values'][number] => v !== null)
      .filter((v) => !spec.allowed || ('entityId' in v && spec.allowed.has(v.entityId)))
      .slice(0, spec.maxValues),
  })).filter((f) => f.values.length > 0);
}

function dropOverlapping(names: string[]): string[] {
  return names.filter(
    (name, i) => !names.slice(0, i).some((earlier) => earlier.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(earlier.toLowerCase())),
  );
}

export function formatFacts(raw: RawFact[], labels: Map<string, string>, lang: LanguageCode): string[] {
  const kinds = new Set(raw.map((f) => f.kind));
  return raw
    .filter((f) => !(f.kind === 'opened' && kinds.has('built')) && !(f.kind === 'foundedBy' && kinds.has('designedBy')))
    .map((f) => ({
      kind: f.kind,
      names: dropOverlapping(
        f.values.map((v) => ('text' in v ? v.text : labels.get(v.entityId))).filter((n): n is string => !!n),
      ),
    }))
    .filter((f) => f.names.length > 0)
    .slice(0, MAX_FACTS)
    .map((f) => factPhrase(lang, f.kind, f.names));
}

const pickLabel = (entity: Entity | undefined, lang: string): string | null =>
  entity?.labels?.[lang]?.value ?? entity?.labels?.en?.value ?? null;

export function createEntityDescriber(fetchFn: FetchLike = fetch) {
  const getEntities = async (ids: string[], lang: string, props: string): Promise<Record<string, Entity>> => {
    const res = await fetchFn(buildEntityUrl(ids, lang, props), { headers: WIKIMEDIA_HEADERS });
    if (!res.ok) throw new Error(`Wikidata HTTP ${res.status}`);
    return ((await res.json()) as EntitiesResponse).entities ?? {};
  };

  return async (id: string, lang: LanguageCode): Promise<EntityText | null> => {
    if (!WIKIDATA_ID.test(id)) return null;
    try {
      const entity = (await getEntities([id], lang, 'labels|descriptions|claims'))[id];
      const raw = extractRawFacts(entity?.claims ?? {});
      const refIds = [...new Set(raw.flatMap((f) => f.values.flatMap((v) => ('entityId' in v ? [v.entityId] : []))))];
      const refs = refIds.length > 0 ? await getEntities(refIds, lang, 'labels') : {};
      const labels = new Map(refIds.map((r) => [r, pickLabel(refs[r], lang)] as const).filter((e): e is [string, string] => e[1] !== null));
      const text: EntityText = {
        label: pickLabel(entity, lang),
        description: entity?.descriptions?.[lang]?.value ?? null,
        facts: formatFacts(raw, labels, lang),
        builtYear: builtYearOf(raw),
      };
      return text.description || text.facts.length > 0 ? text : null;
    } catch {
      return null;
    }
  };
}

export type EntityDescriber = ReturnType<typeof createEntityDescriber>;
