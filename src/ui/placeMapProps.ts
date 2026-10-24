import type { LatLon } from '../geo/geo';
import type { RankedPoi } from '../pois/poiRanker';
import type { RoutePlan } from '../route/planner';

export interface PlaceMapProps {
  nearby: RankedPoi[];
  discoveredIds: string[];
  route: RoutePlan | null;
  position: LatLon | null;
  onSelect: (poiId: string) => void;
}
