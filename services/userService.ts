
import { User } from '../types';
import { cloudService } from './cloudService';

// Update key to force fresh data load on new install
const USERS_STORAGE_KEY = 'admin_dashboard_users_list_v2';

export const userService = {
  getUsers: (): User[] => {
    const stored = localStorage.getItem(USERS_STORAGE_KEY);
    let users: User[] = [];

    // Default Admin Account (The ONLY initial user)
    const defaultAdmin: User = { 
        id: '1', 
        username: 'admin', 
        email: 'admin@example.com', 
        status: 'active', 
        role: 'admin', 
        createdAt: new Date().toISOString().split('T')[0], 
        password: '123456', 
        nickname: 'Super Admin', 
        avatar: 'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff', 
        points: 8888, 
        lastCheckIn: '',
        coverImages: [],
        bio: '',
        tags: [],
        socials: {}
    };

    if (!stored) {
      // Initialize with ONLY default admin - NO MOCK DATA
      users = [defaultAdmin];
      try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      } catch (e) {
          console.warn("Storage quota limit reached on init");
      }
    } else {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
            users = parsed;
        } else {
            // If array is empty or invalid, restore admin
            users = [defaultAdmin];
            localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
        }
      } catch (e) {
        console.warn('User storage corrupted, resetting.', e);
        users = [defaultAdmin];
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      }
    }

    // Defensive: Ensure 'admin' always exists to prevent lockout
    const adminExists = users.some(u => u.username === 'admin');
    if (!adminExists) {
        users.unshift(defaultAdmin);
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
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
    
    // Merge Logic:
    // If we are updating (index >= 0), we must merge the new 'user' data into 'existing'
    // BUT we must also ensure that if the 'user' object comes from a partial form (like Admin panel),
    // it doesn't accidentally wipe out fields like 'coverImages' by setting them to undefined.
    
    if (index >= 0) {
        const existing = users[index];
        users[index] = {
            ...existing, // Start with all existing data (preserves bio, covers, etc.)
            ...user,     // Overwrite with new data provided
            // Explicitly ensure objects aren't lost if 'user' has them as undefined, but keep them if 'user' has them (even empty)
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
            id: Date.now().toString(), 
            createdAt: new Date().toISOString().split('T')[0],
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

    // 2. Trigger Cloud Sync to D1
    // This is the critical step for persistence
    try {
        // Pass the FULL users array to overwrite the cloud state for the 'users' key
        cloudService.push(['users'], { users: users });
    } catch (e) {
        console.error("Cloud push failed", e);
    }
  },

  deleteUser: (id: string): void => {
    const users = userService.getUsers();
    const userToDelete = users.find(u => u.id === id);
    if (userToDelete && userToDelete.username === 'admin') {
        return; // Protect admin
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
