import React, { useState, useEffect, useCallback } from 'react';
import { LoginLog } from '../types';
import { loginLogService } from '../services/loginLogService';
import { ShieldCheck, Search, Monitor, Globe, Clock, RefreshCw, Smartphone, Laptop, Wifi, WifiOff, History, Network, Timer } from 'lucide-react';

export const LoginHistoryPage: React.FC = () => {
    const [logs, setLogs] = useState<LoginLog[]>([]);
    const [isLoadingInitial, setIsLoadingInitial] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    // Trigger refresh periodically
    const [tick, setTick] = useState(0);

    const fetchLogs = useCallback(async (isBackground = false) => {
        if (!isBackground) setIsLoadingInitial(true);
        else setIsRefreshing(true);

        try {
            const data = await loginLogService.fetchLogs();
            if (Array.isArray(data)) {
                setLogs(data);
            } else {
                setLogs([]);
            }
        } catch (e) {
            console.error("Fetch logs failed", e);
            if (!isBackground) setLogs([]); // Only clear on initial error
        } finally {
            setIsLoadingInitial(false);
            setIsRefreshing(false);
        }
    }, []);

    // Initial Load
    useEffect(() => {
        fetchLogs(false);
    }, [fetchLogs]);

    // Background Refresh (Every 1 min)
    useEffect(() => {
        const interval = setInterval(() => {
            fetchLogs(true);
            setTick(t => t + 1); // Force re-render of timestamps
        }, 60000);
        return () => clearInterval(interval);
    }, [fetchLogs]);

    const filteredLogs = logs.filter(log => {
        if (!log) return false;
        const term = searchTerm.toLowerCase();
        return (log.username || '').toLowerCase().includes(term) ||
               (log.ip || '').includes(term) ||
               (log.location || '').toLowerCase().includes(term) ||
               (log.isp || '').toLowerCase().includes(term);
    });

    const getRankColor = (title?: string) => {
        if (!title) return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
        if (title.includes('皇帝')) return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
        if (title.includes('太保') || title.includes('宰相')) return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800';
        if (title.includes('尚书') || title.includes('督公')) return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
        return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
    };

    const getOsIcon = (os?: string) => {
        if (!os) return <Monitor className="w-4 h-4 text-gray-500" />;
        const lower = os.toLowerCase();
        if (lower.includes('win') || lower.includes('mac') || lower.includes('linux')) return <Laptop className="w-4 h-4 text-gray-500" />;
        return <Smartphone className="w-4 h-4 text-gray-500" />;
    };

    const getSessionStatus = (lastAccessed?: string) => {
        if (!lastAccessed) return { label: '离线', color: 'text-gray-400 bg-gray-100 border-gray-200 dark:bg-slate-700 dark:border-slate-600', icon: WifiOff };
        
        const diff = Date.now() - new Date(lastAccessed).getTime();
        // Considered online if active within last 15 minutes (Heartbeat interval is 45s)
        const IDLE_TIMEOUT = 15 * 60 * 1000;

        if (diff < IDLE_TIMEOUT) {
            return { label: '在线', color: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 animate-pulse', icon: Wifi };
        } else {
            return { label: '离线', color: 'text-gray-400 bg-gray-100 border-gray-200 dark:bg-slate-700 dark:border-slate-600', icon: WifiOff };
        }
    };

    const formatDuration = (ms?: number) => {
        if (!ms) return <span className="text-gray-300">-</span>;
        
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        
        // FIX: Replaced '>' with '&gt;' to fix build error
        if (minutes > 120) return <span className="text-gray-500">&gt; 2h</span>;

        return (
            <span className="font-mono text-xs">
                {minutes > 0 && <span className="text-gray-900 dark:text-white font-bold">{minutes}m </span>}
                <span className="text-gray-700 dark:text-gray-300">{seconds}s</span>
            </span>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                        <ShieldCheck className="w-8 h-8 text-[var(--color-primary)]" />
                        登录行为审计
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        实时监控会话状态与时长，保留最新30条记录 (自动滚动清理)。
                    </p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="搜索 IP / 用户 / 地区..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-all dark:text-white"
                        />
                    </div>
                    <button 
                        onClick={() => fetchLogs(true)}
                        className="p-2.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                        title="刷新列表"
                    >
                        <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs w-24">状态</th>
                                <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">用户身份</th>
                                <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">地理位置 / 设备</th>
                                <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">会话时长</th>
                                <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">时间轴</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {isLoadingInitial ? (
                                Array.from({length: 5}).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-16"></div></td>
                                        <td className="px-6 py-4"><div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-full inline-block mr-2"></div><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 inline-block"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-40 mb-2"></div><div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-20"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32"></div></td>
                                    </tr>
                                ))
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-400">
                                            <History className="w-12 h-12 mb-3 opacity-20" />
                                            <p>{logs.length === 0 ? '暂无审计记录' : '未找到匹配的会话'}</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => {
                                    const status = getSessionStatus(log.lastAccessed);
                                    return (
                                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                        <td className="px-6 py-4 align-middle">
                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${status.color}`}>
                                                <status.icon className="w-3 h-3" />
                                                {status.label}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-middle">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-600 shrink-0">
                                                    <img src={log.avatar || `https://ui-avatars.com/api/?name=${log.username}`} alt="avatar" className="w-full h-full object-cover" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                                                        {log.username}
                                                    </div>
                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border mt-1 ${getRankColor(log.rankTitle)}`}>
                                                        {log.rankTitle || '未知'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-middle">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                                                    <Globe className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                                    <span className="truncate max-w-[200px]" title={log.location}>{log.location || 'Unknown'}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                    <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                                                        {log.ip || '-'}
                                                    </span>
                                                    {log.isp && (
                                                        <span className="flex items-center gap-1 text-[10px] truncate max-w-[120px] opacity-80" title={log.isp}>
                                                            <Network className="w-3 h-3" />
                                                            {log.isp}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-xs mt-1 text-slate-400">
                                                    <div className="flex items-center gap-1" title="浏览器">
                                                        <Monitor className="w-3 h-3" />
                                                        <span className="text-[10px]">{log.browser || '-'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1" title="操作系统">
                                                        {getOsIcon(log.os)}
                                                        <span className="text-[10px]">{log.os || '-'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-middle">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                                    <Timer className="w-4 h-4 text-orange-500" />
                                                    {formatDuration(log.durationMs)}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-middle">
                                            <div className="flex flex-col gap-2 border-l-2 border-slate-100 dark:border-slate-700 pl-3">
                                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-xs">
                                                    <Clock className="w-3.5 h-3.5 text-green-500" />
                                                    <span className="text-slate-400 text-[10px]">登录:</span>
                                                    <span className="font-mono">{log.loginTime ? new Date(log.loginTime).toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit'}) : '-'}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-xs">
                                                    <History className="w-3.5 h-3.5 text-blue-500" />
                                                    <span className="text-slate-400 text-[10px]">活跃:</span>
                                                    <span className="font-mono">{log.lastAccessed ? new Date(log.lastAccessed).toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit'}) : '-'}</span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )})
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
