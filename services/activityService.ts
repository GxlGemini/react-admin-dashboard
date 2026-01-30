import { ActivityLog, User } from '../types';
import { cloudService } from './cloudService';

const ACTIVITY_STORAGE_KEY = 'admin_dashboard_activities';
// Limit log retention to prevent "White Screen" crashes due to localStorage overflow
const MAX_LOG_SIZE = 50; 

export const activityService = {
  getActivities: (): ActivityLog[] => {
    const stored = localStorage.getItem(ACTIVITY_STORAGE_KEY);
    const initialLogs: ActivityLog[] = [
      { id: '1', userId: '1', username: 'admin', userAvatar: '', action: 'login', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), details: 'System login' },
    ];

    if (!stored) {
      try {
        localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(initialLogs));
      } catch (e) {
        // Ignore initial save error if storage full
      }
      return initialLogs;
    }

    try {
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        return initialLogs;
      }
      return parsed;
    } catch (e) {
      console.warn('Failed to parse activities, resetting storage:', e);
      return initialLogs;
    }
  },

  logActivity: (user: User, action: ActivityLog['action'], details?: string) => {
    try {
      const activities = activityService.getActivities();
      const newLog: ActivityLog = {
        id: Date.now().toString(),
        userId: user.id,
        username: user.nickname || user.username,
        userAvatar: user.avatar,
        action,
        timestamp: new Date().toISOString(),
        details
      };
      
      // AGGRESSIVE TRUNCATION: Keep only the last 50 activities.
      // This prevents the "White Screen of Death" caused by LocalStorage quota exceeded.
      const updatedActivities = [newLog, ...activities].slice(0, MAX_LOG_SIZE);
      
      try {
        localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(updatedActivities));
        // Differential Sync: Only push activities
        cloudService.push(['activities']);
      } catch (storageError) {
        console.error("Storage quota exceeded. Cleaning up old logs.");
        // Emergency cleanup: clear logs if we can't save
        localStorage.removeItem(ACTIVITY_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Error logging activity:', e);
    }
  },

  clearActivities: () => {
    localStorage.removeItem(ACTIVITY_STORAGE_KEY);
    cloudService.push(['activities']);
  }
};
