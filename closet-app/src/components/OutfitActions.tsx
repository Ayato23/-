import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Level } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';

import { Button } from './ui';

export function OutfitActions({
  rating,
  rejected,
  wornToday,
  onRate,
  onReject,
  onWear,
}: {
  rating?: Level;
  rejected?: boolean;
  wornToday?: boolean;
  onRate: (r: Level) => void;
  onReject: () => void;
  onWear: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={styles.stars}>
        {([1, 2, 3, 4, 5] as Level[]).map((n) => (
          <Pressable key={n} accessibilityRole="button" accessibilityLabel={`星${n}`} onPress={() => onRate(n)} hitSlop={6}>
            <Text style={{ fontSize: 26, color: rating && n <= rating && !rejected ? '#E2A93B' : theme.border }}>★</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.buttons}>
        <View style={{ flex: 1 }}>
          <Button small variant={rejected ? 'danger' : 'secondary'} title={rejected ? 'これはない ✓' : 'これはない'} onPress={onReject} />
        </View>
        <View style={{ flex: 1 }}>
          <Button small variant={wornToday ? 'secondary' : 'primary'} title={wornToday ? '今日着た ✓' : '今日これ着る'} onPress={onWear} disabled={wornToday} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  stars: { flexDirection: 'row', gap: 4 },
  buttons: { flexDirection: 'row', gap: 8 },
});
