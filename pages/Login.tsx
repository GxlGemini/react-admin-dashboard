
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { activityService } from '../services/activityService';
import { Lock, User as UserIcon, AlertCircle, Eye, EyeOff, ArrowRight, Check, AlertTriangle, Sparkles, Crown, Star, Award, Users, X, Rocket, Construction, Shield, Briefcase, GraduationCap, User, Target, Clock, UserPlus } from 'lucide-react';
import { RoutePath, User as UserType } from '../types';
import { useApp } from '../contexts/AppContext';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setUser, t, lastSyncTime } = useApp();
  
  // Mode State: Login vs Register
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Form State
  const [username, setUsername] = useState('root');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState(''); // For registration
  const [showPassword, setShowPassword] = useState(false);
  
  // UI State
  const [loginStatus, setLoginStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [capsLockOn, setCapsLockOn] = useState(false);
  
  // Background Floating Elements State
  const [floatingUsers, setFloatingUsers] = useState<UserType[]>([]);

  // --- IDLE TIMEOUT LOGIC (120 Minutes) ---
  const idleTimerRef = useRef<any>(null);

  useEffect(() => {
      const IDLE_TIMEOUT = 120 * 60 * 1000; 
      const resetIdleTimer = () => {
          if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
          idleTimerRef.current = setTimeout(() => {
              console.log("Login page idle timeout. Clearing cache and refreshing.");
              localStorage.clear(); 
              window.location.reload(); 
          }, IDLE_TIMEOUT);
      };
      resetIdleTimer();
      const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
      events.forEach(event => window.addEventListener(event, resetIdleTimer));
      return () => {
          if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
          events.forEach(event => window.removeEventListener(event, resetIdleTimer));
      };
  }, []);

  // Get all users for Avatar Matching Logic
  const allUsersList = useMemo(() => {
      try {
          return userService.getUsers();
      } catch (e) {
          return [];
      }
  }, [lastSyncTime]);

  // Determine which avatar to show in the header
  const matchedUser = useMemo(() => {
      if (!username.trim()) return null;
      return allUsersList.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  }, [username, allUsersList]);

  // Effect: Load random users for background animation
  useEffect(() => {
    try {
      const shuffled = [...allUsersList].sort(() => 0.5 - Math.random()).slice(0, 15);
      setFloatingUsers(shuffled);
    } catch (e) {
      console.warn('Failed to load floating users:', e);
    }
  }, [allUsersList]);

  // Effect: Caps Lock Detection
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.getModifierState && e.getModifierState('CapsLock')) {
        setCapsLockOn(true);
      } else {
        setCapsLockOn(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKey);
    return () => {
        window.removeEventListener('keydown', handleKey);
        window.removeEventListener('keyup', handleKey);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoginStatus('loading');

    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const userProfile = await authService.login(username, password);
      
      if (userProfile) {
        setLoginStatus('success');
        setUser(userProfile);
        setTimeout(() => navigate(RoutePath.DASHBOARD), 800);
      } else {
        setLoginStatus('error');
        setErrorMessage('用户名或密码错误');
        setTimeout(() => setLoginStatus('idle'), 500);
      }
    } catch (err) {
      console.error('Login error:', err);
      setLoginStatus('error');
      setErrorMessage('登录服务暂时不可用，请查看控制台');
      setTimeout(() => setLoginStatus('idle'), 500);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMessage('');
      setLoginStatus('loading');

      // 1. Validation
      if (!username.trim() || !password.trim()) {
          setErrorMessage('请填写完整信息');
          setLoginStatus('idle');
          return;
      }
      
      // 2. Duplicate Check
      const existing = userService.getUserByUsername(username.trim());
      if (existing) {
          setErrorMessage('该用户名已被占用');
          setLoginStatus('error');
          setTimeout(() => setLoginStatus('idle'), 500);
          return;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      // 3. Create User Object
      const isRoot = username.trim() === 'root';
      const newUser: UserType = {
          id: Date.now().toString(),
          username: username.trim(),
          nickname: nickname.trim() || username.trim(),
          password: password.trim(),
          email: '',
          // ROOT LOGIC: If username is 'root', become admin with high points
          role: isRoot ? 'admin' : 'user',
          status: 'active',
          points: isRoot ? 88888 : 100, // SVIP points for root
          createdAt: new Date().toISOString().split('T')[0],
          avatar: `https://ui-avatars.com/api/?name=${username.trim()}&background=${isRoot ? 'B8860B' : 'random'}&color=fff`,
          coverImages: [],
          tags: isRoot ? ['超级管理员', '系统核心'] : ['新用户'],
          bio: isRoot ? '系统最高权限拥有者，掌控一切。' : '这家伙很懒，什么也没写。'
      };

      try {
          // 4. Save
          userService.saveUser(newUser);
          activityService.logActivity(newUser, 'register', `用户 ${newUser.username} 自助注册成功`);
          
          // 5. Auto Login
          const loggedIn = await authService.login(newUser.username, newUser.password);
          if (loggedIn) {
              setLoginStatus('success');
              setUser(loggedIn);
              setTimeout(() => navigate(RoutePath.DASHBOARD), 800);
          }
      } catch (err) {
          setErrorMessage('注册失败，请稍后重试');
          setLoginStatus('idle');
      }
  };

  // Helper for rank info
  const getRankInfo = (points: number = 0) => {
      if (points > 60000) return { title: 'rankHuangdi', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', icon: Crown };
      if (points > 35000) return { title: 'rankTaibao', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', icon: Shield };
      if (points > 20000) return { title: 'rankZaixiang', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: Star };
      if (points > 10000) return { title: 'rankShangshu', bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', icon: Briefcase };
      if (points > 6000) return { title: 'rankDugong', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: Target };
      if (points > 3000) return { title: 'rankJuren', bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200', icon: GraduationCap };
      if (points > 1000) return { title: 'rankCaomin', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', icon: User };
      return { title: 'rankJianbi', bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', icon: Users };
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-blue-50 font-sans selection:bg-indigo-100">
      
      {/* --- Styles for Animations --- */}
      <style>{`
        @keyframes float-up {
          0% { transform: translateY(0) scale(0.8); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.8; }
          100% { transform: translateY(-120vh) scale(1.1); opacity: 0; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-2px); }
          80% { transform: translateX(2px); }
        }
        .float-item {
          position: absolute;
          animation: float-up linear infinite;
          will-change: transform, opacity;
          bottom: -100px; /* Start just below screen */
        }
        .glass-card {
            background: rgba(255, 255, 255, 0.65);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.8);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.05);
        }
      `}</style>

      {/* --- Dynamic Floating Background --- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-100/40 blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-100/40 blur-[120px] animate-pulse delay-1000"></div>

          {/* Floating User Bubbles */}
          {floatingUsers.map((u, i) => {
              const slotWidth = 90 / floatingUsers.length; 
              const baseLeft = 5 + (i * slotWidth);
              const randomOffset = Math.random() * (slotWidth * 0.6); 
              const left = `${baseLeft + randomOffset}%`;
              const duration = 15 + (i % 5) * 4 + Math.random() * 5 + 's'; 
              const delay = -(Math.random() * 30) + 's'; 
              const scale = 0.7 + Math.random() * 0.3;
              const rank = getRankInfo(u.points);
              const RankIcon = rank.icon;

              return (
                  <div 
                    key={u.id + i} 
                    className="float-item flex flex-col items-center gap-2 group"
                    style={{ 
                        left: left, 
                        animationDuration: duration, 
                        animationDelay: delay,
                        transform: `scale(${scale})`
                    }}
                  >
                      <div className="relative p-1 bg-white/50 backdrop-blur-sm rounded-full shadow-sm border border-white/60 group-hover:scale-110 transition-transform duration-500 cursor-default">
                          <img 
                            src={u.avatar || `https://ui-avatars.com/api/?name=${u.username}`} 
                            className="w-12 h-12 rounded-full object-cover shadow-sm opacity-90"
                            alt=""
                          />
                          <div className={`absolute -right-1 -bottom-1 w-5 h-5 rounded-full flex items-center justify-center border border-white ${rank.bg} shadow-sm z-10`}>
                             <RankIcon size={10} className={rank.text} />
                          </div>
                      </div>
                      
                      <div className="flex flex-col items-center gap-1 opacity-100 group-hover:scale-105 transition-transform duration-300">
                          <span className="px-2 py-0.5 rounded-full bg-white/70 backdrop-blur-md text-[10px] font-bold text-slate-700 shadow-sm border border-white/50 whitespace-nowrap">
                              {u.nickname || u.username}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium border flex items-center gap-1 shadow-sm whitespace-nowrap ${rank.bg} ${rank.text} ${rank.border}`}>
                              <RankIcon size={8} /> {t(rank.title as any)}
                          </span>
                      </div>
                  </div>
              );
          })}
      </div>

      {/* --- Main Card --- */}
      <div 
        className={`
            relative z-10 w-full max-w-[400px] p-8 m-4
            glass-card rounded-[2rem]
            transition-all duration-300
            ${loginStatus === 'error' ? 'animate-shake ring-2 ring-red-100' : ''}
        `}
      >
          {/* Timeout Indicator */}
          <div className="absolute top-4 right-4 group z-20">
              <div className="p-2 bg-white/50 rounded-full hover:bg-white/80 transition-colors cursor-help shadow-sm">
                  <Clock className="w-4 h-4 text-slate-400" />
              </div>
              <div className="absolute top-1/2 left-full ml-3 -translate-y-1/2 w-40 p-2.5 bg-white/90 backdrop-blur-md rounded-xl shadow-xl text-[10px] text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-left border border-white/50">
                  <div className="font-bold text-slate-800 mb-0.5">安全保护</div>
                  页面闲置120分钟将自动刷新并清除缓存。
              </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
             <div className="relative inline-flex items-center justify-center h-16 w-16 mb-5 mx-auto">
                 <div className={`
                    absolute inset-0 rounded-2xl transform transition-all duration-500 shadow-lg
                    ${matchedUser && !isRegisterMode
                        ? 'bg-white rotate-0 scale-100 shadow-blue-500/10 border-2 border-white' 
                        : 'bg-gradient-to-tr from-blue-400 to-indigo-500 rotate-6 hover:rotate-12 shadow-blue-500/20'
                    }
                 `}></div>

                 {isRegisterMode ? (
                     <div className="relative z-10 text-white animate-fade-in">
                         <UserPlus className="h-8 w-8" />
                     </div>
                 ) : (
                     <>
                        <div className={`relative z-10 transition-all duration-500 transform ${matchedUser ? 'opacity-0 scale-50 rotate-180' : 'opacity-100 scale-100 rotate-0'}`}>
                            <Sparkles className="h-8 w-8 text-white" />
                        </div>
                        <div className={`
                            absolute inset-0 z-20 rounded-2xl overflow-hidden shadow-sm transform transition-all duration-500
                            ${matchedUser ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 -rotate-12'}
                        `}>
                            {matchedUser && (
                                <img 
                                    src={matchedUser.avatar || `https://ui-avatars.com/api/?name=${matchedUser.username}`} 
                                    alt="User" 
                                    className="w-full h-full object-cover"
                                />
                            )}
                        </div>
                     </>
                 )}
                 
                 {/* Crown for Root/SVIP */}
                 {(matchedUser?.username === 'root' || username === 'root') && (
                     <div className="absolute -top-3 -right-3 z-30 bg-amber-100 rounded-full p-1.5 border-2 border-white shadow-sm animate-bounce">
                         <Crown className="h-4 w-4 text-amber-500 fill-amber-400" />
                     </div>
                 )}
             </div>

             <h2 className="text-2xl font-bold text-slate-800 mb-2 tracking-tight">
                 {isRegisterMode ? '创建新账号' : (matchedUser ? matchedUser.nickname : '欢迎回来')}
             </h2>
             <p className="text-slate-500 text-sm">
                 {isRegisterMode ? '请填写您的注册信息' : (matchedUser ? '请验证您的身份' : '登录以访问您的仪表盘')}
             </p>
          </div>

          {/* Form */}
          <form onSubmit={isRegisterMode ? handleRegister : handleLogin} className="space-y-5">
              
              {errorMessage && (
                <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50/80 border border-red-100 px-4 py-3 rounded-xl animate-fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {errorMessage}
                </div>
              )}

              {/* Username Field */}
              <div className="space-y-1">
                  <div className="relative group">
                      <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${matchedUser && !isRegisterMode ? 'text-[var(--color-primary)]' : 'text-slate-400 group-focus-within:text-blue-500'}`}>
                        <UserIcon className="h-5 w-5" />
                      </div>
                      <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className={`
                            w-full bg-white/50 border rounded-xl px-12 py-3.5 text-slate-700 outline-none transition-all placeholder:text-slate-400 font-medium
                            ${matchedUser && !isRegisterMode
                                ? 'border-blue-400 bg-blue-50/50 ring-4 ring-blue-50' 
                                : 'border-slate-200 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50'
                            }
                        `}
                        placeholder="请输入用户名"
                        required
                        autoComplete="off"
                      />
                  </div>
              </div>

              {/* Nickname Field (Register Only) */}
              {isRegisterMode && (
                  <div className="space-y-1 animate-slide-in-up">
                      <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500">
                            <Target className="h-5 w-5" />
                          </div>
                          <input
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            className="w-full bg-white/50 border border-slate-200 rounded-xl px-12 py-3.5 text-slate-700 outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-400 font-medium"
                            placeholder="请输入昵称 (选填)"
                          />
                      </div>
                  </div>
              )}

              {/* Password Field */}
              <div className="space-y-1">
                  <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                        <Lock className="h-5 w-5" />
                      </div>
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white/50 border border-slate-200 rounded-xl px-12 py-3.5 text-slate-700 outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all placeholder:text-slate-400 font-medium"
                        placeholder={isRegisterMode ? "设置密码" : "请输入密码"}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                  </div>
              </div>

              {/* Caps Lock Alert */}
              <div className="h-4 px-1">
                {capsLockOn && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-500 font-medium animate-pulse">
                        <AlertTriangle className="h-3 w-3" />
                        <span>大写锁定已开启</span>
                    </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loginStatus === 'loading' || loginStatus === 'success'}
                className={`
                    w-full flex items-center justify-center py-3.5 px-4 rounded-xl font-bold text-sm text-white shadow-lg shadow-blue-500/20 transition-all duration-300 transform
                    ${loginStatus === 'success' 
                        ? 'bg-green-500 scale-95 shadow-green-500/30' 
                        : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:scale-95'
                    }
                    disabled:opacity-80 disabled:cursor-not-allowed disabled:transform-none
                `}
              >
                <div className="flex items-center gap-2">
                    {loginStatus === 'loading' ? (
                        <>
                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>{isRegisterMode ? '注册中...' : '登录中...'}</span>
                        </>
                    ) : loginStatus === 'success' ? (
                        <>
                            <Check className="h-5 w-5 animate-bounce" />
                            <span>{isRegisterMode ? '注册成功' : '验证通过'}</span>
                        </>
                    ) : (
                        <>
                            <span>{isRegisterMode ? '立即注册' : '立即登录'}</span>
                            <ArrowRight className="h-4 w-4" />
                        </>
                    )}
                </div>
              </button>

              {/* Toggle Register/Login */}
              <div className="text-center pt-2">
                  <p className="text-xs text-slate-400">
                      {isRegisterMode ? '已有账号? ' : '还没有账号? '}
                      <button 
                        type="button" 
                        className="text-blue-600 font-bold hover:underline ml-1"
                        onClick={() => {
                            setIsRegisterMode(!isRegisterMode);
                            setErrorMessage('');
                            setLoginStatus('idle');
                            setUsername(isRegisterMode ? 'root' : '');
                            setPassword('');
                        }}
                      >
                          {isRegisterMode ? '直接登录' : '立即注册'}
                      </button>
                  </p>
                  {isRegisterMode && (
                      <p className="text-[10px] text-slate-400 mt-2 opacity-70">
                          提示: 注册为 <strong>root</strong> 用户可直接获得至尊权限与皇冠图标。
                      </p>
                  )}
              </div>
          </form>
      </div>
      
      {/* Footer */}
      <div className="absolute bottom-6 text-center">
         <p className="text-slate-400/80 text-[10px] tracking-widest font-medium uppercase">
            Admin Pro GXL &copy; 2026
         </p>
      </div>
    </div>
  );
};
