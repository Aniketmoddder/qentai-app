'use client';

import type { Dispatch, ReactNode, SetStateAction } from 'react';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getDefaultSiteTheme } from '@/services/siteSettingsService'; // New Import

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
    colors: { primary: '#8B5CF6', background: '#0A0A13'} // Original Default
  },
  { 
    value: 'light-pale-purple', 
    label: 'Elegant Light', 
    colors: { primary: '#6366F1', background: '#F9FAFB'} // Updated primary
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

const FALLBACK_DEFAULT_THEME: Theme = 'dark-purple-premium'; // Used if Firestore fetch fails or no default is set

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  availableThemes: ThemeOption[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(FALLBACK_DEFAULT_THEME);
  const [isInitialThemeLoaded, setIsInitialThemeLoaded] = useState(false);

  useEffect(() => {
    // This effect runs once on mount to determine the initial theme
    const determineInitialTheme = async () => {
      let initialTheme = FALLBACK_DEFAULT_THEME;
      if (typeof window !== 'undefined') {
        const storedUserTheme = localStorage.getItem('qentai-theme') as Theme | null;
        
        if (storedUserTheme && themes.some(t => t.value === storedUserTheme)) {
          initialTheme = storedUserTheme;
        } else {
          // No user preference, fetch site default
          const siteDefaultTheme = await getDefaultSiteTheme();
          if (siteDefaultTheme && themes.some(t => t.value === siteDefaultTheme)) {
            initialTheme = siteDefaultTheme;
          }
        }
      }
      setThemeState(initialTheme);
      setIsInitialThemeLoaded(true);
    };

    determineInitialTheme();
  }, []);


  useEffect(() => {
    // This effect applies the theme once it's determined (either initially or by user change)
    if (!isInitialThemeLoaded) return; // Don't run if initial theme isn't set yet

    const root = window.document.documentElement;
    root.setAttribute('data-theme', theme);
    
    // Update user's local preference if they changed it (not just applying fetched default)
    const storedUserTheme = localStorage.getItem('qentai-theme') as Theme | null;
    if (storedUserTheme !== theme) {
      localStorage.setItem('qentai-theme', theme);
    }

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

  }, [theme, isInitialThemeLoaded]);

  const setTheme = useCallback((newTheme: Theme) => {
    if (themes.some(t => t.value === newTheme)) {
      setThemeState(newTheme);
      // User explicitly sets theme, so store it as their preference
      if (typeof window !== 'undefined') {
        localStorage.setItem('qentai-theme', newTheme);
      }
    } else {
      console.warn(`Attempted to set invalid theme: ${newTheme}`);
      // Potentially revert to a known default or the current theme if invalid
      // For simplicity, we'll just log and not change if invalid.
    }
  }, []);

  if (!isInitialThemeLoaded) {
    // You can return a loading state here if the theme switch causes a flash
    // For example: return <div style={{ visibility: 'hidden' }}>{children}</div>;
    // Or a full-page loader if preferred. However, usually the FALLBACK_DEFAULT_THEME
    // provides a decent enough initial render.
    return null; 
  }

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