import { dominantColors, nearestBaseColor, outfitColors } from '../color';
import { makeItem } from './fixtures';

describe('nearestBaseColor', () => {
  it('maps pure black and white', () => {
    expect(nearestBaseColor(0, 0, 0)).toBe('black');
    expect(nearestBaseColor(255, 255, 255)).toBe('white');
  });
  it('maps a dark blue to navy', () => {
    expect(nearestBaseColor(20, 30, 90)).toBe('navy');
  });
});

describe('dominantColors', () => {
  const px = (r: number, g: number, b: number, a = 255, n = 1) => Array.from({ length: n }, () => [r, g, b, a]).flat();
  it('orders by frequency', () => {
    const pixels = [...px(200, 40, 40, 255, 100), ...px(255, 255, 255, 255, 20)];
    expect(dominantColors(pixels)).toEqual(['red', 'white']);
  });
  it('ignores transparent pixels', () => {
    const pixels = [...px(0, 0, 0, 0, 100), ...px(255, 255, 255, 255, 5)];
    expect(dominantColors(pixels)).toEqual(['white']);
  });
});

it('outfitColors dedupes and ignores sub colors of shoes', () => {
  const items = [
    makeItem({ category: 'tops', colors: ['white', 'navy'] }),
    makeItem({ category: 'bottoms', colors: ['navy'] }),
    makeItem({ category: 'shoes', colors: ['black', 'red'] }),
  ];
  expect(outfitColors(items).sort()).toEqual(['black', 'navy', 'white']);
});
