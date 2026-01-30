
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    Plus, Trash2, X, Image as ImageIcon, Upload, Loader2, 
    CheckSquare, Square, Download, Search, Filter, Hash,
    Maximize2, Info, ChevronUp, ListChecks, CheckCircle2
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Photo } from '../types';
import { photoService } from '../services/photoService';

export const GalleryPage: React.FC = () => {
  const { isSyncing } = useApp();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Viewer State
  const [viewingPhoto, setViewingPhoto] = useState<Photo | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Photo['category']>('life');
  const [imgData, setImgData] = useState<string>('');
  const [imgDims, setImgDims] = useState<{width: number, height: number} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load photos from API
  const loadGallery = async () => {
      setLoadingPhotos(true);
      const data = await photoService.fetchPhotos();
      setPhotos(data);
      setLoadingPhotos(false);
  };

  useEffect(() => {
      loadGallery();
  }, []); // Run once on mount

  const categories = ['all', 'life', 'work', 'screenshot', 'other'];

  const categoryStats = useMemo(() => {
      const stats: Record<string, number> = { all: photos.length };
      photos.forEach(p => {
          stats[p.category] = (stats[p.category] || 0) + 1;
      });
      return stats;
  }, [photos]);

  const filteredPhotos = useMemo(() => {
      return photos.filter(p => {
          const matchesFilter = filter === 'all' || p.category === filter;
          const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
          return matchesFilter && matchesSearch;
      });
  }, [photos, filter, searchQuery]);

  const allSelected = useMemo(() => {
      if (filteredPhotos.length === 0) return false;
      return filteredPhotos.every(p => selectedIds.has(p.id));
  }, [filteredPhotos, selectedIds]);

  const handleSelectAll = () => {
      const newSet = new Set(selectedIds);
      if (allSelected) {
          filteredPhotos.forEach(p => newSet.delete(p.id));
      } else {
          filteredPhotos.forEach(p => newSet.add(p.id));
      }
      setSelectedIds(newSet);
  };

  const compressImage = (file: File): Promise<{ url: string, width: number, height: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200; 
          const scaleSize = MAX_WIDTH / img.width;
          const finalWidth = img.width > MAX_WIDTH ? MAX_WIDTH : img.width;
          const finalHeight = img.width > MAX_WIDTH ? img.height * scaleSize : img.height;
          canvas.width = finalWidth;
          canvas.height = finalHeight;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, finalWidth, finalHeight);
          resolve({ url: canvas.toDataURL('image/jpeg', 0.85), width: finalWidth, height: finalHeight });
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
          setIsUploading(true);
          try {
             const result = await compressImage(e.target.files[0]);
             setImgData(result.url);
             setImgDims({ width: result.width, height: result.height });
             if (!title) {
                 const fname = e.target.files[0].name.split('.')[0];
                 setTitle(fname.charAt(0).toUpperCase() + fname.slice(1));
             }
          } catch (e) {
              alert('处理失败');
          } finally {
              setIsUploading(false);
          }
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!imgData) return;
      setIsUploading(true);
      try {
          await photoService.addPhoto({ title: title || '未命名', url: imgData, category, width: imgDims?.width, height: imgDims?.height });
          await loadGallery(); // Refresh list
          setIsModalOpen(false);
          resetForm();
      } catch(e) {
          alert('上传失败，请重试');
      } finally {
          setIsUploading(false);
      }
  };

  const handleBulkDelete = async () => {
      if(confirm(`确定从 D1 数据库永久删除这 ${selectedIds.size} 张灵感吗？此操作无法撤销。`)) {
          setLoadingPhotos(true);
          await photoService.deletePhotos(Array.from(selectedIds));
          await loadGallery(); // Refresh list
          setSelectedIds(new Set());
          setIsSelectionMode(false);
      }
  };

  const toggleSelection = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
      setSelectedIds(newSet);
  };

  const resetForm = () => {
      setTitle(''); setCategory('life'); setImgData(''); setImgDims(null);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
        {/* Gallery Header */}
        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-5">
                <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-3xl">
                    <ImageIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">灵感图库</h1>
                    <p className="text-slate-400 text-sm mt-1 font-medium">沉淀美好时刻，共 {photos.length} 张灵感</p>
                </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input 
                        type="text"
                        placeholder="搜索灵感..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border-none rounded-2xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                    />
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="shrink-0 bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all font-bold text-sm flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" /> 上传
                </button>
            </div>
        </div>

        {/* Categories & Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide w-full sm:w-auto">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setFilter(cat)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-bold transition-all border shrink-0
                            ${filter === cat 
                                ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900 shadow-md' 
                                : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'}
                        `}
                    >
                        <span className="capitalize">{cat === 'all' ? '全部' : cat}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] ${filter === cat ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700'}`}>
                            {categoryStats[cat] || 0}
                        </span>
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-3">
                {isSelectionMode && (
                    <button 
                        onClick={handleSelectAll}
                        className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border
                            ${allSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-400'
                            }
                        `}
                    >
                        <ListChecks className="h-4 w-4" />
                        {allSelected ? '取消全选' : '全选'}
                    </button>
                )}
                
                <button 
                    onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds(new Set()); }}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border
                        ${isSelectionMode ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100' : 'bg-white text-slate-600 border-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 hover:shadow-sm'}
                    `}
                >
                    {isSelectionMode ? <X className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
                    {isSelectionMode ? '退出管理' : '批量管理'}
                </button>
            </div>
        </div>

        {/* Action Bar for Selected Items */}
        {isSelectionMode && selectedIds.size > 0 && (
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] animate-slide-in-up">
                <div className="bg-slate-900/90 dark:bg-white/90 backdrop-blur-xl px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-8 border border-white/20 dark:border-black/10">
                    <p className="text-white dark:text-slate-900 text-sm font-black tracking-tight flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-indigo-400 dark:text-indigo-600" />
                        已选择 <span className="text-indigo-400 dark:text-indigo-600 text-lg">{selectedIds.size}</span> 张灵感
                    </p>
                    <div className="h-6 w-px bg-white/20 dark:bg-black/10"></div>
                    <button 
                        onClick={handleBulkDelete}
                        disabled={loadingPhotos}
                        className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-2xl font-black text-sm transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
                    >
                        {loadingPhotos ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />} 
                        {loadingPhotos ? '删除中...' : '批量删除'}
                    </button>
                </div>
            </div>
        )}

        {/* Photos Grid - Masonry columns */}
        {loadingPhotos && photos.length === 0 ? (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
            </div>
        ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-8 space-y-8">
                {filteredPhotos.map(photo => (
                    <div 
                        key={photo.id} 
                        onClick={() => isSelectionMode ? toggleSelection(photo.id) : setViewingPhoto(photo)}
                        className={`
                            break-inside-avoid relative group rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-800 transition-all duration-500 mb-8 border border-slate-100 dark:border-slate-700
                            ${isSelectionMode ? 'cursor-pointer' : 'cursor-zoom-in hover:-translate-y-2 hover:shadow-2xl hover:shadow-indigo-100 dark:hover:shadow-black/40'}
                            ${selectedIds.has(photo.id) ? 'ring-4 ring-indigo-500 scale-[0.96]' : ''}
                        `}
                    >
                        <img src={photo.url} alt={photo.title} className="w-full h-auto block transform group-hover:scale-105 transition-transform duration-700 ease-out" />
                        
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        
                        {/* Selection Checkmark */}
                        {isSelectionMode && (
                            <div className={`absolute inset-0 flex items-center justify-center backdrop-blur-[2px] transition-all ${selectedIds.has(photo.id) ? 'bg-indigo-600/20' : 'opacity-0 group-hover:opacity-100'}`}>
                                <div className={`p-3 rounded-full shadow-lg ${selectedIds.has(photo.id) ? 'bg-indigo-600 text-white' : 'bg-white/90 text-slate-300'}`}>
                                    <CheckSquare className="h-8 w-8" />
                                </div>
                            </div>
                        )}

                        {!isSelectionMode && (
                            <div className="absolute bottom-0 left-0 right-0 p-8 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                                <h3 className="font-black text-white text-xl truncate mb-1">{photo.title}</h3>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-white/20 backdrop-blur-md rounded-lg text-[10px] uppercase font-black text-white border border-white/20">{photo.category}</span>
                                    <span className="text-white/60 text-[10px] font-bold">{new Date(photo.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        )}

        {/* Empty State */}
        {!loadingPhotos && filteredPhotos.length === 0 && (
            <div className="text-center py-40 bg-slate-50/50 dark:bg-slate-800/30 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-700">
                <ImageIcon className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-500">未找到匹配的灵感</h3>
            </div>
        )}

        {/* Fullscreen Viewer - Click backdrop to close */}
        {viewingPhoto && (
            <div 
                className="fixed inset-0 z-[100] flex items-center justify-center bg-white/95 dark:bg-slate-950/95 backdrop-blur-3xl animate-fade-in cursor-default"
                onClick={() => setViewingPhoto(null)}
            >
                {/* Fixed Close Button */}
                <button 
                    onClick={() => setViewingPhoto(null)}
                    className="absolute top-10 right-10 p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-indigo-600 transition-colors z-[110] shadow-xl"
                >
                    <X className="h-8 w-8" />
                </button>

                {/* Content - Stop propagation to prevent closing when clicking the image info */}
                <div 
                    className="relative flex flex-col items-center justify-center p-6 animate-bounce-in max-w-full max-h-full"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] p-4 shadow-[0_0_120px_rgba(0,0,0,0.15)] dark:shadow-none border border-slate-100 dark:border-slate-800">
                        <img 
                            src={viewingPhoto.url} 
                            alt={viewingPhoto.title}
                            className="max-h-[70vh] w-auto object-contain rounded-[3rem] select-none"
                        />
                    </div>
                    
                    <div className="mt-8 text-center bg-white/60 dark:bg-slate-800/60 backdrop-blur-2xl px-16 py-8 rounded-[3rem] border border-white dark:border-slate-700 shadow-2xl">
                        <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2">{viewingPhoto.title}</h2>
                        <div className="flex items-center justify-center gap-6 text-sm font-bold uppercase tracking-widest text-slate-400">
                             <span className="flex items-center gap-2 text-indigo-500"><Hash className="h-4 w-4" /> {viewingPhoto.category}</span>
                             <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                             <span>{viewingPhoto.width} x {viewingPhoto.height} px</span>
                        </div>
                        <div className="mt-8 flex justify-center gap-4">
                            <a href={viewingPhoto.url} download={viewingPhoto.title} className="flex items-center gap-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-8 py-3.5 rounded-[1.5rem] font-black text-sm hover:scale-105 transition-all shadow-xl">
                                <Download className="h-4 w-4" /> 下载原图
                            </a>
                            <button 
                                onClick={async () => { 
                                    if(confirm('彻底从 D1 数据库删除这张灵感？')) { 
                                        await photoService.deletePhoto(viewingPhoto.id); 
                                        await loadGallery();
                                        setViewingPhoto(null); 
                                    } 
                                }}
                                className="flex items-center gap-2 bg-red-50 text-red-500 px-8 py-3.5 rounded-[1.5rem] font-black text-sm hover:bg-red-500 hover:text-white transition-all border border-red-100"
                            >
                                <Trash2 className="h-4 w-4" /> 永久删除
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Upload Modal Implementation */}
        {isModalOpen && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-xl p-4 animate-fade-in">
                <div className="bg-white dark:bg-slate-800 rounded-[3rem] w-full max-w-lg p-10 shadow-3xl border border-white dark:border-slate-700 animate-slide-in-up">
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h3 className="text-3xl font-black text-slate-800 dark:text-white">上传新灵感</h3>
                            <p className="text-slate-400 text-sm mt-1 font-medium">图片将直接存入 Cloudflare D1 数据库</p>
                        </div>
                        <button onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-50 dark:bg-slate-700 rounded-full hover:bg-slate-100 transition-colors shadow-sm">
                            <X className="h-6 w-6 text-slate-400" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div 
                            onClick={() => !isUploading && fileInputRef.current?.click()}
                            className={`
                                relative aspect-video rounded-[2.5rem] border-4 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-500 overflow-hidden
                                ${imgData ? 'border-transparent ring-8 ring-indigo-50 dark:ring-indigo-900/20' : 'border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 dark:border-slate-700'}
                            `}
                        >
                            {imgData ? (
                                <img src={imgData} className="w-full h-full object-cover rounded-[2rem] animate-fade-in" />
                            ) : (
                                <div className="text-center">
                                    <div className="p-6 bg-slate-50 dark:bg-slate-700 rounded-full mb-4 inline-block">
                                        <Upload className="h-10 w-10 text-indigo-500" />
                                    </div>
                                    <p className="font-black text-slate-600 dark:text-slate-300">点击或拖拽上传图片</p>
                                    <p className="text-xs text-slate-400 mt-2">支持 JPG, PNG (Max 5MB)</p>
                                </div>
                            )}
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} disabled={isUploading} />
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">灵感标题</label>
                                <input 
                                    value={title} onChange={e => setTitle(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl p-5 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                    placeholder="起一个动听的名字..." required
                                    disabled={isUploading}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">选择分类</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {['life', 'work', 'screenshot', 'other'].map(opt => (
                                        <button
                                            key={opt} type="button" onClick={() => setCategory(opt as any)}
                                            disabled={isUploading}
                                            className={`p-4 rounded-2xl text-xs font-black capitalize transition-all border
                                                ${category === opt 
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' 
                                                    : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-400'}
                                            `}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button 
                            type="submit" disabled={!imgData || isUploading}
                            className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-lg hover:bg-indigo-700 disabled:opacity-50 shadow-2xl shadow-indigo-200 dark:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {isUploading ? <Loader2 className="h-5 w-5 animate-spin"/> : <Upload className="h-5 w-5" />}
                            {isUploading ? '正在同步至云端...' : '保存并同步'}
                        </button>
                    </form>
                </div>
             </div>
        )}
    </div>
  );
};
