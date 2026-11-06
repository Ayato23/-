import AsyncStorage from '@react-native-async-storage/async-storage';

import { createCollection, loadValue, resetAll, saveValue } from '../storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

beforeEach(() => AsyncStorage.clear());

it('round-trips a collection', async () => {
  const c = createCollection<{ id: string; n: number }>('things');
  await c.save([{ id: 'a', n: 1 }]);
  expect(await c.load()).toEqual([{ id: 'a', n: 1 }]);
});

it('backs up corrupt data and returns an empty list', async () => {
  await AsyncStorage.setItem('closet:v1:things', '{not json');
  const c = createCollection<{ id: string }>('things');
  expect(await c.load()).toEqual([]);
  const keys = await AsyncStorage.getAllKeys();
  const backup = keys.find((k) => k.startsWith('closet:v1:corrupt:'));
  expect(backup).toBeDefined();
  expect(await AsyncStorage.getItem(backup!)).toBe('{not json');
});

it('treats a non-array value as corrupt', async () => {
  await AsyncStorage.setItem('closet:v1:things', '{"a":1}');
  expect(await createCollection<{ id: string }>('things').load()).toEqual([]);
});

it('loadValue falls back and saveValue persists', async () => {
  expect(await loadValue('profile', { x: 1 })).toEqual({ x: 1 });
  await saveValue('profile', { x: 2 });
  expect(await loadValue('profile', { x: 1 })).toEqual({ x: 2 });
});

it('resetAll removes only closet keys', async () => {
  await AsyncStorage.setItem('other', 'keep');
  await saveValue('profile', { x: 2 });
  await resetAll();
  expect(await AsyncStorage.getAllKeys()).toEqual(['other']);
});
