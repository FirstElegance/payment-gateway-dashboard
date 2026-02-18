import { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'elegance_auto_refresh';

/**
 * AutoRefresh Context
 * จัดการ auto refresh ทุกหน้าตาม interval (3s, 5s, 10s) หรือปิด (close)
 */
const AutoRefreshContext = createContext(null);

export const useAutoRefresh = () => {
  const context = useContext(AutoRefreshContext);
  if (!context) {
    throw new Error('useAutoRefresh must be used within an AutoRefreshProvider');
  }
  return context;
};

export const AutoRefreshProvider = ({ children }) => {
  const [intervalSeconds, setIntervalSeconds] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === '3' || stored === '5' || stored === '10') return Number(stored);
      if (stored === 'off' || stored === '' || stored === null) return null;
      return null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (intervalSeconds !== null) {
        localStorage.setItem(STORAGE_KEY, String(intervalSeconds));
      } else {
        localStorage.setItem(STORAGE_KEY, 'off');
      }
    } catch (e) {
      console.error('Error saving auto refresh to localStorage:', e);
    }
  }, [intervalSeconds]);

  useEffect(() => {
    if (intervalSeconds == null || intervalSeconds <= 0) return;
    const ms = intervalSeconds * 1000;
    const id = setInterval(() => {
      window.location.reload();
    }, ms);
    return () => clearInterval(id);
  }, [intervalSeconds]);

  const value = {
    intervalSeconds,
    setIntervalSeconds,
    isActive: intervalSeconds != null && intervalSeconds > 0,
  };

  return (
    <AutoRefreshContext.Provider value={value}>
      {children}
    </AutoRefreshContext.Provider>
  );
};
