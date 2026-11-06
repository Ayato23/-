import type { Ctx, Item, Profile, WeatherSnapshot } from '../types';

let seq = 0;
export function makeItem(partial: Partial<Item> = {}): Item {
  seq += 1;
  return {
    id: partial.id ?? `i${seq}`,
    photoUri: '',
    category: 'tops',
    subcategory: 'tshirt',
    colors: ['white'],
    pattern: 'solid',
    material: 'cotton',
    seasons: [],
    warmth: 2,
    formality: 2,
    volume: 'regular',
    tastes: [],
    waterResistant: false,
    shiny: false,
    status: 'available',
    createdAt: '2026-11-01T00:00:00Z',
    ...partial,
  };
}

export const mens: Profile = { style: 'mens', useLocation: false };
export const womens: Profile = { style: 'womens', useLocation: false };

export function weather(partial: Partial<WeatherSnapshot> = {}): WeatherSnapshot {
  return { date: '2026-11-06', tempMax: 20, tempMin: 12, precipProb: 0, snow: false, manual: true, ...partial };
}

export function ctx(partial: Partial<Ctx> = {}): Ctx {
  return {
    occasion: 'everyday',
    taste: 'casual',
    weather: weather(),
    profile: mens,
    today: '2026-11-06',
    ...partial,
  };
}
