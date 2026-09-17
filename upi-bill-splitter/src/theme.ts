import { useColorScheme } from 'react-native';

export interface Theme {
  dark: boolean;
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textDim: string;
  accent: string;
  accentText: string;
  success: string;
  warning: string;
  danger: string;
}

export const darkTheme: Theme = {
  dark: true,
  bg: '#0B1120',
  surface: '#141C2F',
  surfaceAlt: '#1D283F',
  border: '#2A3550',
  text: '#F2F5FA',
  textDim: '#94A3B8',
  accent: '#3DDC97',
  accentText: '#04231A',
  success: '#3DDC97',
  warning: '#F2B544',
  danger: '#F2616B',
};

export const lightTheme: Theme = {
  dark: false,
  bg: '#F4F6FB',
  surface: '#FFFFFF',
  surfaceAlt: '#EDF1F8',
  border: '#DCE3EF',
  text: '#0B1120',
  textDim: '#5B6982',
  accent: '#0F9D6B',
  accentText: '#FFFFFF',
  success: '#0F9D6B',
  warning: '#B77A07',
  danger: '#C8353F',
};

export function useTheme(): Theme {
  return useColorScheme() === 'light' ? lightTheme : darkTheme;
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 18, pill: 999 };
