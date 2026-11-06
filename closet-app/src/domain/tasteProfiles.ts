import type { BaseColor, Pattern, Taste } from './types';

export interface TasteProfile {
  colors: Partial<Record<BaseColor, number>>;
  patterns: Partial<Record<Pattern, number>>;
  materials: Record<string, number>;
}

const VIVID: Partial<Record<BaseColor, number>> = { red: -1, yellow: -1, orange: -1, pink: -0.6, blue: -0.6, green: -0.6, purple: -0.6 };

export const TASTE_PROFILES: Record<Taste, TasteProfile> = {
  chic: {
    colors: { ...VIVID, black: 1, gray: 0.8, charcoal: 1, navy: 0.9, beige: 0.7, white: 0.4, burgundy: 0.4, camel: 0.4 },
    patterns: { solid: 1, stripe: 0, check: -0.4, print: -1 },
    materials: { wool: 1, leather: 0.8, silk: 0.8, knit: 0.4, cotton: 0, denim: -0.6, canvas: -0.6, synthetic: -0.2 },
  },
  casual: {
    colors: { white: 0.6, navy: 0.6, gray: 0.5, khaki: 0.6, blue: 0.5, lightBlue: 0.5, olive: 0.4, beige: 0.4, red: 0.2 },
    patterns: { solid: 0.4, stripe: 0.6, check: 0.6, print: 0.2 },
    materials: { cotton: 1, denim: 1, canvas: 0.8, nylon: 0.4, knit: 0.4, silk: -0.6, leather: 0 },
  },
  kireime: {
    colors: { white: 0.8, navy: 0.9, beige: 0.8, gray: 0.6, black: 0.6, lightBlue: 0.6, camel: 0.6, pink: 0.2, red: -0.4, yellow: -0.4 },
    patterns: { solid: 1, stripe: 0.4, check: 0, print: -0.6 },
    materials: { wool: 0.8, cotton: 0.4, silk: 0.8, leather: 0.6, knit: 0.4, denim: -0.4, canvas: -0.6, nylon: -0.4 },
  },
  street: {
    colors: { black: 0.8, white: 0.6, gray: 0.4, olive: 0.6, khaki: 0.6, red: 0.4, orange: 0.4, yellow: 0.3 },
    patterns: { solid: 0.2, stripe: 0.2, check: 0.4, print: 0.8 },
    materials: { cotton: 0.6, nylon: 0.8, denim: 0.8, canvas: 0.6, synthetic: 0.4, silk: -0.8, wool: -0.2 },
  },
  natural: {
    colors: { beige: 1, white: 0.8, brown: 0.8, khaki: 0.8, olive: 0.8, camel: 0.6, green: 0.4, black: -0.4, red: -0.6, purple: -0.6 },
    patterns: { solid: 0.8, stripe: 0.4, check: 0.4, print: 0 },
    materials: { linen: 1, cotton: 1, knit: 0.6, wool: 0.4, denim: 0.2, synthetic: -0.6, nylon: -0.6 },
  },
  mode: {
    colors: { black: 1, white: 0.6, charcoal: 0.8, gray: 0.6, silver: 0.4, burgundy: 0.2, beige: -0.2, camel: -0.4, orange: -0.6 },
    patterns: { solid: 1, stripe: 0, check: -0.6, print: -0.2 },
    materials: { wool: 0.6, leather: 1, synthetic: 0.4, silk: 0.4, denim: -0.4, linen: -0.4, canvas: -0.6 },
  },
};
