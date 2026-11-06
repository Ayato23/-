import { outfitViolations, violations } from '../occasionRules';
import { makeItem, mens, womens } from './fixtures';

describe('violations', () => {
  it('flags a white blouse at a wedding for women', () => {
    const blouse = makeItem({ category: 'tops', subcategory: 'blouse', colors: ['white'] });
    expect(violations(blouse, 'weddingGuest', womens).join()).toContain('白');
  });
  it('flags a white dress at a wedding for anyone', () => {
    const dress = makeItem({ category: 'onepiece', subcategory: 'dress', colors: ['white'] });
    expect(violations(dress, 'weddingGuest', mens).join()).toContain('白');
  });
  it('allows a white dress shirt under a jacket for men at a wedding', () => {
    const shirt = makeItem({ category: 'tops', subcategory: 'shirt', colors: ['white'], formality: 4 });
    expect(violations(shirt, 'weddingGuest', mens)).toEqual([]);
  });
  it('flags shiny accessories at a funeral', () => {
    const acc = makeItem({ category: 'accessory', subcategory: 'necklace', colors: ['black'], shiny: true });
    expect(violations(acc, 'funeral', mens).length).toBeGreaterThan(0);
  });
  it('flags suede boots at a snow event', () => {
    const boots = makeItem({ category: 'shoes', subcategory: 'boots', material: 'suede', colors: ['brown'] });
    expect(violations(boots, 'snowEvent', mens).length).toBeGreaterThan(0);
  });
  it('flags canvas sneakers on a rainy day', () => {
    const s = makeItem({ category: 'shoes', subcategory: 'sneakers', material: 'canvas' });
    expect(violations(s, 'rain', mens).length).toBeGreaterThan(0);
  });
  it('allows a navy jacket at a wedding', () => {
    const j = makeItem({ category: 'outer', subcategory: 'tailoredJacket', colors: ['navy'], formality: 4 });
    expect(violations(j, 'weddingGuest', mens)).toEqual([]);
  });
});

describe('outfitViolations', () => {
  const allBlack = [
    makeItem({ category: 'onepiece', subcategory: 'dress', colors: ['black'] }),
    makeItem({ category: 'outer', subcategory: 'coat', colors: ['black'] }),
    makeItem({ category: 'shoes', subcategory: 'pumps', colors: ['black'] }),
  ];
  it('flags all-black for women at a wedding', () => {
    expect(outfitViolations(allBlack, 'weddingGuest', womens)).toHaveLength(1);
  });
  it('allows all-black for men at a wedding', () => {
    expect(outfitViolations(allBlack, 'weddingGuest', mens)).toHaveLength(0);
  });
});
