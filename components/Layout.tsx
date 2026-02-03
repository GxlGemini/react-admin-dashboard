
import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { authService } from '../services/authService';
import { notificationService } from '../services/notificationService';
import { Menu, Bell, Moon, Sun, Languages, Palette, Check, Info, CheckCircle, AlertTriangle, LogOut, Github } from 'lucide-react';
import { RoutePath, AppNotification } from '../types';
import { useApp } from '../contexts/AppContext';
import { GlobalPlayerWidget } from './GlobalPlayerWidget';

export const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  
  const { language, setLanguage, theme, setTheme, t, user, setUser } = useApp();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    navigate(RoutePath.LOGIN);
  };

  useEffect(() => {
      // Load notifications
      const notifs = notificationService.getNotifications();
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
  }, [isNotifOpen]); // Refresh when opening dropdown

  const handleMarkAllRead = (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent dropdown from closing immediately
      const updated = notificationService.markAllAsRead();
      setNotifications(updated);
      setUnreadCount(0);
  };

  const getTitle = () => {
    switch (location.pathname) {
      case RoutePath.GUIDE: return '系统指南';
      case RoutePath.NEW_YEAR: return '春节倒计时';
      case RoutePath.GOLDEN_FLOWER: return '大夏·炸金花';
      case RoutePath.DASHBOARD: return t('dashboard');
      case RoutePath.USERS: return t('userManagement');
      case RoutePath.LOGIN_HISTORY: return '登录审计';
      case RoutePath.MAP: return t('maps');
      case RoutePath.WEATHER: return t('weather');
      case RoutePath.PROFILE: return t('profile');
      case RoutePath.AI_ASSISTANT: return t('aiAssistant');
      case RoutePath.GALLERY: return '照片墙';
      case RoutePath.MUSIC: return 'CD 音乐机';
      case RoutePath.SNIPPETS: return '代码片段库';
      default: return 'Admin';
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60); // minutes
    
    if (diff < 1) return t('justNow');
    if (diff < 60) return `${diff} ${t('minsAgo')}`;
    if (diff < 1440) return `${Math.floor(diff / 60)} ${t('hoursAgo')}`;
    return date.toLocaleDateString();
  };

  const colors = [
    { name: 'Blue', value: '#2563eb' },
    { name: 'Purple', value: '#9333ea' },
    { name: 'Green', value: '#16a34a' },
    { name: 'Orange', value: '#ea580c' },
    { name: 'Rose', value: '#e11d48' },
    { name: 'Black', value: '#0f172a' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-900 transition-colors duration-200">
      {/* Global Backdrop for Modals/Sidebar/Dropdowns */}
      {(isSidebarOpen || isSettingsOpen || isNotifOpen) && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity" 
          onClick={() => {
            setIsSidebarOpen(false);
            setIsSettingsOpen(false);
            setIsNotifOpen(false);
          }}
        ></div>
      )}

      <Sidebar 
        onLogout={handleLogout} 
        isOpen={isSidebarOpen} 
        onCloseMobile={() => setIsSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Header - z-50 to sit above backdrop */}
        <header className="relative z-50 flex h-16 items-center justify-between bg-white px-6 shadow-sm dark:bg-slate-800 dark:border-b dark:border-slate-700 transition-colors duration-200">
          <div className="flex items-center">
            <button
              onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(!isSidebarOpen); }}
              className="mr-4 rounded-md p-1 text-gray-500 hover:bg-gray-100 md:hidden dark:text-gray-300 dark:hover:bg-slate-700"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{getTitle()}</h2>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4">
            
            {/* GitHub Link */}
            <a 
              href="https://github.com/GxlGemini/react-admin-dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700 transition-colors"
              title="GitHub Source Code"
            >
              <Github className="h-5 w-5" />
            </a>

            {/* Language Switch */}
            <button 
              onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
              className="flex items-center gap-1 rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700"
              title="Switch Language"
            >
              <Languages className="h-5 w-5" />
              <span className="text-sm font-medium hidden sm:inline">{language.toUpperCase()}</span>
            </button>

            {/* Theme Settings Toggle */}
            <div className="relative">
              <button 
                onClick={(e) => {
                    e.stopPropagation();
                    setIsSettingsOpen(!isSettingsOpen);
                    setIsNotifOpen(false);
                }}
                className={`rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700 ${isSettingsOpen ? 'bg-gray-100 dark:bg-slate-700' : ''}`}
              >
                <Palette className="h-5 w-5" />
              </button>

              {isSettingsOpen && (
                <div 
                    className="absolute right-0 mt-2 w-56 rounded-lg bg-white p-4 shadow-xl ring-1 ring-black ring-opacity-5 dark:bg-slate-800 dark:ring-white dark:ring-opacity-10 animate-fade-in" 
                    onClick={e => e.stopPropagation()}
                >
                   <div className="mb-4">
                     <p className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{t('theme')}</p>
                     <div className="flex gap-2 rounded-lg bg-gray-100 p-1 dark:bg-slate-700">
                       <button
                         onClick={() => setTheme({ ...theme, mode: 'light' })}
                         className={`flex-1 flex items-center justify-center gap-1 rounded-md py-1.5 text-xs font-medium transition-all ${theme.mode === 'light' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                       >
                         <Sun className="h-3.5 w-3.5" />
                         Light
                       </button>
                       <button
                         onClick={() => setTheme({ ...theme, mode: 'dark' })}
                         className={`flex-1 flex items-center justify-center gap-1 rounded-md py-1.5 text-xs font-medium transition-all ${theme.mode === 'dark' ? 'bg-slate-600 text-white shadow' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                       >
                         <Moon className="h-3.5 w-3.5" />
                         Dark
                       </button>
                     </div>
                   </div>

                   <div>
                     <p className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{t('accentColor')}</p>
                     <div className="grid grid-cols-6 gap-2">
                        {colors.map(c => (
                          <button
                            key={c.name}
                            onClick={() => setTheme({ ...theme, color: c.value })}
                            className="group relative h-6 w-6 rounded-full ring-1 ring-gray-200 focus:outline-none dark:ring-slate-600"
                            style={{ backgroundColor: c.value }}
                            title={c.name}
                          >
                            {theme.color === c.value && (
                                <Check className="absolute inset-0 m-auto h-3 w-3 text-white" />
                            )}
                          </button>
                        ))}
                     </div>
                   </div>
                </div>
              )}
            </div>
            
            {/* Notifications */}
            <div className="relative">
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsNotifOpen(!isNotifOpen);
                        setIsSettingsOpen(false);
                    }}
                    className={`relative rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700 ${isNotifOpen ? 'bg-gray-100 dark:bg-slate-700' : ''}`}
                >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-800 animate-pulse"></span>
                )}
                </button>
                
                {isNotifOpen && (
                    <div 
                        className="absolute right-0 mt-2 w-80 rounded-lg bg-white shadow-xl ring-1 ring-black ring-opacity-5 dark:bg-slate-800 dark:ring-white dark:ring-opacity-10 overflow-hidden animate-fade-in"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-3 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('notifications')}</h3>
                            <span className="text-xs bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded text-gray-500 dark:text-gray-300">{unreadCount} New</span>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                            {notifications.length > 0 ? notifications.map(notif => (
                                <div key={notif.id} className={`p-3 hover:bg-gray-50 dark:hover:bg-slate-700 border-b border-gray-50 last:border-0 dark:border-slate-700 transition-colors ${!notif.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                    <div className="flex gap-3">
                                        <div className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center shrink-0 
                                            ${notif.type === 'success' ? 'bg-green-100 text-green-600' : 
                                              notif.type === 'warning' ? 'bg-orange-100 text-orange-600' : 
                                              'bg-blue-100 text-blue-600'}
                                        `}>
                                            {notif.type === 'success' ? <CheckCircle className="h-4 w-4" /> : 
                                             notif.type === 'warning' ? <AlertTriangle className="h-4 w-4" /> : 
                                             <Info className="h-4 w-4" />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <p className={`text-sm font-medium ${!notif.read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                                                    {notif.title}
                                                </p>
                                                <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">{formatTime(notif.time)}</span>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{notif.message}</p>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="p-6 text-center text-gray-400 text-sm">
                                    No notifications
                                </div>
                            )}
                        </div>
                        <div className="p-2 text-center border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                            <button 
                                onClick={handleMarkAllRead}
                                className="text-xs text-[var(--color-primary)] font-medium hover:underline disabled:opacity-50 disabled:cursor-default"
                                disabled={unreadCount === 0}
                            >
                                {t('markAllRead')}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* User Profile Area */}
            <div className="relative group cursor-pointer border-l pl-4 dark:border-slate-700" onClick={() => navigate(RoutePath.PROFILE)}>
              <div className="flex items-center space-x-3 transition-transform duration-300 ease-out group-hover:scale-105 origin-right">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.nickname || user?.username || t('guest')}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role ? t(user.role) : t('visitor')}</p>
                  </div>
                  <div className="relative">
                    <img
                        src={user?.avatar || 'https://ui-avatars.com/api/?name=User&background=random'}
                        alt="Profile"
                        className="h-9 w-9 rounded-full border-2 border-transparent group-hover:border-[var(--color-primary)] transition-colors duration-300 object-cover bg-gray-100 dark:bg-slate-700"
                    />
                    <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white dark:ring-slate-800"></span>
                  </div>
              </div>

              <div className="absolute top-full right-0 pt-3 w-32 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 ease-out z-50">
                  <button
                     onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                     className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 text-sm font-medium text-red-500 hover:text-white hover:bg-red-500 transition-colors duration-200"
                  >
                      <LogOut className="h-4 w-4" />
                      <span>{t('signOut')}</span>
                  </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 dark:bg-slate-900 transition-colors duration-200">
          <div className="mx-auto max-w-7xl animate-fade-in text-gray-800 dark:text-gray-200 pb-16">
            <Outlet />
          </div>
        </main>

        {/* Global Music Player Widget - Always visible if music is loaded */}
        <div className="hidden md:block">
            <GlobalPlayerWidget />
        </div>
      </div>
    </div>
  );
};
