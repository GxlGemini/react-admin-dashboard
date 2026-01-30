
interface D1Result<T = any> {
  results: T[];
  success: boolean;
  meta: any;
  error?: string;
}

interface D1Database {
  prepare(query: string): any;
}

interface Env {
  DB: D1Database;
}

// --- Translation Maps ---

const REGION_MAP: Record<string, string> = {
    // China Provinces
    'Guangdong': '广东省', 'Beijing': '北京市', 'Shanghai': '上海市', 'Tianjin': '天津市', 'Chongqing': '重庆市',
    'Zhejiang': '浙江省', 'Jiangsu': '江苏省', 'Sichuan': '四川省', 'Hubei': '湖北省', 'Fujian': '福建省',
    'Shandong': '山东省', 'Henan': '河南省', 'Hebei': '河北省', 'Hunan': '湖南省', 'Anhui': '安徽省',
    'Jiangxi': '江西省', 'Guangxi': '广西壮族自治区', 'Shaanxi': '陕西省', 'Shanxi': '山西省', 'Yunnan': '云南省',
    'Guizhou': '贵州省', 'Liaoning': '辽宁省', 'Jilin': '吉林省', 'Heilongjiang': '黑龙江省', 'Hainan': '海南省',
    'Gansu': '甘肃省', 'Qinghai': '青海省', 'Ningxia': '宁夏回族自治区', 'Xinjiang': '新疆维吾尔自治区',
    'Tibet': '西藏自治区', 'Inner Mongolia': '内蒙古自治区',
    'Hong Kong': '香港', 'Macau': '澳门', 'Taiwan': '台湾',
    // International
    'United States': '美国', 'Japan': '日本', 'Singapore': '新加坡', 'United Kingdom': '英国',
    'Germany': '德国', 'France': '法国', 'Russia': '俄罗斯', 'Canada': '加拿大'
};

const CITY_MAP: Record<string, string> = {
    'Shenzhen': '深圳市', 'Guangzhou': '广州市', 'Dongguan': '东莞市', 'Foshan': '佛山市',
    'Hangzhou': '杭州市', 'Ningbo': '宁波市', 'Wenzhou': '温州市',
    'Nanjing': '南京市', 'Suzhou': '苏州市', 'Wuxi': '无锡市',
    'Chengdu': '成都市', 'Wuhan': '武汉市', 'Changsha': '长沙市',
    'Zhengzhou': '郑州市', 'Xi\'an': '西安市', 'Jinan': '济南市', 'Qingdao': '青岛市',
    'Fuzhou': '福州市', 'Xiamen': '厦门市', 'Hefei': '合肥市', 'Shenyang': '沈阳市',
    'Dalian': '大连市', 'Harbin': '哈尔滨市', 'Kunming': '昆明市', 'Nanning': '南宁市'
};

const ISP_MAP: Record<string, string> = {
    'China Telecom': '中国电信', 'Chinanet': '中国电信', 'China169': '中国联通',
    'China Unicom': '中国联通', 'Unicom': '中国联通',
    'China Mobile': '中国移动', 'CMNET': '中国移动',
    'China Education and Research Network': '中国教育网', 'CERNET': '中国教育网',
    'Tencent': '腾讯云', 'Alibaba': '阿里云', 'Aliyun': '阿里云', 'Taobao': '阿里云',
    'Google': '谷歌云', 'Google Cloud': '谷歌云',
    'Cloudflare': 'Cloudflare', 
    'Amazon': '亚马逊 AWS', 'AWS': '亚马逊 AWS',
    'Microsoft': '微软云', 'Azure': '微软 Azure',
    'PCCW': '电讯盈科', 'HKT': '香港电讯', 'HGC': '环球全域电讯',
    'HKBN': '香港宽频', 'SmartTone': '数码通'
};

const translate = (text: string, map: Record<string, string>): string => {
    if (!text) return '';
    // 1. Direct Match
    if (map[text]) return map[text];
    
    // 2. Partial Match (e.g. "China Telecom Guangdong" contains "China Telecom")
    for (const [k, v] of Object.entries(map)) {
        if (text.toLowerCase().includes(k.toLowerCase())) return v;
    }
    return text;
};

