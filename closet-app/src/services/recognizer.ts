import { Platform } from 'react-native';

import { dominantColors } from '@/domain/color';
import type { ItemAttributes } from '@/domain/types';

export interface ItemRecognizer {
  recognize(uri: string): Promise<Partial<ItemAttributes>>;
}

function loadImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('画像を読み込めませんでした'));
    img.src = uri;
  });
}

const SIZE = 32;

/** PoC: 写真の中央60%から主な色を2色推定する(Web のみ) */
export const ruleRecognizer: ItemRecognizer = {
  async recognize(uri) {
    if (Platform.OS !== 'web') return {};
    try {
      const img = await loadImage(uri);
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const g = canvas.getContext('2d');
      if (!g) return {};
      g.drawImage(img, 0, 0, SIZE, SIZE);
      const margin = Math.round(SIZE * 0.2);
      const side = SIZE - margin * 2;
      const data = g.getImageData(margin, margin, side, side).data;
      const colors = dominantColors(data, 2);
      return colors.length ? { colors } : {};
    } catch {
      return {};
    }
  },
};
