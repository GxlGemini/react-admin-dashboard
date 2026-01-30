
import React from 'react';
import { useMusic } from '../contexts/MusicContext';
import { Play, Pause, SkipForward, Disc } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '../types';

export const GlobalPlayerWidget: React.FC = () => {
    const { currentTrack, isPlaying, togglePlay, nextTrack, progress } = useMusic();
    const navigate = useNavigate();

    if (!currentTrack) return null;

    return (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3 p-2 pr-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-full shadow-xl border border-gray-200 dark:border-slate-700 animate-slide-in-up">
            {/* Rotating Disc Icon */}
            <div 
                className="relative cursor-pointer group"
                onClick={() => navigate(RoutePath.MUSIC)}
            >
                <div className={`w-10 h-10 rounded-full overflow-hidden border-2 border-gray-900 dark:border-white ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
                    <img src={currentTrack.cover} alt="cover" className="w-full h-full object-cover" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Disc className="w-4 h-4 text-white" />
                </div>
            </div>

            <div className="flex flex-col max-w-[100px] cursor-pointer" onClick={() => navigate(RoutePath.MUSIC)}>
                <span className="text-xs font-bold text-gray-900 dark:text-white truncate">{currentTrack.title}</span>
                <span className="text-[10px] text-gray-500 truncate">{currentTrack.artist}</span>
            </div>

            <div className="flex items-center gap-1">
                <button 
                    onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                    {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); nextTrack(); }}
                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                    <SkipForward className="w-4 h-4" />
                </button>
            </div>
            
            {/* Progress Bar Background */}
            <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-transparent rounded-full overflow-hidden">
                <div className="h-full bg-[var(--color-primary)] transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>
        </div>
    );
};
