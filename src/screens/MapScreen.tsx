import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGuideContext } from '../guide/GuideContext';
import { PlaceMap } from '../ui/PlaceMap';
import { colors } from '../ui/theme';

export function MapScreen() {
  const { guide } = useGuideContext();
  const { nearby, discoveredIds, position } = guide.snapshot;
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <PlaceMap
        nearby={nearby}
        discoveredIds={discoveredIds}
        route={guide.route}
        position={position}
        onSelect={(poiId) => {
          guide.tellAbout(poiId);
          router.navigate('/');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});
