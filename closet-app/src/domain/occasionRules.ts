import { BASIC_COLORS } from './catalog';
import type { BaseColor, Category, Item, Occasion, Profile } from './types';

export interface Rule {
  id: string;
  label: string;
  test: (item: Item, profile: Profile) => boolean;
}

export interface Requirement extends Rule {
  categories: Category[];
  searchKeyword: string;
  styles?: Profile['style'][];
}

export interface OutfitRule {
  label: string;
  test: (items: Item[], profile: Profile) => boolean;
}

export interface OccasionRule {
  id: Occasion;
  formality?: [number, number];
  /** 当てはまったら NG */
  forbid: Rule[];
  /** コーデ全体で当てはまったら NG */
  outfitForbid: OutfitRule[];
  /** コーデに必ず1点含める */
  require: Requirement[];
  /** 無くても組めるが、持っていないなら買い足し提案に出す */
  wishes: Requirement[];
  /** 当てはまる服1点ごとの加点(エンジンの並び順に使う) */
  prefer: (Rule & { bonus: number })[];
  warmthOffset: number;
}

const CLOTHING: Category[] = ['tops', 'bottoms', 'outer', 'onepiece'];
const isClothing = (i: Item) => CLOTHING.includes(i.category);
const main = (i: Item): BaseColor | undefined => i.colors[0];
const isShoe = (i: Item, ...subs: string[]) => i.category === 'shoes' && subs.includes(i.subcategory);

const suedeOrCanvasShoes: Rule = {
  id: 'suedeCanvasShoes',
  label: 'スエード・キャンバスの靴は濡れに弱い',
  test: (i) => i.category === 'shoes' && (i.material === 'suede' || i.material === 'canvas'),
};
const sandals: Rule = { id: 'sandals', label: 'サンダルは不向き', test: (i) => isShoe(i, 'sandals') };
const loungewear: Rule = {
  id: 'loungewear',
  label: '部屋着レベルの服は不向き',
  test: (i) => isClothing(i) && i.formality === 1,
};

