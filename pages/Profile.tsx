
import React, { useState, useRef, useEffect } from 'react';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { UserProfile } from '../types';
import { 
    Camera, Save, Lock, AlertCircle, Eye, EyeOff, Plus, X, 
    Image as ImageIcon, Hash, Github, Twitter, Globe, Edit2, Check, Layout, 
    Upload, Trash2, Instagram, ExternalLink, Sliders, ChevronLeft, ChevronRight, Loader2, Mail, Calendar, MapPin
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';

// Custom Icons for Chinese Platforms
const GiteeIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 1024 1024" fill="currentColor" className={className}>
        <path d="M512 1024C230.4 1024 0 793.6 0 512S230.4 0 512 0s512 230.4 512 512-230.4 512-512 512z m259.2-569.6H480c-12.8 0-25.6 12.8-25.6 25.6v64c0 12.8 12.8 25.6 25.6 25.6h176c12.8 0 25.6 12.8 25.6 25.6v12.8c0 41.6-35.2 76.8-76.8 76.8h-240c-12.8 0-25.6-12.8-25.6-25.6V416c0-41.6 35.2-76.8 76.8-76.8h355.2c12.8 0 25.6-12.8 25.6-25.6v-64c0-12.8-12.8-25.6-25.6-25.6H416c-105.6 0-192 86.4-192 192v256c0 105.6 86.4 192 192 192h188.8c105.6 0 192-86.4 192-192V480c0-12.8-12.8-25.6-25.6-25.6z" />
    </svg>
);

const BilibiliIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a1.623 1.623 0 0 1 .187-.213l3.466-3.387a1.235 1.235 0 0 1 .92-.373c.347 0 .653.124.92.373l.027.027c.249.249.373.551.373.907 0 .355-.124.657-.373.906L17.813 4.653zM5.333 7.24c-.746.036-1.373.294-1.88.774-.506.48-.76.1.106-.76 1.88v7.36c0 .773.253 1.4.76 1.88.507.48 1.134.738 1.88.773h13.334c.746-.035 1.373-.293 1.88-.773.506-.48.76-1.107.76-1.88V9.894c0-.774-.254-1.4-.76-1.88-.507-.48-1.134-.738-1.88-.774H5.333zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v.027c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.387-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v.027c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.387-.947.258-.257.574-.386.947-.386z"/>
    </svg>
);

