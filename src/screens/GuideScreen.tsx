import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { discoveryLine } from '../guide/discovery';
import { useGuideContext, type GuideState } from '../guide/GuideContext';
import type { GuideSnapshot } from '../guide/guideController';
import { LANGUAGES } from '../i18n/languages';
import { placeCardText } from '../share/placeCard';
import { LanguagePicker } from '../ui/LanguagePicker';
import { NearbyList } from '../ui/NearbyList';
import { NowPlayingCard } from '../ui/NowPlayingCard';
import { QuizCard } from '../ui/QuizCard';
import { RouteCard } from '../ui/RouteCard';
import { colors } from '../ui/theme';
import { useVoiceQuestion } from '../voice/useVoiceQuestion';

function gpsStatus({ gpsAccuracyM, gpsWeak }: GuideSnapshot): string {
  if (gpsAccuracyM === null) {
    return 'GPS: waiting for a location…';
  }
  const accuracy = `±${Math.round(gpsAccuracyM)} m`;
  return gpsWeak
    ? `GPS: signal too weak (${accuracy}). Waiting for a better fix — try moving into the open.`
    : `GPS: ${accuracy}`;
}

function GuideHeader({ state }: { state: GuideState }) {
  const { guide, quiz, lang } = state;
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
      </View>
      <WalkTools state={state} />
      {guide.route && (
        <RouteCard plan={guide.route} position={guide.snapshot.position} isTold={guide.isTold} onEnd={guide.endWalk} />
      )}
      {guide.snapshot.badge && <Text style={styles.badge}>🏅 New badge: {guide.snapshot.badge}!</Text>}
      {guide.walking && <Text style={styles.notice}>{gpsStatus(guide.snapshot)}</Text>}
      <Text style={styles.notice}>
        {discoveryLine(guide.snapshot.discoveredTotal, guide.snapshot.discoveredIds.length, guide.snapshot.nearby.length)}
      </Text>
    </View>
  );
}

function WalkTools({ state }: { state: GuideState }) {
  const { guide, lang } = state;
  const voice = useVoiceQuestion(LANGUAGES[lang].ttsLocale, guide.ask);
  if (!guide.walking) {
    return (
      <Pressable accessibilityRole="button" onPress={guide.startSimulated} style={styles.simulate}>
        <Text style={styles.secondaryText}>▶ Simulate a walk (Munich old town)</Text>
      </Pressable>
    );
  }
  return (
    <View>
      <View style={styles.tools}>
        <Pressable accessibilityRole="button" onPress={() => guide.tellAbout()} style={[styles.simulate, styles.tool]}>
          <Text style={styles.secondaryText}>🔊 What’s around me?</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            guide.skip();
            void voice.listen();
          }}
          style={[styles.simulate, styles.tool, voice.listening && styles.listening]}
        >
          <Text style={styles.secondaryText}>{voice.listening ? '🎙 Listening… tap to stop' : '🎤 Ask a question'}</Text>
        </Pressable>
      </View>
      {voice.voiceError && <Text style={styles.error}>{voice.voiceError}</Text>}
      {!guide.route && (
        <Pressable accessibilityRole="button" onPress={() => void guide.planWalk()} style={styles.simulate}>
          <Text style={styles.secondaryText}>🗺 Suggest a walk</Text>
        </Pressable>
      )}
    </View>
  );
}

export function GuideScreen() {
  const state = useGuideContext();
  const { guide, lang, setLang } = state;
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.appTitle}>TourGuide</Text>
      <LanguagePicker value={lang} onChange={setLang} />
      <NearbyList
        items={guide.snapshot.nearby}
        lang={lang}
        onSelect={guide.tellAbout}
        discoveredIds={guide.snapshot.discoveredIds}
        header={<GuideHeader state={state} />}
      />
    </SafeAreaView>
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
  listening: { borderStyle: 'solid', borderColor: colors.danger },
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
});