export const OCCASION_RULES: Record<Occasion, OccasionRule> = {
  everyday: { id: 'everyday', formality: [1, 3], forbid: [], outfitForbid: [], require: [], wishes: [], prefer: [], warmthOffset: 0 },
  office: {
    id: 'office',
    formality: [3, 4],
    forbid: [
      sandals,
      { id: 'casualShoes', label: '通勤にはカジュアルすぎる靴', test: (i) => i.category === 'shoes' && i.formality < 3 },
    ],
    outfitForbid: [],
    require: [],
    wishes: [
      {
        id: 'officeShoes',
        label: '通勤向けのきれいめな靴',
        categories: ['shoes'],
        searchKeyword: 'ビジネス 革靴 黒',
        test: (i) => i.category === 'shoes' && i.formality >= 3,
      },
    ],
    prefer: [],
    warmthOffset: 0,
  },
  date: { id: 'date', formality: [2, 4], forbid: [loungewear], outfitForbid: [], require: [], wishes: [], prefer: [], warmthOffset: 0 },
  rain: {
    id: 'rain',
    forbid: [suedeOrCanvasShoes],
    outfitForbid: [],
    require: [],
    wishes: [
      {
        id: 'rainShoes',
        label: '雨の日用の撥水の靴',
        categories: ['shoes'],
        searchKeyword: '撥水 レザースニーカー 黒',
        test: (i) => i.category === 'shoes' && i.waterResistant,
      },
      {
        id: 'rainOuter',
        label: '撥水のアウター',
        categories: ['outer'],
        searchKeyword: '撥水 ステンカラーコート',
        test: (i) => i.category === 'outer' && i.waterResistant,
      },
    ],
    prefer: [
      { id: 'wrShoes', label: '撥水の靴', bonus: 6, test: (i) => i.category === 'shoes' && i.waterResistant },
      { id: 'wrOuter', label: '撥水のアウター', bonus: 4, test: (i) => i.category === 'outer' && i.waterResistant },
      {
        id: 'darkBottoms',
        label: '濃い色のボトムス',
        bonus: 3,
        test: (i) => i.category === 'bottoms' && ['black', 'navy', 'charcoal', 'brown', 'olive'].includes(main(i) ?? ''),
      },
    ],
    warmthOffset: 0,
  },
  snowEvent: {
    id: 'snowEvent',
    formality: [1, 3],
    forbid: [suedeOrCanvasShoes, sandals],
    outfitForbid: [],
    require: [
      {
        id: 'warmOuter',
        label: '防寒アウター',
        categories: ['outer'],
        searchKeyword: 'ダウンジャケット 防寒',
        test: (i) => i.category === 'outer' && i.warmth >= 4,
      },
      {
        id: 'waterproofShoes',
        label: '防水の靴',
        categories: ['shoes'],
        searchKeyword: 'スノーブーツ 防水',
        test: (i) => i.category === 'shoes' && i.waterResistant,
      },
    ],
    wishes: [],
    prefer: [],
    warmthOffset: 2,
  },
  outdoor: {
    id: 'outdoor',
    formality: [1, 2],
    forbid: [{ id: 'dressShoes', label: 'アウトドアに革靴・ヒールは不向き', test: (i) => isShoe(i, 'heels', 'pumps', 'leatherShoes') }],
    outfitForbid: [],
    require: [
      {
        id: 'activeShoes',
        label: 'スニーカーかブーツ',
        categories: ['shoes'],
        searchKeyword: 'トレッキングシューズ',
        test: (i) => isShoe(i, 'sneakers', 'boots', 'rainBoots'),
      },
    ],
    wishes: [],
    prefer: [],
    warmthOffset: 0,
  },
  weddingGuest: {
    id: 'weddingGuest',
    formality: [4, 5],
    forbid: [
      {
        id: 'white',
        label: '白は花嫁の色なので避ける',
        test: (i, p) =>
          main(i) === 'white' &&
          (i.category === 'onepiece' || i.category === 'outer' || (p.style !== 'mens' && isClothing(i))),
      },
      { id: 'denim', label: 'デニムはカジュアルすぎる', test: (i) => i.material === 'denim' },
      { id: 'sneakers', label: 'スニーカーはカジュアルすぎる', test: (i) => isShoe(i, 'sneakers') },
      sandals,
    ],
    outfitForbid: [
      {
        label: '全身黒は喪服に見えやすい',
        test: (items, p) => {
          if (p.style !== 'womens') return false;
          const clothes = items.filter(isClothing);
          return clothes.length > 0 && clothes.every((i) => main(i) === 'black');
        },
      },
    ],
    require: [
      {
        id: 'jacket',
        label: 'ジャケット(またはスーツ)',
        categories: ['outer', 'onepiece'],
        searchKeyword: 'テーラードジャケット ネイビー',
        styles: ['mens'],
        test: (i) => i.subcategory === 'tailoredJacket' || i.subcategory === 'setup',
      },
      {
        id: 'formalShoes',
        label: '革靴かパンプス',
        categories: ['shoes'],
        searchKeyword: '革靴 黒 ストレートチップ / パンプス',
        test: (i) => isShoe(i, 'leatherShoes', 'loafers', 'pumps', 'heels'),
      },
    ],
    wishes: [],
    prefer: [],
    warmthOffset: 0,
  },
  funeral: {
    id: 'funeral',
    formality: [5, 5],
    forbid: [
      { id: 'shiny', label: '光り物は避ける', test: (i) => i.shiny },
      { id: 'pattern', label: '柄物は避ける', test: (i) => i.pattern !== 'solid' },
      { id: 'nonBasic', label: '明るい色・差し色は避ける', test: (i) => !!main(i) && !BASIC_COLORS.includes(main(i)!) },
      {
        id: 'notDark',
        label: '黒か濃紺の服にする',
        test: (i, p) => {
          const c = main(i);
          if (!isClothing(i) && i.category !== 'shoes') return false;
          if (i.category === 'tops' && p.style === 'mens') return !['black', 'navy', 'charcoal', 'white'].includes(c ?? '');
          return !['black', 'navy', 'charcoal'].includes(c ?? '');
        },
      },
    ],
    outfitForbid: [],
    require: [],
    wishes: [
      {
        id: 'mourning',
        label: '黒の礼服(喪服)',
        categories: ['onepiece', 'outer'],
        searchKeyword: '礼服 ブラックフォーマル',
        test: (i) => (i.category === 'onepiece' || i.category === 'outer') && main(i) === 'black' && i.formality >= 5,
      },
    ],
    prefer: [],
    warmthOffset: 0,
  },
  party: { id: 'party', formality: [3, 5], forbid: [loungewear], outfitForbid: [], require: [], wishes: [], prefer: [], warmthOffset: 0 },
};

export function violations(item: Item, occasion: Occasion, profile: Profile): string[] {
  return OCCASION_RULES[occasion].forbid.filter((r) => r.test(item, profile)).map((r) => r.label);
}

export function outfitViolations(items: Item[], occasion: Occasion, profile: Profile): string[] {
  const rule = OCCASION_RULES[occasion];
  const perItem = items.flatMap((i) => violations(i, occasion, profile));
  const whole = rule.outfitForbid.filter((r) => r.test(items, profile)).map((r) => r.label);
  return [...new Set([...perItem, ...whole])];
}

export function activeRequirements(occasion: Occasion, profile: Profile, kind: 'require' | 'wishes' = 'require'): Requirement[] {
  return OCCASION_RULES[occasion][kind].filter((r) => !r.styles || r.styles.includes(profile.style));
}
