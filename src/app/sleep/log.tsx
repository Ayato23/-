import { useEffect, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TimeField } from '@/components/time-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { computeSleepHours, isValidTimeString, todayString } from '@/lib/date';
import { getTargetSleepHours, setTargetSleepHours } from '@/lib/settings';
import { addSleepLog } from '@/lib/sleepRepository';
import { useTheme } from '@/hooks/use-theme';

export default function SleepLogScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [bedtime, setBedtime] = useState('23:30');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [sleepHoursText, setSleepHoursText] = useState('');
  const [sleepHoursTouched, setSleepHoursTouched] = useState(false);
  const [targetHoursText, setTargetHoursText] = useState('7');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getTargetSleepHours().then((hours) => setTargetHoursText(String(hours)));
  }, []);

  useEffect(() => {
    if (sleepHoursTouched) return;
    const computed = computeSleepHours(bedtime, wakeTime);
    setSleepHoursText(computed !== null ? computed.toString() : '');
  }, [bedtime, wakeTime, sleepHoursTouched]);

  const timesValid = isValidTimeString(bedtime) && isValidTimeString(wakeTime);
  const sleepHours = Number(sleepHoursText);
  const targetHours = Number(targetHoursText);
  const canSave =
    timesValid && Number.isFinite(sleepHours) && sleepHours > 0 && Number.isFinite(targetHours) && targetHours > 0 && !saving;

  const debtPreview = canSave ? Math.round((targetHours - sleepHours) * 100) / 100 : null;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    await setTargetSleepHours(targetHours);
    await addSleepLog({
      date: todayString(),
      bedtime,
      wake_time: wakeTime,
      target_sleep_hours: targetHours,
      sleep_hours_override: sleepHoursTouched ? sleepHours : undefined,
    });
    router.dismissAll();
  };

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="small" themeColor="textSecondary">
          前夜の睡眠を記録しましょう
        </ThemedText>

        <Card>
          <TimeField label="就寝時刻" value={bedtime} onChange={setBedtime} />
          <TimeField label="起床時刻" value={wakeTime} onChange={setWakeTime} />
        </Card>

        <Card>
          <ThemedText type="smallBold">睡眠時間(時間)</ThemedText>
          <TextInput
            value={sleepHoursText}
            onChangeText={(t) => {
              setSleepHoursTouched(true);
              setSleepHoursText(t);
            }}
            keyboardType="decimal-pad"
            style={[
              styles.numberInput,
              { color: theme.text, backgroundColor: theme.background, borderColor: theme.border },
            ]}
          />
          <ThemedText type="small" themeColor="textSecondary">
            就寝・起床時刻から自動計算されます。手入力で上書きも可能です。
          </ThemedText>
        </Card>

        <Card>
          <ThemedText type="smallBold">目標睡眠時間(時間)</ThemedText>
          <TextInput
            value={targetHoursText}
            onChangeText={setTargetHoursText}
            keyboardType="decimal-pad"
            style={[
              styles.numberInput,
              { color: theme.text, backgroundColor: theme.background, borderColor: theme.border },
            ]}
          />
        </Card>

        {debtPreview !== null && (
          <Card>
            <ThemedText type="smallBold" themeColor="textSecondary">
              睡眠負債(プレビュー)
            </ThemedText>
            <ThemedText type="subtitle" style={{ color: debtPreview > 0 ? theme.danger : theme.accent }}>
              {debtPreview > 0 ? `+${debtPreview.toFixed(1)}` : debtPreview.toFixed(1)} 時間
            </ThemedText>
          </Card>
        )}

        <Button label="記録を保存" onPress={handleSave} disabled={!canSave} style={styles.saveButton} />
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
    paddingTop: Spacing.three,
    gap: Spacing.three,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  numberInput: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    fontSize: 20,
  },
  saveButton: {
    marginTop: Spacing.two,
  },
});
