
import React, { useState, useEffect } from 'react';
import { 
  Database, Server, Cloud, ShieldCheck, Zap, 
  LayoutDashboard, Users, Image as ImageIcon, 
  Map as MapIcon, CloudSun, Bot, Disc, Code, Cpu,
  HardDrive, Activity, Globe, RefreshCcw, CalendarClock, Code2, Crown, ClipboardList
} from 'lucide-react';
import { userService } from '../services/userService';
import { photoService } from '../services/photoService';
import { snippetService } from '../services/snippetService';

export const GuidePage: React.FC = () => {
  const [stats, setStats] = useState({ users: 0, photos: 0, snippets: 0, storage: '0 KB' });

  useEffect(() => {
      const initStats = async () => {
          const u = userService.getUsers().length;
          let p = 0;
          let s = 0;
          try {
              const photos = await photoService.fetchPhotos();
              p = photos.length;
              const snippets = await snippetService.fetchSnippets();
              s = snippets.length;
          } catch (e) {
              console.warn("Failed to load stats", e);
          }
          
          // Rough estimate of local storage usage
          const size = encodeURI(JSON.stringify(localStorage)).length / 1024;
          setStats({ users: u, photos: p, snippets: s, storage: size.toFixed(1) + ' KB' });
      };

      initStats();
  }, []);

  const architecture = [
    {
      title: 'Cloudflare D1',
      desc: '关系型 SQL 数据库，用于存储核心结构化数据。',
      tech: 'SQLite-based',
      icon: Database,
      items: ['用户信息 (Users)', '登录审计 (Login Logs)', '照片数据 (Photos)', '代码片段 (Snippets)'],
      color: 'bg-blue-50 text-blue-600 border-blue-100 shadow-blue-50'
    },
    {
      title: 'Cloudflare KV',
      desc: '高性能键值存储，用于存储非结构化配置及缓存。',
      tech: 'Key-Value Store',
      icon: Cloud,
      items: ['系统配置 (Manifest)', '用户偏好 (Preferences)', '天气缓存 (Weather)', 'AI 会话设置 (AI Data)'],
      color: 'bg-orange-50 text-orange-600 border-orange-100 shadow-orange-50'
    }
  ];

  const modules = [
    { title: '控制台 (Dashboard)', icon: LayoutDashboard, desc: '集成 Recharts 图表，展示核心业务指标、用户段位积分榜及最近动态。', db: 'D1 / KV' },
    { title: '用户管理 (Users)', icon: Users, desc: '完整的 RBAC（角色权限控制）系统，支持头像压缩上传、分页搜索及状态管理。', db: 'D1' },
    { title: '登录审计 (Login Audit)', icon: ClipboardList, desc: '全维度会话追踪，实时监控在线状态（心跳检测）与地理位置。内置自动净化机制，记录超30条自动重置，极致轻量。', db: 'D1' },
    { title: '代码片段 (Snippets)', icon: Code2, desc: '开发者知识库，支持多语言语法高亮 (PrismJS) 及一键复制，Mac 风格窗口 UI。', db: 'D1' },
    { title: '大夏·炸金花 (Game)', icon: Crown, desc: '沉浸式宫廷风格卡牌对战，支持实时积分结算、皇位轮替机制及动态 NPC 对手。', db: 'D1' },
    { title: '照片墙 (Gallery)', icon: ImageIcon, desc: '瀑布流 Masonry 布局，支持原比例展示与大图预览模式，图片自动增量同步。', db: 'D1' },
    { title: '春节倒计时 (Countdown)', icon: CalendarClock, desc: '沉浸式中国红视觉风格，内置灯笼动画、春联与节日BGM，支持自定义日期倒数。', db: 'Local' },
    { title: '智能助手 (AI)', icon: Bot, desc: '集成 Google Gemini 3.0 与 DeepSeek V3，支持 Markdown 渲染及会话持久化。', db: 'KV' },
    { title: '可视化地图 (Maps)', icon: MapIcon, desc: '基于 ECharts 的 3D 地图，模拟业务全景、基础架构及安全威胁动态扫描。', db: 'KV' },
    { title: 'CD 音乐机 (Music)', icon: Disc, desc: '复古 CD 唱机 UI，支持全局播放、进度控制及歌单持久化播放。', db: 'Public' },
    { title: '实时天气 (Weather)', icon: CloudSun, desc: '调用 Open-Meteo 接口，提供 24 小时及 7 天预报，支持城市自定义订阅。', db: 'KV' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-16 animate-fade-in pb-20">
      {/* Hero Section */}
      <section className="text-center space-y-4 py-6">
        <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
          Admin Dashboard Pro <br/><span className="text-[var(--color-primary)]">系统数字架构说明</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-lg font-medium">
          这是一款纯前端驱动、Serverless 后端支撑的高级管理系统。采用“本地优先 + 云端增量同步”的现代 Web 开发范式。
        </p>
      </section>

      {/* Real-time Storage Monitor Panel */}
      <section className="bg-slate-900 dark:bg-slate-950 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden text-white border border-slate-800">
          <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
              <Globe className="h-64 w-64 animate-spin-slow" />
          </div>
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="md:col-span-1 space-y-2">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                      <Activity className="h-5 w-5 text-green-400" />
                      运行状态
                  </h2>
                  <p className="text-slate-400 text-xs leading-relaxed">
                      实时监测 D1 数据库节点与本地 IndexedDB/LocalStorage 的存储配额。
                  </p>
              </div>
              <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-4 gap-4">
                  {[
                      { label: '注册用户', value: stats.users, icon: Users, unit: 'Nodes' },
                      { label: '图库总量', value: stats.photos, icon: ImageIcon, unit: 'Assets' },
                      { label: '代码沉淀', value: stats.snippets, icon: Code2, unit: 'Blocks' },
                      { label: '本地占用', value: stats.storage, icon: HardDrive, unit: 'Quota' },
                  ].map((s, i) => (
                      <div key={i} className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:bg-white/10 transition-colors">
                          <s.icon className="h-5 w-5 text-indigo-400 mb-3" />
                          <div className="text-2xl font-black">{s.value}</div>
                          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{s.label} / {s.unit}</div>
                      </div>
                  ))}
              </div>
          </div>
      </section>

      {/* Database Architecture */}
      <section className="space-y-8">
        <div className="flex items-center gap-3">
          <Server className="h-6 w-6 text-indigo-500" />
          <h2 className="text-3xl font-black dark:text-white">数据持久化方案</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {architecture.map((arch, idx) => (
            <div key={idx} className={`p-10 rounded-[2.5rem] border-2 ${arch.color} dark:bg-slate-800/50 dark:border-slate-700 h-full flex flex-col transition-all hover:shadow-xl`}>
              <div className="flex items-center gap-5 mb-6">
                <div className={`p-4 rounded-3xl ${arch.color} bg-white dark:bg-slate-900 shadow-sm`}>
                  <arch.icon className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-black dark:text-white">{arch.title}</h3>
                  <span className="text-xs font-mono opacity-50 uppercase tracking-widest">{arch.tech}</span>
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-400 font-medium mb-8 italic">“{arch.desc}”</p>
              <div className="mt-auto">
                <h4 className="text-xs font-black uppercase mb-4 tracking-widest opacity-40">托管数据模块</h4>
                <div className="flex flex-wrap gap-2">
                  {arch.items.map((item, i) => (
                    <span key={i} className="px-4 py-2 bg-white dark:bg-slate-900 rounded-xl text-xs font-bold border border-white dark:border-slate-700 shadow-sm">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sync Mechanism */}
      <section className="p-10 rounded-[3rem] bg-indigo-600 text-white shadow-3xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
          <Zap className="h-48 w-48" />
        </div>
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="flex items-center gap-3">
            <Cpu className="h-6 w-6 text-yellow-300" />
            <h2 className="text-2xl font-black">智能增量同步 (Incremental Sync)</h2>
          </div>
          <p className="text-indigo-100 text-base leading-relaxed font-medium">
            系统通过 <code>cloudService.ts</code> 与 <code>api/sync.ts</code> 协同工作。每次操作先保存在浏览器的 <code>localStorage</code>，然后触发差异化 Push。
            系统拉取数据时会对比 <code>Manifest</code> 时间戳，仅下载已更新的模块，显著提升响应速度并降低带宽消耗。
          </p>
          <div className="flex items-center gap-4 pt-4">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(n => <div key={n} className="h-2 w-8 bg-white/40 rounded-full animate-pulse" style={{animationDelay: `${n * 200}ms`}}></div>)}
            </div>
            <span className="text-xs font-mono text-white/60 tracking-widest uppercase">Status: Auto-Sync Engine Online</span>
          </div>
        </div>
      </section>

      {/* Functionality Grid */}
      <section className="space-y-8">
        <div className="flex items-center gap-3">
          <Code className="h-6 w-6 text-green-500" />
          <h2 className="text-3xl font-black dark:text-white">功能定位与设计</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {modules.map((mod, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-2xl group-hover:bg-[var(--color-primary)] group-hover:text-white transition-colors">
                  <mod.icon className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-black px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-400">
                  {mod.db}
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white mb-3">{mod.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{mod.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech Stack Footer */}
      <section className="pt-16 border-t border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap justify-center gap-x-12 gap-y-6">
          {['React 18', 'TypeScript', 'Tailwind CSS', 'Cloudflare Pages', 'Gemini AI', 'D1 & KV'].map(tech => (
            <span key={tech} className="text-xs font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.3em]">{tech}</span>
          ))}
        </div>
      </section>
    </div>
  );
};
