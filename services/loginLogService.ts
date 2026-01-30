
import { LoginLog } from '../types';
import { detectDevice } from '../utils/deviceDetector';

export const loginLogService = {
  fetchLogs: async (): Promise<LoginLog[]> => {
    try {
      const res = await fetch('/api/login_logs');
      if (!res.ok) throw new Error('Failed to fetch login logs');
      return await res.json();
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  recordLogin: async (user: { id: string, username: string, avatar?: string, points?: number }): Promise<string | null> => {
    try {
        // Detect Device is now async to support Client Hints (Windows 11 detection)
        const { os, browser } = await detectDevice();
        const rankTitle = getRankTitle(user.points || 0);

        const res = await fetch('/api/login_logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: user.id,
                username: user.username,
                avatar: user.avatar,
                rankTitle,
                os,
                browser
            })
        });
        
        if (res.ok) {
            const data = await res.json();
            return data.id; // Return Session ID
        }
        return null;
    } catch (e) {
        console.error("Failed to record login log", e);
        return null;
    }
  },

  sendHeartbeat: async (sessionId: string) => {
      try {
          await fetch('/api/login_logs', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: sessionId })
          });
      } catch (e) {
          // Silent fail for heartbeat
          console.debug("Heartbeat failed", e);
      }
  }
};

// Helper duplicated here to avoid circular dependencies
const getRankTitle = (points: number): string => {
    if (points > 60000) return '皇帝至尊 SVIP';
    if (points > 35000) return '太子太保';
    if (points > 20000) return '宰相大人';
    if (points > 10000) return '户部尚书';
    if (points > 6000) return '东厂督公';
    if (points > 3000) return '举人老爷';
    if (points > 1000) return '草民';
    return '贱婢';
};
