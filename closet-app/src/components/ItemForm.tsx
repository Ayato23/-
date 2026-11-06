import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { BASE_COLORS, CATEGORIES, MATERIALS, PATTERNS, SEASONS, SUBCATEGORIES, TASTES } from '@/domain/catalog';
import type { Category, ItemAttributes, Level } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';

import { ChipSelect } from './ChipSelect';
import { Body, Button, Label } from './ui';

export const EMPTY_ATTRS: ItemAttributes = {
  category: 'tops',
  subcategory: 'tshirt',
  colors: [],
  pattern: 'solid',
  material: 'cotton',
  seasons: [],
  warmth: 2,
  formality: 2,
  volume: 'regular',
  tastes: [],
  waterResistant: false,
  shiny: false,
};

const LEVELS: { id: Level; label: string }[] = [1, 2, 3, 4, 5].map((n) => ({ id: n as Level, label: String(n) }));
const VOLUMES = [
  { id: 'slim' as const, label: '細身' },
  { id: 'regular' as const, label: '普通' },
  { id: 'loose' as const, label: 'ゆったり' },
];
const LENGTHS = [
  { id: 'short' as const, label: '短め' },
  { id: 'regular' as const, label: '普通' },
  { id: 'long' as const, label: '長め' },
];
const YES_NO = [
  { id: 'yes' as const, label: 'はい' },
  { id: 'no' as const, label: 'いいえ' },
];

export function ItemForm({
  initial,
  onSubmit,
  submitLabel = '保存する',
}: {
  initial: ItemAttributes;
  onSubmit: (attrs: ItemAttributes) => void;
  submitLabel?: string;
}) {
  const theme = useTheme();
  const [a, setA] = useState<ItemAttributes>(initial);
  const set = <K extends keyof ItemAttributes>(k: K, v: ItemAttributes[K]) => setA((prev) => ({ ...prev, [k]: v }));
  const subs = SUBCATEGORIES.filter((s) => s.category === a.category);
  const inputStyle = [styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }];
  const hasLength = ['bottoms', 'outer', 'onepiece'].includes(a.category);

  return (
    <View style={styles.form}>
      <Label>カテゴリ</Label>
      <ChipSelect
        options={CATEGORIES}
        value={a.category}
        onChange={(c: Category) => setA((p) => ({ ...p, category: c, subcategory: SUBCATEGORIES.find((s) => s.category === c)!.id }))}
      />
      <Label>種類</Label>
      <ChipSelect options={subs} value={a.subcategory} onChange={(v) => set('subcategory', v)} />
      <Label>色(最初に選んだ色がメイン)</Label>
      <ChipSelect multiple options={BASE_COLORS} value={a.colors} onChange={(v) => set('colors', v)} swatch={(id) => BASE_COLORS.find((c) => c.id === id)?.hex} />
      <Label>柄</Label>
      <ChipSelect options={PATTERNS} value={a.pattern} onChange={(v) => set('pattern', v)} />
      <Label>素材</Label>
      <ChipSelect options={MATERIALS} value={a.material} onChange={(v) => set('material', v)} />
      <Label>季節(未選択なら通年)</Label>
      <ChipSelect multiple options={SEASONS} value={a.seasons} onChange={(v) => set('seasons', v)} />
      <Label>暖かさ(1 薄手 〜 5 極厚)</Label>
      <ChipSelect options={LEVELS} value={a.warmth} onChange={(v) => set('warmth', v)} />
      <Label>フォーマル度(1 部屋着 〜 5 礼装)</Label>
      <ChipSelect options={LEVELS} value={a.formality} onChange={(v) => set('formality', v)} />
      <Label>シルエット</Label>
      <ChipSelect options={VOLUMES} value={a.volume} onChange={(v) => set('volume', v)} />
      {hasLength && (
        <>
          <Label>丈</Label>
          <ChipSelect options={LENGTHS} value={a.length ?? 'regular'} onChange={(v) => set('length', v)} />
        </>
      )}
      <Label>テイスト</Label>
      <ChipSelect multiple options={TASTES} value={a.tastes} onChange={(v) => set('tastes', v)} />
      <Label>撥水・防水</Label>
      <ChipSelect options={YES_NO} value={a.waterResistant ? 'yes' : 'no'} onChange={(v) => set('waterResistant', v === 'yes')} />
      <Label>光り物(ラメ・金属・エナメル)</Label>
      <ChipSelect options={YES_NO} value={a.shiny ? 'yes' : 'no'} onChange={(v) => set('shiny', v === 'yes')} />
      <Label>ブランド</Label>
      <TextInput style={inputStyle} value={a.brand ?? ''} onChangeText={(t) => set('brand', t || undefined)} placeholder="例: UNIQLO" placeholderTextColor={theme.textSecondary} />
      <Label>購入日(YYYY-MM-DD)</Label>
      <TextInput style={inputStyle} value={a.purchasedAt ?? ''} onChangeText={(t) => set('purchasedAt', t || undefined)} placeholder="2026-04-01" placeholderTextColor={theme.textSecondary} />
      <Label>価格(円)</Label>
      <TextInput
        style={inputStyle}
        value={a.price !== undefined ? String(a.price) : ''}
        onChangeText={(t) => {
          const n = Number(t.replace(/[^0-9]/g, ''));
          set('price', t.trim() === '' || Number.isNaN(n) ? undefined : n);
        }}
        keyboardType="number-pad"
        placeholder="5990"
        placeholderTextColor={theme.textSecondary}
      />
      {a.colors.length === 0 && <Body muted>色を1つ以上選んでください</Body>}
      <Button title={submitLabel} onPress={() => onSubmit(a)} disabled={a.colors.length === 0} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 10 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
});
