import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { useApp } from '../contexts/AppContext';
import { 
  Activity, Radio, Server, Map as MapIcon, X, 
  ShieldAlert, ZoomIn, ZoomOut, RotateCcw,
  Target, ShieldCheck, Globe, Cpu
} from 'lucide-react';
import { chinaGeoJson as localGeoJson } from '../data/chinaMapData';
import { LogItem, ViewMode } from '../types';
import { mapSimulationService } from '../services/mapSimulationService';
import { cloudService, STORAGE_KEYS } from '../services/cloudService';

// ... (Retain existing CHINA_CITIES and HUBS definitions)
const CHINA_CITIES: Record<string, { coords: number[]; type: 'hub' | 'node' | 'edge' }> = {
  '北京': { coords: [116.407526, 39.90403], type: 'hub' },
  '上海': { coords: [121.473701, 31.230416], type: 'hub' },
  '广州': { coords: [113.264385, 23.129112], type: 'hub' },
  '深圳': { coords: [114.057868, 22.543099], type: 'hub' },
  '成都': { coords: [104.066541, 30.572269], type: 'hub' },
  '武汉': { coords: [114.305393, 30.593099], type: 'hub' },
  '杭州': { coords: [120.15507, 30.274085], type: 'node' },
  '南京': { coords: [118.796877, 32.060255], type: 'node' },
  '苏州': { coords: [120.585315, 31.298886], type: 'node' },
  '合肥': { coords: [117.227239, 31.820586], type: 'node' },
  '济南': { coords: [117.120128, 36.651216], type: 'node' },
  '青岛': { coords: [120.38264, 36.067082], type: 'node' },
  '郑州': { coords: [113.625328, 34.746611], type: 'node' },
  '长沙': { coords: [112.938814, 28.228209], type: 'node' },
  '南昌': { coords: [115.858198, 28.682892], type: 'node' },
  '西安': { coords: [108.93977, 34.341574], type: 'node' },
  '太原': { coords: [112.548879, 37.87059], type: 'node' },
  '沈阳': { coords: [123.431474, 41.805698], type: 'node' },
  '大连': { coords: [121.614682, 38.914003], type: 'node' },
  '福州': { coords: [119.296494, 26.074508], type: 'node' },
  '厦门': { coords: [118.089425, 24.479834], type: 'node' },
  '重庆': { coords: [106.551556, 29.563009], type: 'node' },
  '贵阳': { coords: [106.630153, 26.647661], type: 'node' },
  '昆明': { coords: [102.832891, 24.880095], type: 'node' },
  '南宁': { coords: [108.320004, 22.82402], type: 'node' },
  '呼和浩特': { coords: [111.749181, 40.842585], type: 'edge' },
  '兰州': { coords: [103.834303, 36.061089], type: 'edge' },
  '西宁': { coords: [101.778223, 36.617144], type: 'edge' },
  '银川': { coords: [106.230977, 38.487783], type: 'edge' },
  '拉萨': { coords: [91.140856, 29.645554], type: 'edge' },
  '乌鲁木齐': { coords: [87.616848, 43.825592], type: 'edge' },
  '哈尔滨': { coords: [126.534967, 45.803775], type: 'edge' },
  '长春': { coords: [125.323544, 43.817071], type: 'edge' },
  '海口': { coords: [110.33119, 20.031971], type: 'edge' },
  '三亚': { coords: [109.511909, 18.252847], type: 'edge' },
  '喀什': { coords: [75.989755, 39.467664], type: 'edge' },
  '延吉': { coords: [129.513228, 42.904823], type: 'edge' }
};

const HUBS = ['北京', '上海', '深圳', '成都', '武汉', '广州'];

