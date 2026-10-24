import { WIKIMEDIA_HEADERS, type FetchLike } from '../pois/wikipediaSource';
import { buildEntityUrl } from './wikidata';

export interface GalleryPhoto {
  thumbUrl: string;
  width: number;
  height: number;
  pageUrl: string;
  year: number | null;
  historic: boolean;
  credit: string;
}

const HISTORIC_BEFORE = 1950;
const SEARCH_LIMIT = 40;
const MAX_PHOTOS = 12;
const MAX_HISTORIC = 8;
const THUMB_WIDTH = 640;
const YEAR = /(?:^|\D)(1[5-9]\d\d|20\d\d)(?!\d)/;

interface ImageInfo {
  thumburl?: string;
  thumbwidth?: number;
  thumbheight?: number;
  descriptionurl?: string;
  extmetadata?: Record<string, { value?: string } | undefined>;
}

interface SearchResponse {
  query?: { pages?: { title: string; imageinfo?: ImageInfo[] }[] };
}

const OLD_PHOTO_TERMS = '(historic OR historical OR old OR postcard OR "19th century" OR "20th century" OR vintage)';

export function buildCommonsSearchUrl(category: string, deep: boolean, oldOnly = false): string {
  const name = category.replace(/"/g, '');
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    origin: '*',
    generator: 'search',
    gsrnamespace: '6',
    gsrsearch: `${deep ? 'deepcat' : 'incategory'}:"${name}" filetype:bitmap${oldOnly ? ` ${OLD_PHOTO_TERMS}` : ''}`,
    gsrlimit: String(SEARCH_LIMIT),
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: String(THUMB_WIDTH),
    iiextmetadatafilter: 'DateTimeOriginal|DateTime|Artist|LicenseShortName',
  });
  return `https://commons.wikimedia.org/w/api.php?${params.toString()}`;
}

function plain(html: string | undefined): string {
  return (html ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

export function yearOf(dateText: string | undefined): number | null {
  const match = YEAR.exec(plain(dateText));
  return match ? Number(match[1]) : null;
}

export function parseGallery(...bodies: unknown[]): GalleryPhoto[] {
  const pages = bodies.flatMap((body) => (body as SearchResponse).query?.pages ?? []);
  const seen = new Set<string>();
  const photos = pages.flatMap((page) => {
    if (seen.has(page.title)) return [];
    seen.add(page.title);
    const info = page.imageinfo?.[0];
    if (!info?.thumburl || !info.descriptionurl) return [];
    const meta = info.extmetadata ?? {};
    const year = yearOf(meta.DateTimeOriginal?.value) ?? yearOf(meta.DateTime?.value);
    const credit = [plain(meta.Artist?.value), plain(meta.LicenseShortName?.value)].filter(Boolean).join(', ');
    return [
      {
        thumbUrl: info.thumburl,
        width: info.thumbwidth ?? THUMB_WIDTH,
        height: info.thumbheight ?? THUMB_WIDTH,
        pageUrl: info.descriptionurl,
        year,
        historic: year !== null && year < HISTORIC_BEFORE,
        credit: credit || 'Wikimedia Commons',
      },
    ];
  });
  return pickThenAndNow(photos);
}

// Oldest photos first so "then" leads, followed by the newest ones for "now".
export function pickThenAndNow(photos: GalleryPhoto[]): GalleryPhoto[] {
  const historic = photos.filter((p) => p.historic).sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
  const modern = photos.filter((p) => !p.historic).sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
  const then = historic.slice(0, MAX_HISTORIC);
  return [...then, ...modern.slice(0, MAX_PHOTOS - then.length)];
}

interface ClaimsResponse {
  entities?: Record<string, { claims?: { P373?: { mainsnak?: { datavalue?: { value?: unknown } } }[] } }>;
}

export function createGalleryLoader(fetchFn: FetchLike = fetch) {
  const cache = new Map<string, GalleryPhoto[]>();
  const getJson = async (url: string): Promise<unknown> => {
    const res = await fetchFn(url, { headers: WIKIMEDIA_HEADERS });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };
  return async (wikidataId: string): Promise<GalleryPhoto[]> => {
    if (!/^Q\d+$/.test(wikidataId)) return [];
    const cached = cache.get(wikidataId);
    if (cached) return cached;
    const claims = (await getJson(buildEntityUrl([wikidataId], 'en', 'claims'))) as ClaimsResponse;
    const category = claims.entities?.[wikidataId]?.claims?.P373?.[0]?.mainsnak?.datavalue?.value;
    if (typeof category !== 'string') return [];
    const search = (deep: boolean) =>
      Promise.all([getJson(buildCommonsSearchUrl(category, deep)), getJson(buildCommonsSearchUrl(category, deep, true))]);
    let photos = parseGallery(...(await search(true)));
    if (photos.length === 0) photos = parseGallery(...(await search(false)));
    cache.set(wikidataId, photos);
    return photos;
  };
}
