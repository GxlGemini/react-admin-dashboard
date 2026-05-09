import React, { useState, useEffect } from 'react';
import { FileCode, LayoutDashboard, Database, Bot, Disc, Map as MapIcon, CloudSun, Crown, UserCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Prism from 'prismjs';

interface ImplModule {
  id: string;
  title: string;
  icon: React.ElementType;
  summary: string;
  highlights: string;
}

const modules: ImplModule[] = [
  {
    id: 'architecture',
    title: '系统架构与全局状态',
    icon: Database,
    summary: '应用采用 React 18 配合 Vite 构建纯前端架构（包含 PWA 支持）。路由使用 `react-router-dom` 实现前端拦截与鉴权，配合全局状态 Context（`AppContext`、`MusicContext`）管理多语言与媒体播放。',
    highlights: `
### 精彩代码：路由守卫 (ProtectedRoute)
在应用结构中，所有的受保护页面都被 \`ProtectedRoute\` 拦截。这里展示了利用高阶组件和 Context 实现轻量级前端鉴权的方案。

\`\`\`tsx
// App.tsx 中的路由守卫
const ProtectedRoute = ({ children }: PropsWithChildren) => {
  if (!authService.isAuthenticated()) {
    return <Navigate to={RoutePath.LOGIN} replace />;
  }
  return <>{children}</>;
};

// 配合基础服务验证：
export const authService = {
  isAuthenticated: () => {
    return !!localStorage.getItem('auth_token');
  }
};
\`\`\`
`
  },
  {
    id: 'dashboard_map',
    title: '全景大盘与心跳监控',
    icon: LayoutDashboard,
    summary: 'Dashboard 与 Map 页面通过 Echarts 构建中国地图与动态折线图，实现了全屏仪表盘体验，配合 MapSimulationService 实现了逼真的「心跳式」流数据和炫酷样式的图表刷新。',
    highlights: `
### 精彩代码：心跳日志生成引擎
\`mapSimulationService.ts\` 是整个可视化页面的数据流引擎，它在客户端实现了复杂的动态指标生成：

\`\`\`tsx
export class MapSimulationService {
  // 生成动态日志并模拟趋势数据
  public tick(viewMode: ViewMode, cityNames: string[]) {
    // 根据模式(基础设施/安全/业务)随机变动核心负载
    if (viewMode === 'business') {
        const delta = Math.floor(Math.random() * 20) - 8;
        this.activeUsers = Math.max(10000, this.activeUsers + delta);
    }
    
    // 生成折线图的 Sparkline 尾部数据
    const newVal = Math.floor(Math.random() * 50) + 20;
    this.trendData = [...this.trendData.slice(1), newVal];

    // 随机产生节点流转日志
    if (Math.random() > 0.4 && cityNames.length > 0) {
        // ...根据场景挑选模板如：'DDoS 流量清洗中'
        const newLog = { city, action, time, level, mode };
        this.logs = [newLog, ...this.logs].slice(0, 8);
    }
    return this.getState();
  }
}
\`\`\`

结合 Echarts 的 \`geo\`、\`effectScatter\` (涟漪节点) 与 \`lines\` (流光飞线)，达到了极佳的数据演示效果。
`
  },
  {
    id: 'golden_flower',
    title: '炸金花游戏',
    icon: Crown,
    summary: '“大夏·炸金花” 是一个复杂的带有状态机逻辑的 React 单页面应用。内部包含了发牌逻辑、牌型比较算法以及动画状态流转。',
    highlights: `
### 精彩代码：牌型比较与权重算法
其中最亮眼的是纯前端实现的扑克牌权重计算和基于高阶数组方法的比牌逻辑。

\`\`\`typescript
const evaluateHand = (cards: Card[]): { type: HandType, value: number, name: string } => {
  const sorted = [...cards].sort((a, b) => b.value - a.value);
  const isFlush = sorted.every(c => c.suit === sorted[0].suit);
  const isStraight = 
    (sorted[0].value - sorted[1].value === 1 && sorted[1].value - sorted[2].value === 1) ||
    (sorted[0].value === 14 && sorted[1].value === 3 && sorted[2].value === 2); // A32 case
  
  if (isFlush && isStraight) return { type: 'LEOPARD', value: 6000 + sorted[0].value, name: '同花顺' };
  if (sorted[0].value === sorted[1].value && sorted[1].value === sorted[2].value) 
    return { type: 'LEOPARD', value: 5000 + sorted[0].value, name: '豹子' };
  if (isFlush) return { type: 'FLUSH', value: 4000 + sorted[0].value, name: '金花' };
  if (isStraight) return { type: 'STRAIGHT', value: 3000 + sorted[0].value, name: '顺子' };
  
  // 对子判断
  if (sorted[0].value === sorted[1].value) return { type: 'PAIR', value: 2000 + sorted[0].value, name: '对子' };
  // 散牌
  return { type: 'HIGH_CARD', value: sorted[0].value, name: '散牌' };
};
\`\`\`
此段代码通过优雅的权值分配，将繁杂的逻辑转为了数学大小比较。
`
  },
  {
    id: 'ai_assistant',
    title: 'AI 助手对话',
    icon: Bot,
    summary: '集成了 `@google/genai` 的浏览器流式输出功能。利用 \`generateContentStream\` 接口，在前端无服务端代理的情况下直接处理流式 Markdown 数据，极大提升了响应的实时性。',
    highlights: `
### 精彩代码：GenAI 大模型客户端流式响应

\`\`\`tsx
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

const handleSend = async () => {
    // ... 添加用户消息占位
    const responseStream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: [...chatHistory, userMessage],
    });

    for await (const chunk of responseStream) {
        setMessages(prev => {
            const last = prev[prev.length - 1];
            // 实时追加生成字符，实现打字机效果
            return [...prev.slice(0, -1), { ...last, text: last.text + chunk.text }];
        });
    }
};
\`\`\`
配合 React 的不变性更新和 ReactMarkdown 渲染，使得完整的流式对话可以在几行核心代码内完成。
`
  },
  {
    id: 'music_player',
    title: '悬浮音乐播放器',
    icon: Disc,
    summary: '利用 `MusicContext` 提供全局引用，结合 `GlobalPlayerWidget` 组件。使得音乐播放状态可以在跨路由时保持播放、不中断。采用原生的 HTML5 Audio API。',
    highlights: `
### 精彩代码：跨路由状态留存
为了保证用户在切换页面（如从仪表盘切换到相册）时音乐不会停止，我们将 \`<audio>\` 元素放置于最顶层的 Provider 内。

\`\`\`tsx
export const MusicProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 播放控制
  const togglePlay = () => {
    if (audioRef.current) {
        isPlaying ? audioRef.current.pause() : audioRef.current.play();
        setIsPlaying(!isPlaying);
    }
  };

  return (
    <MusicContext.Provider value={{ currentTrack, isPlaying, togglePlay }}>
      {children}
      {/* 隐藏的全局音频标签 */}
      <audio ref={audioRef} src={currentTrack?.src} autoPlay />
    </MusicContext.Provider>
  );
};
\`\`\`
`
  },
  {
    id: 'global_auth',
    title: '基于拦截器的数据源',
    icon: UserCircle,
    summary: '由于是纯前端系统展示，许多组件使用 Simulated Service（模拟服务）替代了实际 API，在某些场景中使用了 localStorage 做持久化，模拟了一个真实的 CRUD 流程。',
    highlights: `
### 精彩代码：数据持久化 Service 包装
在 \`snippetService.ts\` 等处，展示了非常典型的本地化数据 mock 手法：

\`\`\`typescript
export const snippetService = {
  getSnippets: (): Snippet[] => {
    const raw = localStorage.getItem('app_snippets');
    if (!raw) return DEFAULT_SNIPPETS;
    return JSON.parse(raw);
  },
  
  saveSnippet: (snippet: Snippet) => {
    const current = snippetService.getSnippets();
    const updated = [snippet, ...current];
    localStorage.setItem('app_snippets', JSON.stringify(updated));
  }
};
\`\`\`
避免了复杂的 Redux 模板代码，直接利用 localStorage + Hook 完成数据流通。
`
  },
  {
    id: '3d_globe',
    title: '3D 交互地球仪',
    icon: MapIcon,
    summary: '使用 `react-globe.gl` 与 `three.js` 实现了酷炫的 3D 地球仪，展示了全球核心数据节点的连线与动画效果。',
    highlights: `
### 精彩代码：Globe 渲染与数据绑定
在指南页面中集成了一个非常惊艳的地球仪组件：

\`\`\`tsx
import Globe from 'react-globe.gl';

export const GlobeVisualization = () => {
  const [arcsData, setArcsData] = useState([]);

  useEffect(() => {
    // 构建地点之间的飞线连接数据
    const data = [
      { startLat: 39.9, startLng: 116.4, endLat: 37.7, endLng: -122.4, color: '#3b82f6' }
    ];
    setArcsData(data);
  }, []);

  return (
    <Globe
      globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
      arcsData={arcsData}
      arcColor="color"
      arcDashLength={0.4}
      arcDashGap={4}
      arcDashAnimateTime={1000}
      backgroundColor="rgba(0,0,0,0)"
    />
  );
};
\`\`\`
通过传递参数给 \`react-globe.gl\`，实现了动态流光飞线的效果。
`
  },
  {
    id: 'i18n',
    title: '多语言国际化',
    icon: BookOpen,
    summary: '系统级别支持中文与英文之间的无缝切换。实现方式未使用重量级的 i18next，而是自己实现了一个轻量的基于 Context 的多语言字典引擎。',
    highlights: `
### 精彩代码：极简 I18n 引擎
\`AppContext.tsx\` 结合 \`utils/i18n.ts\` :

\`\`\`tsx
const translations = {
  zh: { dashboard: '大盘概览', map: '全国监控' },
  en: { dashboard: 'Dashboard', map: 'Map View' },
};

export const AppProvider = ({ children }) => {
  const [language, setLanguage] = useState('zh');
  
  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <AppContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </AppContext.Provider>
  );
};
\`\`\`
通过自定义 hook \`useApp()\` 配合 \`t('key')\` 在任意组件内获取国际化文本，保持了极高的灵活性与执行效率。
`
  }
];

export const CodeImplementationPage: React.FC = () => {
  const [activeModuleId, setActiveModuleId] = useState(modules[0].id);

  const activeModule = modules.find(m => m.id === activeModuleId) || modules[0];

  // Effect to trigger PrismJS highlighting when active module changes
  useEffect(() => {
    Prism.highlightAll();
  }, [activeModuleId]);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800">
      {/* 左侧模块导航 */}
      <div className="w-1/4 max-w-xs border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-y-auto custom-scrollbar">
        <div className="p-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">功能实现清单</h2>
          <div className="space-y-1">
            {modules.map((m) => {
              const isActive = m.id === activeModuleId;
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveModuleId(m.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[var(--color-primary)] text-white shadow-sm'
                      : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400 dark:text-slate-400'}`} />
                  {m.title}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 右侧实现详情 */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar relative">
        <div className="max-w-4xl mx-auto animation-fade-in-up">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl dark:bg-blue-900/40 dark:text-blue-400">
              <activeModule.icon className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {activeModule.title}
            </h1>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 md:p-8 mb-8 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-[var(--color-primary)]"></div>
             <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">架构摘要</h3>
             <p className="text-gray-600 dark:text-slate-300 leading-relaxed text-lg">
                {activeModule.summary}
             </p>
          </div>

          <div className="prose prose-blue dark:prose-invert max-w-none prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-700 prose-pre:shadow-lg">
             <ReactMarkdown>{activeModule.highlights}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};
