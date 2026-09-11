import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { formatDateJP, todayString } from '@/lib/date';
import { getNapLogsSince } from '@/lib/napRepository';
import { getSleepLogByDate } from '@/lib/sleepRepository';
import type { NapLog, SleepLog } from '@/lib/types';
import { useTheme } from '@/hooks/use-theme';

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [sleepLog, setSleepLog] = useState<SleepLog | null | undefined>(undefined);
  const [todayNaps, setTodayNaps] = useState<NapLog[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const today = todayString();
      Promise.all([getSleepLogByDate(today), getNapLogsSince([today])]).then(
        ([log, naps]) => {
          if (cancelled) return;
          setSleepLog(log ?? null);
          setTodayNaps(naps);
        },
      );
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const debt = sleepLog?.sleep_debt;
  const debtColor = debt === undefined || debt === null ? theme.textSecondary : debt > 0 ? theme.danger : theme.accent;

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          仮眠最適化
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatDateJP(todayString())}
        </ThemedText>

        <Card style={styles.debtCard}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            今日の睡眠負債
          </ThemedText>
          {sleepLog === undefined ? (
            <ThemedText type="subtitle">--</ThemedText>
          ) : sleepLog === null ? (
            <>
              <ThemedText type="subtitle">未記録</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                今朝の睡眠を記録して負債を確認しましょう
              </ThemedText>
            </>
          ) : (
            <>
              <ThemedText type="subtitle" style={{ color: debtColor }}>
                {debt !== undefined && debt > 0 ? `+${debt.toFixed(1)}` : debt?.toFixed(1)}
                <ThemedText type="default"> 時間</ThemedText>
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                睡眠 {sleepLog.sleep_hours.toFixed(1)}h / 目標 {sleepLog.target_sleep_hours}h
              </ThemedText>
            </>
          )}
        </Card>

        <Card>
          <ThemedText type="smallBold" themeColor="textSecondary">
            今日の仮眠
          </ThemedText>
          <ThemedText type="subtitle">{todayNaps.length}回</ThemedText>
        </Card>

        <ThemedView style={styles.actions}>
          <Button label="仮眠を記録する" onPress={() => router.push('/nap/start')} />
          <Button
            label="睡眠を記録する"
            variant="secondary"
            onPress={() => router.push('/sleep/log')}
          />
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    gap: Spacing.three,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
  },
  debtCard: {
    gap: Spacing.one,
  },
  actions: {
    marginTop: Spacing.two,
    gap: Spacing.three,
  },
});
