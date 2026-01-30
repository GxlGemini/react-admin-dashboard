
import React, { useState, useRef, useEffect } from 'react';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { cloudService } from '../services/cloudService';
import { UserProfile } from '../types';
import { 
    Camera, Save, Lock, AlertCircle, Eye, EyeOff, Plus, X, 
    Image as ImageIcon, Hash, Github, Twitter, Globe, Edit2, Check, Layout, 
    Upload, Trash2, Instagram, ExternalLink, Sliders, ChevronLeft, ChevronRight, Loader2
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
  const { user: contextUser, refreshUser, t, profileOpacity, setProfileOpacity, isSyncing } = useApp();
  
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

  // --- Critical Fix for Data Loading ---
  // The contextUser from authService is lightweight (stripped images).
  // We MUST fetch the full user profile from userService to get the images.
  useEffect(() => {
    if (contextUser) {
        // 1. Fetch full data from local storage (source of truth for heavy data)
        const fullUser = userService.getUserById(contextUser.id);
        
        // 2. Merge with context (for latest session status) but prioritize fullUser for data fields
        if (fullUser) {
            setUser(prev => {
                // If we are editing bio, don't overwrite it, but do update images/points
                if (isEditingBio && prev) {
                    return {
                        ...prev,
                        points: contextUser.points, // Keep points synced
                        coverImages: fullUser.coverImages || [], // Ensure images are present
                    };
                }
                return {
                    ...fullUser,
                    ...contextUser, // Context might have newer token-related fields
                    coverImages: fullUser.coverImages || [], // Explicitly take images from fullUser
                    bio: fullUser.bio, 
                    tags: fullUser.tags,
                    socials: fullUser.socials
                };
            });
        } else {
            // Fallback if not found in user list (rare)
            setUser({ ...contextUser, coverImages: [] });
        }
    }
  }, [contextUser, isSyncing, isEditingBio]);

  // Carousel Auto-play
  useEffect(() => {
      const interval = setInterval(() => {
          if (user?.coverImages && user.coverImages.length > 1) {
              setCurrentSlide(prev => (prev + 1) % user.coverImages!.length);
          }
      }, 6000);
      return () => clearInterval(interval);
  }, [user?.coverImages]);

  if (!user) return <div>Loading...</div>;

  // --- Handlers ---

  // Optimized for D1 Storage: 
  // 1. Use WebP for better compression/quality ratio.
  // 2. Max width 1920px (HD).
  // 3. Quality 0.8 (High visually, low file size).
  // This ensures 3 images fit within D1's 1MB statement limit.
  const compressImage = (file: File, maxWidth = 1920, quality = 0.8): Promise<string> => {
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
      // Avatars can be smaller, 400px is enough
      const base64 = await compressImage(file, 400, 0.8);
      setUser({ ...user, avatar: base64 });
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
          setUploadingCover(true);
          
          // Use the current state's coverImages, ensuring it's an array
          const currentCovers = user.coverImages || [];
          const newCovers = [...currentCovers];
          
          try {
              let addedCount = 0;
              for (let i = 0; i < files.length; i++) {
                  if (newCovers.length >= 3) break; // Max 3 limit
                  
                  // Use HD compression settings
                  const base64 = await compressImage(files[i], 1920, 0.8);
                  newCovers.push(base64);
                  addedCount++;
              }
              
              if (addedCount === 0 && currentCovers.length >= 3) {
                  setError('最多只能上传3张壁纸，请先删除旧的。');
                  setUploadingCover(false);
                  return;
              }

              const updatedUser = { ...user, coverImages: newCovers };
              setUser(updatedUser);
              setCurrentSlide(newCovers.length - 1); // Switch to newest

              // Auto-save immediately for images
              if (contextUser) {
                  // Save directly to UserService (Persistent Store)
                  userService.saveUser(updatedUser);
                  
                  // Update Session Context (Lightweight)
                  authService.updateUser(updatedUser);
                  
                  refreshUser(); // Trigger UI updates
                  
                  setMessage(`成功上传 ${addedCount} 张高清壁纸`);
                  setTimeout(() => setMessage(''), 3000);
              }
          } catch (err) {
              console.error("Cover upload error:", err);
              setError('图片处理失败，请重试');
          } finally {
              setUploadingCover(false);
              if (coverInputRef.current) coverInputRef.current.value = ''; // Reset input
          }
      }
  };

  const removeCover = (index: number) => {
      const newCovers = user.coverImages?.filter((_, i) => i !== index) || [];
      const updatedUser = { ...user, coverImages: newCovers };
      setUser(updatedUser);
      if (currentSlide >= newCovers.length) setCurrentSlide(Math.max(0, newCovers.length - 1));
      
      // Auto-save delete
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

    // Safety checks
    userToSave.coverImages = userToSave.coverImages || [];
    userToSave.tags = userToSave.tags || [];
    userToSave.socials = userToSave.socials || {};

    try {
        // Persist to D1 via AuthService -> UserService -> CloudService
        // We use updateUser to handle both session and persistence
        userService.saveUser(userToSave);
        authService.updateUser(userToSave);
        
        refreshUser(); 

        setNewPassword('');
        setConfirmNewPassword('');
        setIsEditingBio(false);
        setMessage(t('success') + '!');
        setTimeout(() => setMessage(''), 3000);
    } catch (e) {
        setError('保存失败，请稍后重试');
    } finally {
        setSaving(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] -m-6 overflow-hidden">
        
        {/* --- 1. Fullscreen Background Carousel (Fixed) --- */}
        <div className="fixed inset-0 z-0 bg-slate-900">
            {user.coverImages && user.coverImages.length > 0 ? (
                user.coverImages.map((img, idx) => (
                    <div 
                        key={idx}
                        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === currentSlide ? 'opacity-100' : 'opacity-0'}`}
                    >
                        {/* Ken Burns Effect */}
                        <div 
                            className={`w-full h-full bg-cover bg-center transition-transform duration-[10000ms] ease-linear ${idx === currentSlide ? 'scale-110' : 'scale-100'}`}
                            style={{ backgroundImage: `url(${img})` }}
                        />
                        {/* Overlay Gradient for readability */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60"></div>
                    </div>
                ))
            ) : (
                // Default Gradient
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900">
                    <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }}></div>
                </div>
            )}
        </div>

        {/* --- 2. Main Scrollable Content Container --- */}
        <div className="relative z-10 w-full h-full overflow-y-auto custom-scrollbar px-4 pb-20 pt-10">
            
            <div className="max-w-5xl mx-auto">
                {/* Transparency Control & Cover Upload */}
                <div className="flex justify-end items-center gap-4 mb-6">
                    {/* Transparency Slider linked to Global Context */}
                    <div className="group flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 transition-all hover:bg-black/60">
                        <Sliders className="w-4 h-4 text-white/70" />
                        <input 
                            type="range" min="0.1" max="1" step="0.05" 
                            value={profileOpacity} 
                            onChange={(e) => setProfileOpacity(parseFloat(e.target.value))}
                            className="w-24 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            title="调节卡片透明度"
                        />
                        <span className="text-[10px] text-white/50 w-6 text-right">{Math.round(profileOpacity * 100)}%</span>
                    </div>

                    {/* Image Manager */}
                    <div className="flex gap-2">
                        <button 
                            onClick={() => coverInputRef.current?.click()}
                            disabled={uploadingCover || (user.coverImages?.length || 0) >= 3}
                            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full backdrop-blur-md text-xs font-bold flex items-center gap-2 border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {uploadingCover ? <div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin"/> : <ImageIcon className="h-4 w-4"/>}
                            {(user.coverImages?.length || 0) >= 3 ? '封面已满 (3/3)' : '上传壁纸 (HD)'}
                        </button>
                        <input type="file" ref={coverInputRef} className="hidden" accept="image/*" multiple onChange={handleCoverUpload} />
                        
                        {/* Thumbnails to Delete */}
                        {user.coverImages?.map((img, idx) => (
                            <div key={idx} className="relative w-10 h-8 rounded-md overflow-hidden border border-white/30 group/thumb cursor-pointer hover:scale-110 transition-transform bg-black">
                                <img src={img} className="w-full h-full object-cover" />
                                <div onClick={() => removeCover(idx)} className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                                    <X className="h-3 w-3 text-white" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- Glass Card --- */}
                <div 
                    className="rounded-[2.5rem] shadow-2xl border border-white/40 dark:border-white/10 overflow-hidden flex flex-col md:flex-row transition-all duration-300 backdrop-blur-xl"
                    style={{ backgroundColor: `rgba(255, 255, 255, ${profileOpacity})` }} // Dynamic Opacity from KV/Context
                >
                    
                    {/* Left Sidebar: Identity */}
                    <div className="md:w-80 bg-white/50 dark:bg-slate-900/50 p-8 border-r border-slate-200/50 dark:border-slate-700/50 flex flex-col items-center text-center">
                        {/* Avatar */}
                        <div className="relative group mb-4">
                            <div className="w-32 h-32 rounded-[2rem] p-1 bg-gradient-to-tr from-[var(--color-primary)] to-purple-500 shadow-xl">
                                <img 
                                    src={user.avatar || 'https://ui-avatars.com/api/?name=' + user.username} 
                                    className="w-full h-full object-cover rounded-[1.8rem] border-4 border-white dark:border-slate-800 bg-white"
                                />
                            </div>
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white font-bold gap-2 backdrop-blur-sm"
                            >
                                <Camera className="h-6 w-6" /> 更换
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                        </div>

                        <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-1">{user.nickname || user.username}</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-4">@{user.username}</p>

                        <div className="flex gap-2 mb-6">
                            <span className="px-3 py-1 rounded-full bg-blue-100/80 text-blue-700 text-xs font-bold border border-blue-200">
                                {user.role === 'admin' ? 'Administrator' : 'User'}
                            </span>
                            <span className="px-3 py-1 rounded-full bg-amber-100/80 text-amber-700 text-xs font-bold border border-amber-200 flex items-center gap-1">
                                {user.points || 0} 积分
                            </span>
                        </div>

                        {/* Socials Matrix with Jump Buttons */}
                        <div className="w-full space-y-3">
                            <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest text-left mb-2 pl-1">社交矩阵</h4>
                            
                            {[
                                { key: 'github', icon: Github, color: 'text-slate-700', ph: 'GitHub Username' },
                                { key: 'gitee', icon: GiteeIcon, color: 'text-[#C71D23]', ph: 'Gitee Username' },
                                { key: 'bilibili', icon: BilibiliIcon, color: 'text-[#FB7299]', ph: 'Bilibili UID' },
                                { key: 'instagram', icon: Instagram, color: 'text-[#E1306C]', ph: 'Instagram Handle' },
                                { key: 'twitter', icon: Twitter, color: 'text-blue-400', ph: 'Twitter Handle' },
                                { key: 'website', icon: Globe, color: 'text-emerald-500', ph: 'Personal Website' },
                            ].map((item) => {
                                const val = (user.socials as any)?.[item.key] || '';
                                return (
                                    <div key={item.key} className="relative group/input flex items-center">
                                        <div className={`absolute left-3 top-2.5 h-4 w-4 ${item.color}`}>
                                            <item.icon className="h-4 w-4 fill-current" />
                                        </div>
                                        <input 
                                            placeholder={item.ph}
                                            value={val}
                                            onChange={(e) => setUser({...user, socials: {...user.socials, [item.key]: e.target.value}})}
                                            className="w-full bg-slate-50/80 dark:bg-slate-800/50 rounded-xl pl-9 pr-9 py-2 text-xs border border-transparent focus:border-slate-300 dark:focus:border-slate-600 focus:bg-white dark:focus:bg-slate-900 transition-all font-medium"
                                        />
                                        {val && (
                                            <button 
                                                onClick={() => handleSocialJump(item.key, val)}
                                                className="absolute right-2 top-2 text-slate-400 hover:text-[var(--color-primary)] transition-colors p-0.5 rounded"
                                                title="跳转到主页"
                                            >
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Content */}
                    <div className="flex-1 p-8 flex flex-col min-h-[600px]">
                        {/* Tabs */}
                        <div className="flex gap-6 border-b border-slate-200/50 dark:border-slate-700/50 mb-8">
                            <button 
                                onClick={() => setActiveTab('profile')}
                                className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'profile' ? 'text-[var(--color-primary)]' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Layout className="w-4 h-4 inline mr-2" /> 个人资料
                                {activeTab === 'profile' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary)] rounded-full"></div>}
                            </button>
                            <button 
                                onClick={() => setActiveTab('security')}
                                className={`pb-4 text-sm font-bold transition-all relative ${activeTab === 'security' ? 'text-[var(--color-primary)]' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Lock className="w-4 h-4 inline mr-2" /> 安全设置
                                {activeTab === 'security' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary)] rounded-full"></div>}
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                            {activeTab === 'profile' && (
                                <div className="space-y-8 animate-fade-in">
                                    {/* Bio Section */}
                                    <div>
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">关于我</h3>
                                            <button onClick={() => setIsEditingBio(!isEditingBio)} className="text-slate-400 hover:text-[var(--color-primary)] transition-colors">
                                                {isEditingBio ? <Check className="h-4 w-4"/> : <Edit2 className="h-4 w-4"/>}
                                            </button>
                                        </div>
                                        {isEditingBio ? (
                                            <textarea 
                                                value={user.bio || ''}
                                                onChange={(e) => setUser({...user, bio: e.target.value})}
                                                className="w-full h-32 bg-slate-50/80 dark:bg-slate-900/50 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-[var(--color-primary)]/20 border-none resize-none"
                                                placeholder="写一段简介，让大家更了解你..."
                                            />
                                        ) : (
                                            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-100/50 dark:border-slate-700/50 min-h-[5rem]">
                                                {user.bio || '这个人很懒，什么都没写...'}
                                            </p>
                                        )}
                                    </div>

                                    {/* Tags Section */}
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-3">我的标签</h3>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {user.tags?.map((tag, idx) => (
                                                <span key={idx} className="group px-3 py-1.5 rounded-xl bg-indigo-50/80 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300 text-xs font-bold border border-indigo-100 dark:border-indigo-800 flex items-center gap-2 transition-all hover:bg-indigo-100 hover:shadow-sm cursor-default">
                                                    <Hash className="h-3 w-3 opacity-50" /> {tag}
                                                    <button onClick={() => removeTag(tag)} className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"><X className="h-3 w-3"/></button>
                                                </span>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <input 
                                                value={newTag}
                                                onChange={(e) => setNewTag(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                                                placeholder="添加标签 (如: 全栈开发)..."
                                                className="bg-slate-50/80 dark:bg-slate-900/50 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-[var(--color-primary)]/20"
                                            />
                                            <button onClick={handleAddTag} className="bg-slate-200/80 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 px-4 rounded-xl hover:bg-slate-300 transition-colors">
                                                <Plus className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Basic Info Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">用户名</label>
                                            <input value={user.username} disabled className="w-full bg-slate-100/50 dark:bg-slate-900/50 text-slate-500 rounded-xl px-4 py-3 text-sm font-medium border-none cursor-not-allowed" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">邮箱</label>
                                            <input 
                                                value={user.email} 
                                                onChange={(e) => setUser({...user, email: e.target.value})}
                                                className="w-full bg-slate-50/80 dark:bg-slate-900/50 text-slate-800 dark:text-white rounded-xl px-4 py-3 text-sm font-medium border-none focus:ring-2 focus:ring-[var(--color-primary)]/20" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'security' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="bg-orange-50/80 dark:bg-orange-900/20 p-4 rounded-2xl flex items-start gap-3 border border-orange-100 dark:border-orange-900/30">
                                        <AlertCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                                        <p className="text-xs text-orange-700 dark:text-orange-300 leading-relaxed">
                                            为了账号安全，建议定期更换密码。请确保新密码包含至少6个字符。如果不修改，请保留为空。
                                        </p>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">新密码</label>
                                        <div className="relative">
                                            <input 
                                                type={showNewPassword ? "text" : "password"}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder="••••••"
                                                className="w-full bg-slate-50/80 dark:bg-slate-900/50 text-slate-800 dark:text-white rounded-xl px-4 py-3 text-sm font-medium border-none focus:ring-2 focus:ring-[var(--color-primary)]/20" 
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
                                                placeholder="••••••"
                                                className="w-full bg-slate-50/80 dark:bg-slate-900/50 text-slate-800 dark:text-white rounded-xl px-4 py-3 text-sm font-medium border-none focus:ring-2 focus:ring-[var(--color-primary)]/20" 
                                            />
                                            <button onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-3 text-slate-400 hover:text-slate-600">
                                                {showConfirmPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="pt-6 mt-4 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between">
                            <div>
                                {error && <span className="text-xs text-red-500 font-bold animate-pulse">{error}</span>}
                                {message && <span className="text-xs text-green-500 font-bold animate-fade-in">{message}</span>}
                            </div>
                            <button 
                                onClick={handleSave}
                                disabled={saving}
                                className="bg-[var(--color-primary)] hover:opacity-90 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4" />} 
                                {saving ? '保存中...' : '保存修改'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
