import { StyleSheet, Text, View } from 'react-native';

import { BREAKDOWN_LABELS, MAX, type Breakdown, type Evaluation } from '@/domain/critic';
import { useTheme } from '@/hooks/use-theme';

export function ScoreBreakdown({ evaluation, commentsLimit }: { evaluation: Evaluation; commentsLimit?: number }) {
  const theme = useTheme();
  const comments = commentsLimit ? evaluation.comments.slice(0, commentsLimit) : evaluation.comments;
  return (
    <View style={styles.wrap}>
      <View style={styles.totalRow}>
        <Text style={[styles.total, { color: theme.text }]}>{evaluation.total}</Text>
        <Text style={{ color: theme.textSecondary }}> / 100点</Text>
      </View>
      {(Object.keys(MAX) as (keyof Breakdown)[]).map((k) => {
        const ratio = evaluation.breakdown[k] / MAX[k];
        return (
          <View key={k} style={styles.barRow}>
            <Text style={[styles.barLabel, { color: theme.textSecondary }]}>{BREAKDOWN_LABELS[k]}</Text>
            <View style={[styles.track, { backgroundColor: theme.chip }]}>
              <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%`, backgroundColor: ratio < 0.5 ? theme.danger : theme.accent }]} />
            </View>
            <Text style={[styles.barValue, { color: theme.text }]}>
              {Math.round(evaluation.breakdown[k])}/{MAX[k]}
            </Text>
          </View>
        );
      })}
      {evaluation.violations.length > 0 && (
        <Text style={{ color: theme.danger, fontSize: 13 }}>⚠ {evaluation.violations.join('、')}</Text>
      )}
      {comments.map((c) => (
        <Text key={c} style={{ color: theme.text, fontSize: 13, lineHeight: 19 }}>
          ・{c}
        </Text>
      ))}
      {evaluation.comments.length === 0 && <Text style={{ color: theme.text, fontSize: 13 }}>・よくまとまっています</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  totalRow: { flexDirection: 'row', alignItems: 'baseline' },
  total: { fontSize: 32, fontWeight: '800' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { width: 108, fontSize: 12 },
  track: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  barValue: { width: 44, fontSize: 12, textAlign: 'right' },
});
