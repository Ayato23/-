import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ScoreSelector } from '@/components/score-selector';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { nowTimeString, todayString } from '@/lib/date';
import {
  cancelNapEvaluationReminder,
  ensureNotificationPermission,
  playTimerCompleteHaptic,
  REMINDER_DELAY_SECONDS,
  scheduleNapEvaluationReminder,
  type NapResultParams,
} from '@/lib/notifications';
import { LOCATION_PRESETS, POSTURES, type LocationPreset, type Posture } from '@/lib/types';
import { useTheme } from '@/hooks/use-theme';

const DURATION_OPTIONS = [10, 15, 20, 30];
const DEFAULT_DURATION = 20;
const MIN_DURATION = 5;
const MAX_DURATION = 60;

type Phase = 'setup' | 'running';

/**
 * Optional params to pre-fill the form, e.g. from QuickStartButton or a recommendation:
 * /nap/start?place=デスク&posture=座位&minutes=20&autostart=1
 */
type NapStartParams = {
  place?: string;
  posture?: string;
  minutes?: string;
  autostart?: string;
};

function initialLocation(place: string | undefined): { preset: LocationPreset; custom: string } {
  const trimmed = place?.trim() ?? '';
  if ((LOCATION_PRESETS as readonly string[]).includes(trimmed)) {
    return { preset: trimmed as LocationPreset, custom: '' };
  }
  if (trimmed) return { preset: 'その他', custom: trimmed };
  return { preset: LOCATION_PRESETS[0], custom: '' };
}

function initialPosture(posture: string | undefined): Posture {
  return (POSTURES as readonly string[]).includes(posture ?? '') ? (posture as Posture) : POSTURES[0];
}

function initialDuration(minutes: string | undefined): number {
  const value = Math.round(Number(minutes));
  if (!minutes || !Number.isFinite(value)) return DEFAULT_DURATION;
  return Math.min(MAX_DURATION, Math.max(MIN_DURATION, value));
}

export default function NapStartScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<NapStartParams>();

  const [locationPreset, setLocationPreset] = useState<LocationPreset>(
    () => initialLocation(params.place).preset,
  );
  const [customLocation, setCustomLocation] = useState(() => initialLocation(params.place).custom);
  const [posture, setPosture] = useState<Posture>(() => initialPosture(params.posture));
  const [durationMinutes, setDurationMinutes] = useState(() => initialDuration(params.minutes));
  const [preNapSleepiness, setPreNapSleepiness] = useState<number>();

  const [phase, setPhase] = useState<Phase>('setup');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const startTimeRef = useRef<string>('');
  const startedAtRef = useRef(0);
  const endAtRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishedRef = useRef(false);
  const autoStartedRef = useRef(false);
  // Resolves to the scheduled evaluation reminder's id (undefined if not scheduled).
  const reminderRef = useRef<Promise<string | undefined>>(Promise.resolve(undefined));

  useEffect(() => {
    if (params.autostart === '1' && !autoStartedRef.current) {
      autoStartedRef.current = true;
      startTimer();
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      // Nap abandoned (screen closed mid-timer): drop its reminder.
      if (startedAtRef.current && !finishedRef.current) {
        reminderRef.current.then(cancelNapEvaluationReminder);
      }
    };
  }, []);

  const buildResultParams = (actualMinutes: number): NapResultParams => {
    const location = locationPreset === 'その他' && customLocation.trim() ? customLocation.trim() : locationPreset;
    return {
      date: todayString(new Date(startedAtRef.current)),
      start_time: startTimeRef.current,
      duration_minutes: String(actualMinutes),
      location_tag: location,
      posture,
      pre_nap_sleepiness: preNapSleepiness ? String(preNapSleepiness) : '',
    };
  };

  const finishNap = async (actualMinutes: number, early: boolean) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (intervalRef.current) clearInterval(intervalRef.current);
    const resultParams = buildResultParams(actualMinutes);
    let reminderId = await reminderRef.current;
    if (early) {
      // The pre-scheduled reminder assumed the full duration; re-schedule from now.
      await cancelNapEvaluationReminder(reminderId);
      reminderId = await scheduleNapEvaluationReminder(resultParams, REMINDER_DELAY_SECONDS);
    }
    router.replace({
      pathname: '/nap/result',
      params: { ...resultParams, reminder_id: reminderId ?? '' },
    });
  };

  const startTimer = () => {
    const now = Date.now();
    startTimeRef.current = nowTimeString(new Date(now));
    startedAtRef.current = now;
    endAtRef.current = now + durationMinutes * 60 * 1000;
    setRemainingSeconds(durationMinutes * 60);
    setPhase('running');

    // Ask for permission now (while the user is awake) and schedule the evaluation
    // reminder for "end of nap + 5 min". Scheduling up front keeps it reliable even if
    // the app is suspended during the nap.
    const fullParams = buildResultParams(durationMinutes);
    reminderRef.current = ensureNotificationPermission().then((granted) =>
      granted
        ? scheduleNapEvaluationReminder(fullParams, durationMinutes * 60 + REMINDER_DELAY_SECONDS)
        : undefined,
    );

    // Derive remaining time from the wall clock so the countdown catches up after backgrounding.
    intervalRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      setRemainingSeconds(remaining);
      if (remaining <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (Platform.OS !== 'web') Vibration.vibrate();
        playTimerCompleteHaptic();
        finishNap(durationMinutes, false);
      }
    }, 1000);
  };

  const stopEarly = () => {
    const elapsedSeconds = (Date.now() - startedAtRef.current) / 1000;
    const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    finishNap(elapsedMinutes, true);
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
              onPress={() => setDurationMinutes((m) => Math.max(MIN_DURATION, m - 5))}
            >
              <ThemedText type="smallBold">-5</ThemedText>
            </Pressable>
            <ThemedText type="subtitle">{durationMinutes}分</ThemedText>
            <Pressable
              style={[styles.stepperButton, { backgroundColor: theme.background, borderColor: theme.border }]}
              onPress={() => setDurationMinutes((m) => Math.min(MAX_DURATION, m + 5))}
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
