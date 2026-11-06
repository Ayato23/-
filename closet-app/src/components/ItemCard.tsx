import { Pressable, StyleSheet, Text, View } from 'react-native';

import { subcategoryLabel } from '@/domain/catalog';
import type { Item } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';

import { ItemPhoto } from './ItemPhoto';

const STATUS_LABEL = { laundry: '洗濯中', cleaning: 'クリーニング中' } as const;

export function ItemCard({ item, onPress, selected }: { item: Item; onPress?: () => void; selected?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subcategoryLabel(item.subcategory)}
      onPress={onPress}
      style={[styles.card, selected && { borderColor: theme.accent, borderWidth: 3 }]}
    >
      <ItemPhoto uri={item.photoUri} style={styles.photo} />
      {item.status !== 'available' && (
        <View style={[styles.badge, { backgroundColor: theme.danger }]}>
          <Text style={styles.badgeText}>{STATUS_LABEL[item.status]}</Text>
        </View>
      )}
      <Text numberOfLines={1} style={[styles.caption, { color: theme.text }]}>
        {item.brand ? `${item.brand} ` : ''}
        {subcategoryLabel(item.subcategory)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, borderRadius: 12, borderWidth: 0, borderColor: 'transparent', gap: 4 },
  photo: { width: '100%', aspectRatio: 1 },
  badge: { position: 'absolute', top: 6, left: 6, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  caption: { fontSize: 12 },
});
