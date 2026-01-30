import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Track } from '../types';

// --- LOCAL PLAYLIST ---
// NOTE: Please upload these files to your 'public/music/' folder
const DEFAULT_PLAYLIST: Track[] = [
  { 
    id: '1', 
    title: 'Neon City', 
    artist: 'Synthwave Boy', 
    src: '/music/song1.mp3', 
    cover: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=300&auto=format&fit=crop' 
  },
  { 
    id: '2', 
    title: 'Midnight Rain', 
    artist: 'Lofi Girl', 
    src: '/music/song2.mp3', 
    cover: 'https://images.unsplash.com/photo-1514525253440-b393452eeb25?q=80&w=300&auto=format&fit=crop' 
  },
  { 
    id: '3', 
    title: 'Coding Flow', 
    artist: 'Focus Beats', 
    src: '/music/song3.mp3', 
    cover: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=300&auto=format&fit=crop' 
  },
];

interface MusicContextType {
  isPlaying: boolean;
  currentTrack: Track | null;
  playlist: Track[];
  progress: number; // 0-100
  duration: number; // seconds
  currentTime: number; // seconds
  volume: number; // 0-1
  togglePlay: () => void;
  playTrack: (track: Track) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  audioRef: React.RefObject<HTMLAudioElement>;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const MusicProvider = ({ children }: { children?: React.ReactNode }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(DEFAULT_PLAYLIST[0]);
  const [playlist] = useState<Track[]>(DEFAULT_PLAYLIST);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.5);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // Initialize Volume
  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.volume = volume;
    }
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
            console.warn("Autoplay prevented or load failed:", e);
            // Don't alert here, let the onError handler catch the actual loading error
            setIsPlaying(false);
        });
      }
    }
    setIsPlaying(!isPlaying);
  };

  const playTrack = (track: Track) => {
    if (currentTrack?.id === track.id) {
        togglePlay();
        return;
    }
    setCurrentTrack(track);
    setIsPlaying(true);
    // Audio element update is handled by the useEffect watching currentTrack
  };

  const nextTrack = () => {
    if (!currentTrack) return;
    const idx = playlist.findIndex(t => t.id === currentTrack.id);
    const nextIdx = (idx + 1) % playlist.length;
    playTrack(playlist[nextIdx]);
  };

  const prevTrack = () => {
    if (!currentTrack) return;
    const idx = playlist.findIndex(t => t.id === currentTrack.id);
    const prevIdx = (idx - 1 + playlist.length) % playlist.length;
    playTrack(playlist[prevIdx]);
  };

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const setVolume = (vol: number) => {
      setVolumeState(vol);
      if (audioRef.current) audioRef.current.volume = vol;
  };

  // Handle Track Change
  useEffect(() => {
    if (audioRef.current && currentTrack) {
        audioRef.current.src = currentTrack.src;
        if (isPlaying) {
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.error("Playback start error", e);
                    setIsPlaying(false);
                });
            }
        }
    }
  }, [currentTrack]); // Only re-run if track object changes

  // Handle Playback Errors (Missing File)
  const handleAudioError = () => {
      if (audioRef.current?.error) {
          setIsPlaying(false);
          const src = currentTrack?.src || 'unknown';
          // User requested a simple popup
          alert(`播放失败: 找不到文件 "${currentTrack?.title}"\n\n请确保已将 MP3 文件上传到 public${src}`);
      }
  };

  // Global Audio Event Listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    };

    const updateDuration = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
        nextTrack();
    };

    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);
    // Error event is handled by React prop on audio tag for simplicity

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
    };
  }, [currentTrack, playlist]); // Dependencies for nextTrack closure

  return (
    <MusicContext.Provider value={{ 
        isPlaying, currentTrack, playlist, progress, duration, currentTime, volume,
        togglePlay, playTrack, nextTrack, prevTrack, seek, setVolume, audioRef 
    }}>
      {children}
      {/* Hidden Global Audio Element */}
      <audio 
        ref={audioRef} 
        crossOrigin="anonymous" 
        onError={handleAudioError}
      />
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) throw new Error('useMusic must be used within MusicProvider');
  return context;
};