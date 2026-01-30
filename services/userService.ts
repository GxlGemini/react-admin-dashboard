
import { User } from '../types';
import { cloudService } from './cloudService';

// Update key to force fresh data load on new install
const USERS_STORAGE_KEY = 'admin_dashboard_users_list_v2';

export const userService = {
  getUsers: (): User[] => {
    const stored = localStorage.getItem(USERS_STORAGE_KEY);
    let users: User[] = [];

    // Removed Hardcoded "Default Admin"
    // The system now relies on the Registration page or Cloud Sync to populate users.
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
            users = parsed;
        }
      } catch (e) {
        console.warn('User storage corrupted, resetting.', e);
        users = [];
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      }
    }

    return users;
  },

  getUserByUsername: (username: string): User | undefined => {
    const users = userService.getUsers();
    return users.find(u => u.username === username);
  },
  
  getUserById: (id: string): User | undefined => {
    const users = userService.getUsers();
    return users.find(u => u.id === id);
  },

  saveUser: (user: User): void => {
    if (!user.id || !user.username) {
        throw new Error("Invalid user data: Missing ID or Username");
    }

    const users = userService.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    
    // Password handling logic
    if (index === -1 && !user.password) {
        user.password = '123456'; 
    }
    if (index >= 0 && !user.password) {
        user.password = users[index].password;
    }
    
    // Merge Logic
    if (index >= 0) {
        const existing = users[index];
        users[index] = {
            ...existing, // Start with all existing data
            ...user,     // Overwrite with new data
            coverImages: user.coverImages !== undefined ? user.coverImages : existing.coverImages,
            bio: user.bio !== undefined ? user.bio : existing.bio,
            tags: user.tags !== undefined ? user.tags : existing.tags,
            socials: user.socials !== undefined ? user.socials : existing.socials,
            points: user.points !== undefined ? user.points : existing.points,
            lastCheckIn: user.lastCheckIn !== undefined ? user.lastCheckIn : existing.lastCheckIn
        };
    } else {
        // New User
        users.push({ 
            ...user, 
            id: user.id || Date.now().toString(), 
            createdAt: user.createdAt || new Date().toISOString().split('T')[0],
            points: user.points || 0,
            coverImages: user.coverImages || [],
            tags: user.tags || [],
            socials: user.socials || {}
        });
    }
    
    // 1. Save to Local Storage
    try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {
        console.warn("Local storage full, saving only to cloud.", e);
    }

    // 2. Trigger Cloud Sync
    try {
        cloudService.push(['users'], { users: users });
    } catch (e) {
        console.error("Cloud push failed", e);
    }
  },

  deleteUser: (id: string): void => {
    const users = userService.getUsers();
    
    // Protect root admin from deletion (security measure)
    const userToDelete = users.find(u => u.id === id);
    if (userToDelete && userToDelete.username === 'root') {
        alert("超级管理员 (root) 账号不可删除！");
        return; 
    }

    const newUsers = users.filter(u => u.id !== id);
    try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(newUsers));
        cloudService.push(['users'], { users: newUsers });
    } catch (e) {
        console.error("Storage error during delete", e);
    }
  }
};
