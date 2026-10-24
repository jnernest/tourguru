import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import {
  INTERESTS,
  MAX_SPEECH_RATE,
  MIN_SPEECH_RATE,
  TONES,
  type Interest,
  type Settings,
  type Tone,
} from '../settings/settings';
import { colors } from './theme';

interface Props {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  ttsLocale: string;
  aiAvailable: boolean;
}

const TONE_LABELS: Record<Tone, string> = { standard: 'Standard', kids: 'Kids', expert: 'Expert', fun: 'Fun' };
const INTEREST_LABELS: Record<Interest, string> = {
  history: 'History',
  architecture: 'Architecture',
  art: 'Art',
  religion: 'Religion',
  war: 'Wars',
  people: 'Famous people',
  nature: 'Parks & nature',
};
const RATE_STEP = 0.1;

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function Row({ label, value, onValueChange, disabled }: { label: string; value: boolean; onValueChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, disabled && styles.muted]}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} disabled={disabled} />
    </View>
  );
}

function useVoices(ttsLocale: string): Speech.Voice[] {
  const [voices, setVoices] = useState<Speech.Voice[]>([]);
  useEffect(() => {
    const prefix = ttsLocale.split('-')[0].toLowerCase();
    Speech.getAvailableVoicesAsync()
      .then((all) => setVoices(all.filter((v) => v.language.toLowerCase().startsWith(prefix))))
      .catch(() => setVoices([]));
  }, [ttsLocale]);
  return voices;
}

export function SettingsPanel({ settings, onChange, ttsLocale, aiAvailable }: Props) {
  const voices = useVoices(ttsLocale);
  const voiceIndex = voices.findIndex((v) => v.identifier === settings.voiceId);
  const nextVoice = () => onChange({ voiceId: voices.length ? voices[(voiceIndex + 1) % voices.length].identifier : null });
  const setRate = (delta: number) =>
    onChange({ speechRate: Math.round(Math.min(MAX_SPEECH_RATE, Math.max(MIN_SPEECH_RATE, settings.speechRate + delta)) * 10) / 10 });
  const toggleInterest = (i: Interest) =>
    onChange({ interests: settings.interests.includes(i) ? settings.interests.filter((x) => x !== i) : [...settings.interests, i] });

  return (
    <View style={styles.panel}>
      <Row label="Talk automatically while walking" value={settings.autoTalk} onValueChange={(autoTalk) => onChange({ autoTalk })} />
      <Row
        label={aiAvailable ? 'AI narration' : 'AI narration (no key configured)'}
        value={aiAvailable && settings.aiEnabled}
        onValueChange={(aiEnabled) => onChange({ aiEnabled })}
        disabled={!aiAvailable}
      />
      <Text style={styles.heading}>Tone</Text>
      <View style={styles.chips}>
        {TONES.map((t) => (
          <Chip key={t} label={TONE_LABELS[t]} selected={settings.tone === t} onPress={() => onChange({ tone: t })} />
        ))}
      </View>
      <Text style={styles.heading}>Interests</Text>
      <View style={styles.chips}>
        {INTERESTS.map((i) => (
          <Chip key={i} label={INTEREST_LABELS[i]} selected={settings.interests.includes(i)} onPress={() => toggleInterest(i)} />
        ))}
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Speaking speed: {settings.speechRate.toFixed(1)}×</Text>
        <View style={styles.chips}>
          <Chip label="−" selected={false} onPress={() => setRate(-RATE_STEP)} />
          <Chip label="+" selected={false} onPress={() => setRate(RATE_STEP)} />
        </View>
      </View>
      <View style={styles.row}>
        <Text style={styles.label} numberOfLines={1}>
          Voice: {voiceIndex >= 0 ? voices[voiceIndex].name : 'default'} ({voices.length} available)
        </Text>
        <Chip label="Next voice" selected={false} onPress={nextVoice} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginHorizontal: 16, marginBottom: 8, padding: 14, borderRadius: 12, backgroundColor: colors.surface, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  label: { flex: 1, color: colors.text },
  muted: { color: colors.muted },
  heading: { color: colors.muted, fontSize: 12, textTransform: 'uppercase', marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text },
  chipTextSelected: { color: colors.onPrimary, fontWeight: '600' },
});
