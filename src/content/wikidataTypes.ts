import { WIKIMEDIA_HEADERS, type FetchLike } from '../pois/wikipediaSource';

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const WIKIDATA_ID = /^Q\d+$/;
const BUSINESS = 'Q4830453';

interface SparqlResponse {
  results?: { bindings?: { item?: { value?: string } }[] };
}

export function businessQuery(ids: string[]): string {
  const values = ids.map((id) => `wd:${id}`).join(' ');
  return `SELECT DISTINCT ?item WHERE { VALUES ?item { ${values} } ?item wdt:P31/wdt:P279* wd:${BUSINESS} }`;
}

/** Ids among `ids` that Wikidata types as a business (banks, shops, companies); empty on any failure. */
export function createBusinessLookup(fetchFn: FetchLike = fetch) {
  return async (ids: string[]): Promise<Set<string>> => {
    const valid = ids.filter((id) => WIKIDATA_ID.test(id));
    if (valid.length === 0) return new Set();
    try {
      const url = `${SPARQL_ENDPOINT}?format=json&query=${encodeURIComponent(businessQuery(valid))}`;
      const res = await fetchFn(url, { headers: { ...WIKIMEDIA_HEADERS, Accept: 'application/sparql-results+json' } });
      if (!res.ok) return new Set();
      const bindings = ((await res.json()) as SparqlResponse).results?.bindings ?? [];
      return new Set(bindings.map((b) => b.item?.value?.split('/').pop() ?? '').filter((id) => WIKIDATA_ID.test(id)));
    } catch {
      return new Set();
    }
  };
}

export type BusinessLookup = ReturnType<typeof createBusinessLookup>;
