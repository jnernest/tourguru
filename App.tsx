import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { discoveryLine } from './src/guide/discovery';
import type { GuideSnapshot } from './src/guide/guideController';
import { AI_PROVIDER_LABEL, OFFLINE_TRANSLATION_AVAILABLE, useGuide } from './src/guide/useGuide';
import { LANGUAGES, type LanguageCode } from './src/i18n/languages';
import { useQuiz } from './src/quiz/useQuiz';
import { placeCardText } from './src/share/placeCard';
import { LanguagePicker } from './src/ui/LanguagePicker';
import { NearbyList } from './src/ui/NearbyList';
import { NowPlayingCard } from './src/ui/NowPlayingCard';
import { QuizCard } from './src/ui/QuizCard';
import { RouteCard } from './src/ui/RouteCard';
import { SettingsPanel } from './src/ui/SettingsPanel';
import { colors } from './src/ui/theme';
import { useWalkDiary } from './src/walk/useWalkDiary';

function gpsStatus({ gpsAccuracyM, gpsWeak }: GuideSnapshot): string {
  if (gpsAccuracyM === null) {
    return 'GPS: waiting for a location…';
  }
  const accuracy = `±${Math.round(gpsAccuracyM)} m`;
  return gpsWeak
    ? `GPS: signal too weak (${accuracy}). Waiting for a better fix — try moving into the open.`
    : `GPS: ${accuracy}`;
}

function GuideHeader({ guide, lang }: { guide: ReturnType<typeof useGuide>; lang: LanguageCode }) {
  const [showSettings, setShowSettings] = useState(false);
  const quiz = useQuiz(() => guide.settings.aiEnabled);
  const diary = useWalkDiary(guide.snapshot, guide.walking);
  const { current, narration } = guide.snapshot;
  return (
    <View>
      <NowPlayingCard
        poi={current}
        narration={narration}
        status={guide.snapshot.status}
        onSkip={guide.skip}
        onMore={guide.tellMore}
        onQuiz={() => current && void quiz.makeQuiz(current, lang)}
        onShare={() => current && Share.share({ message: placeCardText(current, narration) }).catch(() => undefined)}
      />
      {quiz.quizMessage && <Text style={styles.notice}>{quiz.quizMessage}</Text>}
      {quiz.quiz && quiz.quiz.poiId === current?.id && (
        <QuizCard state={quiz.quiz} score={quiz.score} onAnswer={quiz.answer} onClose={quiz.closeQuiz} />
      )}
      {guide.error && <Text style={styles.error}>{guide.error}</Text>}
      {guide.aiNotice && <Text style={styles.notice}>{guide.aiNotice}</Text>}
      {guide.translationNotice && <Text style={styles.error}>{guide.translationNotice}</Text>}
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={guide.walking ? guide.stop : guide.start}
          style={[styles.primary, guide.walking && styles.stop]}
        >
          <Text style={styles.primaryText}>{guide.walking ? 'Stop walk' : 'Start walk'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={guide.resetHistory} style={styles.secondary}>
          <Text style={styles.secondaryText}>Reset history</Text>
        </Pressable>
      </View>
      <WalkTools guide={guide} />
      {guide.route && (
        <RouteCard plan={guide.route} position={guide.snapshot.position} isTold={guide.isTold} onEnd={guide.endWalk} />
      )}
      {guide.snapshot.badge && <Text style={styles.badge}>🏅 New badge: {guide.snapshot.badge}!</Text>}
      {guide.walking && <Text style={styles.notice}>{gpsStatus(guide.snapshot)}</Text>}
      <Text style={styles.notice}>
        {discoveryLine(guide.snapshot.discoveredTotal, guide.snapshot.discoveredIds.length, guide.snapshot.nearby.length)}
      </Text>
      {diary.walks.length > 0 && !guide.walking && (
        <Pressable accessibilityRole="button" onPress={diary.shareLastWalk} style={styles.simulate}>
          <Text style={styles.secondaryText}>📔 Share last walk ({diary.walks[0].places.length} {diary.walks[0].places.length === 1 ? 'place' : 'places'})</Text>
        </Pressable>
      )}
      <Pressable accessibilityRole="button" onPress={() => setShowSettings((s) => !s)} style={styles.simulate}>
        <Text style={styles.secondaryText}>⚙ Settings {showSettings ? '▲' : '▼'}</Text>
      </Pressable>
      {showSettings && (
        <SettingsPanel
          settings={guide.settings}
          onChange={guide.updateSettings}
          ttsLocale={LANGUAGES[lang].ttsLocale}
          aiAvailable={AI_PROVIDER_LABEL !== null}
        />
      )}
    </View>
  );
}

function WalkTools({ guide }: { guide: ReturnType<typeof useGuide> }) {
  if (!guide.walking) {
    return (
      <Pressable accessibilityRole="button" onPress={guide.startSimulated} style={styles.simulate}>
        <Text style={styles.secondaryText}>▶ Simulate a walk (Munich old town)</Text>
      </Pressable>
    );
  }
  return (
    <View style={styles.tools}>
      <Pressable accessibilityRole="button" onPress={() => guide.tellAbout()} style={[styles.simulate, styles.tool]}>
        <Text style={styles.secondaryText}>🔊 What’s around me?</Text>
      </Pressable>
      {!guide.route && (
        <Pressable accessibilityRole="button" onPress={() => void guide.planWalk()} style={[styles.simulate, styles.tool]}>
          <Text style={styles.secondaryText}>🗺 Suggest a walk</Text>
        </Pressable>
      )}
    </View>
  );
}

function GuideScreen() {
  const [lang, setLang] = useState<LanguageCode>('en');
  const guide = useGuide(lang);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.appTitle}>TourGuide</Text>
      <LanguagePicker value={lang} onChange={setLang} />
      <NearbyList
        items={guide.snapshot.nearby}
        lang={lang}
        onSelect={guide.tellAbout}
        discoveredIds={guide.snapshot.discoveredIds}
        header={<GuideHeader guide={guide} lang={lang} />}
      />
      <Text style={styles.shareLog} onPress={guide.shareLog} accessibilityRole="button">
        Share diagnostic log
      </Text>
      <Text style={styles.footer}>
        AI narration: {AI_PROVIDER_LABEL ?? 'off (no API key)'} · Offline translation:{' '}
        {OFFLINE_TRANSLATION_AVAILABLE ? 'on' : 'not available here'} · Place data © Wikipedia
        contributors, CC BY-SA 4.0
      </Text>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <GuideScreen />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  appTitle: { fontSize: 24, fontWeight: '800', paddingHorizontal: 16, paddingTop: 8, color: colors.text },
  error: { color: colors.danger, paddingHorizontal: 16 },
  notice: { color: colors.muted, paddingHorizontal: 16, fontSize: 12 },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingBottom: 8 },
  primary: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  stop: { backgroundColor: colors.danger },
  primaryText: { color: colors.onPrimary, fontWeight: '700', fontSize: 16 },
  secondary: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: { color: colors.text },
  simulate: {
    marginHorizontal: 16,
    marginBottom: 8,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  tools: { flexDirection: 'row', marginHorizontal: 16, gap: 8 },
  tool: { flex: 1, marginHorizontal: 0 },
  badge: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FFF4D6',
    color: colors.text,
    fontWeight: '700',
    textAlign: 'center',
  },
  shareLog: {
    textAlign: 'center',
    color: colors.primary,
    fontSize: 12,
    textDecorationLine: 'underline',
    paddingTop: 6,
  },
  footer: { textAlign: 'center', color: colors.muted, fontSize: 11, paddingVertical: 6 },
});
