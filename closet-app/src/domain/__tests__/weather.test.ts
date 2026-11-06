import { clothingWarmth, isRainy, needsOuter, warmthTarget } from '../weather';
import { makeItem, weather } from './fixtures';

describe('warmthTarget', () => {
  it('maps hot days to 2-4', () => {
    expect(warmthTarget(weather({ tempMax: 30, tempMin: 20 }))).toEqual({ min: 2, max: 4 });
  });
  it('maps 20℃ average to 3-6', () => {
    expect(warmthTarget(weather({ tempMax: 22, tempMin: 18 }))).toEqual({ min: 3, max: 6 });
  });
  it('puts exactly 5.0℃ in the 5-10 band', () => {
    expect(warmthTarget(weather({ tempMax: 7, tempMin: 3 }))).toEqual({ min: 9, max: 13 });
  });
  it('puts 4.9℃ in the coldest band', () => {
    expect(warmthTarget(weather({ tempMax: 6.9, tempMin: 2.9 }))).toEqual({ min: 12, max: 99 });
  });
  it('adds the offset to both ends', () => {
    expect(warmthTarget(weather({ tempMax: 22, tempMin: 18 }), 2)).toEqual({ min: 5, max: 8 });
  });
});

describe('needsOuter', () => {
  it('is true at 12℃', () => {
    expect(needsOuter(weather({ tempMax: 14, tempMin: 10 }))).toBe(true);
  });
  it('is false at 18℃', () => {
    expect(needsOuter(weather({ tempMax: 20, tempMin: 16 }))).toBe(false);
  });
});

it('isRainy uses 50% threshold', () => {
  expect(isRainy(weather({ precipProb: 50 }))).toBe(true);
  expect(isRainy(weather({ precipProb: 49 }))).toBe(false);
});

it('clothingWarmth ignores shoes, bags and accessories', () => {
  const items = [
    makeItem({ category: 'tops', warmth: 2 }),
    makeItem({ category: 'outer', warmth: 4 }),
    makeItem({ category: 'shoes', warmth: 5 }),
    makeItem({ category: 'bag', warmth: 5 }),
  ];
  expect(clothingWarmth(items)).toBe(6);
});
