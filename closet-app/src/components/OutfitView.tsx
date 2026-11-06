import { StyleSheet, Text, View } from 'react-native';

import { BASE_COLORS, subcategoryLabel } from '@/domain/catalog';
import type { Category, Item } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';

import { ItemPhoto } from './ItemPhoto';

const ORDER: Category[] = ['outer', 'tops', 'onepiece', 'bottoms', 'shoes', 'bag', 'accessory'];

export function sortForDisplay(items: (Item | undefined)[]): (Item | undefined)[] {
  const known = items.filter((i): i is Item => !!i).sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category));
  const missing = items.filter((i) => !i);
  return [...known, ...missing];
}

export function OutfitView({ items, compact }: { items: (Item | undefined)[]; compact?: boolean }) {
  const theme = useTheme();
  const size = compact ? 44 : 72;
  return (
    <View style={compact ? styles.rowCompact : styles.column}>
      {sortForDisplay(items).map((item, idx) => (
        <View key={item?.id ?? `gone${idx}`} style={compact ? undefined : styles.row}>
          <ItemPhoto uri={item?.photoUri} style={{ width: size, height: size }} label={item ? undefined : '削除'} />
          {!compact && (
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontSize: 14 }}>{item ? subcategoryLabel(item.subcategory) : '削除された服'}</Text>
              {item && (
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                  {item.colors.map((c) => BASE_COLORS.find((b) => b.id === c)?.label).join('・')}
                  {item.brand ? ` / ${item.brand}` : ''}
                </Text>
              )}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  column: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowCompact: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
});
