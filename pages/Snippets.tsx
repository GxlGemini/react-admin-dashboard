
import React, { useState, useEffect, useMemo } from 'react';
import { snippetService } from '../services/snippetService';
import { Snippet } from '../types';
import { 
    Code2, Plus, Search, Trash2, Edit3, Copy, Check, X, 
    Terminal, Layers, Save, RefreshCw, AlertCircle
} from 'lucide-react';

// Use global Prism from index.html
const Prism = (window as any).Prism;

const LANGUAGES = [
    { id: 'javascript', label: 'JavaScript', icon: 'JS', color: 'text-yellow-400' },
    { id: 'typescript', label: 'TypeScript', icon: 'TS', color: 'text-blue-400' },
    { id: 'python', label: 'Python', icon: 'PY', color: 'text-green-400' },
    { id: 'sql', label: 'SQL', icon: 'SQL', color: 'text-orange-400' },
    { id: 'css', label: 'CSS', icon: '#', color: 'text-pink-400' },
    { id: 'json', label: 'JSON', icon: '{}', color: 'text-gray-400' },
    { id: 'bash', label: 'Bash', icon: '$_', color: 'text-white' },
];

const LIMITS = {
    TITLE: 100,
    DESC: 500,
    CODE: 20000 // ~20KB
};

