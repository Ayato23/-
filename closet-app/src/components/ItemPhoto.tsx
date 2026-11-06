import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View, type ImageStyle, type StyleProp } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { resolvePhoto } from '@/services/photos';

export function ItemPhoto({ uri, style, label }: { uri: string | undefined; style?: StyleProp<ImageStyle>; label?: string }) {
  const theme = useTheme();
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!uri) {
      setSrc(null);
      return;
    }
    resolvePhoto(uri).then((s) => alive && setSrc(s));
    return () => {
      alive = false;
    };
  }, [uri]);
  if (!src) {
    return (
      <View style={[styles.placeholder, { backgroundColor: theme.chip, borderColor: theme.border }, style as object]}>
        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{label ?? '写真なし'}</Text>
      </View>
    );
  }
  return <Image source={{ uri: src }} style={[styles.image, style]} resizeMode="cover" />;
}

const styles = StyleSheet.create({
  image: { borderRadius: 10 },
  placeholder: { borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
