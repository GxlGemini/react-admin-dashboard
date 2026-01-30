import { AppNotification } from '../types';
import { cloudService } from './cloudService';

const NOTIF_STORAGE_KEY = 'admin_dashboard_notifications';

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  { id: '1', title: '系统更新', message: '系统已成功更新至 v2.0 版本，新增了天气和地图功能。', time: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), read: false, type: 'info' },
];

export const notificationService = {
  getNotifications: (): AppNotification[] => {
    const stored = localStorage.getItem(NOTIF_STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(INITIAL_NOTIFICATIONS));
      return INITIAL_NOTIFICATIONS;
    }
    try {
        return JSON.parse(stored);
    } catch (e) {
        return INITIAL_NOTIFICATIONS;
    }
  },

  markAllAsRead: (): AppNotification[] => {
    const notifs = notificationService.getNotifications();
    const updated = notifs.map(n => ({ ...n, read: true }));
    try {
        localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(updated));
        // Differential Sync: Only push notifications
        cloudService.push(['notifications']);
    } catch(e) {}
    return updated;
  },

  addNotification: (notification: Omit<AppNotification, 'id' | 'read' | 'time'>) => {
    const notifs = notificationService.getNotifications();
    const newNotif: AppNotification = {
      ...notification,
      id: Date.now().toString(),
      read: false,
      time: new Date().toISOString()
    };
    const updated = [newNotif, ...notifs].slice(0, 20); // Keep last 20
    try {
        localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(updated));
        cloudService.push(['notifications']);
    } catch(e) {}
    return updated;
  },
  
  getUnreadCount: (): number => {
      const notifs = notificationService.getNotifications();
      return notifs.filter(n => !n.read).length;
  }
};
