import { useCallback, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { getLatestNapLog } from '@/lib/napRepository';
import type { NapLog } from '@/lib/types';

export interface QuickStartButtonProps {
  style?: StyleProp<ViewStyle>;
}

/**
 * Starts a nap timer immediately with the same place / posture / duration as the
 * most recent nap. Renders nothing until at least one nap has been recorded.
 */
export function QuickStartButton({ style }: QuickStartButtonProps) {
  const router = useRouter();
  const [lastNap, setLastNap] = useState<NapLog>();

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getLatestNapLog().then((log) => {
        if (!cancelled) setLastNap(log);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (!lastNap) return null;

  const handlePress = () => {
    router.push({
      pathname: '/nap/start',
      params: {
        place: lastNap.location_tag,
        posture: lastNap.posture,
        minutes: String(lastNap.duration_minutes),
        autostart: '1',
      },
    });
  };

  return (
    <View style={[styles.container, style]}>
      <Button label="前回と同じ条件で仮眠開始" onPress={handlePress} />
      <ThemedText type="small" themeColor="textSecondary" style={styles.caption}>
        {lastNap.location_tag} ・ {lastNap.posture} ・ {lastNap.duration_minutes}分
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  caption: {
    textAlign: 'center',
  },
});
