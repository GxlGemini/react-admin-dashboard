import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { 
  Cloud, Search, Droplets, Wind, Settings, MapPin, 
  ThermometerSun, Plus, X, Sun, Moon, CloudRain, CloudSnow, 
  CloudLightning, Eye, Gauge, Navigation, Calendar, RefreshCw 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { useApp } from '../contexts/AppContext';
import { cloudService, STORAGE_KEYS } from '../services/cloudService';

// --- Types & Constants ---

interface HourlyData {
  time: string;
  temp: number;
  code: number;
}

interface DailyData {
  date: string;
  max: number;
  min: number;
  code: number;
}

interface DetailedWeatherData {
  city: string;
  cnName: string;
  current: {
    temp: number;
    condition: string;
    code: number;
    humidity: number;
    windSpeed: number;
    pressure: number;
    feelsLike: number;
    isDay: number;
  };
  hourly: HourlyData[];
  daily: DailyData[];
  updatedAt: number;
}

const CITY_DB: Record<string, { lat: number, lon: number, cnName: string }> = {
    'Beijing': { lat: 39.9042, lon: 116.4074, cnName: '北京' },
    'Shanghai': { lat: 31.2304, lon: 121.4737, cnName: '上海' },
    'Guangzhou': { lat: 23.1291, lon: 113.2644, cnName: '广州' },
    'Shenzhen': { lat: 22.5431, lon: 114.0579, cnName: '深圳' },
    'Chengdu': { lat: 30.5728, lon: 104.0668, cnName: '成都' },
    'Hangzhou': { lat: 30.2741, lon: 120.1551, cnName: '杭州' },
    'Wuhan': { lat: 30.5928, lon: 114.3055, cnName: '武汉' },
    'Xi\'an': { lat: 34.3416, lon: 108.9398, cnName: '西安' },
    'Chongqing': { lat: 29.5630, lon: 106.5516, cnName: '重庆' },
    'Hong Kong': { lat: 22.3193, lon: 114.1694, cnName: '香港' },
    'Lhasa': { lat: 29.6525, lon: 91.1721, cnName: '拉萨' },
    'Urumqi': { lat: 43.8256, lon: 87.6168, cnName: '乌鲁木齐' },
    'Harbin': { lat: 45.8038, lon: 126.5349, cnName: '哈尔滨' },
    'Sanya': { lat: 18.2528, lon: 109.5119, cnName: '三亚' },
};

const getWeatherInfo = (code: number, isDay: number = 1) => {
    if (code === 0) return { text: '晴', icon: isDay ? Sun : Moon, color: isDay ? 'from-orange-400 to-yellow-300' : 'from-slate-700 to-slate-900', bg: isDay ? 'bg-orange-500' : 'bg-slate-800' };
    if (code >= 1 && code <= 3) return { text: '多云', icon: Cloud, color: isDay ? 'from-blue-400 to-blue-200' : 'from-slate-600 to-slate-800', bg: 'bg-blue-500' };
    if (code >= 45 && code <= 48) return { text: '雾', icon: Cloud, color: 'from-gray-400 to-slate-300', bg: 'bg-gray-500' };
    if (code >= 51 && code <= 67) return { text: '雨', icon: CloudRain, color: 'from-blue-600 to-slate-600', bg: 'bg-blue-700' };
    if (code >= 71 && code <= 77) return { text: '雪', icon: CloudSnow, color: 'from-indigo-200 to-white', bg: 'bg-indigo-300' };
    if (code >= 80 && code <= 82) return { text: '阵雨', icon: CloudRain, color: 'from-blue-500 to-blue-300', bg: 'bg-blue-600' };
    if (code >= 95 && code <= 99) return { text: '雷雨', icon: CloudLightning, color: 'from-purple-800 to-indigo-900', bg: 'bg-purple-900' };
    return { text: '未知', icon: Cloud, color: 'from-gray-400 to-gray-500', bg: 'bg-gray-500' };
};

const WeatherBackground: React.FC<{ code: number, isDay: number }> = ({ code, isDay }) => {
    if (code === 0 && isDay) {
        return (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-10 right-10 w-32 h-32 bg-yellow-300 rounded-full blur-3xl opacity-60 animate-pulse"></div>
                <div className="absolute -top-20 -left-20 w-96 h-96 bg-orange-400 rounded-full blur-[100px] opacity-40"></div>
            </div>
        );
    }
    if (code >= 51 && code <= 67 || code >= 80) {
        return (
            <div className="absolute inset-0 overflow-hidden pointer-events-none bg-gradient-to-b from-slate-800/50 to-slate-900/50">
                <div className="rain-container absolute inset-0 opacity-30">
                     <div className="absolute inset-0 bg-[url('https://raw.githubusercontent.com/frontend-assets/weather-assets/main/rain.png')] bg-repeat animate-rain"></div>
                </div>
            </div>
        );
    }
    if (code >= 1 && code <= 3) {
        return (
             <div className="absolute inset-0 overflow-hidden pointer-events-none">
                 <div className="absolute top-20 left-1/4 w-40 h-12 bg-white rounded-full blur-xl opacity-40 animate-[float_10s_infinite_ease-in-out]"></div>
                 <div className="absolute top-40 right-1/4 w-56 h-16 bg-white rounded-full blur-xl opacity-30 animate-[float_15s_infinite_ease-in-out_reverse]"></div>
             </div>
        );
    }
    return <div className="absolute inset-0 bg-gradient-to-br from-gray-900/20 to-transparent pointer-events-none"></div>;
};

export const WeatherPage: React.FC = () => {
  const { t, theme, isSyncing } = useApp();
  const [activeCity, setActiveCity] = useState<DetailedWeatherData | null>(null);
  const [monitoredCities, setMonitoredCities] = useState<DetailedWeatherData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dataLoaded, setDataLoaded] = useState(false);

  // Initial Load (Sync aware)
  useEffect(() => {
    if (!isSyncing) {
        loadInitialData();
    }
  }, [isSyncing]); 

  // Sync Data on Changes - Protected by dataLoaded
  useEffect(() => {
      // Vital: Do not save empty state if we haven't finished loading yet
      if (!dataLoaded) return;
      
      const payload = {
          monitoredCities,
          activeCityName: activeCity?.city || ''
      };
      
      localStorage.setItem(STORAGE_KEYS.WEATHER, JSON.stringify(payload));
      
      // Debounce push to avoid rapid firing
      const timer = setTimeout(() => {
        cloudService.push();
      }, 1000);
      
      return () => clearTimeout(timer);

  }, [monitoredCities, activeCity, dataLoaded]);

  const loadInitialData = async () => {
    setLoading(true);
    
    // Check localStorage (which cloudService.pull populated)
    const storedData = localStorage.getItem(STORAGE_KEYS.WEATHER);
    let initialCities: DetailedWeatherData[] = [];
    let initialActiveName = '';

    if (storedData) {
        try {
            const parsed = JSON.parse(storedData);
            initialCities = parsed.monitoredCities || [];
            initialActiveName = parsed.activeCityName || '';
        } catch (e) {
            console.error("Failed to parse weather data");
        }
    }

    if (initialCities.length > 0) {
        setMonitoredCities(initialCities);
        const found = initialCities.find(c => c.city === initialActiveName) || initialCities[0];
        setActiveCity(found);
        setLoading(false);
        setDataLoaded(true); // Mark as loaded so subsequent changes trigger save
        return;
    }

    // Fallback default if nothing in storage
    const bj = await fetchWeatherData('Beijing');
    if (bj) setActiveCity(bj);

    const others = ['Shanghai', 'Guangzhou'];
    const results = await Promise.all(others.map(c => fetchWeatherData(c)));
    const validResults = results.filter((c): c is DetailedWeatherData => c !== null);
    if (bj) validResults.unshift(bj);
    setMonitoredCities(validResults);
    
    setLoading(false);
    setDataLoaded(true); // Mark as loaded
  };

  const fetchWeatherData = async (query: string): Promise<DetailedWeatherData | null> => {
    let lat: number, lon: number, name: string = query, cnName: string = query;

    const dbKey = Object.keys(CITY_DB).find(k => k.toLowerCase() === query.toLowerCase() || CITY_DB[k].cnName === query);
    
    if (dbKey) {
        lat = CITY_DB[dbKey].lat;
        lon = CITY_DB[dbKey].lon;
        name = dbKey;
        cnName = CITY_DB[dbKey].cnName;
    } else {
        try {
            const geoRes = await axios.get(`https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=1&language=zh&format=json`);
            if (!geoRes.data.results?.length) return null;
            lat = geoRes.data.results[0].latitude;
            lon = geoRes.data.results[0].longitude;
            name = geoRes.data.results[0].name;
            cnName = name; 
        } catch (e) {
            return null;
        }
    }

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,surface_pressure,wind_speed_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`;
        const res = await axios.get(url);
        const data = res.data;

        const hourly: HourlyData[] = data.hourly.time.slice(0, 24).map((t: string, i: number) => ({
            time: t.split('T')[1].substring(0, 5),
            temp: Math.round(data.hourly.temperature_2m[i]),
            code: data.hourly.weather_code[i]
        }));

        const daily: DailyData[] = data.daily.time.map((t: string, i: number) => ({
            date: new Date(t).toLocaleDateString('zh-CN', { weekday: 'short', month: 'numeric', day: 'numeric' }),
            max: Math.round(data.daily.temperature_2m_max[i]),
            min: Math.round(data.daily.temperature_2m_min[i]),
            code: data.daily.weather_code[i]
        }));

        return {
            city: name,
            cnName,
            current: {
                temp: Math.round(data.current.temperature_2m),
                condition: getWeatherInfo(data.current.weather_code).text,
                code: data.current.weather_code,
                humidity: data.current.relative_humidity_2m,
                windSpeed: data.current.wind_speed_10m,
                pressure: Math.round(data.current.surface_pressure),
                feelsLike: Math.round(data.current.apparent_temperature),
                isDay: data.current.is_day
            },
            hourly,
            daily,
            updatedAt: Date.now()
        };
    } catch (e) {
        return null;
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!searchQuery.trim()) return;
      
      setLoading(true);
      setError('');
      const data = await fetchWeatherData(searchQuery);
      if (data) {
          if (!monitoredCities.find(c => c.city === data.city)) {
              setMonitoredCities([data, ...monitoredCities]);
          }
          setActiveCity(data);
          setSearchQuery('');
      } else {
          setError('未找到该城市');
      }
      setLoading(false);
  };

  const removeCity = (e: React.MouseEvent, cityName: string) => {
      e.stopPropagation();
      const newList = monitoredCities.filter(c => c.city !== cityName);
      setMonitoredCities(newList);
      if (activeCity?.city === cityName && newList.length > 0) {
          setActiveCity(newList[0]);
      } else if (newList.length === 0) {
          setActiveCity(null);
      }
  };

  if (!activeCity && loading) {
      return (
          <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
      );
  }

  const activeWeatherInfo = activeCity ? getWeatherInfo(activeCity.current.code, activeCity.current.isDay) : null;

  return (
    <div className="h-[calc(100vh-8rem)] w-full flex flex-col lg:flex-row gap-6 animate-fade-in overflow-hidden">
      
      {/* Left Panel */}
      <div className={`
          relative flex-1 rounded-3xl overflow-hidden shadow-2xl transition-all duration-500
          ${theme.mode === 'dark' ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-gray-200'}
      `}>
         {activeCity && activeWeatherInfo && (
             <>
                <div className={`absolute inset-0 bg-gradient-to-br ${activeWeatherInfo.color} opacity-20 dark:opacity-10 transition-colors duration-1000`}></div>
                <WeatherBackground code={activeCity.current.code} isDay={activeCity.current.isDay} />

                <div className="relative z-10 h-full flex flex-col p-8 overflow-y-auto custom-scrollbar">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <MapPin className="h-5 w-5 text-[var(--color-primary)]" />
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{activeCity.cnName}</h1>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-mono">
                                {new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                        <div className="text-right">
                             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/30 dark:bg-slate-800/30 backdrop-blur-md border border-white/20 dark:border-slate-700/50">
                                 <RefreshCw className="h-3 w-3 text-gray-600 dark:text-gray-300" />
                                 <span className="text-xs text-gray-600 dark:text-gray-300">Updated</span>
                             </div>
                        </div>
                    </div>

                    {/* Main Stats */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-10 mb-10">
                        <div className="flex items-center gap-6">
                            <div className="relative">
                                <activeWeatherInfo.icon className="h-32 w-32 drop-shadow-2xl text-gray-800 dark:text-gray-100" strokeWidth={1} />
                            </div>
                            <div>
                                <div className="text-8xl font-bold tracking-tighter text-gray-900 dark:text-white flex items-start">
                                    {activeCity.current.temp}
                                    <span className="text-4xl mt-2 font-light text-gray-400">°</span>
                                </div>
                                <div className="text-2xl font-medium text-gray-600 dark:text-gray-300">{activeWeatherInfo.text}</div>
                            </div>
                        </div>
                        
                        {/* Grid Metrics */}
                        <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                            {[
                                { icon: Droplets, label: '湿度', value: `${activeCity.current.humidity}%`, color: 'text-blue-500' },
                                { icon: Wind, label: '风速', value: `${activeCity.current.windSpeed}m/s`, color: 'text-cyan-500' },
                                { icon: Gauge, label: '气压', value: `${activeCity.current.pressure}hPa`, color: 'text-purple-500' },
                                { icon: Eye, label: '体感', value: `${activeCity.current.feelsLike}°`, color: 'text-orange-500' },
                            ].map((item, idx) => (
                                <div key={idx} className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-md p-4 rounded-2xl border border-white/20 dark:border-slate-700/50 min-w-[140px]">
                                    <div className="flex items-center gap-2 mb-2">
                                        <item.icon className={`h-4 w-4 ${item.color}`} />
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{item.label}</span>
                                    </div>
                                    <div className="text-xl font-bold text-gray-900 dark:text-white">{item.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Charts & Forecast */}
                    <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
                        {/* Hourly Chart */}
                        <div className="flex-[2] bg-white/40 dark:bg-slate-800/40 backdrop-blur-md rounded-2xl border border-white/20 dark:border-slate-700/50 p-6 flex flex-col">
                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                                <ThermometerSun className="h-4 w-4" /> 24小时温度趋势
                            </h3>
                            <div className="flex-1 w-full min-h-[150px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={activeCity.hourly}>
                                        <defs>
                                            <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={theme.color} stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor={theme.color} stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <Tooltip 
                                            contentStyle={{ 
                                                backgroundColor: theme.mode === 'dark' ? '#1e293b' : 'rgba(255,255,255,0.9)', 
                                                borderRadius: '12px', 
                                                border: 'none', 
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
                                            }}
                                            itemStyle={{ color: theme.mode === 'dark' ? '#fff' : '#1f2937' }}
                                        />
                                        <Area type="monotone" dataKey="temp" stroke={theme.color} fillOpacity={1} fill="url(#colorTemp)" strokeWidth={3} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 7-Day List */}
                        <div className="flex-1 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md rounded-2xl border border-white/20 dark:border-slate-700/50 p-6 overflow-y-auto">
                             <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                                <Calendar className="h-4 w-4" /> 7天预报
                            </h3>
                            <div className="space-y-3">
                                {activeCity.daily.map((day, idx) => {
                                    const DayInfo = getWeatherInfo(day.code);
                                    return (
                                        <div key={idx} className="flex items-center justify-between text-sm group">
                                            <span className="w-16 text-gray-600 dark:text-gray-400 font-medium">{idx === 0 ? '今天' : day.date.split(' ')[0]}</span>
                                            <div className="flex items-center gap-2 flex-1 justify-center">
                                                <DayInfo.icon className="h-4 w-4 text-gray-500 dark:text-gray-300" />
                                                <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">{DayInfo.text}</span>
                                            </div>
                                            <div className="w-20 text-right flex gap-2 justify-end">
                                                <span className="font-bold text-gray-900 dark:text-white">{day.max}°</span>
                                                <span className="text-gray-400">{day.min}°</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                    </div>
                </div>
             </>
         )}
      </div>

      {/* Right Panel: Sidebar */}
      <div className="w-full lg:w-80 flex flex-col gap-4">
          <form onSubmit={handleSearch} className="relative mt-2 p-1">
              <Search className="absolute left-5 top-5 h-5 w-5 text-gray-400" />
              <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="添加城市..."
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition-all box-border"
              />
              {error && <span className="absolute right-4 top-5 text-xs text-red-500 animate-pulse bg-white dark:bg-slate-800 px-2 rounded-lg">{error}</span>}
          </form>

          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar p-2">
              {monitoredCities.map((city) => {
                  const info = getWeatherInfo(city.current.code, city.current.isDay);
                  const isActive = activeCity?.city === city.city;
                  return (
                      <div 
                        key={city.city}
                        onClick={() => setActiveCity(city)}
                        className={`
                            relative group cursor-pointer p-4 rounded-2xl border transition-all duration-300
                            ${isActive 
                                ? 'bg-gradient-to-br from-[var(--color-primary)] to-purple-600 text-white shadow-lg scale-[1.02] border-transparent' 
                                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:shadow-md hover:border-[var(--color-primary)]/30'
                            }
                        `}
                      >
                          <div className="flex justify-between items-start">
                              <div>
                                  <h4 className={`font-bold text-lg ${isActive ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{city.cnName}</h4>
                                  <p className={`text-xs ${isActive ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>{info.text}</p>
                              </div>
                              <div className="text-right pr-6">
                                  <span className={`text-2xl font-bold tracking-tight ${isActive ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{city.current.temp}°</span>
                              </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1">
                                      <Droplets className={`h-3 w-3 ${isActive ? 'text-blue-200' : 'text-gray-400'}`} />
                                      <span className={`text-xs ${isActive ? 'text-blue-100' : 'text-gray-500'}`}>{city.current.humidity}%</span>
                                  </div>
                              </div>
                              <info.icon className={`h-8 w-8 ${isActive ? 'text-white/80' : 'text-gray-300 dark:text-slate-600'}`} />
                          </div>
                          {!isActive && (
                              <button 
                                onClick={(e) => removeCity(e, city.city)}
                                className="absolute top-3 right-3 p-1.5 rounded-full bg-white/80 dark:bg-slate-700/80 text-red-500 hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm backdrop-blur-sm"
                              >
                                  <X className="h-3.5 w-3.5" />
                              </button>
                          )}
                      </div>
                  );
              })}
          </div>
      </div>
    </div>
  );
};
