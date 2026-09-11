import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ScoreSelector } from '@/components/score-selector';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { nowTimeString, todayString } from '@/lib/date';
import { LOCATION_PRESETS, POSTURES, type Posture } from '@/lib/types';
import { useTheme } from '@/hooks/use-theme';

const DURATION_OPTIONS = [10, 15, 20, 30];
const DEFAULT_DURATION = 20;

type Phase = 'setup' | 'running';

export default function NapStartScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [locationPreset, setLocationPreset] = useState<(typeof LOCATION_PRESETS)[number]>(
    LOCATION_PRESETS[0],
  );
  const [customLocation, setCustomLocation] = useState('');
  const [posture, setPosture] = useState<Posture>(POSTURES[0]);
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_DURATION);
  const [preNapSleepiness, setPreNapSleepiness] = useState<number>();

  const [phase, setPhase] = useState<Phase>('setup');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const startTimeRef = useRef<string>('');
  const totalSecondsRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const finishNap = (actualMinutes: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const location = locationPreset === 'その他' && customLocation.trim() ? customLocation.trim() : locationPreset;
    router.replace({
      pathname: '/nap/result',
      params: {
        date: todayString(),
        start_time: startTimeRef.current,
        duration_minutes: String(actualMinutes),
        location_tag: location,
        posture,
        pre_nap_sleepiness: preNapSleepiness ? String(preNapSleepiness) : '',
      },
    });
  };

  const startTimer = () => {
    startTimeRef.current = nowTimeString();
    totalSecondsRef.current = durationMinutes * 60;
    setRemainingSeconds(durationMinutes * 60);
    setPhase('running');
    intervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          if (Platform.OS !== 'web') Vibration.vibrate();
          finishNap(durationMinutes);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopEarly = () => {
    const elapsedSeconds = totalSecondsRef.current - remainingSeconds;
    const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    finishNap(elapsedMinutes);
  };

  if (phase === 'running') {
    const mm = Math.floor(remainingSeconds / 60)
      .toString()
      .padStart(2, '0');
    const ss = (remainingSeconds % 60).toString().padStart(2, '0');
    return (
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.timerSafeArea}>
          <ThemedText type="small" themeColor="textSecondary">
            仮眠中...
          </ThemedText>
          <ThemedText style={styles.timerText}>
            {mm}:{ss}
          </ThemedText>
          <Button label="中断して評価へ進む" variant="secondary" onPress={stopEarly} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <Card>
          <ThemedText type="smallBold">場所</ThemedText>
          <View style={styles.chipRow}>
            {LOCATION_PRESETS.map((preset) => (
              <Chip
                key={preset}
                label={preset}
                selected={locationPreset === preset}
                onPress={() => setLocationPreset(preset)}
              />
            ))}
          </View>
          {locationPreset === 'その他' && (
            <TextInput
              value={customLocation}
              onChangeText={setCustomLocation}
              placeholder="場所を入力(任意)"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.textInput,
                { color: theme.text, backgroundColor: theme.background, borderColor: theme.border },
              ]}
            />
          )}
        </Card>

        <Card>
          <ThemedText type="smallBold">姿勢</ThemedText>
          <View style={styles.chipRow}>
            {POSTURES.map((p) => (
              <Chip key={p} label={p} selected={posture === p} onPress={() => setPosture(p)} />
            ))}
          </View>
        </Card>

        <Card>
          <ThemedText type="smallBold">仮眠時間</ThemedText>
          <View style={styles.chipRow}>
            {DURATION_OPTIONS.map((d) => (
              <Chip
                key={d}
                label={`${d}分`}
                selected={durationMinutes === d}
                onPress={() => setDurationMinutes(d)}
              />
            ))}
          </View>
          <View style={styles.stepperRow}>
            <Pressable
              style={[styles.stepperButton, { backgroundColor: theme.background, borderColor: theme.border }]}
              onPress={() => setDurationMinutes((m) => Math.max(5, m - 5))}
            >
              <ThemedText type="smallBold">-5</ThemedText>
            </Pressable>
            <ThemedText type="subtitle">{durationMinutes}分</ThemedText>
            <Pressable
              style={[styles.stepperButton, { backgroundColor: theme.background, borderColor: theme.border }]}
              onPress={() => setDurationMinutes((m) => Math.min(60, m + 5))}
            >
              <ThemedText type="smallBold">+5</ThemedText>
            </Pressable>
          </View>
        </Card>

        <Card>
          <ScoreSelector
            label="仮眠前の眠気"
            value={preNapSleepiness}
            onChange={setPreNapSleepiness}
            lowLabel="眠くない"
            highLabel="非常に眠い"
          />
        </Card>

        <Button label="タイマー開始" onPress={startTimer} style={styles.startButton} />
      </SafeAreaView>
    </ThemedView>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.accent : theme.background,
          borderColor: selected ? theme.accent : theme.border,
        },
      ]}
    >
      <ThemedText type="small" style={{ color: selected ? theme.accentText : theme.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.three,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  timerSafeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.five,
  },
  timerText: {
    fontSize: 72,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
    borderWidth: 1,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
    marginTop: Spacing.one,
  },
  stepperButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
  startButton: {
    marginTop: Spacing.two,
  },
});
