
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Map as MapIcon, CloudSun, UserCircle, LogOut, Bot, Image, Disc, BookOpen, CalendarClock, Code2, Crown, ClipboardList } from 'lucide-react';
import { RoutePath } from '../types';
import { useApp } from '../contexts/AppContext';

interface SidebarProps {
  onLogout: () => void;
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onLogout, isOpen, onCloseMobile }) => {
  const { t } = useApp();

  const menuItems = [
    { path: RoutePath.GUIDE, icon: BookOpen, label: '系统指南' },
    { path: RoutePath.NEW_YEAR, icon: CalendarClock, label: '春节倒计时' },
    { path: RoutePath.GOLDEN_FLOWER, icon: Crown, label: '大夏·炸金花' },
    { path: RoutePath.DASHBOARD, icon: LayoutDashboard, label: t('dashboard') },
    { path: RoutePath.USERS, icon: Users, label: t('userManagement') },
    { path: RoutePath.LOGIN_HISTORY, icon: ClipboardList, label: '登录审计' },
    { path: RoutePath.SNIPPETS, icon: Code2, label: '代码片段库' },
    { path: RoutePath.GALLERY, icon: Image, label: '照片墙' },
    { path: RoutePath.MUSIC, icon: Disc, label: 'CD 音乐机' },
    { path: RoutePath.MAP, icon: MapIcon, label: t('maps') },
    { path: RoutePath.WEATHER, icon: CloudSun, label: t('weather') },
    { path: RoutePath.AI_ASSISTANT, icon: Bot, label: t('aiAssistant') },
    { path: RoutePath.PROFILE, icon: UserCircle, label: t('profile') },
  ];

  const sidebarClasses = `
    fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    md:translate-x-0 md:static md:inset-auto
    dark:bg-slate-950
  `;

  return (
    <aside className={sidebarClasses}>
      <div className="flex h-16 items-center justify-center border-b border-slate-700 dark:border-slate-800">
        <h1 className="text-xl font-bold tracking-wider text-[var(--color-primary)]">ADMIN<span className="text-white">PRO</span></h1>
      </div>

      <nav className="mt-6 px-4 space-y-2 overflow-y-auto max-h-[calc(100vh-160px)] custom-scrollbar">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onCloseMobile}
            className={({ isActive }) => `
              flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
              ${isActive 
                ? 'bg-[var(--color-primary)] text-white shadow-lg' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white dark:hover:bg-slate-900'}
            `}
          >
            <item.icon className="mr-3 h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="absolute bottom-0 w-full border-t border-slate-700 p-4 dark:border-slate-800">
        <button
          onClick={onLogout}
          className="flex w-full items-center justify-center rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] transition-colors"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {t('signOut')}
        </button>
      </div>
    </aside>
  );
};
