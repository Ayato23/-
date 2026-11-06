export type Category = 'tops' | 'bottoms' | 'outer' | 'onepiece' | 'shoes' | 'bag' | 'accessory';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Taste = 'chic' | 'casual' | 'kireime' | 'street' | 'natural' | 'mode';
export type Occasion =
  | 'everyday'
  | 'office'
  | 'date'
  | 'rain'
  | 'snowEvent'
  | 'outdoor'
  | 'weddingGuest'
  | 'funeral'
  | 'party';
export type BaseColor =
  | 'black' | 'white' | 'gray' | 'charcoal' | 'navy' | 'beige' | 'brown'
  | 'camel' | 'khaki' | 'olive' | 'green' | 'blue' | 'lightBlue' | 'red'
  | 'burgundy' | 'pink' | 'purple' | 'yellow' | 'orange' | 'gold' | 'silver';
export type Pattern = 'solid' | 'stripe' | 'check' | 'print';
export type Level = 1 | 2 | 3 | 4 | 5;

export interface Item {
  id: string;
  photoUri: string;
  category: Category;
  subcategory: string;
  /** [メイン, サブ…] */
  colors: BaseColor[];
  pattern: Pattern;
  material: string;
  seasons: Season[];
  warmth: Level;
  formality: Level;
  volume: 'slim' | 'regular' | 'loose';
  length?: 'short' | 'regular' | 'long';
  tastes: Taste[];
  waterResistant: boolean;
  shiny: boolean;
  brand?: string;
  purchasedAt?: string;
  price?: number;
  status: 'available' | 'laundry' | 'cleaning';
  createdAt: string;
}

export type ItemAttributes = Omit<Item, 'id' | 'photoUri' | 'createdAt' | 'status'>;

export interface WeatherSnapshot {
  date: string;
  tempMax: number;
  tempMin: number;
  precipProb: number;
  snow: boolean;
  manual: boolean;
}

export interface Outfit {
  id: string;
  itemIds: string[];
  source: 'auto' | 'manual';
  occasion?: Occasion;
  taste?: Taste;
  weather?: WeatherSnapshot;
  rating?: Level;
  rejected: boolean;
  createdAt: string;
}

export interface WearLog {
  id: string;
  outfitId: string;
  /** YYYY-MM-DD */
  date: string;
}

export interface Profile {
  style: 'mens' | 'womens' | 'unisex';
  heightCm?: number;
  bodyType?: 'slim' | 'standard' | 'solid' | 'curvy';
  useLocation: boolean;
}

export interface Ctx {
  occasion: Occasion;
  taste: Taste;
  weather: WeatherSnapshot;
  profile: Profile;
  /** YYYY-MM-DD */
  today: string;
}
