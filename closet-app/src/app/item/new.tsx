import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EMPTY_ATTRS, ItemForm } from '@/components/ItemForm';
import { ItemPhoto } from '@/components/ItemPhoto';
import { Body, Button, Screen } from '@/components/ui';
import type { ItemAttributes } from '@/domain/types';
import { pickPhoto, savePhoto } from '@/services/photos';
import { ruleRecognizer } from '@/services/recognizer';
import { generateId } from '@/services/storage';
import { useStore } from '@/state/store';

export default function NewItemScreen() {
  const { addItem } = useStore();
  const [uri, setUri] = useState<string | null>(null);
  const [initial, setInitial] = useState<ItemAttributes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (source: 'camera' | 'library') => {
    setError(null);
    try {
      const picked = await pickPhoto(source);
      if (!picked) return;
      setBusy(true);
      const guess = await ruleRecognizer.recognize(picked);
      setUri(picked);
      setInitial({ ...EMPTY_ATTRS, ...guess });
    } catch (e) {
      setError(e instanceof Error ? e.message : '写真を読み込めませんでした');
    } finally {
      setBusy(false);
    }
  };

  const submit = async (attrs: ItemAttributes) => {
    if (!uri) return;
    setBusy(true);
    try {
      const id = generateId();
      const stored = await savePhoto(id, uri);
      await addItem(attrs, stored, id);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? `保存できませんでした: ${e.message}` : '保存できませんでした');
      setBusy(false);
    }
  };

  return (
    <Screen>
      {uri ? <ItemPhoto uri={uri} style={styles.photo} /> : <Body muted>服を1枚ずつ、なるべく無地の背景で撮影してください。</Body>}
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Button title="📷 撮影" variant="secondary" onPress={() => pick('camera')} disabled={busy} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="🖼 アルバムから" variant="secondary" onPress={() => pick('library')} disabled={busy} />
        </View>
      </View>
      {error && <Body style={{ color: '#C0453A' }}>{error}</Body>}
      {initial && (
        <>
          <Body muted>写真から色を推定しました。違っていたら直してください。</Body>
          <ItemForm key={uri ?? ''} initial={initial} onSubmit={submit} submitLabel={busy ? '保存中…' : 'クローゼットに追加'} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 1, maxHeight: 360 },
  row: { flexDirection: 'row', gap: 10 },
});
