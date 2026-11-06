import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ChipSelect } from '@/components/ChipSelect';
import { ItemCard } from '@/components/ItemCard';
import { Body, Button, Screen } from '@/components/ui';
import { CATEGORIES } from '@/domain/catalog';
import type { Category } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/state/store';

type Filter = Category | 'all';
const FILTERS: { id: Filter; label: string }[] = [{ id: 'all', label: 'すべて' }, ...CATEGORIES];

export default function ClosetScreen() {
  const { items, ready } = useStore();
  const theme = useTheme();
  const [filter, setFilter] = useState<Filter>('all');
  const shown = items.filter((i) => filter === 'all' || i.category === filter);
  const rows: (typeof shown)[] = [];
  for (let i = 0; i < shown.length; i += 3) rows.push(shown.slice(i, i + 3));

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <View style={styles.header}>
          <Text style={[styles.count, { color: theme.textSecondary }]}>{items.length}着</Text>
          <Link href="/outfit/manual" asChild>
            <Pressable accessibilityRole="button">
              <Text style={{ color: theme.accent, fontSize: 15, fontWeight: '600' }}>手組みする</Text>
            </Pressable>
          </Link>
        </View>
        <ChipSelect options={FILTERS} value={filter} onChange={setFilter} />
        {ready && items.length === 0 && (
          <Body muted>まだ服が登録されていません。右下の「＋」から写真を撮って登録しましょう。</Body>
        )}
        {rows.map((row, idx) => (
          <View key={idx} style={styles.row}>
            {row.map((item) => (
              <ItemCard key={item.id} item={item} onPress={() => router.push(`/item/${item.id}`)} />
            ))}
            {Array.from({ length: 3 - row.length }).map((_, k) => (
              <View key={`pad${k}`} style={{ flex: 1 }} />
            ))}
          </View>
        ))}
      </Screen>
      <View style={styles.fab}>
        <Button title="＋ 服を追加" onPress={() => router.push('/item/new')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  count: { fontSize: 14 },
  row: { flexDirection: 'row', gap: 10 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
