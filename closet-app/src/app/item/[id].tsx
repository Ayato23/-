import { Stack, router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ChipSelect } from '@/components/ChipSelect';
import { ItemForm } from '@/components/ItemForm';
import { ItemPhoto } from '@/components/ItemPhoto';
import { Body, Button, Card, Label, Screen, confirmAsync } from '@/components/ui';
import { subcategoryLabel } from '@/domain/catalog';
import type { Item } from '@/domain/types';
import { useStore } from '@/state/store';

const STATUSES: { id: Item['status']; label: string }[] = [
  { id: 'available', label: '着られる' },
  { id: 'laundry', label: '洗濯中' },
  { id: 'cleaning', label: 'クリーニング中' },
];

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, outfits, wearLogs, updateItem, deleteItem } = useStore();
  const item = items.find((i) => i.id === id);
  if (!item) {
    return (
      <Screen>
        <Body muted>この服は見つかりませんでした(削除された可能性があります)。</Body>
      </Screen>
    );
  }
  const outfitIds = new Set(outfits.filter((o) => o.itemIds.includes(item.id)).map((o) => o.id));
  const wears = wearLogs.filter((w) => outfitIds.has(w.outfitId)).length;
  const perWear = item.price !== undefined && wears > 0 ? Math.round(item.price / wears) : undefined;
  const { id: _id, photoUri: _p, createdAt: _c, status: _s, ...attrs } = item;

  const remove = async () => {
    if (!(await confirmAsync('この服を削除しますか?'))) return;
    await deleteItem(item.id);
    router.back();
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: subcategoryLabel(item.subcategory) }} />
      <ItemPhoto uri={item.photoUri} style={styles.photo} />
      <Card>
        <Label>状態</Label>
        <ChipSelect options={STATUSES} value={item.status} onChange={(status) => updateItem(item.id, { status })} />
        <View style={styles.stats}>
          <Body>着用 {wears} 回</Body>
          <Body>
            1回あたり {item.price === undefined ? '価格未登録' : perWear === undefined ? '未着用' : `¥${perWear.toLocaleString()}`}
          </Body>
        </View>
      </Card>
      <ItemForm key={item.id} initial={attrs} onSubmit={(a) => updateItem(item.id, a).then(() => router.back())} submitLabel="変更を保存" />
      <Button title="この服を削除" variant="danger" onPress={remove} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 1, maxHeight: 360 },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
});
