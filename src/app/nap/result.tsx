import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ScoreSelector } from '@/components/score-selector';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { addNapLog } from '@/lib/napRepository';
import type { Posture } from '@/lib/types';

export default function NapResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    date: string;
    start_time: string;
    duration_minutes: string;
    location_tag: string;
    posture: string;
    pre_nap_sleepiness: string;
  }>();

  const [focus, setFocus] = useState<number>();
  const [postSleepiness, setPostSleepiness] = useState<number>();
  const [mood, setMood] = useState<number>();
  const [saving, setSaving] = useState(false);

  const canSave = focus !== undefined && postSleepiness !== undefined && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    await addNapLog({
      date: params.date,
      start_time: params.start_time,
      duration_minutes: Number(params.duration_minutes),
      location_tag: params.location_tag,
      posture: params.posture as Posture,
      pre_nap_sleepiness: params.pre_nap_sleepiness ? Number(params.pre_nap_sleepiness) : 0,
      post_nap_focus: focus!,
      post_nap_sleepiness: postSleepiness!,
      post_nap_mood: mood,
    });
    router.dismissAll();
  };

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <Card>
          <ThemedText type="smallBold" themeColor="textSecondary">
            仮眠内容
          </ThemedText>
          <ThemedText type="default">
            {params.location_tag} ・ {params.posture} ・ {params.duration_minutes}分
          </ThemedText>
        </Card>

        <Card>
          <ScoreSelector
            label="仮眠後の集中力"
            value={focus}
            onChange={setFocus}
            lowLabel="低い"
            highLabel="高い"
          />
        </Card>

        <Card>
          <ScoreSelector
            label="仮眠後の眠気"
            value={postSleepiness}
            onChange={setPostSleepiness}
            lowLabel="眠くない"
            highLabel="非常に眠い"
          />
        </Card>

        <Card>
          <ScoreSelector
            label="仮眠後の気分(任意)"
            value={mood}
            onChange={setMood}
            lowLabel="悪い"
            highLabel="良い"
          />
        </Card>

        <Button
          label="記録を保存"
          onPress={handleSave}
          disabled={!canSave}
          style={styles.saveButton}
        />
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
  saveButton: {
    marginTop: Spacing.two,
  },
});
