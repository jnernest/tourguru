import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { QuizScore } from '../quiz/quizMaker';
import type { QuizState } from '../quiz/useQuiz';
import { colors } from './theme';

interface Props {
  state: QuizState;
  score: QuizScore;
  onAnswer: (index: number) => void;
  onClose: () => void;
}

export function QuizCard({ state, score, onAnswer, onClose }: Props) {
  const { quiz, chosen } = state;
  const answered = chosen !== null;
  return (
    <View style={styles.card}>
      <Text style={styles.question}>{quiz.question}</Text>
      {quiz.options.map((option, i) => {
        const right = answered && i === quiz.answerIndex;
        const wrong = answered && i === chosen && i !== quiz.answerIndex;
        return (
          <Pressable
            key={option}
            accessibilityRole="button"
            onPress={() => onAnswer(i)}
            disabled={answered}
            style={[styles.option, right && styles.right, wrong && styles.wrong]}
          >
            <Text style={styles.optionText}>
              {right ? '✓ ' : wrong ? '✗ ' : ''}
              {option}
            </Text>
          </Pressable>
        );
      })}
      <View style={styles.footer}>
        <Text style={styles.score}>
          {answered ? (chosen === quiz.answerIndex ? 'Correct! ' : 'Not quite. ') : ''}Score: {score.correct} of {score.answered}
        </Text>
        <Text style={styles.close} onPress={onClose} accessibilityRole="button">
          Close
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 8, padding: 14, borderRadius: 12, backgroundColor: '#FFF4D6', gap: 8 },
  question: { color: colors.text, fontSize: 16, fontWeight: '700' },
  option: { padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  right: { backgroundColor: '#D7F2DC', borderColor: '#2E7D32' },
  wrong: { backgroundColor: '#FBE0DE', borderColor: colors.danger },
  optionText: { color: colors.text },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },
  score: { color: colors.muted },
  close: { color: colors.primary, textDecorationLine: 'underline' },
});
