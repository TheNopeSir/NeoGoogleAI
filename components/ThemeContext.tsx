import { createContext, useContext } from 'react';

export type Theme = 'dark' | 'light' | 'xp' | 'winamp';

export const ThemeContext = createContext<Theme>('dark');
export const useTheme = (): Theme => useContext(ThemeContext);
