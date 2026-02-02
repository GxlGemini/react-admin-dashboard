
import React, { useState, useEffect, useCallback } from 'react';
import { LoginLog } from '../types';
import { loginLogService } from '../services/loginLogService';
import { ShieldCheck, Search, Monitor, Globe, Clock, RefreshCw, Smartphone, Laptop, Wifi, WifiOff, History, Network, Timer, AlertCircle } from 'lucide-react';

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
                // STRICT LIMIT: Keep only the latest 30 records to match the policy
                setLogs(data.slice(0, 30));
            } else {
                setLogs([]);
            }
        } catch (e) {
            console.error("Fetch logs failed", e);
            if (!isBackground) setLogs([]); 
        } finally {
            setIsLoadingInitial(false);
            setIsRefreshing(false);
        }
    }, []);

    // Initial Load
    useEffect(() => {
        fetchLogs(false);
    }, [fetchLogs]);

    // Background Refresh (Every 30s for better "live" feel)
    useEffect(() => {
        const interval = setInterval(() => {
            fetchLogs(true);
            setTick(t => t + 1); 
        }, 30000);
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
        const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 mins

        if (diff < IDLE_TIMEOUT) {
            return { label: '在线', color: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 animate-pulse', icon: Wifi };
        } else {
            return { label: '离线', color: 'text-slate-400 bg-slate-100 border-slate-200 dark:bg-slate-700 dark:border-slate-600', icon: WifiOff };
        }
    };

    const formatDuration = (ms?: number) => {
        if (!ms) return <span className="text-gray-300">-</span>;
        
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        
        if (minutes > 120) return <span className="text-gray-500">&gt; 2h</span>;

        return (
            <span className="font-mono text-xs">
                {minutes > 0 && <span className="text-slate-900 dark:text-white font-bold">{minutes}m </span>}
                <span className="text-slate-500 dark:text-slate-400">{seconds}s</span>
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
                    <div className="flex items-center gap-2 mt-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                            实时监控 | 自动滚动清理 (保留最新30条)
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="搜索 IP / 用户 / 地区..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-all dark:text-white text-sm font-medium"
                        />
                    </div>
                    <button 
                        onClick={() => fetchLogs(true)}
                        className="p-2.5 bg-gray-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors border border-slate-200 dark:border-slate-600"
                        title="立即刷新"
                    >
                        <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden relative min-h-[400px]">
                {isLoadingInitial && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm z-10 flex items-center justify-center">
                        <RefreshCw className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
                    </div>
                )}
                
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider text-xs w-24">Status</th>
                                <th className="px-6 py-4 font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider text-xs">User Identity</th>
                                <th className="px-6 py-4 font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider text-xs">Location / Device</th>
                                <th className="px-6 py-4 font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider text-xs">Duration</th>
                                <th className="px-6 py-4 font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider text-xs">Timeline</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                            {filteredLogs.length === 0 && !isLoadingInitial ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                                            <History className="w-16 h-16 mb-4 opacity-50" />
                                            <p className="text-sm font-medium">{logs.length === 0 ? '暂无审计记录' : '未找到匹配的会话'}</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => {
                                    const status = getSessionStatus(log.lastAccessed);
                                    return (
                                    <tr key={log.id} className="hover:bg-blue-50/50 dark:hover:bg-slate-700/30 transition-colors group">
                                        <td className="px-6 py-4 align-middle">
                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${status.color} shadow-sm`}>
                                                <status.icon className="w-3 h-3" />
                                                {status.label}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-middle">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden border-2 border-white dark:border-slate-600 shadow-sm shrink-0">
                                                    <img src={log.avatar || `https://ui-avatars.com/api/?name=${log.username}`} alt="avatar" className="w-full h-full object-cover" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                                                        {log.username}
                                                    </div>
                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border mt-1 shadow-sm ${getRankColor(log.rankTitle)}`}>
                                                        {log.rankTitle || '未知'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-middle">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                                                    <Globe className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                                    <span className="truncate max-w-[180px]" title={log.location}>{log.location || 'Unknown Area'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600">
                                                        {log.ip || '0.0.0.0'}
                                                    </span>
                                                    {log.isp && (
                                                        <span className="flex items-center gap-1 text-[10px] text-slate-400 truncate max-w-[100px]" title={log.isp}>
                                                            <Network className="w-3 h-3" />
                                                            {log.isp}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-xs mt-0.5 text-slate-400">
                                                    <div className="flex items-center gap-1" title={`Browser: ${log.browser}`}>
                                                        <Monitor className="w-3 h-3" />
                                                        <span className="text-[10px]">{log.browser || '-'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1" title={`OS: ${log.os}`}>
                                                        {getOsIcon(log.os)}
                                                        <span className="text-[10px]">{log.os || '-'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-middle">
                                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 px-3 py-1.5 rounded-lg w-fit border border-slate-100 dark:border-slate-700">
                                                <Timer className="w-4 h-4 text-orange-500" />
                                                {formatDuration(log.durationMs)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-middle">
                                            <div className="flex flex-col gap-2 border-l-2 border-slate-100 dark:border-slate-700 pl-3 ml-1 relative">
                                                <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-600"></div>
                                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-xs">
                                                    <span className="text-slate-400 text-[10px] uppercase font-bold w-8">Login</span>
                                                    <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded">{log.loginTime ? new Date(log.loginTime).toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit'}) : '-'}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-xs">
                                                    <span className="text-slate-400 text-[10px] uppercase font-bold w-8">Active</span>
                                                    <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded">{log.lastAccessed ? new Date(log.lastAccessed).toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit'}) : '-'}</span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )})
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Footer Info */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 flex justify-between items-center text-xs text-slate-400">
                    <div className="flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>只展示最近 30 条会话记录</span>
                    </div>
                    <div>
                        Total: {logs.length}
                    </div>
                </div>
            </div>
        </div>
    );
};
