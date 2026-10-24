import type { LatLon } from '../geo/geo';

export type WikiLang = string;

export interface Poi extends LatLon {
  id: string;
  title: string;
  summary: string;
  articleLength: number;
  lang: WikiLang;
  pageId: number;
  url: string;
  image: PoiImage | null;
}

export interface PoiImage {
  url: string;
  width: number;
  height: number;
}

export interface PoiSource {
  nearby(center: LatLon, radiusM: number, lang: WikiLang): Promise<Poi[]>;
}
