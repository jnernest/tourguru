import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { LANGUAGE_CODES, LANGUAGES, type LanguageCode } from '../i18n/languages';
import { colors } from './theme';

interface Props {
  value: LanguageCode;
  onChange: (lang: LanguageCode) => void;
}

export function LanguagePicker({ value, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroller}
      contentContainerStyle={styles.row}
    >
      {LANGUAGE_CODES.map((code) => {
        const selected = code === value;
        return (
          <Pressable
            key={code}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(code)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
              {LANGUAGES[code].label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Without this the parent column squeezes the horizontal scroller to almost zero height.
  scroller: { flexGrow: 0, flexShrink: 0 },
  row: { gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text },
  chipTextSelected: { color: colors.onPrimary, fontWeight: '600' },
});
