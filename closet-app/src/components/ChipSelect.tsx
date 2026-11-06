import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type Option<T extends string | number> = { id: T; label: string };

type Props<T extends string | number> =
  | { options: Option<T>[]; multiple: true; value: T[]; onChange: (v: T[]) => void; swatch?: (id: T) => string | undefined }
  | { options: Option<T>[]; multiple?: false; value: T | undefined; onChange: (v: T) => void; swatch?: (id: T) => string | undefined; allowDeselect?: boolean };

export function ChipSelect<T extends string | number>(props: Props<T>) {
  const theme = useTheme();
  const selected = (id: T) => (props.multiple ? props.value.includes(id) : props.value === id);
  const toggle = (id: T) => {
    if (props.multiple) {
      props.onChange(props.value.includes(id) ? props.value.filter((v) => v !== id) : [...props.value, id]);
    } else {
      props.onChange(id);
    }
  };
  return (
    <View style={styles.wrap}>
      {props.options.map((o) => {
        const on = selected(o.id);
        const sw = props.swatch?.(o.id);
        return (
          <Pressable
            key={String(o.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => toggle(o.id)}
            style={[
              styles.chip,
              { backgroundColor: on ? theme.accent : theme.chip, borderColor: on ? theme.accent : theme.border },
            ]}
          >
            {sw && <View style={[styles.swatch, { backgroundColor: sw, borderColor: theme.border }]} />}
            <Text style={{ color: on ? theme.accentText : theme.text, fontSize: 14 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  swatch: { width: 14, height: 14, borderRadius: 7, borderWidth: 1 },
});
