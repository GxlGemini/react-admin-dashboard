import { LogItem, ViewMode } from '../types';

class MapSimulationService {
  // Persistent State
  private activeUsers: number = 12450;
  private threatLevel: number = 12;
  private systemLoad: number = 42;
  private logs: LogItem[] = [];
  private trendData: number[] = new Array(20).fill(0).map(() => Math.floor(Math.random() * 40) + 20);
  
  // Templates
  private readonly logTemplates: Record<ViewMode, {text: string, level: LogItem['level']}[]> = {
      business: [
          { text: '用户登录成功', level: 'info' },
          { text: '大额订单支付', level: 'info' },
          { text: '新用户注册', level: 'info' },
          { text: '商品加入购物车', level: 'info' },
          { text: '会员升级', level: 'info' }
      ],
      infra: [
          { text: '节点延迟 > 200ms', level: 'warn' },
          { text: '自动扩容完成', level: 'info' },
          { text: '缓存命中率下降', level: 'warn' },
          { text: '数据库连接池波动', level: 'warn' },
          { text: '服务健康检查: OK', level: 'info' }
      ],
      security: [
          { text: '拦截 SQL 注入攻击', level: 'error' },
          { text: '检测到异常登录', level: 'warn' },
          { text: 'DDoS 流量清洗中', level: 'error' },
          { text: '黑名单 IP 封禁', level: 'info' },
          { text: 'WAF 规则触发', level: 'warn' }
      ],
      globe: [
          { text: '区域网络状态良好', level: 'info' },
          { text: '全球数据同步中', level: 'info' },
          { text: '新节点接入请求', level: 'info' },
          { text: '跨境传输延迟增加', level: 'warn' },
          { text: '数据中心能耗正常', level: 'info' }
      ]
  };

  public getState() {
    return {
      activeUsers: this.activeUsers,
      threatLevel: this.threatLevel,
      systemLoad: this.systemLoad,
      logs: [...this.logs],
      trendData: [...this.trendData]
    };
  }

  public tick(viewMode: ViewMode, cityNames: string[]) {
    // 1. Update Metrics based on mode
    // We add randomness but keep it continuous based on previous value
    if (viewMode === 'business') {
        const delta = Math.floor(Math.random() * 20) - 8;
        this.activeUsers = Math.max(10000, this.activeUsers + delta);
    } else if (viewMode === 'infra') {
        const delta = Math.floor(Math.random() * 10) - 4;
        this.systemLoad = Math.min(100, Math.max(10, this.systemLoad + delta));
    } else {
        // Threat level fluctuates more randomly
        if (Math.random() > 0.8) {
            this.threatLevel = Math.floor(Math.random() * 100);
        }
    }

    // 2. Update Trend Data (Sparkline)
    const newVal = Math.floor(Math.random() * 50) + 20;
    this.trendData = [...this.trendData.slice(1), newVal];

    // 3. Generate Logs
    // 40% chance to generate a new log per tick
    if (Math.random() > 0.4 && cityNames.length > 0) {
        const randomCity = cityNames[Math.floor(Math.random() * cityNames.length)];
        const templates = this.logTemplates[viewMode];
        const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
        
        const newLog: LogItem = {
            id: Date.now().toString() + Math.random(),
            city: randomCity,
            action: randomTemplate.text,
            time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
            level: randomTemplate.level,
            mode: viewMode
        };
        // Keep last 8 logs
        this.logs = [newLog, ...this.logs].slice(0, 8);
    }

    return this.getState();
  }
}

// Export as Singleton
export const mapSimulationService = new MapSimulationService();