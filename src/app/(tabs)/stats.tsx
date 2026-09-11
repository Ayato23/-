import { useCallback, useMemo, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { BarChart, LineChart } from 'react-native-chart-kit';

import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { getTimeOfDayBucket, lastNDays } from '@/lib/date';
import { getNapLogsSince } from '@/lib/napRepository';
import { getSleepLogsSince } from '@/lib/sleepRepository';
import type { NapLog, SleepLog } from '@/lib/types';
import { useTheme } from '@/hooks/use-theme';

const DAYS = 7;

function napPerformanceScore(nap: NapLog): number {
  return (nap.post_nap_focus + (6 - nap.post_nap_sleepiness)) / 2;
}

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export default function StatsScreen() {
  const theme = useTheme();
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [napLogs, setNapLogs] = useState<NapLog[]>([]);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const dates = lastNDays(DAYS);
      Promise.all([getSleepLogsSince(dates), getNapLogsSince(dates)]).then(([sleep, naps]) => {
        if (cancelled) return;
        setSleepLogs(sleep);
        setNapLogs(naps);
        setLoaded(true);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const debtChartData = useMemo(() => {
    const dates = lastNDays(DAYS);
    const byDate = new Map(sleepLogs.map((l) => [l.date, l]));
    return {
      labels: dates.map((d) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`),
      values: dates.map((d) => byDate.get(d)?.sleep_debt ?? 0),
    };
  }, [sleepLogs]);

  const byLocation = useMemo(() => {
    const groups = new Map<string, number[]>();
    for (const nap of napLogs) {
      const list = groups.get(nap.location_tag) ?? [];
      list.push(napPerformanceScore(nap));
      groups.set(nap.location_tag, list);
    }
    return Array.from(groups.entries()).map(([label, scores]) => ({
      label,
      value: Math.round(average(scores) * 100) / 100,
    }));
  }, [napLogs]);

  const byTimeOfDay = useMemo(() => {
    const groups = new Map<string, number[]>();
    for (const nap of napLogs) {
      const bucket = getTimeOfDayBucket(nap.start_time);
      const list = groups.get(bucket) ?? [];
      list.push(napPerformanceScore(nap));
      groups.set(bucket, list);
    }
    return Array.from(groups.entries()).map(([label, scores]) => ({
      label,
      value: Math.round(average(scores) * 100) / 100,
    }));
  }, [napLogs]);

  const screenWidth = Math.min(Dimensions.get('window').width, MaxContentWidth) - Spacing.four * 2;

  const chartConfig = {
    backgroundGradientFrom: theme.backgroundElement,
    backgroundGradientTo: theme.backgroundElement,
    decimalPlaces: 1,
    color: (opacity = 1) => hexToRgba(theme.accent, opacity),
    labelColor: (opacity = 1) => hexToRgba(theme.textSecondary, opacity),
    propsForBackgroundLines: { stroke: theme.border },
    barPercentage: 0.6,
  };

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title" style={styles.title}>
            週次グラフ
          </ThemedText>

          <Card>
            <ThemedText type="smallBold" themeColor="textSecondary">
              睡眠負債の推移(直近{DAYS}日)
            </ThemedText>
            {loaded && (
              <LineChart
                data={{
                  labels: debtChartData.labels,
                  datasets: [{ data: debtChartData.values }],
                }}
                width={screenWidth}
                height={200}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                fromZero
              />
            )}
          </Card>

          <Card>
            <ThemedText type="smallBold" themeColor="textSecondary">
              場所別 平均パフォーマンススコア
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              (集中力 + (6-眠気)) / 2 で算出
            </ThemedText>
            {loaded &&
              (byLocation.length > 0 ? (
                <BarChart
                  data={{
                    labels: byLocation.map((g) => g.label),
                    datasets: [{ data: byLocation.map((g) => g.value) }],
                  }}
                  width={screenWidth}
                  height={200}
                  chartConfig={chartConfig}
                  style={styles.chart}
                  fromZero
                  yAxisLabel=""
                  yAxisSuffix=""
                />
              ) : (
                <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                  まだ仮眠の記録がありません
                </ThemedText>
              ))}
          </Card>

          <Card>
            <ThemedText type="smallBold" themeColor="textSecondary">
              時間帯別 平均パフォーマンススコア
            </ThemedText>
            {loaded &&
              (byTimeOfDay.length > 0 ? (
                <BarChart
                  data={{
                    labels: byTimeOfDay.map((g) => g.label),
                    datasets: [{ data: byTimeOfDay.map((g) => g.value) }],
                  }}
                  width={screenWidth}
                  height={200}
                  chartConfig={chartConfig}
                  style={styles.chart}
                  fromZero
                  yAxisLabel=""
                  yAxisSuffix=""
                />
              ) : (
                <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                  まだ仮眠の記録がありません
                </ThemedText>
              ))}
          </Card>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function hexToRgba(hex: string, opacity: number): string {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  chart: {
    borderRadius: Spacing.three,
    marginTop: Spacing.two,
  },
  empty: {
    paddingVertical: Spacing.four,
    textAlign: 'center',
  },
});
