
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Language, translations } from '../utils/i18n';
import { UserProfile } from '../types';
import { authService } from '../services/authService';
import { cloudService, STORAGE_KEYS } from '../services/cloudService';
import { userService } from '../services/userService';
import { loginLogService } from '../services/loginLogService';

interface ThemeConfig {
  mode: 'light' | 'dark';
  color: string;
}

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: ThemeConfig;
  setTheme: (theme: ThemeConfig) => void;
  t: (key: keyof typeof translations['en']) => string;
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  refreshUser: () => void;
  isSyncing: boolean;
  lastSyncTime: number; 
  profileOpacity: number; // New State for KV persistence
  setProfileOpacity: (val: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper function to darken a hex color safely
const darkenColor = (hex: string, percent: number) => {
    if (!/^#([0-9A-F]{3}){1,2}$/i.test(hex)) return hex;
    let color = hex.replace("#", "");
    if (color.length === 3) color = color.split('').map(c => c + c).join('');
    let num = parseInt(color, 16);
    let amt = Math.round(2.55 * percent);
    let R = (num >> 16) - amt;
    let B = ((num >> 8) & 0x00FF) - amt;
    let G = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (B<255?B<1?0:B:255)*0x100 + (G<255?G<1?0:G:255)).toString(16).slice(1);
};

export const AppProvider = ({ children }: { children?: React.ReactNode }) => {
  // --- Initialize State Safely ---
  const [language, setLanguageState] = useState<Language>(() => {
      try {
        const prefs = JSON.parse(localStorage.getItem(STORAGE_KEYS.PREFERENCES) || '{}');
        return prefs.language || 'zh';
      } catch (e) { return 'zh'; }
  });

  const [theme, setThemeState] = useState<ThemeConfig>(() => {
      try {
        const prefs = JSON.parse(localStorage.getItem(STORAGE_KEYS.PREFERENCES) || '{}');
        const legacy = localStorage.getItem('app_theme');
        return prefs.theme || (legacy ? JSON.parse(legacy) : { mode: 'light', color: '#2563eb' });
      } catch (e) { return { mode: 'light', color: '#2563eb' }; }
  });

  // Init Profile Opacity from KV/Local Preferences
  const [profileOpacity, setProfileOpacityState] = useState<number>(() => {
      try {
        const prefs = JSON.parse(localStorage.getItem(STORAGE_KEYS.PREFERENCES) || '{}');
        // Default to 0.85 if undefined
        return typeof prefs.profileOpacity === 'number' ? prefs.profileOpacity : 0.85;
      } catch (e) { return 0.85; }
  });

  const [isSyncing, setIsSyncing] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState(Date.now());
  
  const isFirstRender = useRef(true);

  const refreshUser = () => {
    setUser(authService.getUser());
  };

  const setLanguage = (lang: Language) => {
      setLanguageState(lang);
  };

  const setTheme = (newTheme: ThemeConfig) => {
      setThemeState(newTheme);
  };

  const setProfileOpacity = (val: number) => {
      setProfileOpacityState(val);
  };

  // --- 1. Initial Cloud Pull ---
  useEffect(() => {
    const initData = async () => {
      setIsSyncing(true);
      try {
        const success = await cloudService.pull();
        
        if (success) {
            // Re-hydrate state from fresh storage data pulled from Cloud/KV
            try {
                const prefs = JSON.parse(localStorage.getItem(STORAGE_KEYS.PREFERENCES) || '{}');
                if (prefs.theme) setThemeState(prefs.theme);
                if (prefs.language) setLanguageState(prefs.language);
                if (typeof prefs.profileOpacity === 'number') setProfileOpacityState(prefs.profileOpacity);
                setLastSyncTime(Date.now());
            } catch (parseError) {
                console.warn("Failed to parse synced preferences", parseError);
            }
        }
      } catch (err) {
        console.warn("Initial sync failed", err);
      }
      
      setUser(authService.getUser());
      setIsSyncing(false);
      userService.getUsers(); 
    };
    initData();
  }, []);

  // --- 2. Real-time Polling & Heartbeat ---
  useEffect(() => {
    // 5s interval for data sync polling
    const pollInterval = setInterval(async () => {
        if (document.visibilityState === 'visible') {
            const hasChanges = await cloudService.poll();
            if (hasChanges) {
                const prefs = JSON.parse(localStorage.getItem(STORAGE_KEYS.PREFERENCES) || '{}');
                if (prefs.theme) setThemeState(prefs.theme);
                if (typeof prefs.profileOpacity === 'number') setProfileOpacityState(prefs.profileOpacity);
                refreshUser();
                setLastSyncTime(Date.now());
            }
        }
    }, 5000);

    // 45s interval for Session Heartbeat (for Online Status)
    const heartbeatInterval = setInterval(() => {
        const sessionId = authService.getSessionId();
        if (sessionId && document.visibilityState === 'visible') {
            loginLogService.sendHeartbeat(sessionId);
        }
    }, 45000);

    return () => {
        clearInterval(pollInterval);
        clearInterval(heartbeatInterval);
    };
  }, []);

  // --- 3. Persist Preferences (Sync to KV) ---
  useEffect(() => {
    if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
    }

    const preferences = { theme, language, profileOpacity };
    try {
        // Save to LocalStorage
        localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(preferences));
        
        // Save to Cloud KV (Debounced by cloudService logic or API rate limits usually, 
        // but here we push immediately for settings changes to ensure persistence before close)
        cloudService.push(['preferences'], { preferences }); 
    } catch(e) {}

    // --- Apply DOM Changes ---
    const root = document.documentElement;
    if (theme.mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.style.setProperty('--color-primary', theme.color);
    try {
        const hoverColor = darkenColor(theme.color, 10);
        root.style.setProperty('--color-primary-hover', hoverColor); 
    } catch (e) {
        root.style.setProperty('--color-primary-hover', theme.color);
    }

  }, [theme, language, profileOpacity]);

  // Apply theme on initial load
  useEffect(() => {
    const root = document.documentElement;
    if (theme.mode === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    root.style.setProperty('--color-primary', theme.color);
  }, []);

  const t = (key: keyof typeof translations['en']) => {
    return translations[language][key] || key;
  };

  return (
    <AppContext.Provider value={{ 
        language, setLanguage, theme, setTheme, t, user, setUser, refreshUser, isSyncing, lastSyncTime,
        profileOpacity, setProfileOpacity
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
