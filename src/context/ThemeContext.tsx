'use client';

import type { Dispatch, ReactNode, SetStateAction } from 'react';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type Theme = 'dark-purple-premium' | 'light-pale-purple' | 'kawaii-pink-vibe' | 'futuristic-cyberpunk';

export interface ThemeOption {
  value: Theme;
  label: string;
  colors: {
    primary: string;
    background: string;
  };
}

export const themes: ThemeOption[] = [
  { 
    value: 'dark-purple-premium', 
    label: 'Premium Anime Dark',
    colors: { primary: '#8B5CF6', background: '#0A0A13'}
  },
  { 
    value: 'light-pale-purple', 
    label: 'Elegant Light', 
    colors: { primary: '#7C3AED', background: '#F9FAFB'}
  },
  {
    value: 'kawaii-pink-vibe',
    label: 'Kawaii Pink Vibe',
    colors: { primary: '#EC4899', background: '#1A0A1E'}
  },
  { 
    value: 'futuristic-cyberpunk', 
    label: 'Futuristic Cyberpunk',
    colors: { primary: '#00FFFF', background: '#0F0F1A'}
  },
];

const DEFAULT_THEME: Theme = 'dark-purple-premium';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  availableThemes: ThemeOption[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('qentai-theme') as Theme | null;
      return storedTheme && themes.some(t => t.value === storedTheme) ? storedTheme : DEFAULT_THEME;
    }
    return DEFAULT_THEME;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute('data-theme', theme);
    localStorage.setItem('qentai-theme', theme);

    // Update meta theme-color for browser UI
    const currentThemeDetails = themes.find(t => t.value === theme);
    if (currentThemeDetails) {
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.setAttribute('name', 'theme-color');
            document.getElementsByTagName('head')[0].appendChild(metaThemeColor);
        }
        metaThemeColor.setAttribute('content', currentThemeDetails.colors.background);
    }

  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    if (themes.some(t => t.value === newTheme)) {
      setThemeState(newTheme);
    } else {
      console.warn(`Attempted to set invalid theme: ${newTheme}`);
      setThemeState(DEFAULT_THEME);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, availableThemes: themes }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
