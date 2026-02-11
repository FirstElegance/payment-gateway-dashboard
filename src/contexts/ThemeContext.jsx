import { createContext, useContext, useState, useEffect } from 'react';

/**
 * Theme Context
 * จัดการ dark/light mode theme
 */
const ThemeContext = createContext(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Check localStorage first, then system preference
    try {
      const storedTheme = localStorage.getItem('elegance_theme');
      if (storedTheme === 'dark' || storedTheme === 'light') {
        return storedTheme;
      }
    } catch (e) {
      console.error('Error reading theme from localStorage:', e);
    }
    // Check system preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'light';
  });

  useEffect(() => {
    // Apply theme to document immediately on mount and when theme changes
    const root = document.documentElement;
    
    console.log('[ThemeContext] Applying theme:', theme);
    
    // Apply theme class
    if (theme === 'dark') {
      root.classList.add('dark');
      console.log('[ThemeContext] Added dark class to root');
    } else {
      root.classList.remove('dark');
      console.log('[ThemeContext] Removed dark class from root');
    }
    
    console.log('[ThemeContext] Root classes after change:', root.className);
    
    // Save to localStorage
    try {
      localStorage.setItem('elegance_theme', theme);
    } catch (e) {
      console.error('Error saving theme to localStorage:', e);
    }
  }, [theme]);

  const toggleTheme = () => {
    console.log('[ThemeContext] toggleTheme called, current theme:', theme);
    setTheme((prevTheme) => {
      const newTheme = prevTheme === 'dark' ? 'light' : 'dark';
      console.log('[ThemeContext] Theme changed from', prevTheme, 'to', newTheme);
      return newTheme;
    });
  };

  const value = {
    theme,
    toggleTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

