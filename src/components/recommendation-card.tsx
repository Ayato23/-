import { useCallback, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { getAllNapLogs } from '@/lib/napRepository';
import { CONFIDENCE_LABELS, recommendNap, type NapRecommendation } from '@/lib/recommendation';
import { useTheme } from '@/hooks/use-theme';

export interface RecommendationCardProps {
  style?: StyleProp<ViewStyle>;
}

/** "おすすめ仮眠" card. Loads all nap logs itself and refreshes whenever the screen gains focus. */
export function RecommendationCard({ style }: RecommendationCardProps) {
  const theme = useTheme();
  const [recommendation, setRecommendation] = useState<NapRecommendation | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getAllNapLogs()
        .then((naps) => {
          if (!cancelled) setRecommendation(recommendNap(naps));
        })
        .catch(() => {
          if (!cancelled) setRecommendation(recommendNap([]));
        });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const isPersonal = recommendation?.kind === 'personal';
  const confidenceColor =
    recommendation?.confidence === 'high'
      ? theme.accent
      : recommendation?.confidence === 'medium'
        ? theme.text
        : theme.textSecondary;

  return (
    <Card style={[styles.card, style]}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        おすすめ仮眠{recommendation && !isPersonal ? '(一般的な目安)' : ''}
      </ThemedText>
      {recommendation === null ? (
        <ThemedText type="default" themeColor="textSecondary">
          --
        </ThemedText>
      ) : (
        <>
          <ThemedText type="default" style={styles.label}>
            {recommendation.label}
          </ThemedText>
          {isPersonal && (
            <View style={styles.metaRow}>
              <ThemedText type="small" themeColor="textSecondary">
                予想スコア {recommendation.expectedScore?.toFixed(1)}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                n={recommendation.sampleCount}
              </ThemedText>
              <ThemedText type="small" style={{ color: confidenceColor }}>
                信頼度 {CONFIDENCE_LABELS[recommendation.confidence]}
              </ThemedText>
            </View>
          )}
          <ThemedText type="small" themeColor="textSecondary">
            {recommendation.reason}
          </ThemedText>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.one,
  },
  label: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: 600,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Spacing.three,
  },
});
