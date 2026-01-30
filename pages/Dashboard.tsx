
import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, BarChart, Bar, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';
import { Users, Eye, Activity, TrendingUp, Plus, X, DollarSign, ShoppingBag, Calendar, Trophy, Star, Award, Crown, Zap, LogIn, Edit, UserPlus, CheckCircle, BarChart3, Target, User as UserIcon, Shield, Briefcase, GraduationCap } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { DashboardStat, User, ActivityLog } from '../types';
import { userService } from '../services/userService';
import { authService } from '../services/authService';
import { activityService } from '../services/activityService';
import { cloudService } from '../services/cloudService';

const visitData = [
  { name: 'Mon', visits: 4000, revenue: 2400 },
  { name: 'Tue', visits: 3000, revenue: 1398 },
  { name: 'Wed', visits: 2000, revenue: 9800 },
  { name: 'Thu', visits: 2780, revenue: 3908 },
  { name: 'Fri', visits: 1890, revenue: 4800 },
  { name: 'Sat', visits: 2390, revenue: 3800 },
  { name: 'Sun', visits: 3490, revenue: 4300 },
];

const deviceData = [
  { name: 'Desktop', value: 65 },
  { name: 'Mobile', value: 25 },
  { name: 'Tablet', value: 10 },
];

const performanceData = [
  { subject: 'CPU', A: 120, fullMark: 150 },
  { subject: 'Memory', A: 98, fullMark: 150 },
  { subject: 'Storage', A: 86, fullMark: 150 },
  { subject: 'Network', A: 99, fullMark: 150 },
  { subject: 'Cache', A: 85, fullMark: 150 },
  { subject: 'DB', A: 65, fullMark: 150 },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

const IconMap = {
    Users, Eye, Activity, TrendingUp, DollarSign, ShoppingBag
};

export const Dashboard: React.FC = () => {
  const { t, user, refreshUser, isSyncing } = useApp();
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStat, setNewStat] = useState({ title: '', value: '', icon: 'Activity', color: 'blue' });
  
  // Check-in State
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [showAnimation, setShowAnimation] = useState(false);

  // Data State
  const [leaderboardUsers, setLeaderboardUsers] = useState<User[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([]);

  useEffect(() => {
      // 1. Get all users
      const allUsers = userService.getUsers();
      
      // Calculate Leaderboard
      const topUsers = [...allUsers]
        .sort((a, b) => (b.points || 0) - (a.points || 0))
        .slice(0, 5);
      setLeaderboardUsers(topUsers);

      // 2. Core Stats
      const coreStats: DashboardStat[] = [
        { id: '1', title: 'totalUsers', value: allUsers.length.toLocaleString(), iconName: 'Users', color: 'text-blue-600 bg-blue-600' },
        { id: '2', title: 'totalVisits', value: '84,231', iconName: 'Eye', color: 'text-green-600 bg-green-600' },
        { id: '3', title: 'systemStatus', value: '98.5%', iconName: 'Activity', color: 'text-purple-600 bg-purple-600' },
        { id: '4', title: 'growthRate', value: '+12.5%', iconName: 'TrendingUp', color: 'text-orange-600 bg-orange-600' },
      ];

      // 3. Custom Stats
      const saved = localStorage.getItem('dashboard_stats');
      if (saved) {
          const savedStats = JSON.parse(saved) as DashboardStat[];
          const customStats = savedStats.filter(s => !['1','2','3','4'].includes(s.id));
          setStats([...coreStats, ...customStats]);
      } else {
          setStats(coreStats);
      }

      // 4. Load Activities
      loadActivities();

  }, [user, isSyncing]); // Reload when sync finishes

  const loadActivities = () => {
      const logs = activityService.getActivities();
      setRecentActivities(logs.slice(0, 6)); // Show top 6
  };

  useEffect(() => {
      if (user?.lastCheckIn) {
          if (user.lastCheckIn === new Date().toISOString().split('T')[0]) {
              setIsCheckedIn(true);
          }
      }
  }, [user]);

  const handleCheckIn = () => {
      if (!user || isCheckedIn) return;

      const points = Math.floor(Math.random() * 20) + 1;
      const today = new Date().toISOString().split('T')[0];

      const updatedUser = {
          ...user,
          points: (user.points || 0) + points,
          lastCheckIn: today
      };

      userService.saveUser(updatedUser);
      authService.updateUser(updatedUser);
      activityService.logActivity(updatedUser, 'checkIn', `Daily check-in, earned ${points} points`);
      
      refreshUser();
      loadActivities(); // Refresh list

      setEarnedPoints(points);
      setIsCheckedIn(true);
      setShowAnimation(true);
      setTimeout(() => setShowAnimation(false), 3000);
  };

  const saveStats = (newStats: DashboardStat[]) => {
      setStats(newStats);
      localStorage.setItem('dashboard_stats', JSON.stringify(newStats));
      cloudService.push(); // Sync stats
  };

  const handleAddStat = () => {
      const colorMap: any = {
          blue: 'text-blue-600 bg-blue-600',
          green: 'text-green-600 bg-green-600',
          purple: 'text-purple-600 bg-purple-600',
          orange: 'text-orange-600 bg-orange-600',
          red: 'text-red-600 bg-red-600',
      };

      const stat: DashboardStat = {
          id: Date.now().toString(),
          title: newStat.title,
          value: newStat.value,
          iconName: newStat.icon as any,
          color: colorMap[newStat.color]
      };
      
      saveStats([...stats, stat]);
      setIsModalOpen(false);
      setNewStat({ title: '', value: '', icon: 'Activity', color: 'blue' });
  };

  const removeStat = (id: string) => {
      if (['1','2','3','4'].includes(id)) return;
      saveStats(stats.filter(s => s.id !== id));
  };

  const getRankInfo = (points: number = 0) => {
      if (points > 60000) return { title: 'rankHuangdi', color: 'text-amber-600 bg-amber-100', icon: Crown, next: 100000, range: [60001, 100000] }; 
      if (points > 35000) return { title: 'rankTaibao', color: 'text-purple-600 bg-purple-100', icon: Shield, next: 60001, range: [35001, 60000] };
      if (points > 20000) return { title: 'rankZaixiang', color: 'text-red-600 bg-red-100', icon: Star, next: 35001, range: [20001, 35000] };
      if (points > 10000) return { title: 'rankShangshu', color: 'text-indigo-600 bg-indigo-100', icon: Briefcase, next: 20001, range: [10001, 20000] };
      if (points > 6000) return { title: 'rankDugong', color: 'text-blue-600 bg-blue-100', icon: Target, next: 10001, range: [6001, 10000] };
      if (points > 3000) return { title: 'rankJuren', color: 'text-cyan-600 bg-cyan-100', icon: GraduationCap, next: 6001, range: [3001, 6000] };
      if (points > 1000) return { title: 'rankCaomin', color: 'text-slate-600 bg-slate-100', icon: UserIcon, next: 3001, range: [1001, 3000] };
      return { title: 'rankJianbi', color: 'text-gray-500 bg-gray-50', icon: Users, next: 1001, range: [0, 1000] };
  };

  const currentPoints = user?.points || 0;
  const rank = getRankInfo(currentPoints);
  
  // Dynamic progress calculation based on current tier range
  let progress = 0;
  if (currentPoints >= 60001) {
      progress = 100;
  } else {
      const [min, max] = rank.range;
      progress = ((currentPoints - min) / (max - min)) * 100;
      progress = Math.min(100, Math.max(0, progress));
  }

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60); // minutes
    
    if (diff < 1) return t('justNow');
    if (diff < 60) return `${diff} ${t('minsAgo')}`;
    if (diff < 1440) return `${Math.floor(diff / 60)} ${t('hoursAgo')}`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (action: string) => {
      switch(action) {
          case 'login': return <LogIn className="h-4 w-4" />;
          case 'checkIn': return <Zap className="h-4 w-4" />;
          case 'register': return <UserPlus className="h-4 w-4" />;
          case 'update': return <Edit className="h-4 w-4" />;
          default: return <Activity className="h-4 w-4" />;
      }
  };

  const getActivityColor = (action: string) => {
      switch(action) {
          case 'login': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
          case 'checkIn': return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400';
          case 'register': return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
          case 'update': return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
          default: return 'bg-gray-100 text-gray-600';
      }
  };

  const getActivityText = (act: ActivityLog) => {
      switch(act.action) {
          case 'login': return t('actionLogin');
          case 'checkIn': return t('actionCheckIn');
          case 'register': return t('actionRegister');
          case 'update': return t('actionUpdate');
          default: return act.details || act.action;
      }
  };

  return (
    <div className="space-y-6">
      {/* Check-in Card */}
      <div className="relative overflow-hidden rounded-2xl bg-white p-0 shadow-sm border border-gray-200 dark:bg-slate-800 dark:border-slate-700">
         <div className="h-2 bg-[var(--color-primary)]"></div>
         <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
             <div className="flex items-center gap-4 flex-1">
                 <div className="h-16 w-16 shrink-0 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white shadow-lg">
                    <rank.icon className="h-8 w-8" />
                 </div>
                 <div className="flex-1">
                     <div className="flex items-center gap-2 flex-wrap">
                         <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t(rank.title as any)}</h2>
                         {showAnimation && <span className="text-sm font-bold text-orange-500 animate-bounce">+{earnedPoints} {t('points')}</span>}
                     </div>
                     <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {t('points')}: <span className="font-bold text-[var(--color-primary)]">{currentPoints}</span> 
                        {currentPoints < 60001 && (
                            <>
                                <span className="mx-2">|</span>
                                {t('nextLevel')}: {rank.next}
                            </>
                        )}
                     </p>
                     <div className="mt-2 h-2 w-full max-w-md rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden relative">
                         <div className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                     </div>
                 </div>
             </div>
             <div className="flex-shrink-0">
                 <button
                    onClick={handleCheckIn}
                    disabled={isCheckedIn}
                    className={`
                        relative overflow-hidden group flex items-center gap-2 px-8 py-3 rounded-xl font-bold shadow-md transition-all
                        ${isCheckedIn 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-slate-700 dark:text-gray-500' 
                            : 'bg-[var(--color-primary)] text-white hover:opacity-90 hover:scale-105 hover:shadow-lg'
                        }
                    `}
                 >
                    {isCheckedIn ? (
                        <>
                            <CheckCircleIcon className="h-5 w-5" />
                            {t('alreadyCheckedIn')}
                        </>
                    ) : (
                        <>
                            <Calendar className="h-5 w-5" />
                            {t('dailyCheckIn')}
                            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent z-10"></div>
                        </>
                    )}
                 </button>
             </div>
         </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold dark:text-white">{t('overview')}</h2>
        <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-[var(--color-primary)] text-white px-3 py-1.5 rounded-lg text-sm hover:opacity-90 transition-all shadow-md hover:shadow-lg"
        >
            <Plus className="h-4 w-4" />
            {t('addWidget')}
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
            const Icon = IconMap[stat.iconName] || Activity;
            const displayTitle = ['totalUsers', 'totalVisits', 'systemStatus', 'growthRate'].includes(stat.title) 
                ? t(stat.title as any) 
                : stat.title;
            const isCore = ['1','2','3','4'].includes(stat.id);
            return (
                <div key={stat.id} className="relative group rounded-xl bg-white p-6 shadow-sm border border-gray-200 transition-all hover:shadow-md hover:border-[var(--color-primary)] dark:bg-slate-800 dark:border-slate-700 dark:hover:border-blue-500">
                    {!isCore && (
                        <button 
                            onClick={() => removeStat(stat.id)}
                            className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                    <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{displayTitle}</p>
                        <h3 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</h3>
                    </div>
                    <div className={`rounded-full p-3 ${stat.color} bg-opacity-10 dark:bg-opacity-20`}>
                        <Icon className={`h-6 w-6 ${stat.color.replace('bg-', 'text-')}`} />
                    </div>
                    </div>
                </div>
            );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Line Chart */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200 dark:bg-slate-800 dark:border-slate-700 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{t('weeklyTraffic')}</h3>
            <span className="text-xs text-green-500 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">+12.5%</span>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={visitData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:opacity-20" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-bg-popover)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} 
                />
                <Line type="monotone" dataKey="visits" name="Visits" stroke="var(--color-primary)" strokeWidth={3} dot={{r: 4}} activeDot={{r: 8}} />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2} dot={{r: 0}} activeDot={{r: 6}} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="rounded-xl bg-white p-0 shadow-sm border border-gray-200 dark:bg-slate-800 dark:border-slate-700 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 dark:border-slate-700 bg-[var(--color-primary)]">
             <div className="flex items-center gap-2 text-white">
                 <Trophy className="h-6 w-6" />
                 <h3 className="text-lg font-bold">积分风云榜</h3>
             </div>
             <p className="text-white/80 text-xs mt-1">Top 5 Active Users</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
             {leaderboardUsers.map((u, index) => {
                 const rankInfo = getRankInfo(u.points);
                 return (
                     <div key={u.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition-colors border-b border-gray-50 last:border-0 dark:border-slate-700">
                         <div className={`
                             w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm shrink-0
                             ${index === 0 ? 'bg-yellow-100 text-yellow-600 ring-2 ring-yellow-200' : 
                               index === 1 ? 'bg-gray-100 text-gray-600 ring-2 ring-gray-200' :
                               index === 2 ? 'bg-orange-100 text-orange-600 ring-2 ring-orange-200' :
                               'text-gray-400'
                             }
                         `}>
                             {index + 1}
                         </div>
                         <div className="relative shrink-0">
                            <img src={u.avatar || 'https://ui-avatars.com/api/?name=' + u.username} className="w-10 h-10 rounded-full bg-gray-200 object-cover" alt="avatar" />
                            {index === 0 && <Crown className="absolute -top-2 -right-1 h-4 w-4 text-yellow-500 fill-yellow-400 rotate-12" />}
                         </div>
                         <div className="flex-1 min-w-0">
                             <p className="font-semibold text-gray-900 dark:text-white truncate">{u.nickname || u.username}</p>
                             <div className="flex items-center gap-1 mt-0.5">
                                 <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                     rankInfo.title === 'rankHuangdi' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                     rankInfo.title === 'rankTaibao' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                     rankInfo.title === 'rankZaixiang' ? 'bg-red-100 text-red-700 border-red-200' :
                                     'bg-gray-100 text-gray-600 border-gray-200'
                                 }`}>
                                     {t(rankInfo.title as any)}
                                 </span>
                             </div>
                         </div>
                         <div className="text-right">
                             <p className="font-bold text-[var(--color-primary)]">{u.points || 0}</p>
                             <p className="text-[10px] text-gray-400">PTS</p>
                         </div>
                     </div>
                 );
             })}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Device Pie Chart */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200 dark:bg-slate-800 dark:border-slate-700 lg:col-span-1">
          <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">{t('deviceDist')}</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deviceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {deviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: 'var(--color-bg-popover)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} 
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Bar Chart */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200 dark:bg-slate-800 dark:border-slate-700 lg:col-span-1">
             <div className="flex items-center gap-2 mb-4">
                 <BarChart3 className="h-5 w-5 text-blue-500" />
                 <h3 className="text-lg font-semibold text-gray-800 dark:text-white">收入趋势</h3>
             </div>
             <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={visitData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:opacity-10" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 10}} />
                        <Tooltip 
                            cursor={{fill: 'transparent'}}
                            contentStyle={{ backgroundColor: 'var(--color-bg-popover)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} 
                        />
                        <Bar dataKey="revenue" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
             </div>
        </div>

        {/* Performance Radar Chart */}
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200 dark:bg-slate-800 dark:border-slate-700 lg:col-span-1">
             <div className="flex items-center gap-2 mb-4">
                 <Target className="h-5 w-5 text-purple-500" />
                 <h3 className="text-lg font-semibold text-gray-800 dark:text-white">系统性能</h3>
             </div>
             <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={performanceData}>
                        <PolarGrid stroke="#e5e7eb" className="dark:stroke-slate-600" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                        <Radar
                            name="Performance"
                            dataKey="A"
                            stroke="#8b5cf6"
                            fill="#8b5cf6"
                            fillOpacity={0.6}
                        />
                        <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--color-bg-popover)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} 
                        />
                    </RadarChart>
                </ResponsiveContainer>
             </div>
        </div>
      </div>
      
      {/* Activity Log */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200 dark:bg-slate-800 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{t('recentActivity')}</h3>
                {isSyncing && <span className="text-xs text-blue-500 animate-pulse">Syncing...</span>}
            </div>
            <div className="space-y-0">
                {recentActivities.length > 0 ? recentActivities.map((act) => (
                    <div key={act.id} className="flex items-center space-x-4 border-b border-gray-50 py-3 last:border-0 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 px-2 -mx-2 rounded-lg transition-colors">
                        <div className="relative shrink-0">
                            <img 
                                src={act.userAvatar || `https://ui-avatars.com/api/?name=${act.username}`} 
                                className="h-10 w-10 rounded-full bg-gray-100 border border-gray-100 dark:border-gray-600 object-cover" 
                                alt={act.username} 
                            />
                            <div className={`absolute -bottom-1 -right-1 rounded-full p-0.5 border-2 border-white dark:border-slate-800 ${getActivityColor(act.action)}`}>
                                {getActivityIcon(act.action)}
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                    {act.username} 
                                    <span className="font-normal text-gray-500 dark:text-gray-400 ml-1.5">
                                        {getActivityText(act)}
                                    </span>
                                </p>
                                <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{formatTime(act.timestamp)}</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{act.details}</p>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-8 text-gray-400 text-sm">暂无活动记录</div>
                )}
            </div>
      </div>

      {/* Add Widget Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
              <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-slate-800">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold dark:text-white">{t('addCustomWidget')}</h3>
                      <button onClick={() => setIsModalOpen(false)}><X className="h-5 w-5 text-gray-500" /></button>
                  </div>
                  <div className="space-y-4">
                      <input 
                        className="w-full border p-2 rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" 
                        placeholder={t('widgetTitle')}
                        value={newStat.title}
                        onChange={e => setNewStat({...newStat, title: e.target.value})}
                      />
                      <input 
                        className="w-full border p-2 rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white" 
                        placeholder={t('widgetValue')}
                        value={newStat.value}
                        onChange={e => setNewStat({...newStat, value: e.target.value})}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <select 
                            className="border p-2 rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            value={newStat.icon}
                            onChange={e => setNewStat({...newStat, icon: e.target.value})}
                        >
                            {Object.keys(IconMap).map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                        <select 
                            className="border p-2 rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            value={newStat.color}
                            onChange={e => setNewStat({...newStat, color: e.target.value})}
                        >
                            <option value="blue">Blue</option>
                            <option value="green">Green</option>
                            <option value="purple">Purple</option>
                            <option value="orange">Orange</option>
                            <option value="red">Red</option>
                        </select>
                      </div>
                      <button 
                        onClick={handleAddStat}
                        className="w-full bg-[var(--color-primary)] text-white p-2 rounded hover:opacity-90"
                      >
                          {t('addWidget')}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
