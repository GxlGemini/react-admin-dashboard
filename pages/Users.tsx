
import React, { useState, useEffect, useRef } from 'react';
import { userService } from '../services/userService';
import { authService } from '../services/authService';
import { User } from '../types';
import { Search, Plus, Trash2, Edit2, X, Crown, AlertTriangle, Save, Coins, Eye, EyeOff, ChevronLeft, ChevronRight, Camera, Upload, Loader2, Star, Award, User as UserIcon } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination State - Changed default to 20 to show all data immediately
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Edit/Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Global Context
  // lastSyncTime is updated by AppContext when cloud data changes
  const { t, user: currentUser, refreshUser, isSyncing, lastSyncTime } = useApp();

  // Load data initially AND when cloud sync happens
  useEffect(() => {
    if (!isSyncing) {
        loadUsers();
    }
  }, [isSyncing, lastSyncTime]);

  // Reset page when searching
  useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm]);

  const loadUsers = () => {
    try {
        const freshUsers = userService.getUsers();
        // Prevent unnecessary re-renders if data is identical (optional optimization could go here)
        setUsers([...freshUsers]);
    } catch (e) {
        console.error("Failed to load users", e);
    }
  };

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.nickname && user.nickname.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  // Handle Page Size Change
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setItemsPerPage(Number(e.target.value));
      setCurrentPage(1); // Reset to first page to avoid empty views
  };

  // --- Handlers ---

  const handleDeleteClick = (user: User) => {
    if (user.username === 'admin') return;
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      userService.deleteUser(userToDelete.id);
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      loadUsers();
    }
  };

  const handleOpenModal = (user?: User) => {
    setShowPassword(false); // Reset password view state
    setIsProcessingImg(false);
    if (user) {
      setEditingUser(user);
      // Clone user data but DO NOT pre-fill password for security and UX
      const { password, ...rest } = user;
      setFormData({ ...rest }); 
    } else {
      setEditingUser(null);
      setFormData({ status: 'active', role: 'user', points: 0 });
    }
    setIsModalOpen(true);
  };

  // Compress image to avoid LocalStorage Quota Exceeded errors
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          // Max width 300px is sufficient for avatars
          const MAX_WIDTH = 300;
          const scaleSize = MAX_WIDTH / img.width;
          
          if (img.width > MAX_WIDTH) {
              canvas.width = MAX_WIDTH;
              canvas.height = img.height * scaleSize;
          } else {
              canvas.width = img.width;
              canvas.height = img.height;
          }

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          // Compress to JPEG with 0.7 quality
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessingImg(true);
      try {
        const compressedBase64 = await compressImage(file);
        setFormData({ ...formData, avatar: compressedBase64 });
      } catch (err) {
        console.error("Image processing failed", err);
        alert("图片处理失败，请重试");
      } finally {
        setIsProcessingImg(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username) return;

    // Safety check for Super Admin
    const isSuperAdmin = editingUser?.username === 'admin';
    const finalRole = isSuperAdmin ? 'admin' : (formData.role as 'admin' | 'user');
    const finalStatus = isSuperAdmin ? 'active' : (formData.status as 'active' | 'inactive');

    // Fetch the latest version of the user from storage to ensure we don't overwrite Profile fields (bio, tags, etc.)
    // that might not be in the current 'editingUser' state if the list was stale.
    const latestUser = editingUser ? userService.getUserById(editingUser.id) : null;
    const baseUser = latestUser || editingUser || {};

    const userToSave: User = {
      // FIX: Generate a temporary ID for new users so validation passes
      id: editingUser ? editingUser.id : Date.now().toString(),
      username: formData.username,
      email: formData.email || '', 
      status: finalStatus,
      role: finalRole,
      createdAt: editingUser ? editingUser.createdAt : new Date().toISOString().split('T')[0],
      // Only update password if formData.password is provided, otherwise keep existing
      password: formData.password || (editingUser ? editingUser.password : '123456'), 
      nickname: formData.nickname || formData.username,
      avatar: formData.avatar || editingUser?.avatar,
      points: Number(formData.points) || 0,
      lastCheckIn: editingUser?.lastCheckIn,
      
      // CRITICAL FIX: Merge Profile 2.0 fields from the LATEST user record found in storage
      // The form does not include these fields, so we must preserve them from the source.
      coverImages: (baseUser as User).coverImages || [],
      bio: (baseUser as User).bio || '',
      tags: (baseUser as User).tags || [],
      socials: (baseUser as User).socials || {}
    };

    try {
        // 1. Save to DB (Local + Cloud)
        userService.saveUser(userToSave);

        // 2. CRITICAL: If we are editing the currently logged-in user, 
        // we MUST update the session storage and global context immediately.
        // This ensures Profile page and Header see the changes without logout.
        if (currentUser && currentUser.id === userToSave.id) {
            authService.updateUser(userToSave);
            refreshUser();
        }

        setIsModalOpen(false);
        loadUsers();
    } catch (error: any) {
        console.error("Failed to save user:", error);
        alert(error.message || "保存失败，可能是因为图片太大或存储空间不足。");
    }
  };

  const getRankInfo = (points: number = 0) => {
      if (points > 60000) return { name: 'rankHuangdi', color: 'text-amber-600 bg-amber-100 border-amber-200' };
      if (points > 35000) return { name: 'rankTaibao', color: 'text-purple-600 bg-purple-100 border-purple-200' };
      if (points > 20000) return { name: 'rankZaixiang', color: 'text-red-600 bg-red-100 border-red-200' };
      if (points > 10000) return { name: 'rankShangshu', color: 'text-indigo-600 bg-indigo-100 border-indigo-200' };
      if (points > 6000) return { name: 'rankDugong', color: 'text-blue-600 bg-blue-100 border-blue-200' };
      if (points > 3000) return { name: 'rankJuren', color: 'text-cyan-600 bg-cyan-100 border-cyan-200' };
      if (points > 1000) return { name: 'rankCaomin', color: 'text-slate-600 bg-slate-100 border-slate-200' };
      return { name: 'rankJianbi', color: 'text-gray-500 bg-gray-50 border-gray-200' };
  };

  // --- Render Loading Skeleton ---
  if (isSyncing) {
      return (
          <div className="space-y-6 animate-pulse">
              <div className="flex justify-between">
                  <div className="h-10 w-64 bg-gray-200 dark:bg-slate-700 rounded-lg"></div>
                  <div className="h-10 w-32 bg-gray-200 dark:bg-slate-700 rounded-lg"></div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 h-96 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                      <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
                      <span className="text-sm">正在同步云端数据...</span>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Actions */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-300 pl-10 p-2 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] sm:w-64 dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-colors"
          />
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('addUser')}
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:bg-slate-800 dark:border-slate-700 flex flex-col overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-slate-700 dark:text-gray-200 border-b border-gray-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-3">{t('user')}</th>
                <th className="px-6 py-3">{t('points')}</th>
                <th className="px-6 py-3">{t('role')}</th>
                <th className="px-6 py-3">{t('status')}</th>
                <th className="px-6 py-3">注册时间</th>
                <th className="px-6 py-3 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {currentItems.length > 0 ? (
                currentItems.map((user) => {
                  const rankInfo = getRankInfo(user.points);
                  return (
                  <tr key={user.id} className="bg-white hover:bg-gray-50 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-3 dark:bg-blue-900 dark:text-blue-300 overflow-hidden shrink-0 border border-gray-100 dark:border-gray-700">
                            {user.avatar ? 
                                <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" /> 
                                : user.username.charAt(0).toUpperCase()
                            }
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                              {user.nickname || user.username}
                              {user.username === 'admin' && (
                                  <span className="inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 border border-amber-200" title="Super Admin">
                                      <Crown className="h-3 w-3 fill-amber-500 text-amber-600" />
                                  </span>
                              )}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{user.email || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex flex-col items-start">
                            <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                <Coins className="h-3 w-3 text-yellow-500" />
                                {user.points || 0}
                            </span>
                            <span className={`text-[10px] px-1.5 rounded border mt-0.5 ${rankInfo.color}`}>
                                {t(rankInfo.name as any)}
                            </span>
                        </div>
                    </td>
                    <td className="px-6 py-4 capitalize">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                            {user.role === 'admin' ? t('admin') : t('user')}
                        </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        user.status === 'active' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {user.status === 'active' ? t('active') : t('inactive')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">{user.createdAt}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenModal(user)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded dark:hover:bg-blue-900/20 transition-colors">
                            <Edit2 className="h-4 w-4" />
                        </button>
                        
                        <button 
                            onClick={() => handleDeleteClick(user)} 
                            disabled={user.username === 'admin'}
                            className={`p-1.5 rounded transition-colors ${
                                user.username === 'admin' 
                                ? 'text-gray-300 cursor-not-allowed' 
                                : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                            }`}
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )})
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      无符合条件的用户
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredUsers.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 dark:bg-slate-800 dark:border-slate-700 rounded-b-xl flex-wrap gap-4">
            
            {/* Page Size Selector */}
            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-400">
                <span className="hidden sm:inline">每页显示</span>
                <select 
                    value={itemsPerPage}
                    onChange={handlePageSizeChange}
                    className="border border-gray-300 rounded-md text-sm py-1 px-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] dark:bg-slate-700 dark:border-slate-600 dark:text-white outline-none cursor-pointer"
                >
                    <option value={10}>10 条</option>
                    <option value={20}>20 条</option>
                    <option value={50}>50 条</option>
                    <option value={100}>100 条</option>
                </select>
                <span className="hidden sm:inline text-gray-400">|</span>
                <span className="hidden sm:inline">
                   显示 {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredUsers.length)} 共 {filteredUsers.length} 条
                </span>
                <span className="sm:hidden">
                   {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredUsers.length)} / {filteredUsers.length}
                </span>
            </div>

            <div className="flex items-center gap-2">
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 dark:ring-slate-600 dark:hover:bg-slate-700"
                  >
                    <span className="sr-only">Previous</span>
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  
                  {/* Simplified Page Numbers Logic for many pages */}
                  {[...Array(totalPages)].map((_, idx) => {
                      if (totalPages > 10 && Math.abs(currentPage - (idx + 1)) > 2 && idx !== 0 && idx !== totalPages - 1) {
                          if (idx === 1 || idx === totalPages - 2) return <span key={idx} className="px-2 py-2 text-gray-400 bg-white border border-gray-300 dark:bg-slate-700 dark:border-slate-600">...</span>;
                          return null;
                      }
                      return (
                        <button
                            key={idx}
                            onClick={() => setCurrentPage(idx + 1)}
                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus:outline-offset-0 
                                ${currentPage === idx + 1 
                                    ? 'bg-[var(--color-primary)] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600' 
                                    : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:text-white dark:ring-slate-600 dark:hover:bg-slate-700'
                                }`}
                        >
                            {idx + 1}
                        </button>
                      );
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 dark:ring-slate-600 dark:hover:bg-slate-700"
                  >
                    <span className="sr-only">Next</span>
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
            </div>
          </div>
        )}
      </div>

      {/* Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fade-in backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-slate-800 border border-gray-100 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b p-5 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 rounded-t-2xl">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  {editingUser ? <Edit2 className="h-5 w-5 text-[var(--color-primary)]" /> : <Plus className="h-5 w-5 text-[var(--color-primary)]" />}
                  {editingUser ? t('editUser') : t('newUser')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors bg-white dark:bg-slate-700 rounded-full p-1 shadow-sm">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Avatar Upload Section */}
              <div className="flex justify-center mb-6">
                <div className="relative group cursor-pointer" onClick={() => !isProcessingImg && fileInputRef.current?.click()}>
                   <div className="w-24 h-24 rounded-full border-4 border-gray-100 dark:border-slate-700 overflow-hidden shadow-md bg-gray-50 dark:bg-slate-900 relative">
                       {isProcessingImg ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                             <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          </div>
                       ) : (
                          <img 
                            src={formData.avatar || 'https://ui-avatars.com/api/?name=' + (formData.username || 'User')} 
                            alt="Avatar Preview" 
                            className="w-full h-full object-cover"
                          />
                       )}
                   </div>
                   <div className="absolute inset-0 bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <Camera className="w-8 h-8 text-white/90" />
                   </div>
                   <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleAvatarUpload} 
                   />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">{t('username')}</label>
                  <input
                    type="text"
                    value={formData.username || ''}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] dark:bg-slate-700 dark:border-slate-600 dark:text-white transition-all text-sm"
                    required
                    disabled={!!editingUser}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">昵称</label>
                  <input
                    type="text"
                    value={formData.nickname || ''}
                    onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] dark:bg-slate-700 dark:border-slate-600 dark:text-white transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] dark:bg-slate-700 dark:border-slate-600 dark:text-white transition-all text-sm"
                />
              </div>

              {/* Points Field */}
              <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">{t('points')}</label>
                  <input
                    type="number"
                    value={formData.points || 0}
                    onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] dark:bg-slate-700 dark:border-slate-600 dark:text-white transition-all text-sm"
                  />
              </div>

              {/* Password Field - Optional when editing */}
              <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      {editingUser ? '重置密码 (留空则不修改)' : t('password')}
                  </label>
                  <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={formData.password || ''}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] dark:bg-slate-700 dark:border-slate-600 dark:text-white transition-all text-sm"
                        placeholder={editingUser ? "******" : "Required"}
                        required={!editingUser}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">{t('role')}</label>
                  <select
                    value={formData.role || 'user'}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
                    disabled={editingUser?.username === 'admin'}
                    className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] dark:bg-slate-700 dark:border-slate-600 dark:text-white transition-all text-sm disabled:opacity-50"
                  >
                    <option value="user">{t('user')}</option>
                    <option value="admin">{t('admin')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">{t('status')}</label>
                  <select
                    value={formData.status || 'active'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                    disabled={editingUser?.username === 'admin'}
                    className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] dark:bg-slate-700 dark:border-slate-600 dark:text-white transition-all text-sm disabled:opacity-50"
                  >
                    <option value="active">{t('active')}</option>
                    <option value="inactive">{t('inactive')}</option>
                  </select>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isProcessingImg}
                  className="px-6 py-2 rounded-lg text-sm font-bold text-white bg-[var(--color-primary)] hover:opacity-90 shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {isProcessingImg ? '处理中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fade-in backdrop-blur-sm">
              <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-slate-700">
                  <div className="flex flex-col items-center text-center space-y-4">
                      <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                          <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-500" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">确认删除用户?</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                          您即将删除 <strong>{userToDelete?.username}</strong>。此操作不可撤销，且会同步删除云端数据。
                      </p>
                      <div className="flex gap-3 w-full pt-2">
                          <button 
                              onClick={() => setIsDeleteModalOpen(false)}
                              className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
                          >
                              取消
                          </button>
                          <button 
                              onClick={confirmDelete}
                              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-500/30 transition-all"
                          >
                              确认删除
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
