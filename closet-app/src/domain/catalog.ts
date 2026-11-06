import type { BaseColor, Category, Occasion, Pattern, Season, Taste } from './types';

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'tops', label: 'トップス' },
  { id: 'bottoms', label: 'ボトムス' },
  { id: 'outer', label: 'アウター' },
  { id: 'onepiece', label: 'ワンピース' },
  { id: 'shoes', label: '靴' },
  { id: 'bag', label: 'バッグ' },
  { id: 'accessory', label: '小物' },
];

export const SUBCATEGORIES: { id: string; category: Category; label: string }[] = [
  { id: 'tshirt', category: 'tops', label: 'Tシャツ' },
  { id: 'shirt', category: 'tops', label: 'シャツ' },
  { id: 'blouse', category: 'tops', label: 'ブラウス' },
  { id: 'knit', category: 'tops', label: 'ニット' },
  { id: 'sweat', category: 'tops', label: 'スウェット・パーカー' },
  { id: 'cutsew', category: 'tops', label: 'カットソー' },
  { id: 'slacks', category: 'bottoms', label: 'スラックス' },
  { id: 'jeans', category: 'bottoms', label: 'デニムパンツ' },
  { id: 'chinos', category: 'bottoms', label: 'チノパン' },
  { id: 'shorts', category: 'bottoms', label: 'ショートパンツ' },
  { id: 'skirt', category: 'bottoms', label: 'スカート' },
  { id: 'wideP', category: 'bottoms', label: 'ワイドパンツ' },
  { id: 'tailoredJacket', category: 'outer', label: 'テーラードジャケット' },
  { id: 'coat', category: 'outer', label: 'コート' },
  { id: 'downJacket', category: 'outer', label: 'ダウンジャケット' },
  { id: 'raincoat', category: 'outer', label: 'レインコート' },
  { id: 'cardigan', category: 'outer', label: 'カーディガン' },
  { id: 'blouson', category: 'outer', label: 'ブルゾン' },
  { id: 'dress', category: 'onepiece', label: 'ワンピース・ドレス' },
  { id: 'setup', category: 'onepiece', label: 'セットアップ・スーツ' },
  { id: 'sneakers', category: 'shoes', label: 'スニーカー' },
  { id: 'leatherShoes', category: 'shoes', label: '革靴' },
  { id: 'loafers', category: 'shoes', label: 'ローファー' },
  { id: 'pumps', category: 'shoes', label: 'パンプス' },
  { id: 'heels', category: 'shoes', label: 'ヒール' },
  { id: 'boots', category: 'shoes', label: 'ブーツ' },
  { id: 'rainBoots', category: 'shoes', label: 'レインブーツ' },
  { id: 'sandals', category: 'shoes', label: 'サンダル' },
  { id: 'tote', category: 'bag', label: 'トート' },
  { id: 'shoulder', category: 'bag', label: 'ショルダー' },
  { id: 'clutch', category: 'bag', label: 'クラッチ・パーティーバッグ' },
  { id: 'backpack', category: 'bag', label: 'リュック' },
  { id: 'necklace', category: 'accessory', label: 'アクセサリー' },
  { id: 'scarf', category: 'accessory', label: 'マフラー・ストール' },
  { id: 'hat', category: 'accessory', label: '帽子' },
  { id: 'tie', category: 'accessory', label: 'ネクタイ' },
  { id: 'watch', category: 'accessory', label: '時計' },
];

export const MATERIALS: { id: string; label: string }[] = [
  { id: 'cotton', label: '綿' },
  { id: 'wool', label: 'ウール' },
  { id: 'linen', label: 'リネン' },
  { id: 'synthetic', label: '化繊' },
  { id: 'nylon', label: 'ナイロン' },
  { id: 'leather', label: 'レザー' },
  { id: 'suede', label: 'スエード' },
  { id: 'denim', label: 'デニム' },
  { id: 'canvas', label: 'キャンバス' },
  { id: 'knit', label: 'ニット' },
  { id: 'down', label: 'ダウン' },
  { id: 'silk', label: 'シルク' },
];

