import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGuideContext } from '../guide/GuideContext';
import { AI_PROVIDER_LABEL, OFFLINE_TRANSLATION_AVAILABLE } from '../guide/useGuide';
import { LANGUAGES } from '../i18n/languages';
import { SettingsPanel } from '../ui/SettingsPanel';
import { colors } from '../ui/theme';

export function SettingsScreen() {
  const { guide, lang } = useGuideContext();
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
        <Text style={styles.heading}>Settings</Text>
        <SettingsPanel
          settings={guide.settings}
          onChange={guide.updateSettings}
          ttsLocale={LANGUAGES[lang].ttsLocale}
          aiAvailable={AI_PROVIDER_LABEL !== null}
        />
        <Pressable accessibilityRole="button" onPress={guide.resetHistory} style={styles.button}>
          <Text style={styles.buttonText}>Reset history (hear every place again)</Text>
        </Pressable>
        <Text style={styles.link} onPress={guide.shareLog} accessibilityRole="button">
          Share diagnostic log
        </Text>
        <Text style={styles.footer}>
          AI narration: {AI_PROVIDER_LABEL ?? 'off (no API key)'} · Offline translation:{' '}
          {OFFLINE_TRANSLATION_AVAILABLE ? 'on' : 'not available here'} · Place data © Wikipedia contributors, CC BY-SA
          4.0 · Map © OpenStreetMap contributors, OpenFreeMap
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  heading: { fontSize: 24, fontWeight: '800', paddingHorizontal: 16, paddingVertical: 8, color: colors.text },
  button: {
    marginHorizontal: 16,
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: { color: colors.text },
  link: { textAlign: 'center', color: colors.primary, textDecorationLine: 'underline', paddingTop: 16 },
  footer: { textAlign: 'center', color: colors.muted, fontSize: 11, padding: 16 },
});