// GET: Retrieve logs
export const onRequestGet = async (context: any) => {
  const { env } = context;
  try {
    const { results } = await env.DB.prepare(
        "SELECT * FROM login_logs ORDER BY last_accessed DESC, created_at DESC LIMIT 100"
    ).all();

    const mappedResults = results.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        username: row.username,
        avatar: row.avatar,
        rankTitle: row.rank_title,
        ip: row.ip,
        location: row.location,
        isp: row.isp,
        os: row.os,
        browser: row.browser,
        loginTime: row.login_time,
        lastAccessed: row.last_accessed, 
        durationMs: row.duration_ms, // New field
        createdAt: row.created_at
    }));

    return new Response(JSON.stringify(mappedResults), { 
        headers: { "Content-Type": "application/json" } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

// POST: Create log entry
export const onRequestPost = async (context: any) => {
  const { request, env } = context;
  try {
    const body = await request.json();
    const { userId, username, avatar, rankTitle, os, browser } = body;
    
    // --- Optimized Rolling Delete Logic ---
    // Instead of deleting ALL logs when count >= 30, we delete logs that fall outside the latest 30.
    // We use a subquery to find the IDs we want to keep, and delete the rest.
    // SQLite syntax: DELETE FROM table WHERE id NOT IN (SELECT id FROM table ORDER BY created_at DESC LIMIT 30)
    await env.DB.prepare(`
        DELETE FROM login_logs 
        WHERE id NOT IN (
            SELECT id FROM login_logs ORDER BY created_at DESC LIMIT 30
        )
    `).run();

    // IP & Location Extraction
    const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || '127.0.0.1';
    
    let location = '未知地区';
    let isp = '未知运营商';

    if (request.cf) {
        // Translate ISP
        if (request.cf.asOrganization) {
            isp = translate(request.cf.asOrganization, ISP_MAP);
        }

        // Translate and construct Location: "Province · City"
        const rawRegion = request.cf.region;
        const rawCity = request.cf.city;
        const rawCountry = request.cf.country;

        const cnRegion = translate(rawRegion, REGION_MAP);
        
        let cnCity = '';
        if (rawCity && rawCity !== rawRegion) {
            cnCity = translate(rawCity, CITY_MAP);
            // Fallback: If no map match, and it looks like a city name, use it directly
            if (cnCity === rawCity && !/[^\u0000-\u00ff]/.test(rawCity)) {
                 // Keep English if not mapped
            }
        }

        const parts = [];
        if (cnRegion) parts.push(cnRegion);
        if (cnCity) parts.push(cnCity);
        
        if (parts.length === 0 && rawCountry) {
            parts.push(translate(rawCountry, REGION_MAP));
        }

        if (parts.length > 0) {
            location = parts.join(' · ');
        }
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const isoTime = now.toISOString();
    const createdAt = now.getTime();

    // Init duration_ms to 0
    await env.DB.prepare(
      `INSERT INTO login_logs (id, user_id, username, avatar, rank_title, ip, location, isp, os, browser, login_time, last_accessed, duration_ms, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
    ).bind(
        id, userId, username, avatar || '', rankTitle, ip, location, isp, os, browser, isoTime, isoTime, createdAt
    ).run();
    
    return new Response(JSON.stringify({ success: true, id }), { 
        headers: { "Content-Type": "application/json" } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

// PUT: Heartbeat - Calculates and updates session duration
export const onRequestPut = async (context: any) => {
    const { request, env } = context;
    try {
        const body = await request.json();
        const { id } = body; 
        if (!id) throw new Error("Missing session ID");
        
        const nowObj = new Date();
        const nowIso = nowObj.toISOString();
        const nowTs = nowObj.getTime();

        // 1. Fetch the original login_time to calculate precise duration
        const record = await env.DB.prepare("SELECT login_time FROM login_logs WHERE id = ?").bind(id).first();
        
        if (!record) {
             return new Response(JSON.stringify({ error: "Session not found" }), { status: 404 });
        }

        const loginTimeMs = new Date(record.login_time).getTime();
        const duration = Math.max(0, nowTs - loginTimeMs);

        // 2. Update last_accessed AND duration_ms
        await env.DB.prepare(
            "UPDATE login_logs SET last_accessed = ?, duration_ms = ? WHERE id = ?"
        ).bind(nowIso, duration, id).run();

        return new Response(JSON.stringify({ success: true, duration }), { headers: { "Content-Type": "application/json" } });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};