export const SnippetsPage: React.FC = () => {
    const [snippets, setSnippets] = useState<Snippet[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterLang, setFilterLang] = useState<string>('all');
    const [search, setSearch] = useState('');
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Snippet>>({ language: 'javascript' });
    const [copyId, setCopyId] = useState<string | null>(null);

    useEffect(() => {
        loadSnippets();
    }, []);

    const filteredSnippets = useMemo(() => {
        return snippets.filter(s => {
            const matchLang = filterLang === 'all' || s.language === filterLang;
            const matchSearch = s.title.toLowerCase().includes(search.toLowerCase()) || 
                                s.code.includes(search);
            return matchLang && matchSearch;
        });
    }, [snippets, filterLang, search]);

    // Re-highlight when snippets or filter changes
    useEffect(() => {
        if (!loading && !isModalOpen) {
            // Small timeout to ensure DOM is rendered
            setTimeout(() => {
                if (Prism) {
                    Prism.highlightAll();
                }
            }, 100);
        }
    }, [snippets, filteredSnippets, loading, isModalOpen]);

    const loadSnippets = async () => {
        setLoading(true);
        const data = await snippetService.fetchSnippets();
        setSnippets(data);
        setLoading(false);
    };

    const handleSave = async () => {
        const title = formData.title?.trim() || '';
        const code = formData.code?.trim() || '';
        const desc = formData.description?.trim() || '';

        if (!title) {
            alert("错误：请输入标题");
            return;
        }
        if (!code) {
            alert("错误：请输入代码内容");
            return;
        }

        if (title.length > LIMITS.TITLE) {
            alert(`错误：标题长度 (${title.length}) 超过限制 (${LIMITS.TITLE})`);
            return;
        }
        
        if (desc.length > LIMITS.DESC) {
            alert(`错误：描述长度 (${desc.length}) 超过限制 (${LIMITS.DESC})`);
            return;
        }

        if (code.length > LIMITS.CODE) {
            alert(`错误：代码内容过长 (当前 ${code.length} 字符)，请控制在 ${LIMITS.CODE} 字符以内`);
            return;
        }

        try {
            await snippetService.saveSnippet({
                ...formData,
                title, // Use trimmed values
                code,
                description: desc,
                id: editingId || undefined
            } as any);
            setIsModalOpen(false);
            loadSnippets();
        } catch (e) {
            alert('保存失败，请检查网络或重试');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('确认删除此代码片段?')) {
            await snippetService.deleteSnippet(id);
            loadSnippets();
        }
    };

    const handleCopy = (code: string, id: string) => {
        navigator.clipboard.writeText(code);
        setCopyId(id);
        setTimeout(() => setCopyId(null), 2000);
    };

    const openModal = (snippet?: Snippet) => {
        if (snippet) {
            setEditingId(snippet.id);
            setFormData({ ...snippet });
        } else {
            setEditingId(null);
            setFormData({ language: 'javascript', code: '', title: '', description: '' });
        }
        setIsModalOpen(true);
    };

    return (
        <div className="flex h-[calc(100vh-8rem)] gap-6 animate-fade-in">
            {/* Sidebar Filter */}
            <div className="w-64 shrink-0 flex flex-col gap-2 bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-slate-700 h-full overflow-y-auto hidden md:flex">
                <button 
                    onClick={() => setFilterLang('all')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${filterLang === 'all' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                >
                    <Layers className="h-4 w-4" />
                    全部语言
                    <span className="ml-auto text-xs opacity-60">{snippets.length}</span>
                </button>
                <div className="h-px bg-gray-100 dark:bg-slate-700 my-2"></div>
                {LANGUAGES.map(lang => (
                    <button 
                        key={lang.id}
                        onClick={() => setFilterLang(lang.id)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${filterLang === lang.id ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                    >
                        <span className={`font-mono text-xs ${lang.color} bg-gray-800 px-1.5 py-0.5 rounded`}>{lang.icon}</span>
                        {lang.label}
                        <span className="ml-auto text-xs opacity-60">{snippets.filter(s => s.language === lang.id).length}</span>
                    </button>
                ))}
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col gap-6 min-w-0">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="搜索代码片段..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-slate-900 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500/20"
                        />
                    </div>
                    <button 
                        onClick={() => openModal()}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 dark:shadow-none transition-all w-full sm:w-auto justify-center"
                    >
                        <Plus className="h-4 w-4" /> 新建代码
                    </button>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center pt-20"><RefreshCw className="animate-spin text-indigo-500" /></div>
                    ) : filteredSnippets.length === 0 ? (
                        <div className="text-center pt-20 text-gray-400">
                            <Code2 className="h-16 w-16 mx-auto mb-4 opacity-20" />
                            <p>暂无相关代码片段</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-10">
                            {filteredSnippets.map(snippet => (
                                <div key={snippet.id} className="group bg-[#1e1e1e] rounded-2xl overflow-hidden shadow-xl border border-gray-800 flex flex-col h-[320px] transition-transform hover:-translate-y-1">
                                    {/* Mac Window Header */}
                                    <div className="bg-[#252526] px-4 py-3 flex items-center justify-between border-b border-[#333]">
                                        <div className="flex gap-2">
                                            <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                                            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                                            <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                                        </div>
                                        <span className="text-gray-400 text-xs font-mono truncate max-w-[150px]">{snippet.title}</span>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openModal(snippet)} className="text-gray-400 hover:text-white"><Edit3 className="h-3.5 w-3.5" /></button>
                                            <button onClick={() => handleDelete(snippet.id)} className="text-gray-400 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                                        </div>
                                    </div>
                                    
                                    {/* Code Area */}
                                    <div className="relative flex-1 overflow-hidden bg-[#1e1e1e] group/code">
                                        <pre className="!m-0 !p-4 !bg-transparent h-full custom-scrollbar !text-xs">
                                            <code className={`language-${snippet.language}`}>
                                                {snippet.code}
                                            </code>
                                        </pre>
                                        
                                        {/* Overlay Actions */}
                                        <div className="absolute top-3 right-3 flex gap-2">
                                            <span className="px-2 py-1 rounded-md bg-white/10 text-xs text-white/50 font-mono uppercase backdrop-blur-sm">
                                                {snippet.language}
                                            </span>
                                            <button 
                                                onClick={() => handleCopy(snippet.code, snippet.id)}
                                                className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-colors"
                                            >
                                                {copyId === snippet.id ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Footer Info */}
                                    <div className="bg-[#252526] px-4 py-2 flex justify-between items-center text-[10px] text-gray-500 border-t border-[#333]">
                                        <span className="truncate max-w-[70%]">{snippet.description || 'No description'}</span>
                                        <span className="font-mono">{new Date(snippet.updatedAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Editor Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-950">
                            <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                <Terminal className="h-5 w-5 text-indigo-500" /> 
                                {editingId ? '编辑代码片段' : '新建代码片段'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)}><X className="h-5 w-5 text-gray-500" /></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-gray-500 uppercase">标题</label>
                                        <span className={`text-[10px] font-mono ${(formData.title?.length || 0) > LIMITS.TITLE ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                                            {formData.title?.length || 0}/{LIMITS.TITLE}
                                        </span>
                                    </div>
                                    <input 
                                        className="w-full border dark:border-slate-700 rounded-lg p-2.5 bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500/20" 
                                        placeholder="例如: React UseEffect Hook"
                                        maxLength={LIMITS.TITLE}
                                        value={formData.title}
                                        onChange={e => setFormData({...formData, title: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">语言</label>
                                    <select 
                                        className="w-full border dark:border-slate-700 rounded-lg p-2.5 bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500/20"
                                        value={formData.language}
                                        onChange={e => setFormData({...formData, language: e.target.value as any})}
                                    >
                                        {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1 h-[300px] flex flex-col">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-gray-500 uppercase">代码内容</label>
                                    <div className="flex gap-2 items-center">
                                        {(formData.code?.length || 0) > LIMITS.CODE && (
                                            <span className="flex items-center gap-1 text-[10px] text-red-500 font-bold animate-pulse">
                                                <AlertCircle className="h-3 w-3" /> 超出限制
                                            </span>
                                        )}
                                        <span className={`text-[10px] font-mono ${(formData.code?.length || 0) > LIMITS.CODE ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                                            {formData.code?.length || 0}/{LIMITS.CODE}
                                        </span>
                                    </div>
                                </div>
                                <textarea 
                                    className="flex-1 w-full bg-[#1e1e1e] text-gray-300 font-mono text-sm p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none custom-scrollbar leading-relaxed"
                                    placeholder="// Paste your code here..."
                                    spellCheck={false}
                                    value={formData.code}
                                    onChange={e => setFormData({...formData, code: e.target.value})}
                                />
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-gray-500 uppercase">描述 (可选)</label>
                                    <span className={`text-[10px] font-mono ${(formData.description?.length || 0) > LIMITS.DESC ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                                        {formData.description?.length || 0}/{LIMITS.DESC}
                                    </span>
                                </div>
                                <input 
                                    className="w-full border dark:border-slate-700 rounded-lg p-2.5 bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500/20" 
                                    placeholder="简要描述代码的用途..."
                                    maxLength={LIMITS.DESC}
                                    value={formData.description || ''}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-slate-800 transition-colors">取消</button>
                            <button onClick={handleSave} className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg font-bold flex items-center gap-2">
                                <Save className="h-4 w-4" /> 保存
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
