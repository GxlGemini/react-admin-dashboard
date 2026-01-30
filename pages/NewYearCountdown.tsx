
import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Music, Pause, Play, ChevronRight, Sparkles } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { cloudService, STORAGE_KEYS } from '../services/cloudService';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

// 预设节日 (Lunar New Years)
const PRESETS = [
    { label: '2025 乙巳蛇年', date: '2025-01-29T00:00', icon: '🐍' },
    { label: '2026 丙午马年', date: '2026-02-17T00:00', icon: '🐎' },
    { label: '2027 丁未羊年', date: '2027-02-06T00:00', icon: '🐐' },
];

export const NewYearCountdown: React.FC = () => {
  const { isSyncing } = useApp();
  
  // Init state from local storage or default
  const [targetDate, setTargetDate] = useState<string>(() => {
      try {
          const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.COUNTDOWN) || '{}');
          return saved.targetDate || PRESETS[0].date;
      } catch {
          return PRESETS[0].date;
      }
  });

  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [greetingIndex, setGreetingIndex] = useState(0);

  const greetings = ['恭喜发财', '万事如意', '身体健康', '岁岁平安', '财源广进'];

  // Sync: Listen for cloud updates
  useEffect(() => {
    if (!isSyncing) {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.COUNTDOWN) || '{}');
            if (saved.targetDate && saved.targetDate !== targetDate) {
                setTargetDate(saved.targetDate);
            }
        } catch(e) {}
    }
  }, [isSyncing]);

  // Sync: Save changes to cloud
  useEffect(() => {
     // Persist to local
     const data = { targetDate };
     localStorage.setItem(STORAGE_KEYS.COUNTDOWN, JSON.stringify(data));

     // Push to cloud (debounced)
     const timer = setTimeout(() => {
         cloudService.push(['countdown']);
     }, 1000);
     
     return () => clearTimeout(timer);
  }, [targetDate]);

  // Greeting Rotation
  useEffect(() => {
      const interval = setInterval(() => {
          setGreetingIndex(prev => (prev + 1) % greetings.length);
      }, 3000);
      return () => clearInterval(interval);
  }, []);

  // Countdown Logic
  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(targetDate) - +new Date();
      if (difference > 0) {
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        };
      }
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => alert("请确保 public/music/bgm.mp3 文件存在"));
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center relative overflow-hidden rounded-[3rem] bg-gradient-to-b from-[#8B0000] via-[#A52A2A] to-[#2B0d0d] text-amber-50 shadow-2xl border-4 border-[#FFD700]/30">
        
        {/* CSS for Lantern Swing */}
        <style>{`
            @keyframes swing {
                0% { transform: rotate(5deg); }
                50% { transform: rotate(-5deg); }
                100% { transform: rotate(5deg); }
            }
            @keyframes float-dust {
                0% { transform: translateY(0) translateX(0); opacity: 0; }
                50% { opacity: 0.5; }
                100% { transform: translateY(-100px) translateX(20px); opacity: 0; }
            }
            .swing-lantern {
                transform-origin: top center;
                animation: swing 4s ease-in-out infinite;
            }
            .text-glow {
                text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
            }
        `}</style>

        {/* --- Decorations --- */}
        
        {/* Background Texture */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{ 
                 backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23FCD34D\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")', 
             }}>
        </div>

        {/* Floating Gold Dust */}
        {Array.from({ length: 20 }).map((_, i) => (
             <div key={i} className="absolute w-1 h-1 bg-amber-400 rounded-full opacity-0 animate-[float-dust_5s_linear_infinite]" 
                  style={{ 
                      top: `${Math.random() * 100}%`, 
                      left: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 5}s`,
                      animationDuration: `${5 + Math.random() * 5}s`
                  }}>
             </div>
        ))}

        {/* Lanterns - Top Left */}
        <div className="absolute top-0 left-8 md:left-20 z-20">
             <div className="w-1 h-16 bg-[#FFD700] mx-auto"></div>
             <div className="swing-lantern relative">
                 <div className="w-24 h-20 bg-red-600 rounded-[2rem] border-2 border-[#FFD700] shadow-[0_0_30px_rgba(255,0,0,0.6)] flex items-center justify-center">
                     <span className="text-3xl font-serif text-[#FFD700] font-bold">福</span>
                 </div>
                 <div className="w-16 h-4 bg-[#FFD700] mx-auto -mt-1 rounded-b-lg"></div>
                 <div className="flex justify-center -mt-1 gap-1">
                      <div className="w-1 h-12 bg-yellow-600"></div>
                      <div className="w-1 h-12 bg-yellow-600"></div>
                      <div className="w-1 h-12 bg-yellow-600"></div>
                 </div>
             </div>
        </div>

        {/* Lanterns - Top Right */}
        <div className="absolute top-0 right-8 md:right-20 z-20">
             <div className="w-1 h-24 bg-[#FFD700] mx-auto"></div>
             <div className="swing-lantern relative" style={{ animationDelay: '1s' }}>
                 <div className="w-24 h-20 bg-red-600 rounded-[2rem] border-2 border-[#FFD700] shadow-[0_0_30px_rgba(255,0,0,0.6)] flex items-center justify-center">
                     <span className="text-3xl font-serif text-[#FFD700] font-bold">春</span>
                 </div>
                 <div className="w-16 h-4 bg-[#FFD700] mx-auto -mt-1 rounded-b-lg"></div>
                 <div className="flex justify-center -mt-1 gap-1">
                      <div className="w-1 h-12 bg-yellow-600"></div>
                      <div className="w-1 h-12 bg-yellow-600"></div>
                      <div className="w-1 h-12 bg-yellow-600"></div>
                 </div>
             </div>
        </div>

        {/* Couplets (对联) - Hidden on Mobile */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-4 bg-red-700/80 border-2 border-[#FFD700] p-3 rounded-xl shadow-2xl">
             {'迎喜迎春迎富贵'.split('').map((char, i) => (
                 <span key={i} className="text-3xl font-serif font-black text-[#FFD700] drop-shadow-md">{char}</span>
             ))}
        </div>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-4 bg-red-700/80 border-2 border-[#FFD700] p-3 rounded-xl shadow-2xl">
             {'接财接福接平安'.split('').map((char, i) => (
                 <span key={i} className="text-3xl font-serif font-black text-[#FFD700] drop-shadow-md">{char}</span>
             ))}
        </div>

        {/* --- Main Content --- */}
        <div className="relative z-10 text-center space-y-10 max-w-4xl w-full px-4">
            
            {/* Header */}
            <div className="space-y-4 animate-fade-in-down">
                <div className="inline-flex items-center justify-center gap-3 px-6 py-2 rounded-full bg-red-900/40 border border-[#FFD700]/30 backdrop-blur-sm mb-4">
                    <Sparkles className="h-4 w-4 text-[#FFD700] animate-pulse" />
                    <span className="text-sm font-bold text-[#FFD700] tracking-widest">{new Date(targetDate).getFullYear()} 新春快乐</span>
                    <Sparkles className="h-4 w-4 text-[#FFD700] animate-pulse" />
                </div>
                <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#FFD700] to-[#FFA500] drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] tracking-widest font-serif text-glow">
                    春节倒计时
                </h1>
                
                {/* Rotating Greeting */}
                <div className="h-12 overflow-hidden relative">
                    {greetings.map((text, i) => (
                        <div key={text} 
                             className={`absolute inset-0 flex items-center justify-center transition-all duration-700 transform
                                ${i === greetingIndex ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                        >
                             <p className="text-2xl md:text-3xl font-bold text-amber-100/90 tracking-[0.5em] uppercase text-shadow-sm">
                                {text}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Countdown Display */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 max-w-3xl mx-auto">
                {[
                    { label: '天', value: timeLeft.days },
                    { label: '时', value: timeLeft.hours },
                    { label: '分', value: timeLeft.minutes },
                    { label: '秒', value: timeLeft.seconds },
                ].map((item, idx) => (
                    <div key={idx} className="relative group">
                        <div className="absolute inset-0 bg-[#FFD700] blur-xl opacity-0 group-hover:opacity-20 transition-opacity rounded-3xl"></div>
                        <div className="bg-black/20 backdrop-blur-md border-2 border-[#FFD700]/40 rounded-[2rem] p-4 md:p-6 flex flex-col items-center justify-center transition-all hover:-translate-y-2 shadow-2xl relative z-10">
                            <span className="text-5xl md:text-8xl font-serif font-black text-white drop-shadow-[0_4px_0_#8B0000]">
                                {item.value.toString().padStart(2, '0')}
                            </span>
                            <div className="w-12 h-1 bg-[#FFD700]/50 rounded-full my-3"></div>
                            <span className="text-sm md:text-lg text-[#FFD700] font-bold mt-1 uppercase tracking-widest">
                                {item.label}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Control Panel */}
            <div className="mt-12 bg-black/20 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] border border-[#FFD700]/20 max-w-2xl mx-auto shadow-2xl flex flex-col gap-6">
                
                {/* Preset Buttons */}
                <div className="flex flex-wrap justify-center gap-3">
                    {PRESETS.map((p) => (
                        <button
                            key={p.label}
                            onClick={() => setTargetDate(p.date)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2
                                ${targetDate === p.date 
                                    ? 'bg-[#FFD700] text-red-900 border-[#FFD700] shadow-lg scale-105' 
                                    : 'bg-transparent text-[#FFD700] border-[#FFD700]/30 hover:bg-[#FFD700]/10'
                                }`}
                        >
                            <span className="text-base">{p.icon}</span> {p.label}
                        </button>
                    ))}
                </div>

                <div className="h-px bg-[#FFD700]/10 w-full"></div>

                {/* Main Controls */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex flex-col gap-2 w-full md:w-auto">
                        <label className="text-xs font-bold text-[#FFD700]/70 uppercase tracking-wider flex items-center gap-2">
                            <Calendar className="w-3 h-3" /> 自定义日期
                        </label>
                        <input 
                            type="datetime-local" 
                            value={targetDate}
                            onChange={(e) => setTargetDate(e.target.value)}
                            className="bg-black/40 border border-[#FFD700]/30 text-[#FFD700] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] w-full font-mono"
                        />
                    </div>

                    <div className="flex flex-col gap-2 w-full md:w-auto">
                         <label className="text-xs font-bold text-[#FFD700]/70 uppercase tracking-wider flex items-center gap-2">
                             <Music className="w-3 h-3" /> 节日背景音
                         </label>
                         <button 
                            onClick={togglePlay}
                            className={`
                                flex items-center gap-3 px-8 py-3 rounded-xl font-bold transition-all w-full justify-center
                                ${isPlaying 
                                    ? 'bg-[#FFD700] text-red-900 shadow-[0_0_20px_rgba(255,215,0,0.4)] animate-pulse' 
                                    : 'bg-white/5 text-[#FFD700] hover:bg-white/10 border border-[#FFD700]/30'
                                }
                            `}
                        >
                            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                            {isPlaying ? '播放中...' : '播放 BGM'}
                        </button>
                        <audio ref={audioRef} src="/music/bgm.mp3" loop />
                    </div>
                </div>
            </div>
            
            <p className="text-[#FFD700]/30 text-xs mt-8">
                Design by Admin Pro | 祝您新春快乐，阖家幸福
            </p>

        </div>
    </div>
  );
};
