import { Camera, GeoJSONSource, Layer, Map, type CameraRef } from '@maplibre/maplibre-react-native';
import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MAP_STYLE_URL, placesGeoJson, positionGeoJson, routeGeoJson } from '../map/mapData';
import type { PlaceMapProps } from './placeMapProps';
import { colors } from './theme';

const ZOOM = 16;
const MUNICH: [number, number] = [11.5755, 48.1374];

export function PlaceMap({ nearby, discoveredIds, route, position, onSelect }: PlaceMapProps) {
  const camera = useRef<CameraRef>(null);
  const center: [number, number] = position ? [position.lon, position.lat] : MUNICH;
  return (
    <View style={styles.container}>
      <Map style={styles.map} mapStyle={MAP_STYLE_URL} logo={false} compass>
        <Camera ref={camera} initialViewState={{ center, zoom: ZOOM }} />
        <GeoJSONSource id="route" data={routeGeoJson(route, position)}>
          <Layer
            id="route-line"
            type="line"
            paint={{ 'line-color': colors.primary, 'line-width': 4, 'line-dasharray': [2, 1] }}
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          />
        </GeoJSONSource>
        <GeoJSONSource
          id="places"
          data={placesGeoJson(nearby, discoveredIds)}
          onPress={(event) => {
            const id = event.nativeEvent.features[0]?.properties?.id;
            if (typeof id === 'string') onSelect(id);
          }}
        >
          <Layer
            id="places-dot"
            type="circle"
            paint={{
              'circle-radius': 9,
              'circle-color': ['case', ['get', 'told'], '#2E7D32', '#F2A900'],
              'circle-stroke-width': 2,
              'circle-stroke-color': '#FFFFFF',
            }}
          />
          <Layer
            id="places-label"
            type="symbol"
            layout={{ 'text-field': ['get', 'title'], 'text-size': 12, 'text-offset': [0, 1.3], 'text-anchor': 'top' }}
            paint={{ 'text-color': colors.text, 'text-halo-color': '#FFFFFF', 'text-halo-width': 1.5 }}
          />
        </GeoJSONSource>
        <GeoJSONSource id="me" data={positionGeoJson(position)}>
          <Layer
            id="me-dot"
            type="circle"
            paint={{ 'circle-radius': 7, 'circle-color': '#1A73E8', 'circle-stroke-width': 3, 'circle-stroke-color': '#FFFFFF' }}
          />
        </GeoJSONSource>
      </Map>
      {position && (
        <Pressable
          accessibilityRole="button"
          onPress={() => void camera.current?.setStop({ center, zoom: ZOOM, duration: 500 })}
          style={styles.me}
        >
          <Text style={styles.meText}>📍 Me</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  me: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.background,
    elevation: 3,
  },
  meText: { color: colors.text, fontWeight: '600' },
});
