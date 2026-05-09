
export interface User {
  id: string;
  username: string;
  email: string;
  status: 'active' | 'inactive';
  role: 'admin' | 'user';
  createdAt: string;
  password?: string;
  avatar?: string;
  nickname?: string;
  points?: number;
  lastCheckIn?: string;
  // New Fields for Profile 2.0
  coverImages?: string[]; // Array of Base64 strings (Max 3)
  bio?: string;
  tags?: string[];
  socials?: {
      github?: string;
      gitee?: string;
      bilibili?: string;
      instagram?: string;
      twitter?: string;
      website?: string;
  };
}

export interface UserProfile extends User {}

export interface WeatherData {
  city: string;
  temp: number;
  condition: string;
  icon: string;
  humidity: number;
  windSpeed: number;
}

export interface DashboardStat {
  id: string;
  title: string;
  value: string;
  iconName: 'Users' | 'Eye' | 'Activity' | 'TrendingUp' | 'DollarSign' | 'ShoppingBag';
  color: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  username: string;
  userAvatar?: string;
  action: 'login' | 'logout' | 'checkIn' | 'register' | 'update';
  timestamp: string;
  details?: string;
}

export interface LoginLog {
  id: string; // Session ID / Record Number
  userId: string;
  username: string;
  avatar: string;
  rankTitle: string; // e.g. "皇帝至尊 SVIP"
  ip: string;
  location: string;
  isp?: string; // ISP / Carrier
  os: string;
  browser: string;
  loginTime: string; // ISO String
  lastAccessed?: string; // ISO String - Updated via heartbeat
  durationMs?: number; // Total duration in ms
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'info' | 'success' | 'warning';
}

export interface Photo {
  id: string;
  url: string;
  title: string;
  description?: string;
  category: 'life' | 'work' | 'screenshot' | 'other';
  createdAt: number;
  width?: number;
  height?: number;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  cover: string;
  src: string;
  duration?: number;
}

export interface Snippet {
  id: string;
  title: string;
  code: string;
  language: 'javascript' | 'typescript' | 'python' | 'sql' | 'css' | 'json' | 'bash' | 'other';
  description?: string;
  tags?: string[]; // stored as JSON string in DB
  createdAt: number;
  updatedAt: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: UserProfile | null;
}

export interface LogItem {
    id: string;
    city: string;
    action: string;
    time: string;
    level: 'info' | 'warn' | 'error';
    mode: ViewMode;
}

export type ViewMode = 'business' | 'infra' | 'security' | 'globe';

export enum RoutePath {
  GUIDE = '/guide',
  LOGIN = '/login',
  DASHBOARD = '/',
  USERS = '/users',
  LOGIN_HISTORY = '/login-history',
  MAP = '/map',
  WEATHER = '/weather',
  PROFILE = '/profile',
  AI_ASSISTANT = '/ai-assistant',
  GALLERY = '/gallery',
  MUSIC = '/music',
  SNIPPETS = '/snippets',
  NEW_YEAR = '/new-year',
  GOLDEN_FLOWER = '/golden-flower'
}
