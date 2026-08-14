import { useColorScheme } from 'react-native';

export interface Theme {
  dark: boolean;
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  danger: string;
  success: string;
  bubbleUser: string;
  bubbleUserText: string;
}

const light: Theme = {
  dark: false,
  bg: '#FBFAF7',
  surface: '#FFFFFF',
  surfaceAlt: '#F2F0EA',
  border: '#E3DFD5',
  text: '#1B1A17',
  textMuted: '#6E6A60',
  accent: '#2F6F5E',
  accentSoft: '#DCEAE4',
  danger: '#B23A2F',
  success: '#2F6F4F',
  bubbleUser: '#2F6F5E',
  bubbleUserText: '#FFFFFF',
};

// Dark is designed, not inverted: warm near-black so it does not glare at 1am.
const dark: Theme = {
  dark: true,
  bg: '#14150F',
  surface: '#1D1E18',
  surfaceAlt: '#26271F',
  border: '#34362B',
  text: '#F0EEE4',
  textMuted: '#9C9A8D',
  accent: '#7FC8AE',
  accentSoft: '#22332C',
  danger: '#E8897C',
  success: '#7FC8AE',
  bubbleUser: '#2C4C41',
  bubbleUserText: '#F0EEE4',
};

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export const type = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const },
  title: { fontSize: 20, lineHeight: 27, fontWeight: '600' as const },
  body: { fontSize: 17, lineHeight: 27 },
  reading: { fontSize: 17, lineHeight: 29 },
  small: { fontSize: 14, lineHeight: 20 },
  tiny: { fontSize: 12, lineHeight: 16 },
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 18, pill: 999 };
