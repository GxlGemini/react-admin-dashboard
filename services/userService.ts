
import { User } from '../types';
import { cloudService } from './cloudService';

// Update key to force fresh data load on new install
const USERS_STORAGE_KEY = 'admin_dashboard_users_list_v2';
const COVERS_STORAGE_KEY = 'admin_user_covers_map'; // New key for images

export const userService = {
  getUsers: (): User[] => {
    const stored = localStorage.getItem(USERS_STORAGE_KEY);
    const storedCovers = localStorage.getItem(COVERS_STORAGE_KEY);
    
    let users: User[] = [];
    let coversMap: Record<string, string[]> = {};

    // 1. Load Covers Map
    if (storedCovers) {
        try {
            coversMap = JSON.parse(storedCovers);
        } catch(e) {}
    }

    // 2. Load Users and Merge
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
            users = parsed.map((u: User) => {
                // Merge separate covers into user object for runtime use
                // Priority: CoversMap > User.coverImages (if any left over) > Empty
                const separateCovers = coversMap[u.id];
                return {
                    ...u,
                    coverImages: separateCovers || u.coverImages || []
                };
            });
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

    const users = userService.getUsers(); // This gets merged users
    const index = users.findIndex(u => u.id === user.id);
    
    // Password handling logic
    if (index === -1 && !user.password) {
        user.password = '123456'; 
    }
    if (index >= 0 && !user.password) {
        user.password = users[index].password;
    }
    
    // Merge Logic (In Memory)
    if (index >= 0) {
        const existing = users[index];
        users[index] = {
            ...existing, 
            ...user,     
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
    
    // --- SPLIT STORAGE LOGIC ---
    
    // 1. Prepare Light Users List (Strip Images)
    const lightUsers = users.map(u => {
        const { coverImages, ...rest } = u;
        return { ...rest, coverImages: [] }; // Store empty array in main list
    });

    // 2. Prepare Covers Map (Only Images)
    const coversMap: Record<string, string[]> = {};
    users.forEach(u => {
        if (u.coverImages && u.coverImages.length > 0) {
            coversMap[u.id] = u.coverImages;
        }
    });

    // 3. Save to Local Storage (Split)
    try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(lightUsers));
        // Use try-catch specifically for the heavy images
        try {
            localStorage.setItem(COVERS_STORAGE_KEY, JSON.stringify(coversMap));
        } catch (coverError) {
            console.warn("Cover images storage quota exceeded. Saving main data only locally.");
            // We proceed because we still want to push to cloud
        }
    } catch (e) {
        console.warn("Main User Storage full!", e);
    }

    // 4. Trigger Cloud Sync (Send FULL object)
    // Cloud needs the full object because D1 relational tables handle the split
    try {
        cloudService.push(['users'], { users: users });
    } catch (e) {
        console.error("Cloud push failed", e);
    }
  },

  deleteUser: (id: string): void => {
    const users = userService.getUsers();
    
    const userToDelete = users.find(u => u.id === id);
    if (userToDelete && userToDelete.username === 'root') {
        alert("超级管理员 (root) 账号不可删除！");
        return; 
    }

    const newUsers = users.filter(u => u.id !== id);
    
    // Also remove from covers map
    const storedCovers = localStorage.getItem(COVERS_STORAGE_KEY);
    let coversMap: Record<string, string[]> = {};
    if (storedCovers) {
        try { coversMap = JSON.parse(storedCovers); } catch(e) {}
        delete coversMap[id];
    }

    const lightUsers = newUsers.map(u => {
        const { coverImages, ...rest } = u;
        return { ...rest, coverImages: [] };
    });

    try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(lightUsers));
        localStorage.setItem(COVERS_STORAGE_KEY, JSON.stringify(coversMap));
        cloudService.push(['users'], { users: newUsers });
    } catch (e) {
        console.error("Storage error during delete", e);
    }
  }
};
