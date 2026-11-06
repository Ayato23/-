export const Colors = {
  light: {
    background: '#FAF8F5',
    surface: '#FFFFFF',
    text: '#1F1D1A',
    textSecondary: '#6B665E',
    accent: '#3E5C76',
    accentText: '#FFFFFF',
    border: '#E6E1DA',
    danger: '#C0453A',
    chip: '#EFEAE3',
  },
  dark: {
    background: '#141312',
    surface: '#1F1D1B',
    text: '#F3F0EB',
    textSecondary: '#A9A39A',
    accent: '#8FB3D4',
    accentText: '#0E1720',
    border: '#34312D',
    danger: '#F08A80',
    chip: '#2A2724',
  },
} as const;

export type Theme = { [K in keyof typeof Colors.light]: string };
