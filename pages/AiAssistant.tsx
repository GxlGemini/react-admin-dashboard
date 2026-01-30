import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Trash2, Settings, X, Zap, MessageSquare } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { cloudService, STORAGE_KEYS } from '../services/cloudService';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type ModelProvider = 'gemini' | 'deepseek';

export const AiAssistant: React.FC = () => {
  const { t, isSyncing } = useApp();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Settings State
  const [provider, setProvider] = useState<ModelProvider>('deepseek');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [deepSeekKey, setDeepSeekKey] = useState('');

  // Initial Data Load (Sync aware)
  useEffect(() => {
    if (isSyncing) return;

    // Load AI Data from Cloud/Local Storage
    const aiData = JSON.parse(localStorage.getItem(STORAGE_KEYS.AI_DATA) || '{}');
    
    // Set Provider
    if (aiData.provider) setProvider(aiData.provider);
    else {
        // Fallback to old keys if valid
        const savedProvider = localStorage.getItem('ai_provider');
        if (savedProvider === 'deepseek' || savedProvider === 'gemini') setProvider(savedProvider as ModelProvider);
    }

    // Set History
    if (aiData.chatHistory && Array.isArray(aiData.chatHistory) && aiData.chatHistory.length > 0) {
        setMessages(aiData.chatHistory);
    } else {
        setMessages([{ role: 'assistant', content: '你好！我是你的智能助手。默认使用 DeepSeek 模型，您也可以在设置中切换为 Gemini。' }]);
    }

    // Load Keys (Local Only - never sync API keys to cloud for security)
    const savedKey = localStorage.getItem('deepseek_api_key');
    if (savedKey) setDeepSeekKey(savedKey);

  }, [isSyncing]);

  // Persist Data on Change
  useEffect(() => {
     if (messages.length > 0) {
         const aiData = { provider, chatHistory: messages };
         localStorage.setItem(STORAGE_KEYS.AI_DATA, JSON.stringify(aiData));
         
         // Debounce push to avoid excessive API calls during typing/streaming
         const timer = setTimeout(() => {
             // Differential Sync: Only push aiData
             cloudService.push(['aiData']);
         }, 2000);
         return () => clearTimeout(timer);
     }
  }, [messages, provider]);

  const saveSettings = () => {
      // Local Only
      if (deepSeekKey) localStorage.setItem('deepseek_api_key', deepSeekKey);
      
      // Syncable Provider
      const newVal = provider;
      const aiData = JSON.parse(localStorage.getItem(STORAGE_KEYS.AI_DATA) || '{}');
      aiData.provider = newVal;
      localStorage.setItem(STORAGE_KEYS.AI_DATA, JSON.stringify(aiData));
      
      // Differential Sync
      cloudService.push(['aiData']);

      setIsSettingsOpen(false);
      setMessages(prev => [...prev, { role: 'assistant', content: `**系统**: 已切换至 ${provider === 'gemini' ? 'Gemini 3.0 Flash' : 'DeepSeek V3'} 模型。` }]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleClearHistory = () => {
    const newMsgs = [{ role: 'assistant', content: '历史记录已清除。' } as Message];
    setMessages(newMsgs);
    // Force clear storage immediately
    const aiData = { provider, chatHistory: newMsgs };
    localStorage.setItem(STORAGE_KEYS.AI_DATA, JSON.stringify(aiData));
    
    // Differential Sync
    cloudService.push(['aiData']);
  };

  const callGemini = async (userMessage: string, historyMessages: Message[]) => {
      // Per instructions: API Key must come from process.env.API_KEY
      const apiKey = process.env.API_KEY; 
      
      if (!apiKey) {
          return "错误: 未配置 Gemini API Key (process.env.API_KEY missing)";
      }

      const ai = new GoogleGenAI({ apiKey });
      
      // Filter out system messages that might confuse the model
      const validHistory = historyMessages.filter(m => !m.content.startsWith('**系统**'));
      
      const history = validHistory.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        history: history,
      });

      const result = await chat.sendMessage({ message: userMessage });
      return result.text || 'No response generated.';
  };

  const callDeepSeek = async (userMessage: string, historyMessages: Message[]) => {
      if (!deepSeekKey) return "请在设置中配置 DeepSeek API Key。";

      // Filter out system messages
      const validHistory = historyMessages.filter(m => !m.content.startsWith('**系统**'));

      const history = validHistory.map(m => ({
          role: m.role,
          content: m.content
      }));

      const response = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${deepSeekKey}`
          },
          body: JSON.stringify({
              model: "deepseek-chat",
              messages: [
                  { role: "system", content: "You are a helpful assistant." },
                  ...history,
                  { role: "user", content: userMessage }
              ],
              stream: false
          })
      });

      if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `DeepSeek API Error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    const newMessages = [...messages, { role: 'user', content: userMsg } as Message];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      let responseText = '';
      if (provider === 'gemini') {
          responseText = await callGemini(userMsg, newMessages);
      } else {
          responseText = await callDeepSeek(userMsg, newMessages);
      }

      setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden animate-fade-in relative">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 p-4 bg-gray-50/50 dark:bg-slate-900/50 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${provider === 'gemini' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
             <Bot className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              {t('aiTitle')}
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${provider === 'gemini' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-purple-50 text-purple-600 border-purple-200'}`}>
                  {provider === 'gemini' ? 'Gemini 3.0' : 'DeepSeek V3'}
              </span>
            </h2>
            <p className="text-xs text-gray-400">Powered by LLM</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button 
             onClick={handleClearHistory} 
             className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" 
             title="Clear History"
           >
             <Trash2 className="h-5 w-5" />
           </button>
           <button 
             onClick={() => setIsSettingsOpen(true)}
             className="p-2 text-gray-400 hover:text-[var(--color-primary)] hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
           >
             <Settings className="h-5 w-5" />
           </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50 dark:bg-slate-900/50 custom-scrollbar">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <div key={idx} className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''} animate-fade-in-up`}>
              <div className={`
                flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-sm mt-1
                ${isUser ? 'bg-gray-200 dark:bg-slate-700' : provider === 'gemini' ? 'bg-blue-600' : 'bg-purple-600'}
              `}>
                {isUser ? <User className="h-5 w-5 text-gray-600 dark:text-gray-300" /> : <Sparkles className="h-5 w-5 text-white" />}
              </div>
              
              <div className={`
                max-w-[80%] rounded-2xl p-4 shadow-sm text-sm leading-relaxed
                ${isUser 
                  ? 'bg-white text-gray-800 dark:bg-slate-700 dark:text-white rounded-tr-none border border-gray-100 dark:border-slate-600' 
                  : 'bg-[var(--color-primary)] text-white rounded-tl-none shadow-md shadow-blue-500/10'
                }
              `}>
                <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="flex gap-4 animate-pulse">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${provider === 'gemini' ? 'bg-blue-600' : 'bg-purple-600'}`}>
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="bg-gray-200 dark:bg-slate-700 rounded-2xl rounded-tl-none p-4 flex items-center gap-2">
               <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
               <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
               <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700">
        <div className="relative flex items-end gap-2 bg-gray-50 dark:bg-slate-700/50 p-2 rounded-xl border border-gray-200 dark:border-slate-600 focus-within:ring-2 focus-within:ring-[var(--color-primary)] focus-within:border-[var(--color-primary)] transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('aiPlaceholder')}
            className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[44px] py-2.5 px-3 text-gray-800 dark:text-white placeholder:text-gray-400 text-sm"
            rows={1}
            style={{ height: 'auto', minHeight: '44px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className={`
              p-2.5 rounded-lg mb-0.5 transition-all duration-200 flex-shrink-0
              ${!input.trim() || loading 
                ? 'bg-gray-200 text-gray-400 dark:bg-slate-600 dark:text-slate-500 cursor-not-allowed' 
                : 'bg-[var(--color-primary)] text-white hover:opacity-90 shadow-md transform hover:-translate-y-0.5'
              }
            `}
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
        <p className="text-center text-[10px] text-gray-400 mt-2">
            AI 生成内容可能包含错误，请仔细甄别。
        </p>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
          <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-100 dark:border-slate-600">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <Settings className="h-5 w-5" />
                          {t('apiSettings')}
                      </h3>
                      <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                          <X className="h-5 w-5" />
                      </button>
                  </div>

                  <div className="space-y-6">
                      {/* Provider Selection */}
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">选择模型</label>
                          <div className="grid grid-cols-2 gap-3">
                              <button 
                                onClick={() => setProvider('deepseek')}
                                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${provider === 'deepseek' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300' : 'border-gray-200 dark:border-slate-700 hover:border-purple-200'}`}
                              >
                                  <MessageSquare className="h-6 w-6" />
                                  <span className="text-sm font-bold">DeepSeek</span>
                              </button>
                              <button 
                                onClick={() => setProvider('gemini')}
                                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${provider === 'gemini' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-slate-700 hover:border-blue-200'}`}
                              >
                                  <Zap className="h-6 w-6" />
                                  <span className="text-sm font-bold">Gemini</span>
                              </button>
                          </div>
                      </div>

                      {/* API Keys */}
                      {provider === 'deepseek' && (
                          <div className="animate-fade-in-up">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">DeepSeek API Key</label>
                              <input 
                                  type="password"
                                  value={deepSeekKey}
                                  onChange={(e) => setDeepSeekKey(e.target.value)}
                                  placeholder="sk-..."
                                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white transition-all"
                              />
                              <p className="text-xs text-gray-400 mt-1">Key 仅保存在本地浏览器</p>
                          </div>
                      )}
                      
                      {provider === 'gemini' && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50 animate-fade-in-up">
                              Gemini 模型使用系统环境变量中配置的 Key (<code>process.env.API_KEY</code>)，无需在此输入。
                          </div>
                      )}

                      <button 
                        onClick={saveSettings}
                        className="w-full py-2.5 bg-gray-900 hover:bg-black dark:bg-white dark:text-black dark:hover:bg-gray-100 text-white rounded-xl font-bold transition-all shadow-lg"
                      >
                          {t('save')}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
