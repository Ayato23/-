import type { ItemAttributes, Profile } from './types';

export interface Staple {
  id: string;
  label: string;
  searchKeyword: string;
  styles: Profile['style'][];
  item: ItemAttributes;
}

const ALL: Profile['style'][] = ['mens', 'womens', 'unisex'];
const M: Profile['style'][] = ['mens', 'unisex'];
const W: Profile['style'][] = ['womens', 'unisex'];

const base = (p: Partial<ItemAttributes> & Pick<ItemAttributes, 'category' | 'subcategory' | 'colors'>): ItemAttributes => ({
  pattern: 'solid',
  material: 'cotton',
  seasons: [],
  warmth: 2,
  formality: 3,
  volume: 'regular',
  tastes: [],
  waterResistant: false,
  shiny: false,
  ...p,
});

export const STAPLES: Staple[] = [
  { id: 'whiteShirt', label: '白の無地シャツ', searchKeyword: '白シャツ 無地 ブロード', styles: ALL, item: base({ category: 'tops', subcategory: 'shirt', colors: ['white'], formality: 4, tastes: ['kireime', 'chic'] }) },
  { id: 'blueShirt', label: 'サックスブルーのシャツ', searchKeyword: 'サックスブルー シャツ', styles: ALL, item: base({ category: 'tops', subcategory: 'shirt', colors: ['lightBlue'], formality: 3, tastes: ['kireime'] }) },
  { id: 'whiteTee', label: '白の無地Tシャツ', searchKeyword: '白Tシャツ 厚手 無地', styles: ALL, item: base({ category: 'tops', subcategory: 'tshirt', colors: ['white'], formality: 2, tastes: ['casual'] }) },
  { id: 'blackTee', label: '黒の無地Tシャツ', searchKeyword: '黒Tシャツ 無地', styles: ALL, item: base({ category: 'tops', subcategory: 'tshirt', colors: ['black'], formality: 2, tastes: ['mode', 'street'] }) },
  { id: 'borderTee', label: 'ボーダーカットソー', searchKeyword: 'ボーダー カットソー 紺白', styles: ALL, item: base({ category: 'tops', subcategory: 'cutsew', colors: ['white', 'navy'], pattern: 'stripe', formality: 2, tastes: ['casual'] }) },
  { id: 'navyKnit', label: 'ネイビーのクルーネックニット', searchKeyword: 'クルーネック ニット ネイビー ウール', styles: ALL, item: base({ category: 'tops', subcategory: 'knit', colors: ['navy'], material: 'wool', warmth: 3, formality: 3, tastes: ['chic', 'kireime'] }) },
  { id: 'grayKnit', label: 'グレーのニット', searchKeyword: 'グレー ニット ウール', styles: ALL, item: base({ category: 'tops', subcategory: 'knit', colors: ['gray'], material: 'wool', warmth: 3, formality: 3, tastes: ['chic'] }) },
  { id: 'grayHoodie', label: 'グレーのパーカー', searchKeyword: 'グレー パーカー スウェット', styles: ALL, item: base({ category: 'tops', subcategory: 'sweat', colors: ['gray'], warmth: 3, formality: 1, volume: 'loose', tastes: ['casual', 'street'] }) },
  { id: 'whiteBlouse', label: 'きれいめブラウス', searchKeyword: 'ブラウス とろみ ベージュ', styles: W, item: base({ category: 'tops', subcategory: 'blouse', colors: ['beige'], material: 'synthetic', formality: 4, tastes: ['kireime'] }) },
  { id: 'blackSlacks', label: '黒のスラックス', searchKeyword: '黒 スラックス テーパード', styles: ALL, item: base({ category: 'bottoms', subcategory: 'slacks', colors: ['black'], material: 'wool', formality: 4, tastes: ['chic', 'mode'] }) },
  { id: 'graySlacks', label: 'グレーのスラックス', searchKeyword: 'グレー スラックス ウール', styles: ALL, item: base({ category: 'bottoms', subcategory: 'slacks', colors: ['gray'], material: 'wool', formality: 4, tastes: ['kireime'] }) },
  { id: 'indigoJeans', label: '濃紺のストレートデニム', searchKeyword: 'デニム 濃紺 ストレート', styles: ALL, item: base({ category: 'bottoms', subcategory: 'jeans', colors: ['navy'], material: 'denim', formality: 2, tastes: ['casual'] }) },
  { id: 'beigeChinos', label: 'ベージュのチノパン', searchKeyword: 'チノパン ベージュ', styles: ALL, item: base({ category: 'bottoms', subcategory: 'chinos', colors: ['beige'], formality: 3, tastes: ['casual', 'natural'] }) },
  { id: 'blackSkirt', label: '黒のロングスカート', searchKeyword: 'ロングスカート 黒 プリーツ', styles: W, item: base({ category: 'bottoms', subcategory: 'skirt', colors: ['black'], material: 'synthetic', formality: 3, length: 'long', tastes: ['chic'] }) },
  { id: 'navyJacket', label: 'ネイビーのテーラードジャケット', searchKeyword: 'テーラードジャケット ネイビー', styles: ALL, item: base({ category: 'outer', subcategory: 'tailoredJacket', colors: ['navy'], material: 'wool', warmth: 3, formality: 4, tastes: ['kireime', 'chic'] }) },
  { id: 'trench', label: 'ベージュのトレンチコート', searchKeyword: 'トレンチコート ベージュ 撥水', styles: ALL, item: base({ category: 'outer', subcategory: 'coat', colors: ['beige'], warmth: 3, formality: 4, waterResistant: true, tastes: ['kireime', 'chic'] }) },
  { id: 'chesterCoat', label: 'チャコールのチェスターコート', searchKeyword: 'チェスターコート チャコール ウール', styles: ALL, item: base({ category: 'outer', subcategory: 'coat', colors: ['charcoal'], material: 'wool', warmth: 4, formality: 4, length: 'long', tastes: ['chic', 'mode'] }) },
  { id: 'blackDown', label: '黒のダウンジャケット', searchKeyword: 'ダウンジャケット 黒 撥水', styles: ALL, item: base({ category: 'outer', subcategory: 'downJacket', colors: ['black'], material: 'down', warmth: 5, formality: 2, waterResistant: true, tastes: ['casual', 'street'] }) },
  { id: 'navyCardigan', label: 'ネイビーのカーディガン', searchKeyword: 'カーディガン ネイビー', styles: ALL, item: base({ category: 'outer', subcategory: 'cardigan', colors: ['navy'], material: 'knit', warmth: 2, formality: 3, tastes: ['kireime'] }) },
  { id: 'navySuit', label: 'ネイビーのスーツ', searchKeyword: 'スーツ ネイビー 無地', styles: M, item: base({ category: 'onepiece', subcategory: 'setup', colors: ['navy'], material: 'wool', warmth: 3, formality: 5, tastes: ['kireime'] }) },
  { id: 'navyDress', label: 'ネイビーのワンピース', searchKeyword: 'ワンピース ネイビー きれいめ', styles: W, item: base({ category: 'onepiece', subcategory: 'dress', colors: ['navy'], material: 'synthetic', warmth: 2, formality: 4, tastes: ['kireime', 'chic'] }) },
  { id: 'whiteSneakers', label: '白のレザースニーカー', searchKeyword: '白 レザースニーカー', styles: ALL, item: base({ category: 'shoes', subcategory: 'sneakers', colors: ['white'], material: 'leather', formality: 2, tastes: ['casual', 'kireime'] }) },
  { id: 'wrSneakers', label: '撥水の黒レザースニーカー', searchKeyword: '撥水 レザースニーカー 黒', styles: ALL, item: base({ category: 'shoes', subcategory: 'sneakers', colors: ['black'], material: 'leather', formality: 2, waterResistant: true, tastes: ['casual'] }) },
  { id: 'blackLeather', label: '黒の革靴', searchKeyword: '革靴 黒 ストレートチップ', styles: M, item: base({ category: 'shoes', subcategory: 'leatherShoes', colors: ['black'], material: 'leather', formality: 4, tastes: ['kireime', 'chic'] }) },
  { id: 'loafers', label: '黒のローファー', searchKeyword: 'ローファー 黒', styles: ALL, item: base({ category: 'shoes', subcategory: 'loafers', colors: ['black'], material: 'leather', formality: 3, tastes: ['kireime', 'chic'] }) },
  { id: 'blackPumps', label: '黒のパンプス', searchKeyword: 'パンプス 黒 5cm', styles: W, item: base({ category: 'shoes', subcategory: 'pumps', colors: ['black'], material: 'leather', formality: 4, tastes: ['kireime'] }) },
  { id: 'sideGore', label: '防水のサイドゴアブーツ', searchKeyword: 'サイドゴアブーツ 防水 黒', styles: ALL, item: base({ category: 'shoes', subcategory: 'boots', colors: ['black'], material: 'leather', formality: 3, waterResistant: true, tastes: ['chic', 'casual'] }) },
  { id: 'blackTote', label: '黒のレザートート', searchKeyword: 'レザートート 黒 A4', styles: ALL, item: base({ category: 'bag', subcategory: 'tote', colors: ['black'], material: 'leather', formality: 3, tastes: ['chic', 'kireime'] }) },
  { id: 'clutch', label: 'パーティーバッグ', searchKeyword: 'パーティーバッグ 結婚式', styles: W, item: base({ category: 'bag', subcategory: 'clutch', colors: ['beige'], material: 'synthetic', formality: 5, tastes: ['kireime'] }) },
  { id: 'grayScarf', label: 'グレーのマフラー', searchKeyword: 'マフラー グレー カシミヤ', styles: ALL, item: base({ category: 'accessory', subcategory: 'scarf', colors: ['gray'], material: 'wool', formality: 3, tastes: ['chic'] }) },
];
