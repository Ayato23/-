import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { OutfitView } from '@/components/OutfitView';
import { Body, Card, Screen, Title } from '@/components/ui';
import { OCCASIONS, labelOf } from '@/domain/catalog';
import type { Outfit } from '@/domain/types';
import { useStore } from '@/state/store';

export default function HistoryScreen() {
  const { wearLogs, outfits, items } = useStore();
  const byId = new Map(items.map((i) => [i.id, i]));
  const outfitById = new Map(outfits.map((o) => [o.id, o]));
  const logs = [...wearLogs].sort((a, b) => b.date.localeCompare(a.date));
  const rated = outfits.filter((o) => o.rating !== undefined || o.rejected);

  const row = (o: Outfit | undefined, key: string, head: string) => (
    <Pressable key={key} accessibilityRole="button" disabled={!o} onPress={() => o && router.push(`/outfit/${o.id}`)}>
      <Card>
        <Body style={{ fontWeight: '600' }}>{head}</Body>
        {o ? <OutfitView compact items={o.itemIds.map((id) => byId.get(id))} /> : <Body muted>削除されたコーデ</Body>}
      </Card>
    </Pressable>
  );

  return (
    <Screen>
      <Title>着た記録</Title>
      {logs.length === 0 && <Body muted>「今日これ着る」を押すとここに記録されます。</Body>}
      {logs.map((l) => {
        const o = outfitById.get(l.outfitId);
        return row(o, l.id, `${l.date}${o?.occasion ? ` ・ ${labelOf(OCCASIONS, o.occasion)}` : ''}`);
      })}
      <View style={styles.gap} />
      <Title>評価したコーデ</Title>
      {rated.length === 0 && <Body muted>⭐や「これはない」をつけたコーデが並びます。</Body>}
      {rated.map((o) =>
        row(o, o.id, `${o.rejected ? '🙅 これはない' : '★'.repeat(o.rating ?? 0)} ・ ${labelOf(OCCASIONS, o.occasion)} ・ ${o.source === 'manual' ? '手組み' : '自動提案'}`),
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({ gap: { height: 8 } });
