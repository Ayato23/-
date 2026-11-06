import { BASE_COLORS } from './catalog';
import type { BaseColor, Item } from './types';

type Lab = [number, number, number];

function toLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function rgbToLab(r: number, g: number, b: number): Lab {
  const R = toLinear(r);
  const G = toLinear(g);
  const B = toLinear(b);
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const PALETTE: { id: BaseColor; lab: Lab }[] = BASE_COLORS.map((c) => ({
  id: c.id,
  lab: rgbToLab(...hexToRgb(c.hex)),
}));

export function nearestBaseColor(r: number, g: number, b: number): BaseColor {
  const lab = rgbToLab(r, g, b);
  let best = PALETTE[0];
  let bestD = Infinity;
  for (const p of PALETTE) {
    const d = (lab[0] - p.lab[0]) ** 2 + (lab[1] - p.lab[1]) ** 2 + (lab[2] - p.lab[2]) ** 2;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best.id;
}

export function dominantColors(pixels: ArrayLike<number>, take = 2): BaseColor[] {
  const counts = new Map<BaseColor, number>();
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue;
    const c = nearestBaseColor(pixels[i], pixels[i + 1], pixels[i + 2]);
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, take)
    .map(([c]) => c);
}

const LARGE = new Set(['tops', 'bottoms', 'outer', 'onepiece']);

export function outfitColors(items: Item[]): BaseColor[] {
  const set = new Set<BaseColor>();
  for (const it of items) {
    if (it.colors[0]) set.add(it.colors[0]);
    if (LARGE.has(it.category)) it.colors.slice(1).forEach((c) => set.add(c));
  }
  return [...set];
}