export const MapPage: React.FC = () => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const { theme, isSyncing } = useApp();
  
  // View State - Init from storage
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.MAP_CONFIG) || '{}');
      return (saved.viewMode as ViewMode) || 'business';
  });

  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isLoadingMap, setIsLoadingMap] = useState(true);
  
  // Data State
  const [simData, setSimData] = useState(mapSimulationService.getState());
  const { activeUsers, threatLevel, systemLoad, logs, trendData } = simData;

  // Sync View Mode change
  useEffect(() => {
     localStorage.setItem(STORAGE_KEYS.MAP_CONFIG, JSON.stringify({ viewMode }));
     // Small delay to debounce if user clicks rapidly
     const timer = setTimeout(() => cloudService.push(), 1000);
     return () => clearTimeout(timer);
  }, [viewMode]);

  // Handle cloud update incoming
  useEffect(() => {
      if (!isSyncing) {
         const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.MAP_CONFIG) || '{}');
         if (saved.viewMode && saved.viewMode !== viewMode) {
             setViewMode(saved.viewMode);
         }
      }
  }, [isSyncing]);

  // --- Real-time Simulation Engine ---
  useEffect(() => {
    const cityNames = Object.keys(CHINA_CITIES);
    const interval = setInterval(() => {
        const newState = mapSimulationService.tick(viewMode, cityNames);
        setSimData(newState);
    }, 1200);
    return () => clearInterval(interval);
  }, [viewMode]);

  // --- ECharts Logic ---
  useEffect(() => {
    let isMounted = true;

    const updateChartOption = (chart: echarts.ECharts) => {
        const isDark = theme.mode === 'dark';
        
        // --- Theme Config ---
        const colors = {
            business: {
                area: isDark ? '#1e293b' : '#f1f5f9',
                borderColor: isDark ? '#334155' : '#cbd5e1',
                line: '#3b82f6',
                point: '#60a5fa',
                effect: '#2563eb'
            },
            infra: {
                area: isDark ? '#1e1b4b' : '#f3e8ff', 
                borderColor: isDark ? '#4c1d95' : '#d8b4fe',
                line: '#a855f7',
                point: '#d8b4fe',
                effect: '#7c3aed'
            },
            security: {
                area: isDark ? '#2a0a0a' : '#fef2f2', 
                borderColor: isDark ? '#7f1d1d' : '#fecaca',
                line: '#ef4444',
                point: '#fca5a5',
                effect: '#dc2626'
            },
            globe: {
                area: isDark ? '#0f172a' : '#f0f9ff',
                borderColor: isDark ? '#1e293b' : '#bae6fd',
                line: '#0ea5e9',
                point: '#38bdf8',
                effect: '#0284c7'
            }
        }[viewMode];

        // --- Data Generation ---
        const linesData: any[] = [];
        const scatterData: any[] = [];
        
        Object.entries(CHINA_CITIES).forEach(([name, data]) => {
            scatterData.push({
                name,
                value: [...data.coords, Math.floor(Math.random() * 100)],
                itemStyle: { 
                    color: viewMode === 'security' && data.type === 'hub' ? '#ff0000' : colors.point 
                }
            });

            if (viewMode === 'business') {
                if (data.type !== 'hub') {
                    const target = HUBS[Math.floor(Math.random() * HUBS.length)];
                    if (name !== target) {
                        linesData.push({
                            coords: [data.coords, CHINA_CITIES[target].coords],
                            lineStyle: { type: 'solid', width: 1, opacity: 0.2, curveness: 0.2 }
                        });
                    }
                }
            } else if (viewMode === 'infra') {
                if (data.type === 'hub') {
                    HUBS.forEach(h => {
                        if (name !== h && Math.random() > 0.4) {
                             linesData.push({
                                coords: [data.coords, CHINA_CITIES[h].coords],
                                lineStyle: { type: 'dashed', width: 2, opacity: 0.4, curveness: 0 }
                            });
                        }
                    });
                }
            } else if (viewMode === 'globe') {
                if (data.type !== 'node') {
                   const target = HUBS[Math.floor(Math.random() * HUBS.length)];
                   linesData.push({
                       coords: [data.coords, CHINA_CITIES[target].coords],
                       lineStyle: { type: 'solid', width: 1, opacity: 0.3, curveness: 0.2, color: colors.line }
                   });
                }
            } else {
                if (data.type === 'edge') {
                    const target = HUBS[Math.floor(Math.random() * HUBS.length)];
                     linesData.push({
                        coords: [data.coords, CHINA_CITIES[target].coords],
                        lineStyle: { width: 2, opacity: 0.6, curveness: 0.3, color: '#ef4444' }
                    });
                }
            }
        });

        const option: echarts.EChartsOption = {
            backgroundColor: 'transparent',
            tooltip: { trigger: 'item' },
            geo: {
                map: 'china',
                roam: true,
                zoom: 1.25,
                center: [105, 36],
                label: { 
                    show: true, 
                    color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                    fontSize: 10
                },
                itemStyle: {
                    areaColor: colors.area,
                    borderColor: colors.borderColor,
                    borderWidth: 1.5,
                    shadowColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.1)',
                    shadowBlur: 10,
                    shadowOffsetY: 5
                },
                emphasis: {
                    itemStyle: { 
                        areaColor: isDark ? '#334155' : '#e2e8f0',
                        shadowBlur: 15 
                    },
                    label: { show: true, color: isDark ? '#fff' : '#000' }
                }
            },
            series: [
                {
                    type: 'effectScatter',
                    coordinateSystem: 'geo',
                    data: scatterData.filter(d => HUBS.includes(d.name)),
                    symbolSize: viewMode === 'security' ? 15 : 12,
                    rippleEffect: {
                        brushType: 'fill', 
                        scale: viewMode === 'security' ? 6 : 4,
                        period: viewMode === 'security' ? 2 : 4, 
                        color: colors.effect
                    },
                    itemStyle: { color: colors.effect },
                    label: {
                        show: true,
                        position: 'right',
                        formatter: '{b}',
                        fontSize: 12,
                        fontWeight: 'bold',
                        color: isDark ? '#fff' : '#333',
                        textBorderColor: isDark ? '#000' : '#fff',
                        textBorderWidth: 2,
                        backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)',
                        borderRadius: 4,
                        padding: [4, 6]
                    },
                    zlevel: 2
                },
                {
                    type: 'scatter',
                    coordinateSystem: 'geo',
                    data: scatterData.filter(d => !HUBS.includes(d.name)),
                    symbolSize: 6,
                    itemStyle: { color: colors.point, opacity: 0.7 },
                    label: {
                        show: true,
                        position: 'right',
                        formatter: '{b}',
                        fontSize: 10,
                        color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)',
                        textBorderColor: isDark ? '#000' : '#fff',
                        textBorderWidth: 1.5
                    },
                    zlevel: 2
                },
                {
                    type: 'lines',
                    effect: {
                        show: true,
                        period: viewMode === 'security' ? 2 : 4, 
                        trailLength: viewMode === 'security' ? 0.8 : 0.5, 
                        color: colors.line,
                        symbol: viewMode === 'infra' ? 'rect' : 'arrow',
                        symbolSize: viewMode === 'security' ? 6 : 4
                    },
                    lineStyle: {
                        color: colors.line,
                        width: 0,
                        curveness: 0.2
                    },
                    data: linesData,
                    zlevel: 1
                }
            ]
        };
        chart.setOption(option, true);
    };

    const initChart = () => {
        if (!chartRef.current) return;
        if (chartRef.current.clientWidth === 0 || chartRef.current.clientHeight === 0) return;

        try {
            if (chartInstance.current) chartInstance.current.dispose();
            const myChart = echarts.init(chartRef.current, theme.mode === 'dark' ? 'dark' : undefined);
            chartInstance.current = myChart;

            myChart.on('click', (params) => {
                if (params.componentType === 'series' && params.seriesType.includes('scatter')) {
                    setSelectedCity(params.name);
                }
            });
            myChart.getZr().on('click', (params) => {
                if (!params.target) setSelectedCity(null);
            });

            updateChartOption(myChart);
        } catch (err: any) {
            console.error("Chart rendering failed:", err);
        }
    };

    const loadMapData = async () => {
        try {
            setIsLoadingMap(true);
            setMapError(null);
            
            if (echarts.getMap('china')) {
                initChart();
                setIsLoadingMap(false);
                return;
            }

            try {
                const response = await fetch('https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json');
                if (!response.ok) throw new Error('Network error');
                const geoJson = await response.json();
                echarts.registerMap('china', geoJson);
            } catch (aliyunError) {
                if (localGeoJson && localGeoJson.features) {
                     echarts.registerMap('china', localGeoJson as any);
                } else {
                    throw new Error("No map data available");
                }
            }
            initChart();
        } catch (err: any) {
            console.error("Map data loading failed:", err);
            setMapError(`地图数据加载失败: ${err.message}`);
        } finally {
            setIsLoadingMap(false);
        }
    };

    loadMapData();

    const timer = setInterval(() => {
        if (chartInstance.current) updateChartOption(chartInstance.current);
    }, 5000);

    return () => {
        isMounted = false;
        clearInterval(timer);
        chartInstance.current?.dispose();
    };
  }, [theme.mode, viewMode]);

  useEffect(() => {
      const handleResize = () => chartInstance.current?.resize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleZoom = (direction: 'in' | 'out') => {
      if (!chartInstance.current) return;
      const option = chartInstance.current.getOption() as any;
      const currentZoom = option.geo[0].zoom;
      chartInstance.current.setOption({
          geo: { zoom: direction === 'in' ? currentZoom * 1.2 : currentZoom / 1.2 }
      });
  };

  const handleReset = () => {
      if (!chartInstance.current) return;
      chartInstance.current.setOption({
          geo: { zoom: 1.25, center: [105, 36] }
      });
  };

  return (
    <div className="relative h-[calc(100vh-8rem)] w-full rounded-2xl border border-gray-200 shadow-xl bg-slate-50 dark:bg-[#0b1121] dark:border-slate-800 overflow-hidden flex flex-col transition-colors duration-500 group">
        
        {/* Ambient Background Grid */}
        <div className="absolute inset-0 pointer-events-none z-0" 
             style={{ 
                 backgroundImage: theme.mode === 'dark' 
                    ? 'radial-gradient(#334155 1px, transparent 1px)' 
                    : 'radial-gradient(#cbd5e1 1px, transparent 1px)', 
                 backgroundSize: '30px 30px', 
                 opacity: 0.3 
             }}>
        </div>

        {/* Loading / Error States */}
        {isLoadingMap && (
             <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-900/50 z-50 backdrop-blur-sm">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-primary)] mb-4"></div>
            </div>
        )}

        {mapError && (
             <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 z-50">
                <div className="text-center p-6 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-red-200 dark:border-red-900">
                    <ShieldAlert className="h-10 w-10 text-red-500 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">地图加载异常</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{mapError}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                    >
                        重试
                    </button>
                </div>
            </div>
        )}

        {/* Radar Scan Effect */}
        {viewMode === 'security' && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-red-500/10 z-0 pointer-events-none animate-[spin_10s_linear_infinite]">
                 <div className="w-full h-full rounded-full bg-gradient-to-r from-transparent via-red-500/10 to-transparent blur-3xl opacity-30"></div>
            </div>
        )}

        {/* 1. Top Control Bar */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-full shadow-lg border border-gray-100 dark:border-slate-700 p-1 flex gap-1">
            <button 
                onClick={() => setViewMode('business')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${viewMode === 'business' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700'}`}
            >
                <Activity className="h-3.5 w-3.5" /> 业务全景
            </button>
            <button 
                onClick={() => setViewMode('infra')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${viewMode === 'infra' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700'}`}
            >
                <Server className="h-3.5 w-3.5" /> 基础架构
            </button>
            <button 
                onClick={() => setViewMode('security')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${viewMode === 'security' ? 'bg-red-600 text-white shadow-md animate-pulse' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700'}`}
            >
                <ShieldAlert className="h-3.5 w-3.5" /> 安全态势
            </button>
            <button 
                onClick={() => setViewMode('globe')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${viewMode === 'globe' ? 'bg-cyan-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700'}`}
            >
                <MapIcon className="h-3.5 w-3.5" /> 区域概览
            </button>
        </div>

        {/* 2. Left Stats Panel */}
        <div className="absolute top-4 left-4 z-20 w-64 space-y-4">
            {/* Main Metric Card */}
            <div className={`backdrop-blur-md p-5 rounded-2xl shadow-lg border transition-colors duration-300
                ${viewMode === 'business' ? 'bg-white/90 border-blue-100 dark:bg-slate-900/90 dark:border-blue-900/30' : 
                  viewMode === 'infra' ? 'bg-white/90 border-purple-100 dark:bg-slate-900/90 dark:border-purple-900/30' :
                  viewMode === 'security' ? 'bg-red-50/90 border-red-100 dark:bg-red-950/80 dark:border-red-900/30' :
                  'bg-cyan-50/90 border-cyan-100 dark:bg-cyan-950/80 dark:border-cyan-900/30'}
            `}>
                <div className="flex items-center gap-2 mb-4">
                     {viewMode === 'business' && <Globe className="h-4 w-4 text-blue-500" />}
                     {viewMode === 'infra' && <Cpu className="h-4 w-4 text-purple-500" />}
                     {viewMode === 'security' && <Target className="h-4 w-4 text-red-500 animate-spin-slow" />}
                     {viewMode === 'globe' && <MapIcon className="h-4 w-4 text-cyan-500" />}
                     <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {viewMode === 'business' ? '全球业务监控' : viewMode === 'infra' ? '核心负载监控' : viewMode === 'security' ? '威胁感知中心' : '区域网络概览'}
                     </span>
                </div>

                <div className="flex items-end gap-2 mb-2">
                    <span className={`text-3xl font-bold tabular-nums 
                        ${viewMode === 'business' ? 'text-gray-900 dark:text-white' : 
                          viewMode === 'infra' ? 'text-purple-600 dark:text-purple-400' : 
                          viewMode === 'security' ? 'text-red-600 dark:text-red-500' :
                          'text-cyan-600 dark:text-cyan-400'}
                    `}>
                        {viewMode === 'business' ? activeUsers.toLocaleString() : 
                         viewMode === 'infra' ? `${systemLoad}%` : 
                         viewMode === 'security' ? `${threatLevel}` : '100%'}
                    </span>
                    <span className="text-xs text-gray-400 mb-1.5">
                        {viewMode === 'business' ? '在线用户' : viewMode === 'infra' ? 'CPU 负载' : viewMode === 'security' ? '威胁指数' : '网络健康度'}
                    </span>
                </div>

                {/* SVG Sparkline */}
                <div className="h-10 w-full flex items-end gap-0.5 opacity-50">
                    {trendData.map((val, i) => (
                        <div key={i} 
                            className={`flex-1 rounded-t-sm transition-all duration-300
                                ${viewMode === 'business' ? 'bg-blue-500' : 
                                  viewMode === 'infra' ? 'bg-purple-500' : 
                                  viewMode === 'security' ? 'bg-red-500' : 'bg-cyan-500'}
                            `}
                            style={{ height: `${val}%` }}
                        ></div>
                    ))}
                </div>
            </div>

            {/* Live Logs */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
                 <div className="p-3 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                    <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Radio className={`h-3 w-3 ${viewMode === 'security' ? 'text-red-500' : viewMode === 'globe' ? 'text-cyan-500' : 'text-green-500'} animate-pulse`} />
                        实时日志
                    </h3>
                    <span className="text-[10px] font-mono text-gray-400">{logs.length} EVENTS</span>
                 </div>
                 <div className="max-h-[200px] overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/90 dark:to-slate-900/90 pointer-events-none z-10"></div>
                     <div className="p-3 space-y-3">
                        {logs.map(log => (
                            <div key={log.id} className="flex items-start gap-3 text-xs animate-fade-in-down">
                                <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${
                                    log.level === 'error' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 
                                    log.level === 'warn' ? 'bg-amber-500' : 'bg-green-500'
                                }`}></div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between">
                                        <span className="text-gray-900 dark:text-gray-200 font-medium truncate w-16">{log.city}</span>
                                        <span className="text-xs text-gray-400 font-mono">{log.time}</span>
                                    </div>
                                    <p className={`truncate mt-0.5 ${log.level === 'error' ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                        {log.action}
                                    </p>
                                </div>
                            </div>
                        ))}
                     </div>
                 </div>
             </div>
        </div>

        {/* 3. Right Map Controls */}
        <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2">
            <button onClick={() => handleZoom('in')} className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:text-[var(--color-primary)] transition-colors">
                <ZoomIn className="h-5 w-5" />
            </button>
            <button onClick={() => handleZoom('out')} className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:text-[var(--color-primary)] transition-colors">
                <ZoomOut className="h-5 w-5" />
            </button>
            <button onClick={handleReset} className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:text-[var(--color-primary)] transition-colors">
                <RotateCcw className="h-5 w-5" />
            </button>
        </div>

        {/* 4. Detail Slide-out Panel */}
        <div className={`absolute top-4 bottom-4 right-16 w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 transform transition-transform duration-300 z-20 flex flex-col ${selectedCity ? 'translate-x-0' : 'translate-x-[120%]'}`}>
            {selectedCity && (
                <>
                    <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                        <div className="flex justify-between items-start mb-2">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedCity}</h2>
                            <button onClick={() => setSelectedCity(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                                <X className="h-5 w-5 text-gray-400" />
                            </button>
                        </div>
                        <div className="flex gap-2">
                             <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${HUBS.includes(selectedCity) ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                {HUBS.includes(selectedCity) ? '核心枢纽' : '边缘节点'}
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                在线
                            </span>
                        </div>
                    </div>
                    
                    <div className="p-6 flex-1 space-y-6 overflow-y-auto">
                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700">
                            <p className="text-xs text-gray-500 mb-2">节点健康度</p>
                            <div className="w-full bg-gray-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                <div className="bg-green-500 h-full rounded-full" style={{width: '94%'}}></div>
                            </div>
                            <div className="flex justify-between mt-1">
                                <span className="text-xs font-mono text-gray-400">SCORE</span>
                                <span className="text-xs font-bold text-green-600">94/100</span>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>

        <div ref={chartRef} className="w-full h-full z-10 transition-all duration-500"></div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-gray-400 opacity-50 z-10 pointer-events-none">
            GEO-SPATIAL INTELLIGENCE SYSTEM v3.0
        </div>
    </div>
  );
};