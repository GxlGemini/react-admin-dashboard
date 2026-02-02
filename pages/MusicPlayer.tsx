
import React from 'react';
import { useMusic } from '../contexts/MusicContext';
import { Play, Pause, SkipForward, SkipBack, Volume2, Music, AlertCircle, FileAudio, FolderOpen, X } from 'lucide-react';

export const MusicPlayer: React.FC = () => {
    const { 
        currentTrack, isPlaying, togglePlay, nextTrack, prevTrack, 
        progress, duration, currentTime, seek, volume, setVolume, 
        playlist, playTrack, error, dismissError
    } = useMusic();

    const formatTime = (seconds: number) => {
        if (!seconds || isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="h-full flex flex-col lg:flex-row gap-8 animate-fade-in pb-16 relative">
            
            {/* --- Fresh & Aesthetic Error Modal --- */}
            {error && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-sm w-full p-6 relative overflow-hidden border border-white/50 dark:border-slate-700 transform transition-all scale-100 animate-bounce-in">
                        {/* Decorative Background */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-100 dark:bg-red-900/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-100 dark:bg-orange-900/20 rounded-full blur-3xl -ml-12 -mb-12 pointer-events-none"></div>

                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 shadow-inner">
                                <FileAudio className="w-8 h-8 text-red-500" />
                            </div>
                            
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                                哎呀，无法播放
                            </h3>
                            
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed px-2">
                                系统找不到音频文件 
                                <br/>
                                <span className="font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-xs mx-1 inline-block mt-1 mb-1">
                                    {currentTrack?.src}
                                </span>
                                <br/>
                                请将 MP3 文件手动上传至服务器的 
                                <span className="text-indigo-500 font-mono ml-1">public/music/</span> 目录。
                            </p>

                            <button 
                                onClick={dismissError}
                                className="w-full bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 text-white rounded-xl py-3 font-bold text-sm transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <span className="text-lg">👌</span> 我知道了
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Left: CD Player Visual */}
            <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-slate-700 relative overflow-hidden">
                {/* Background Blur */}
                <div className="absolute inset-0 z-0">
                    <img src={currentTrack?.cover} className="w-full h-full object-cover blur-3xl opacity-30 dark:opacity-20 scale-125" />
                    <div className="absolute inset-0 bg-white/20 dark:bg-black/20" />
                </div>

                <div className="relative z-10 flex flex-col items-center w-full max-w-md">
                    {/* CD Disc */}
                    <div className="relative mb-10 group">
                         {/* Arm */}
                         <div className={`
                             absolute top-[-40px] right-[-20px] w-24 h-40 z-20 transition-transform duration-700 origin-top-right
                             ${isPlaying ? 'rotate-12' : 'rotate-0'}
                         `}>
                             <div className="w-1.5 h-32 bg-gray-300 dark:bg-gray-600 mx-auto rounded-full shadow-lg relative">
                                 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 bg-gray-400 rounded-full shadow-inner border-4 border-gray-200"></div>
                                 <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-10 bg-gray-800 rounded-md"></div>
                             </div>
                         </div>

                         {/* Vinyl */}
                         <div className={`
                             w-64 h-64 md:w-80 md:h-80 rounded-full bg-gray-900 border-8 border-gray-800 shadow-2xl relative flex items-center justify-center
                             ${isPlaying ? 'animate-[spin_6s_linear_infinite]' : ''}
                         `}>
                             {/* Grooves */}
                             <div className="absolute inset-2 rounded-full border border-gray-800 opacity-50"></div>
                             <div className="absolute inset-4 rounded-full border border-gray-800 opacity-50"></div>
                             <div className="absolute inset-8 rounded-full border border-gray-800 opacity-50"></div>
                             
                             {/* Cover Art Label */}
                             <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-800 relative z-10">
                                 <img src={currentTrack?.cover || 'https://via.placeholder.com/300'} alt="album art" className="w-full h-full object-cover" />
                             </div>
                         </div>
                    </div>

                    {/* Track Info */}
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{currentTrack?.title || 'No Track'}</h2>
                        <p className="text-gray-500 dark:text-gray-400">{currentTrack?.artist || 'Unknown Artist'}</p>
                    </div>

                    {/* Controls */}
                    <div className="w-full space-y-4">
                        {/* Progress */}
                        <div className="flex items-center gap-3 text-xs font-mono text-gray-500 dark:text-gray-400">
                            <span>{formatTime(currentTime)}</span>
                            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full cursor-pointer relative group" onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const p = (e.clientX - rect.left) / rect.width;
                                seek(p * duration);
                            }}>
                                <div className="absolute inset-y-0 left-0 bg-[var(--color-primary)] rounded-full" style={{ width: `${progress}%` }}>
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                </div>
                            </div>
                            <span>{formatTime(duration || 0)}</span>
                        </div>

                        {/* Buttons */}
                        <div className="flex items-center justify-center gap-6">
                            <button onClick={prevTrack} className="p-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                                <SkipBack className="w-6 h-6" />
                            </button>
                            <button 
                                onClick={togglePlay} 
                                className="w-16 h-16 flex items-center justify-center bg-[var(--color-primary)] text-white rounded-full shadow-lg shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all"
                            >
                                {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                            </button>
                            <button onClick={nextTrack} className="p-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                                <SkipForward className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right: Playlist */}
            <div className="w-full lg:w-96 bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-slate-700 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                            <Music className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white">播放列表</h3>
                    </div>
                    {/* Import button removed per request */}
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                    {playlist.map((track, idx) => {
                        const active = currentTrack?.id === track.id;
                        return (
                            <div 
                                key={track.id} 
                                onClick={() => playTrack(track)}
                                className={`
                                    group relative flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer
                                    ${active 
                                        ? 'bg-[var(--color-primary)] text-white shadow-md' 
                                        : 'hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300'
                                    }
                                `}
                            >
                                <span className={`text-xs w-4 ${active ? 'text-white/70' : 'text-gray-400'}`}>{idx + 1}</span>
                                <img src={track.cover} className="w-10 h-10 rounded-md object-cover bg-gray-200" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-sm truncate">{track.title}</h4>
                                    <p className={`text-xs truncate ${active ? 'text-white/70' : 'text-gray-500'}`}>{track.artist}</p>
                                </div>
                                
                                {active && isPlaying && (
                                    <div className="flex gap-0.5 items-end h-3 mr-2">
                                        <div className="w-1 bg-white animate-[music-bar_0.6s_ease-in-out_infinite] h-2"></div>
                                        <div className="w-1 bg-white animate-[music-bar_0.8s_ease-in-out_infinite] h-3"></div>
                                        <div className="w-1 bg-white animate-[music-bar_0.5s_ease-in-out_infinite] h-1.5"></div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* Volume Control */}
                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <Volume2 className="w-5 h-5 text-gray-400" />
                        <input 
                            type="range" 
                            min="0" 
                            max="1" 
                            step="0.05" 
                            value={volume}
                            onChange={(e) => setVolume(parseFloat(e.target.value))}
                            className="flex-1 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
                        />
                    </div>
                </div>
            </div>
            
            <style>{`
                @keyframes music-bar {
                    0%, 100% { height: 20%; }
                    50% { height: 100%; }
                }
            `}</style>
        </div>
    );
};
