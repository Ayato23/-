import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { ChipSelect } from '@/components/ChipSelect';
import { Body, Button, Card, Label, Screen, confirmAsync } from '@/components/ui';
import type { Profile } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/state/store';

const STYLES: { id: Profile['style']; label: string }[] = [
  { id: 'mens', label: 'メンズ' },
  { id: 'womens', label: 'レディース' },
  { id: 'unisex', label: '指定なし' },
];
const BODY: { id: NonNullable<Profile['bodyType']>; label: string }[] = [
  { id: 'slim', label: '細身' },
  { id: 'standard', label: '標準' },
  { id: 'solid', label: 'がっしり' },
  { id: 'curvy', label: '曲線的' },
];
const ONOFF = [
  { id: 'on' as const, label: '使う' },
  { id: 'off' as const, label: '使わない' },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const { profile, setProfile, resetAll } = useStore();
  const [height, setHeight] = useState(profile.heightCm ? String(profile.heightCm) : '');
  const update = (patch: Partial<Profile>) => setProfile({ ...profile, ...patch });

  const reset = async () => {
    if (!(await confirmAsync('服・コーデ・記録・写真をすべて削除します。よろしいですか?'))) return;
    await resetAll();
    router.replace('/closet');
  };

  return (
    <Screen>
      <Card>
        <Label>スタイル</Label>
        <ChipSelect options={STYLES} value={profile.style} onChange={(style) => update({ style })} />
        <Label>身長(cm)</Label>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          value={height}
          keyboardType="number-pad"
          accessibilityLabel="身長"
          onChangeText={(t) => {
            setHeight(t);
            const n = Number(t);
            update({ heightCm: t.trim() !== '' && Number.isFinite(n) && n > 0 ? n : undefined });
          }}
          placeholder="170"
          placeholderTextColor={theme.textSecondary}
        />
        <Label>体型</Label>
        <ChipSelect options={BODY} value={profile.bodyType} onChange={(bodyType) => update({ bodyType })} />
        <Label>天気の取得に位置情報を</Label>
        <ChipSelect options={ONOFF} value={profile.useLocation ? 'on' : 'off'} onChange={(v) => update({ useLocation: v === 'on' })} />
      </Card>
      <Body muted>データはこの端末(ブラウザ)の中だけに保存されます。外部に送るのは天気予報の取得(Open-Meteo)のみです。</Body>
      <Button title="データをすべて削除" variant="danger" onPress={reset} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
});
