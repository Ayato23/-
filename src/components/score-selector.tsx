import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ScoreSelectorProps {
  label: string;
  value: number | undefined;
  onChange: (value: number) => void;
  lowLabel?: string;
  highLabel?: string;
}

const SCORES = [1, 2, 3, 4, 5];

export function ScoreSelector({ label, value, onChange, lowLabel, highLabel }: ScoreSelectorProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View style={styles.row}>
        {SCORES.map((score) => {
          const selected = value === score;
          return (
            <Pressable
              key={score}
              onPress={() => onChange(score)}
              style={[
                styles.circle,
                {
                  backgroundColor: selected ? theme.accent : theme.backgroundElement,
                  borderColor: selected ? theme.accent : theme.border,
                },
              ]}
            >
              <ThemedText
                type="smallBold"
                style={{ color: selected ? theme.accentText : theme.text }}
              >
                {score}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      {(lowLabel || highLabel) && (
        <View style={styles.hintRow}>
          <ThemedText type="small" themeColor="textSecondary">
            {lowLabel}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {highLabel}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  circle: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
