import { evaluate } from '../critic';
import { ctx, makeItem, weather, womens } from './fixtures';

const base = () => [
  makeItem({ id: 't', category: 'tops', colors: ['white'], warmth: 2, formality: 3 }),
  makeItem({ id: 'b', category: 'bottoms', colors: ['gray'], warmth: 2, formality: 3 }),
  makeItem({ id: 's', category: 'shoes', subcategory: 'leatherShoes', colors: ['black'], material: 'leather', formality: 3 }),
];

describe('color', () => {
  it('gives full marks to a 3-color outfit', () => {
    expect(evaluate(base(), ctx()).breakdown.color).toBe(25);
  });
  it('gives 10 to a 5-color all-basic solid outfit', () => {
    const items = [
      ...base(),
      makeItem({ category: 'outer', colors: ['navy'] }),
      makeItem({ category: 'bag', colors: ['beige'] }),
    ];
    expect(evaluate(items, ctx()).breakdown.color).toBe(10);
  });
});

it('zeroes occasion and lists violations for a white dress at a wedding', () => {
  const items = [
    makeItem({ category: 'onepiece', subcategory: 'dress', colors: ['white'], formality: 4 }),
    makeItem({ category: 'shoes', subcategory: 'pumps', colors: ['beige'], formality: 4 }),
  ];
  const e = evaluate(items, ctx({ occasion: 'weddingGuest', profile: womens }));
  expect(e.breakdown.occasion).toBe(0);
  expect(e.violations.length).toBeGreaterThan(0);
});

it('penalizes too-warm clothes on a 28℃ day', () => {
  const items = [
    makeItem({ category: 'tops', warmth: 5 }),
    makeItem({ category: 'bottoms', warmth: 5 }),
    makeItem({ category: 'shoes' }),
  ];
  expect(evaluate(items, ctx({ weather: weather({ tempMax: 32, tempMin: 24 }) })).breakdown.weather).toBeLessThan(20);
});

it('removes exactly 10 weather points for suede shoes in rain', () => {
  const items = [...base().slice(0, 2), makeItem({ category: 'shoes', subcategory: 'loafers', material: 'suede', colors: ['black'] })];
  const dry = evaluate(items, ctx({ weather: weather({ precipProb: 10 }) })).breakdown.weather;
  const wet = evaluate(items, ctx({ weather: weather({ precipProb: 80 }) })).breakdown.weather;
  expect(dry - wet).toBe(10);
});

it('penalizes loose top with loose bottoms', () => {
  const items = [
    makeItem({ category: 'tops', volume: 'loose' }),
    makeItem({ category: 'bottoms', volume: 'loose' }),
    makeItem({ category: 'shoes' }),
  ];
  expect(evaluate(items, ctx()).breakdown.silhouette).toBeLessThanOrEqual(9);
});

it('suggests swapping suede shoes for waterproof boots in rain', () => {
  const suede = makeItem({ id: 'suede', category: 'shoes', subcategory: 'loafers', material: 'suede', colors: ['black'] });
  const boots = makeItem({ id: 'wr', category: 'shoes', subcategory: 'boots', material: 'leather', colors: ['black'], waterResistant: true });
  const items = [...base().slice(0, 2), suede];
  const e = evaluate(items, ctx({ occasion: 'rain', weather: weather({ precipProb: 80 }) }), [...items, boots]);
  expect(e.swaps[0]).toMatchObject({ fromItemId: 'suede', toItemId: 'wr' });
  expect(e.swaps[0].gain).toBeGreaterThan(0);
});

it('total equals rounded breakdown sum', () => {
  const e = evaluate(base(), ctx({ weather: weather({ precipProb: 80 }) }));
  const sum = Object.values(e.breakdown).reduce((a, b) => a + b, 0);
  expect(e.total).toBe(Math.round(sum));
});