export const BASE_COLORS: { id: BaseColor; label: string; hex: string }[] = [
  { id: 'black', label: '黒', hex: '#141414' },
  { id: 'white', label: '白', hex: '#F5F5F2' },
  { id: 'gray', label: 'グレー', hex: '#9A9A9A' },
  { id: 'charcoal', label: 'チャコール', hex: '#4A4A4D' },
  { id: 'navy', label: 'ネイビー', hex: '#1F2A4D' },
  { id: 'beige', label: 'ベージュ', hex: '#D9C7A7' },
  { id: 'brown', label: 'ブラウン', hex: '#6B4A2F' },
  { id: 'camel', label: 'キャメル', hex: '#B5844E' },
  { id: 'khaki', label: 'カーキ', hex: '#8F8A5C' },
  { id: 'olive', label: 'オリーブ', hex: '#5C5E33' },
  { id: 'green', label: 'グリーン', hex: '#2F7A45' },
  { id: 'blue', label: 'ブルー', hex: '#2D5DBF' },
  { id: 'lightBlue', label: 'ライトブルー', hex: '#9CC3E6' },
  { id: 'red', label: 'レッド', hex: '#C62F2F' },
  { id: 'burgundy', label: 'ボルドー', hex: '#6E1F2E' },
  { id: 'pink', label: 'ピンク', hex: '#E8A1B8' },
  { id: 'purple', label: 'パープル', hex: '#6D4A93' },
  { id: 'yellow', label: 'イエロー', hex: '#E9C93A' },
  { id: 'orange', label: 'オレンジ', hex: '#E07A2E' },
  { id: 'gold', label: 'ゴールド', hex: '#C8A44D' },
  { id: 'silver', label: 'シルバー', hex: '#BFC3C7' },
];

export const BASIC_COLORS: BaseColor[] = ['black', 'white', 'gray', 'charcoal', 'navy', 'beige', 'brown', 'camel'];

export const PATTERNS: { id: Pattern; label: string }[] = [
  { id: 'solid', label: '無地' },
  { id: 'stripe', label: 'ストライプ' },
  { id: 'check', label: 'チェック' },
  { id: 'print', label: '柄' },
];

export const SEASONS: { id: Season; label: string }[] = [
  { id: 'spring', label: '春' },
  { id: 'summer', label: '夏' },
  { id: 'autumn', label: '秋' },
  { id: 'winter', label: '冬' },
];

export const OCCASIONS: { id: Occasion; label: string }[] = [
  { id: 'everyday', label: '普段' },
  { id: 'office', label: '通勤' },
  { id: 'date', label: 'デート' },
  { id: 'rain', label: '雨の日' },
  { id: 'snowEvent', label: '雪のイベント' },
  { id: 'outdoor', label: 'アウトドア' },
  { id: 'weddingGuest', label: '結婚式(ゲスト)' },
  { id: 'funeral', label: '葬儀・法事' },
  { id: 'party', label: 'パーティー' },
];

export const TASTES: { id: Taste; label: string }[] = [
  { id: 'chic', label: 'シック' },
  { id: 'casual', label: 'カジュアル' },
  { id: 'kireime', label: 'きれいめ' },
  { id: 'street', label: 'ストリート' },
  { id: 'natural', label: 'ナチュラル' },
  { id: 'mode', label: 'モード' },
];

export function labelOf<T extends string>(list: { id: T; label: string }[], id: T | undefined): string {
  return list.find((x) => x.id === id)?.label ?? '';
}

export function subcategoryLabel(id: string): string {
  return SUBCATEGORIES.find((s) => s.id === id)?.label ?? id;
}

export function seasonOf(dateISO: string): Season {
  const month = Number(dateISO.slice(5, 7));
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}
