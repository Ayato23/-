import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import type { Item, ItemAttributes, Outfit, Profile, WearLog } from '@/domain/types';
import { clearPhotos, deletePhoto } from '@/services/photos';
import { createCollection, generateId, loadValue, resetAll as resetStorage, saveValue } from '@/services/storage';

const itemsDb = createCollection<Item>('items');
const outfitsDb = createCollection<Outfit>('outfits');
const wearDb = createCollection<WearLog>('wearLogs');

export const DEFAULT_PROFILE: Profile = { style: 'unisex', useLocation: true };

interface StoreValue {
  ready: boolean;
  items: Item[];
  outfits: Outfit[];
  wearLogs: WearLog[];
  profile: Profile;
  addItem(attrs: ItemAttributes, photoUri: string, id?: string): Promise<Item>;
  updateItem(id: string, patch: Partial<Item>): Promise<void>;
  deleteItem(id: string): Promise<void>;
  saveOutfit(o: Omit<Outfit, 'id' | 'createdAt'>): Promise<Outfit>;
  updateOutfit(id: string, patch: Partial<Outfit>): Promise<void>;
  logWear(outfitId: string, date: string): Promise<void>;
  setProfile(p: Profile): Promise<void>;
  resetAll(): Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [wearLogs, setWearLogs] = useState<WearLog[]>([]);
  const [profile, setProfileState] = useState<Profile>(DEFAULT_PROFILE);
  // 連続した操作でも最新の配列を元に保存するための参照
  const ref = useRef({ items, outfits, wearLogs });
  ref.current = { items, outfits, wearLogs };

  useEffect(() => {
    let alive = true;
    (async () => {
      const [i, o, w, p] = await Promise.all([
        itemsDb.load(),
        outfitsDb.load(),
        wearDb.load(),
        loadValue<Profile>('profile', DEFAULT_PROFILE),
      ]);
      if (!alive) return;
      setItems(i);
      setOutfits(o);
      setWearLogs(w);
      setProfileState({ ...DEFAULT_PROFILE, ...p });
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const commitItems = async (next: Item[]) => {
    ref.current.items = next;
    setItems(next);
    await itemsDb.save(next);
  };
  const commitOutfits = async (next: Outfit[]) => {
    ref.current.outfits = next;
    setOutfits(next);
    await outfitsDb.save(next);
  };

  const value: StoreValue = {
    ready,
    items,
    outfits,
    wearLogs,
    profile,
    async addItem(attrs, photoUri, id) {
      const item: Item = { ...attrs, id: id ?? generateId(), photoUri, status: 'available', createdAt: new Date().toISOString() };
      await commitItems([item, ...ref.current.items]);
      return item;
    },
    async updateItem(id, patch) {
      await commitItems(ref.current.items.map((i) => (i.id === id ? { ...i, ...patch, id } : i)));
    },
    async deleteItem(id) {
      const target = ref.current.items.find((i) => i.id === id);
      await commitItems(ref.current.items.filter((i) => i.id !== id));
      if (target?.photoUri) await deletePhoto(target.photoUri).catch(() => undefined);
    },
    async saveOutfit(o) {
      const outfit: Outfit = { ...o, id: generateId(), createdAt: new Date().toISOString() };
      await commitOutfits([outfit, ...ref.current.outfits]);
      return outfit;
    },
    async updateOutfit(id, patch) {
      await commitOutfits(ref.current.outfits.map((o) => (o.id === id ? { ...o, ...patch, id } : o)));
    },
    async logWear(outfitId, date) {
      const next = [{ id: generateId(), outfitId, date }, ...ref.current.wearLogs];
      ref.current.wearLogs = next;
      setWearLogs(next);
      await wearDb.save(next);
    },
    async setProfile(p) {
      setProfileState(p);
      await saveValue('profile', p);
    },
    async resetAll() {
      await resetStorage();
      await clearPhotos().catch(() => undefined);
      ref.current = { items: [], outfits: [], wearLogs: [] };
      setItems([]);
      setOutfits([]);
      setWearLogs([]);
      setProfileState(DEFAULT_PROFILE);
    },
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(StoreContext);
  if (!v) throw new Error('StoreProvider がありません');
  return v;
}

export function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
