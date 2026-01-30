
import { AppNotification, User, ActivityLog, DashboardStat, Photo } from '../types';

// Centralized Storage Keys
export const STORAGE_KEYS = {
  USERS: 'admin_dashboard_users_list_v2',
  ACTIVITY: 'admin_dashboard_activities',
  NOTIFICATIONS: 'admin_dashboard_notifications',
  STATS: 'dashboard_stats',
  PREFERENCES: 'admin_preferences',
  WEATHER: 'admin_weather_data',
  MAP_CONFIG: 'admin_map_config',
  AI_DATA: 'admin_ai_data',
  // Photos removed from sync keys to use dedicated API
  COUNTDOWN: 'admin_countdown_config'
};

const SYNC_META_KEY = 'admin_sync_manifest';

// Mapping local storage keys to API keys
const API_MAP: Record<string, string> = {
  users: STORAGE_KEYS.USERS,
  activities: STORAGE_KEYS.ACTIVITY,
  notifications: STORAGE_KEYS.NOTIFICATIONS,
  stats: STORAGE_KEYS.STATS,
  preferences: STORAGE_KEYS.PREFERENCES,
  weather: STORAGE_KEYS.WEATHER,
  mapConfig: STORAGE_KEYS.MAP_CONFIG,
  aiData: STORAGE_KEYS.AI_DATA,
  // photos: REMOVED
  countdown: STORAGE_KEYS.COUNTDOWN
};

// Types for better safety
type ApiKey = keyof typeof API_MAP;

interface GlobalState {
  [key: string]: any;
}

export const cloudService = {
  /**
   * Smart Pull: Downloads only what is needed based on Manifest diff
   */
  pull: async (): Promise<boolean> => {
    try {
      // 1. Get Remote Manifest
      const manifestRes = await fetch('/api/sync?mode=manifest');
      if (!manifestRes.ok) return false;
      const remoteManifest = await manifestRes.json();
      
      // 2. Compare with Local Manifest
      const localManifest = JSON.parse(localStorage.getItem(SYNC_META_KEY) || '{}');
      const keysToFetch: string[] = [];
      let hasUpdates = false;

      Object.keys(API_MAP).forEach(key => {
          const remoteTs = remoteManifest[key] || 0;
          const localTs = localManifest[key] || 0;
          // If remote is newer, mark for fetch
          if (remoteTs > localTs) {
              keysToFetch.push(key);
              hasUpdates = true;
          }
      });

      if (keysToFetch.length === 0) return false;

      console.log('☁️ Syncing specific modules:', keysToFetch.join(', '));

      // 3. Fetch only dirty keys
      const dataRes = await fetch(`/api/sync?keys=${keysToFetch.join(',')}`);
      if (!dataRes.ok) return false;
      
      const data = await dataRes.json();
      
      // 4. Update Local Storage Safely
      cloudService.applyUpdates(data);
      
      // 5. Update Local Manifest (Only update timestamps for keys we fetched)
      // Note: With D1, the backend returns a generic manifest. We should ideally merge it carefully.
      // For now, simple timestamp update works.
      const newManifest = { ...localManifest };
      keysToFetch.forEach(k => {
          newManifest[k] = remoteManifest[k] || Date.now();
      });
      localStorage.setItem(SYNC_META_KEY, JSON.stringify(newManifest));
      
      return true;
    } catch (e) {
      console.warn('Sync failed (likely offline or API error):', e);
      return false;
    }
  },

  /**
   * Smart Poll: Check manifest, then trigger pull if needed
   */
  poll: async (): Promise<boolean> => {
      return await cloudService.pull();
  },

  /**
   * Helper to write data to localStorage with Quota Handling
   */
  applyUpdates: (data: GlobalState) => {
      Object.keys(API_MAP).forEach(apiKey => {
          if (data[apiKey] !== undefined) {
              try {
                localStorage.setItem(API_MAP[apiKey], JSON.stringify(data[apiKey]));
              } catch (e) {
                console.error(`Failed to save ${apiKey} to local storage. Storage full?`);
                if (apiKey === 'activities') return;
              }
          }
      });
  },

  /**
   * Smart Push: Only upload changed keys
   * @param keys - Array of keys to sync (e.g. ['users', 'activities'])
   * @param dataOverride - Optional object to provide data directly instead of reading from localStorage
   */
  push: async (keys?: ApiKey[], dataOverride?: GlobalState) => {
    try {
      const payload: GlobalState = {};
      const targets = keys || Object.keys(API_MAP) as ApiKey[];

      // Construct payload
      targets.forEach(key => {
          if (dataOverride && dataOverride[key] !== undefined) {
              // Use provided data directly (Bypasses localStorage read issues)
              payload[key] = dataOverride[key];
          } else {
              // Fallback to reading from localStorage
              const storageKey = API_MAP[key];
              const item = localStorage.getItem(storageKey);
              payload[key] = item ? JSON.parse(item) : null;
          }
      });

      // Fire and forget
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(async (res) => {
          if (res.ok) {
             // On success, we update our local manifest to "now" so we don't immediately re-download
             // assuming the server is consistent.
             const localManifest = JSON.parse(localStorage.getItem(SYNC_META_KEY) || '{}');
             targets.forEach(t => localManifest[t] = Date.now());
             localStorage.setItem(SYNC_META_KEY, JSON.stringify(localManifest));
          }
      }).catch(err => {
          console.error('Cloud push failed', err);
      });

    } catch (e) {
      console.error('Error preparing cloud payload:', e);
    }
  }
};