export const ProfilePage: React.FC = () => {
  const { user: contextUser, refreshUser, t, isSyncing } = useApp();
  
  // Initialize with null, then load full data in Effect
  const [user, setUser] = useState<UserProfile | null>(null);
  
  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // UI State
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // --- Critical Fix for Data Loading & Sync ---
  useEffect(() => {
    if (contextUser) {
        // 1. Fetch full data from local storage (source of truth for heavy data)
        const fullUser = userService.getUserById(contextUser.id);
        
        if (fullUser) {
            setUser(prev => {
                // A. Initial Load or User Switch: Load everything fresh from DB
                if (!prev || prev.id !== contextUser.id) {
                    return {
                        ...fullUser,
                        ...contextUser, // Context has latest session token/points
                        coverImages: fullUser.coverImages || [],
                        socials: fullUser.socials || {},
                        tags: fullUser.tags || [],
                        bio: fullUser.bio || ''
                    };
                }

                // B. Incremental Update (Background Sync/Polling)
                return {
                    ...prev, 
                    // Live System Fields - Safe to update
                    points: contextUser.points, 
                    role: contextUser.role,
                    status: contextUser.status,
                    lastCheckIn: fullUser.lastCheckIn, 
                    
                    // Images: Only sync if local is empty (delayed load), otherwise trust local state to avoid flicker
                    coverImages: (prev.coverImages && prev.coverImages.length > 0) ? prev.coverImages : (fullUser.coverImages || [])
                };
            });
        } else {
            // Fallback
            setUser({ ...contextUser, coverImages: [] });
        }
    }
  }, [contextUser, isSyncing]);

  // Carousel Auto-play Logic
  useEffect(() => {
      const coverCount = user?.coverImages?.length || 0;
      if (coverCount <= 1) return;

      const interval = setInterval(() => {
          setCurrentSlide(prev => (prev + 1) % coverCount);
      }, 5000);
      return () => clearInterval(interval);
  }, [user?.coverImages]); 

  if (!user) return (
      <div className="flex h-96 items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
  );

  // --- Handlers ---

  // Optimized for D1 Storage: Reduced to 1280px & 0.6 Quality to prevent QuotaExceededError
  const compressImage = (file: File, maxWidth = 1280, quality = 0.6): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scale = maxWidth / img.width;
                if (img.width > maxWidth) {
                    canvas.width = maxWidth;
                    canvas.height = img.height * scale;
                } else {
                    canvas.width = img.width;
                    canvas.height = img.height;
                }
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                // Convert to WebP for maximum efficiency
                resolve(canvas.toDataURL('image/webp', quality));
            };
        };
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Avatars can be smaller, 300px is enough
      const base64 = await compressImage(file, 300, 0.7);
      setUser({ ...user, avatar: base64 });
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
          setUploadingCover(true);
          
          const currentCovers = user.coverImages || [];
          const newCovers = [...currentCovers];
          
          try {
              let addedCount = 0;
              for (let i = 0; i < files.length; i++) {
                  if (newCovers.length >= 3) break; // Max 3 limit
                  const base64 = await compressImage(files[i], 1280, 0.6); // Aggressive compression
                  newCovers.push(base64);
                  addedCount++;
              }
              
              if (addedCount === 0 && currentCovers.length >= 3) {
                  setError('封面已满 (3/3)，请先删除旧图片');
                  setUploadingCover(false);
                  return;
              }

              const updatedUser = { ...user, coverImages: newCovers };
              setUser(updatedUser);
              setCurrentSlide(newCovers.length - 1); 

              if (contextUser) {
                  userService.saveUser(updatedUser);
                  authService.updateUser(updatedUser);
                  refreshUser();
                  setMessage(`成功上传 ${addedCount} 张壁纸`);
                  setTimeout(() => setMessage(''), 3000);
              }
          } catch (err) {
              console.error("Cover upload error:", err);
              setError('图片处理失败');
          } finally {
              setUploadingCover(false);
              if (coverInputRef.current) coverInputRef.current.value = ''; 
          }
      }
  };

  const removeCover = (index: number) => {
      const newCovers = user.coverImages?.filter((_, i) => i !== index) || [];
      const updatedUser = { ...user, coverImages: newCovers };
      setUser(updatedUser);
      // Reset slide if out of bounds
      if (currentSlide >= newCovers.length) {
          setCurrentSlide(Math.max(0, newCovers.length - 1));
      }
      
      if (contextUser) {
          userService.saveUser(updatedUser);
          authService.updateUser(updatedUser);
          refreshUser();
      }
  };

  const handleAddTag = () => {
      if (newTag.trim()) {
          const tags = user.tags || [];
          if (!tags.includes(newTag.trim())) {
              setUser({ ...user, tags: [...tags, newTag.trim()] });
          }
          setNewTag('');
      }
  };

  const removeTag = (tag: string) => {
      setUser({ ...user, tags: user.tags?.filter(t => t !== tag) });
  };

  const handleSocialJump = (platform: string, value?: string) => {
      if (!value) return;
      let url = '';
      switch (platform) {
          case 'github': url = `https://github.com/${value}`; break;
          case 'twitter': url = `https://twitter.com/${value}`; break;
          case 'instagram': url = `https://instagram.com/${value}`; break;
          case 'gitee': url = `https://gitee.com/${value}`; break;
          case 'bilibili': url = `https://space.bilibili.com/${value}`; break;
          case 'website': url = value.startsWith('http') ? value : `https://${value}`; break;
      }
      if (url) window.open(url, '_blank');
  };

  const handleSave = () => {
    if (!contextUser) return;
    setSaving(true);
    setError('');
    setMessage('');

    if (activeTab === 'security') {
        if (newPassword && newPassword.length < 6) {
            setError('密码长度至少需要6位');
            setSaving(false);
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setError('两次输入的密码不一致');
            setSaving(false);
            return;
        }
    }

    const userToSave: UserProfile = { ...user };
    if (newPassword) userToSave.password = newPassword;
    else userToSave.password = contextUser.password;

    userToSave.coverImages = userToSave.coverImages || [];
    userToSave.tags = userToSave.tags || [];
    userToSave.socials = userToSave.socials || {};

    try {
        userService.saveUser(userToSave);
        authService.updateUser(userToSave);
        refreshUser(); 

        setNewPassword('');
        setConfirmNewPassword('');
        setIsEditingBio(false);
        setMessage(t('success') + '!');
        setTimeout(() => setMessage(''), 3000);
    } catch (e) {
        setError('保存失败');
    } finally {
        setSaving(false);
    }
  };

  const covers = user.coverImages || [];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-[#0b1121] transition-colors duration-500 -m-6 pb-20 overflow-x-hidden">
        
        {/* --- 1. Top Landscape Cover (Carousel) --- */}
        <div className="relative w-full h-80 md:h-[400px] bg-slate-200 dark:bg-slate-800 overflow-hidden group">
            {covers.length > 0 ? (
                covers.map((img, idx) => (
                    <div 
                        key={idx}
                        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                    >
                        <div 
                            className="w-full h-full bg-cover bg-center"
                            style={{ backgroundImage: `url(${img})` }}
                        />
                        {/* Gradient Overlay for Text Readability if needed */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                    </div>
                ))
            ) : (
                // Default Clean Gradient
                <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-slate-300 dark:text-slate-700 opacity-50" />
                </div>
            )}

            {/* Cover Controls (Top Right) */}
            <div className="absolute top-6 right-6 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button 
                    onClick={() => coverInputRef.current?.click()}
                    disabled={uploadingCover || covers.length >= 3}
                    className="bg-black/30 hover:bg-black/50 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 border border-white/20 transition-all"
                >
                    {uploadingCover ? <Loader2 className="w-3 h-3 animate-spin"/> : <ImageIcon className="w-4 h-4"/>}
                    {covers.length >= 3 ? '已满 (3/3)' : '上传封面'}
                </button>
                <input type="file" ref={coverInputRef} className="hidden" accept="image/*" multiple onChange={handleCoverUpload} />
            </div>

            {/* Slide Indicators */}
            {covers.length > 1 && (
                <div className="absolute bottom-4 right-6 z-20 flex gap-1.5">
                    {covers.map((_, idx) => (
                        <button 
                            key={idx}
                            onClick={() => setCurrentSlide(idx)}
                            className={`w-2 h-2 rounded-full transition-all ${currentSlide === idx ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/80'}`}
                        />
                    ))}
                </div>
            )}
        </div>

        {/* --- 2. Floating Main Content (Overlapping) --- */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-30 -mt-24">
            {/* Removed overflow-hidden to allow avatar to pop out */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl shadow-indigo-100/50 dark:shadow-none border border-white/50 dark:border-slate-800 backdrop-blur-sm relative">
                
                {/* Header Section */}
                <div className="relative pt-0 pb-8 px-8 flex flex-col md:flex-row items-center md:items-end gap-6 border-b border-slate-100 dark:border-slate-800">
                    {/* Avatar Container - Pulled Up */}
                    <div className="relative -mt-16 group flex-shrink-0">
                        <div className="w-36 h-36 rounded-full border-[6px] border-white dark:border-slate-900 shadow-lg bg-white overflow-hidden">
                            <img 
                                src={user.avatar || 'https://ui-avatars.com/api/?name=' + user.username} 
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute bottom-2 right-2 bg-indigo-600 text-white p-2 rounded-full shadow-lg hover:bg-indigo-700 transition-transform hover:scale-110 opacity-0 group-hover:opacity-100"
                        >
                            <Camera className="w-4 h-4" />
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                    </div>

                    {/* Identity Info */}
                    <div className="flex-1 text-center md:text-left pb-2">
                        <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4 mb-2">
                            <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{user.nickname || user.username}</h1>
                            <div className="flex gap-2">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${user.role === 'admin' ? 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/30 dark:border-indigo-800' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                                    {user.role}
                                </span>
                                <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-900/20 dark:border-amber-800 flex items-center gap-1">
                                    {user.points || 0} 积分
                                </span>
                            </div>
                        </div>
                        <p className="text-slate-400 text-sm font-medium flex items-center justify-center md:justify-start gap-4">
                            <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {user.email || '未绑定邮箱'}</span>
                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> 加入于 {new Date(user.createdAt).getFullYear()}</span>
                        </p>
                    </div>

                    {/* Thumbnails Manager (Small) */}
                    {covers.length > 0 && (
                        <div className="hidden md:flex gap-2 pb-2">
                            {covers.map((img, idx) => (
                                <div key={idx} className="relative w-12 h-8 rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 group/thumb cursor-pointer hover:scale-110 transition-transform">
                                    <img src={img} className="w-full h-full object-cover" onClick={() => setCurrentSlide(idx)} />
                                    <div onClick={(e) => { e.stopPropagation(); removeCover(idx); }} className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                                        <X className="h-3 w-3 text-white" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Content Grid */}
                <div className="flex flex-col md:flex-row min-h-[500px]">
                    
                    {/* Left Sidebar: Socials & Stats */}
                    {/* Added md:rounded-bl-[2.5rem] to handle bottom left corner since parent overflow is no longer hidden */}
                    <div className="w-full md:w-80 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-8 space-y-8 md:rounded-bl-[2.5rem]">
                        {/* Socials */}
                        <div>
                            <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4">社交矩阵</h4>
                            <div className="space-y-3">
                                {[
                                    { key: 'github', icon: Github, color: 'text-slate-800 dark:text-white', ph: 'GitHub' },
                                    { key: 'twitter', icon: Twitter, color: 'text-blue-400', ph: 'Twitter' },
                                    { key: 'website', icon: Globe, color: 'text-emerald-500', ph: 'Website' },
                                    { key: 'bilibili', icon: BilibiliIcon, color: 'text-[#FB7299]', ph: 'Bilibili' },
                                    { key: 'instagram', icon: Instagram, color: 'text-[#E1306C]', ph: 'Instagram' },
                                ].map((item) => {
                                    const val = (user.socials as any)?.[item.key] || '';
                                    return (
                                        <div key={item.key} className="relative group/input flex items-center">
                                            <div className={`absolute left-3 top-2.5 ${item.color}`}>
                                                <item.icon className="h-4 w-4 fill-current" />
                                            </div>
                                            <input 
                                                placeholder={item.ph}
                                                value={val}
                                                onChange={(e) => setUser({...user, socials: {...user.socials, [item.key]: e.target.value}})}
                                                className="w-full bg-white dark:bg-slate-800 rounded-xl pl-10 pr-8 py-2 text-xs border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                                            />
                                            {val && (
                                                <button onClick={() => handleSocialJump(item.key, val)} className="absolute right-2 top-2 text-slate-400 hover:text-indigo-500">
                                                    <ExternalLink className="h-3 w-3" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Tags */}
                        <div>
                            <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4">个性标签</h4>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {user.tags?.map((tag, idx) => (
                                    <span key={idx} className="group px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1 hover:border-indigo-300 transition-colors">
                                        <Hash className="h-2.5 w-2.5 text-indigo-400" /> {tag}
                                        <button onClick={() => removeTag(tag)} className="ml-1 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600"><X className="h-3 w-3"/></button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input 
                                    value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                                    placeholder="Add tag..."
                                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs focus:border-indigo-500 outline-none"
                                />
                                <button onClick={handleAddTag} className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 px-3 rounded-lg hover:bg-indigo-100 transition-colors"><Plus className="h-3 w-3" /></button>
                            </div>
                        </div>
                    </div>

                    {/* Right Content: Tabs */}
                    <div className="flex-1 p-8">
                        {/* Tab Switcher */}
                        <div className="flex gap-8 border-b border-slate-100 dark:border-slate-800 mb-8">
                            <button 
                                onClick={() => setActiveTab('profile')}
                                className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'profile' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Layout className="w-4 h-4 inline mr-2" /> 资料编辑
                                {activeTab === 'profile' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full"></div>}
                            </button>
                            <button 
                                onClick={() => setActiveTab('security')}
                                className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'security' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Lock className="w-4 h-4 inline mr-2" /> 安全设置
                                {activeTab === 'security' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full"></div>}
                            </button>
                        </div>

                        {/* Bio & Info */}
                        {activeTab === 'profile' && (
                            <div className="space-y-8 animate-fade-in">
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">About Me</h3>
                                        <button onClick={() => setIsEditingBio(!isEditingBio)} className="text-slate-400 hover:text-indigo-600 transition-colors">
                                            {isEditingBio ? <Check className="h-4 w-4"/> : <Edit2 className="h-4 w-4"/>}
                                        </button>
                                    </div>
                                    {isEditingBio ? (
                                        <textarea 
                                            value={user.bio || ''}
                                            onChange={(e) => setUser({...user, bio: e.target.value})}
                                            className="w-full h-32 bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-500/20 border-none resize-none"
                                            placeholder="写一段简介，让大家更了解你..."
                                        />
                                    ) : (
                                        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            {user.bio || '这个人很懒，什么都没写...'}
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="group">
                                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">用户名</label>
                                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                            {user.username}
                                            <Lock className="w-3 h-3 text-slate-300" />
                                        </div>
                                    </div>
                                    <div className="group">
                                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">邮箱</label>
                                        <input 
                                            value={user.email} 
                                            onChange={(e) => setUser({...user, email: e.target.value})}
                                            className="w-full bg-white dark:bg-slate-800 rounded-xl px-4 py-3 text-sm font-bold border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" 
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-2xl flex items-start gap-3 border border-orange-100 dark:border-orange-900/30">
                                    <AlertCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                                    <p className="text-xs text-orange-800 dark:text-orange-300 leading-relaxed font-medium">
                                        建议定期更换密码以保障账号安全。新密码长度至少需要6位。
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">新密码</label>
                                        <div className="relative">
                                            <input 
                                                type={showNewPassword ? "text" : "password"}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold focus:border-indigo-500 transition-all"
                                                placeholder="******" 
                                            />
                                            <button onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-3 text-slate-400 hover:text-slate-600">
                                                {showNewPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">确认密码</label>
                                        <div className="relative">
                                            <input 
                                                type={showConfirmPassword ? "text" : "password"}
                                                value={confirmNewPassword}
                                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold focus:border-indigo-500 transition-all"
                                                placeholder="******" 
                                            />
                                            <button onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-3 text-slate-400 hover:text-slate-600">
                                                {showConfirmPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Footer Buttons */}
                        <div className="pt-8 mt-4 flex items-center justify-between">
                            <div>
                                {error && <span className="text-xs text-red-500 font-bold animate-pulse flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{error}</span>}
                                {message && <span className="text-xs text-green-500 font-bold animate-fade-in flex items-center gap-1"><Check className="w-3 h-3"/>{message}</span>}
                            </div>
                            <button 
                                onClick={handleSave}
                                disabled={saving}
                                className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-3 rounded-xl font-black text-sm shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50 disabled:transform-none"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4" />} 
                                {saving ? '保存中...' : '保存更改'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
