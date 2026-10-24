import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { errorText, log } from '../diagnostics/log';
import type { LatLon } from '../geo/geo';
import { downloadCityPack, packStore } from '../guide/services';
import type { LanguageCode } from '../i18n/languages';
import { colors } from './theme';

function packLine(): string {
  const pack = packStore.read();
  if (!pack) return 'No area saved yet.';
  const date = new Date(pack.createdAt).toLocaleDateString();
  return `Saved: ${pack.places.length} places within ${(pack.radiusM / 1000).toFixed(1)} km, ${date}.`;
}

export function OfflinePackSection({ position, lang }: { position: LatLon | null; lang: LanguageCode }) {
  const [status, setStatus] = useState(packLine);
  const [busy, setBusy] = useState(false);

  const download = async () => {
    if (!position) return;
    setBusy(true);
    try {
      const pack = await downloadCityPack(position, lang, (done, total) => setStatus(`Downloading ${done} of ${total} places…`));
      log('info', `City pack saved: ${pack.places.length} places`);
      setStatus(packLine());
    } catch (e) {
      setStatus(`Download failed: ${errorText(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Offline area</Text>
      <Text style={styles.muted}>
        Saves the places, articles and facts around you, so the guide keeps talking without mobile data. AI stories need a
        connection; offline you hear the summary.
      </Text>
      <Text style={styles.status} testID="pack-status">
        {status}
      </Text>
      <Pressable
        accessibilityRole="button"
        disabled={!position || busy}
        onPress={() => void download()}
        style={[styles.button, (!position || busy) && styles.disabled]}
      >
        <Text style={styles.buttonText}>
          {position ? (busy ? 'Downloading…' : '📦 Download this area') : 'Start a walk first to download the area'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginHorizontal: 16, marginTop: 12, padding: 14, borderRadius: 12, backgroundColor: colors.surface, gap: 6 },
  title: { color: colors.text, fontWeight: '700', fontSize: 16 },
  muted: { color: colors.muted, fontSize: 13 },
  status: { color: colors.text },
  button: { alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: colors.primary },
  disabled: { opacity: 0.5 },
  buttonText: { color: colors.onPrimary, fontWeight: '600' },
});
