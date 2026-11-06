import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

const DB_NAME = 'closet-photos';
const STORE = 'photos';
const MAX_SIDE = 1024;

export async function pickPhoto(source: 'camera' | 'library'): Promise<string | null> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', quality: 1 };
  const result =
    source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  const landscape = asset.width >= asset.height;
  const needsResize = Math.max(asset.width, asset.height) > MAX_SIDE;
  const ctx = ImageManipulator.manipulate(asset.uri);
  if (needsResize) ctx.resize(landscape ? { width: MAX_SIDE } : { height: MAX_SIDE });
  const ref = await ctx.renderAsync();
  const saved = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  return saved.uri;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => {
      db.close();
      resolve(req.result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

function assertWeb() {
  if (Platform.OS !== 'web') throw new Error('写真の保存はWeb版のみ対応しています(未対応)');
}

export async function savePhoto(itemId: string, uri: string): Promise<string> {
  assertWeb();
  const blob = await (await fetch(uri)).blob();
  await withStore('readwrite', (s) => s.put(blob, itemId));
  return `idb:${itemId}`;
}

const urlCache = new Map<string, string>();

export async function resolvePhoto(photoUri: string): Promise<string | null> {
  if (!photoUri) return null;
  if (!photoUri.startsWith('idb:')) return photoUri;
  if (Platform.OS !== 'web') return null;
  const cached = urlCache.get(photoUri);
  if (cached) return cached;
  try {
    const blob = await withStore<Blob | undefined>('readonly', (s) => s.get(photoUri.slice(4)) as IDBRequest<Blob | undefined>);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    urlCache.set(photoUri, url);
    return url;
  } catch {
    return null;
  }
}

export async function deletePhoto(photoUri: string): Promise<void> {
  if (!photoUri.startsWith('idb:') || Platform.OS !== 'web') return;
  const cached = urlCache.get(photoUri);
  if (cached) URL.revokeObjectURL(cached);
  urlCache.delete(photoUri);
  await withStore('readwrite', (s) => s.delete(photoUri.slice(4)));
}

export async function clearPhotos(): Promise<void> {
  if (Platform.OS !== 'web') return;
  urlCache.forEach((u) => URL.revokeObjectURL(u));
  urlCache.clear();
  await withStore('readwrite', (s) => s.clear());
}
