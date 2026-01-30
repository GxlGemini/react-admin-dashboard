
import { UserProfile } from '../types';
import { userService } from './userService';
import { activityService } from './activityService';
import { loginLogService } from './loginLogService';

const TOKEN_KEY = 'admin_dashboard_token';
const USER_KEY = 'admin_dashboard_user';
const SESSION_KEY = 'admin_dashboard_session_id';

// Helper to create a lightweight session object
const createLightweightSession = (user: UserProfile): UserProfile => {
    // Clone the user object
    const sessionUser = { ...user };
    
    // Remove heavy fields that are not needed for the immediate session context (Sidebar/Header)
    // The Profile page fetches fresh data from userService/API anyway.
    // Base64 images in arrays are the primary cause of QuotaExceededError.
    sessionUser.coverImages = []; 
    
    return sessionUser;
};

export const authService = {
  login: async (username: string, password: string): Promise<UserProfile | null> => {
    // Mock API delay
    await new Promise(resolve => setTimeout(resolve, 600));

    // Trim inputs to avoid whitespace errors
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    const user = userService.getUserByUsername(cleanUsername);

    if (user && user.password === cleanPassword && user.status === 'active') {
      const token = 'mock-jwt-token-' + Date.now();
      
      const sessionUser = createLightweightSession(user);
      
      try {
          localStorage.setItem(TOKEN_KEY, token);
          localStorage.setItem(USER_KEY, JSON.stringify(sessionUser));
      } catch (e: any) {
          console.error("Login Storage Error:", e);
          if (e.name === 'QuotaExceededError' || e.message?.includes('exceeded the quota')) {
              // Emergency cleanup: Try to free up space by removing non-critical logs
              activityService.clearActivities();
              try {
                  localStorage.setItem(TOKEN_KEY, token);
                  localStorage.setItem(USER_KEY, JSON.stringify(sessionUser));
              } catch (retryError) {
                  throw new Error("浏览器存储空间已满，请清理缓存后重试。");
              }
          } else {
              throw e;
          }
      }
      
      // 1. Log Activity (Local/Sync)
      try {
        activityService.logActivity(sessionUser, 'login', 'User logged in successfully');
      } catch (logError) {
        console.error('Failed to log login activity:', logError);
      }

      // 2. Record Login Audit Log (D1 Database)
      try {
          const sessionId = await loginLogService.recordLogin(sessionUser);
          if (sessionId) {
              localStorage.setItem(SESSION_KEY, sessionId);
          }
      } catch (e) {
          console.error('Failed to record login audit', e);
      }
      
      return sessionUser;
    }
    return null;
  },

  logout: async () => {
    // 1. Finalize Session Duration via Heartbeat
    const sessionId = localStorage.getItem(SESSION_KEY);
    if (sessionId) {
        try {
            await loginLogService.sendHeartbeat(sessionId);
        } catch (e) {
            console.error("Failed to send final heartbeat", e);
        }
    }

    // 2. Clear Local Storage
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(SESSION_KEY);
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem(TOKEN_KEY);
  },

  getUser: (): UserProfile | null => {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;
    try {
        return JSON.parse(userStr);
    } catch (e) {
        return null;
    }
  },

  getSessionId: (): string | null => {
      return localStorage.getItem(SESSION_KEY);
  },

  updateUser: (user: UserProfile) => {
    const sessionUser = createLightweightSession(user);
    
    try {
        localStorage.setItem(USER_KEY, JSON.stringify(sessionUser));
    } catch (e) {
        console.warn("Failed to update session user in storage", e);
    }

    // Also update the source of truth in user service (which handles the heavy data persistence)
    userService.saveUser(user);
    
    // Log Activity
    try {
        activityService.logActivity(user, 'update', 'User profile updated');
    } catch (e) {
        console.error('Failed to log update activity', e);
    }
  }
};
