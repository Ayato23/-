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

/** メンズの標準的なクローゼット(各カテゴリ3〜5着) */
export function standardCloset(): Item[] {
  return [
    makeItem({ id: 'shirtW', category: 'tops', subcategory: 'shirt', colors: ['white'], formality: 4, tastes: ['kireime'] }),
    makeItem({ id: 'knitN', category: 'tops', subcategory: 'knit', colors: ['navy'], material: 'wool', warmth: 3, formality: 3, tastes: ['chic'] }),
    makeItem({ id: 'teeG', category: 'tops', subcategory: 'tshirt', colors: ['gray'], formality: 2 }),
    makeItem({ id: 'teeB', category: 'tops', subcategory: 'tshirt', colors: ['black'], formality: 2 }),
    makeItem({ id: 'slacksC', category: 'bottoms', subcategory: 'slacks', colors: ['charcoal'], material: 'wool', formality: 4 }),
    makeItem({ id: 'jeans', category: 'bottoms', subcategory: 'jeans', colors: ['blue'], material: 'denim', formality: 2 }),
    makeItem({ id: 'chinos', category: 'bottoms', subcategory: 'chinos', colors: ['beige'], formality: 3 }),
    makeItem({ id: 'jacketN', category: 'outer', subcategory: 'tailoredJacket', colors: ['navy'], material: 'wool', warmth: 3, formality: 4 }),
    makeItem({ id: 'down', category: 'outer', subcategory: 'downJacket', colors: ['black'], material: 'down', warmth: 5, formality: 2, waterResistant: true }),
    makeItem({ id: 'coat', category: 'outer', subcategory: 'coat', colors: ['camel'], material: 'wool', warmth: 4, formality: 4 }),
    makeItem({ id: 'suitB', category: 'onepiece', subcategory: 'setup', colors: ['black'], material: 'wool', warmth: 3, formality: 5 }),
    makeItem({ id: 'leather', category: 'shoes', subcategory: 'leatherShoes', colors: ['black'], material: 'leather', formality: 4 }),
    makeItem({ id: 'canvas', category: 'shoes', subcategory: 'sneakers', colors: ['white'], material: 'canvas', formality: 1 }),
    makeItem({ id: 'suedeBoots', category: 'shoes', subcategory: 'boots', colors: ['brown'], material: 'suede', formality: 2 }),
    makeItem({ id: 'wrBoots', category: 'shoes', subcategory: 'boots', colors: ['black'], material: 'leather', formality: 2, waterResistant: true }),
    makeItem({ id: 'tote', category: 'bag', subcategory: 'tote', colors: ['black'], material: 'leather', formality: 3 }),
    makeItem({ id: 'necklace', category: 'accessory', subcategory: 'necklace', colors: ['silver'], shiny: true, formality: 2 }),
  ];
}
