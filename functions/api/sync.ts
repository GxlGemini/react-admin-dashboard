
// --- Type Definitions for Cloudflare Bindings ---

interface KVNamespace {
  get(key: string, options?: { type: 'text' | 'json' | 'arrayBuffer' | 'stream' }): Promise<any>;
  put(key: string, value: string | ReadableStream | ArrayBuffer | FormData, options?: any): Promise<void>;
  delete(key: string): Promise<void>;
}

interface D1Result<T = any> {
  results: T[];
  success: boolean;
  meta: any;
  error?: string;
}

interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = any>(colName?: string): Promise<T | null>;
  run<T = any>(): Promise<D1Result<T>>;
  all<T = any>(): Promise<D1Result<T>>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = any>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

interface Env {
  ADMIN_KV: KVNamespace;
  DB: D1Database;
}

interface Context {
  request: Request;
  env: Env;
}

// --- Configuration ---

const META_KEY = 'META_MANIFEST';

// Mapping: API Key -> KV Key
// Ensure preferences are mapped here for KV persistence
const KV_KEYS_MAP: Record<string, string> = {
  notifications: 'DATA_NOTIFICATIONS',
  stats: 'DATA_STATS',
  preferences: 'DATA_PREFS', // Stores theme, language, and profileOpacity
  weather: 'DATA_WEATHER',
  mapConfig: 'DATA_MAP',
  aiData: 'DATA_AI',
  countdown: 'DATA_COUNTDOWN',
};

// --- Handlers ---

export const onRequestGet = async (context: Context) => {
  const { env } = context;
  
  if (!env.ADMIN_KV || !env.DB) {
      return new Response(JSON.stringify({ error: 'Missing KV or D1 bindings' }), { status: 500 });
  }

  const url = new URL(context.request.url);
  const mode = url.searchParams.get('mode'); // 'manifest' or null
  const keysParam = url.searchParams.get('keys');

  try {
    // 1. Manifest Mode: Pure KV read
    if (mode === 'manifest') {
        const manifest = await env.ADMIN_KV.get(META_KEY, { type: 'json' });
        return new Response(JSON.stringify(manifest || {}), { headers: { 'Content-Type': 'application/json' } });
    }

    // 2. Fetch Data Mode
    const requestedKeys = keysParam ? keysParam.split(',') : ['users', 'activities', ...Object.keys(KV_KEYS_MAP)];
    const responseData: any = {};

    const tasks = requestedKeys.map(async (key) => {
        // --- RELATIONAL D1 QUERIES ---
        
        if (key === 'users') {
            // JOIN Logic: Merge users (Auth) + user_profiles (Details)
            // UPDATED: Select individual cover images
            const { results } = await env.DB.prepare(`
                SELECT 
                    u.id, u.username, u.email, u.password, u.role, u.status, u.created_at as createdAt,
                    p.nickname, p.avatar, p.points, 
                    p.last_check_in as lastCheckIn, 
                    p.cover_image_1, p.cover_image_2, p.cover_image_3,
                    p.bio, p.tags, p.socials
                FROM users u
                LEFT JOIN user_profiles p ON u.id = p.user_id
                ORDER BY u.updated_at DESC
            `).all();
            
            // Parse JSON fields and merge images
            responseData[key] = results.map((u: any) => {
                let coverImages: string[] = [];
                if (u.cover_image_1) coverImages.push(u.cover_image_1);
                if (u.cover_image_2) coverImages.push(u.cover_image_2);
                if (u.cover_image_3) coverImages.push(u.cover_image_3);

                let tags = [];
                let socials = {};

                try { tags = u.tags ? JSON.parse(u.tags) : []; } catch(e) {}
                try { socials = u.socials ? JSON.parse(u.socials) : {}; } catch(e) {}

                // Clean up raw columns from response object
                const { cover_image_1, cover_image_2, cover_image_3, ...cleanUser } = u;

                return {
                    ...cleanUser,
                    coverImages,
                    tags,
                    socials
                };
            });
        } 
        
        else if (key === 'activities') {
            const { results } = await env.DB.prepare(`
                SELECT 
                    l.id, 
                    l.user_id as userId, 
                    l.action, 
                    l.details, 
                    l.timestamp,
                    u.username,
                    p.avatar as userAvatar,
                    p.nickname
                FROM activity_logs l
                LEFT JOIN users u ON l.user_id = u.id
                LEFT JOIN user_profiles p ON l.user_id = p.user_id
                ORDER BY l.timestamp DESC
                LIMIT 100
            `).all();
            responseData[key] = results;
        }

        // --- KV QUERIES ---
        else if (KV_KEYS_MAP[key]) {
            try {
                const data = await env.ADMIN_KV.get(KV_KEYS_MAP[key], { type: 'json' });
                responseData[key] = data;
            } catch (e) {
                responseData[key] = null;
            }
        }
    });

    await Promise.all(tasks);

    // Include manifest
    const manifest = await env.ADMIN_KV.get(META_KEY, { type: 'json' });
    responseData._manifest = manifest;

    return new Response(JSON.stringify(responseData), { headers: { 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const onRequestPost = async (context: Context) => {
  const { env } = context;
  if (!env.ADMIN_KV || !env.DB) {
      return new Response(JSON.stringify({ error: 'System Error: D1 Database binding (DB) is missing. Please check your Cloudflare Pages settings.' }), { status: 500 });
  }

  try {
    const body = await context.request.json() as any;
    
    // Get current manifest
    let manifest: Record<string, number> = await env.ADMIN_KV.get(META_KEY, { type: 'json' }) || {};
    const now = Date.now();
    
    const kvPromises: Promise<void>[] = [];
    const d1Statements: D1PreparedStatement[] = [];

    for (const [key, data] of Object.entries(body)) {
        if (data === undefined || data === null) continue;
        manifest[key] = now;

        // --- RELATIONAL WRITES (UPSERT + DELETE) ---

        if (key === 'users') {
            const users = Array.isArray(data) ? data : [];
            for (const u of users) {
                const tagsStr = JSON.stringify(Array.isArray(u.tags) ? u.tags : []);
                const socialsStr = JSON.stringify(u.socials || {});
                
                // UPDATED: Split coverImages array into 3 columns
                const covers = Array.isArray(u.coverImages) ? u.coverImages : [];
                const img1 = covers[0] || null;
                const img2 = covers[1] || null;
                const img3 = covers[2] || null;

                // 1. Update Core User Info (users Table)
                d1Statements.push(env.DB.prepare(`
                    INSERT INTO users (id, username, email, password, role, status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        username=excluded.username, 
                        email=excluded.email, 
                        password=excluded.password, 
                        role=excluded.role, 
                        status=excluded.status, 
                        updated_at=excluded.updated_at
                `).bind(
                    u.id, 
                    u.username, 
                    u.email || null, 
                    u.password, 
                    u.role || 'user', 
                    u.status || 'active', 
                    u.createdAt || new Date().toISOString().split('T')[0], 
                    now
                ));

                // 2. Update Profile Info (user_profiles Table)
                // UPDATED: Bind 3 image columns
                d1Statements.push(env.DB.prepare(`
                    INSERT INTO user_profiles (user_id, nickname, avatar, points, last_check_in, cover_image_1, cover_image_2, cover_image_3, bio, tags, socials, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(user_id) DO UPDATE SET
                        nickname=excluded.nickname,
                        avatar=excluded.avatar, 
                        points=excluded.points,
                        last_check_in=excluded.last_check_in, 
                        cover_image_1=excluded.cover_image_1,
                        cover_image_2=excluded.cover_image_2,
                        cover_image_3=excluded.cover_image_3,
                        bio=excluded.bio, 
                        tags=excluded.tags, 
                        socials=excluded.socials, 
                        updated_at=excluded.updated_at
                `).bind(
                    u.id, // Maps to user_id
                    u.nickname || null, 
                    u.avatar || null, 
                    u.points || 0, 
                    u.lastCheckIn || null, 
                    img1, img2, img3,
                    u.bio || '', 
                    tagsStr,        
                    socialsStr,     
                    now
                ));
            }
        }

        else if (key === 'activities') {
            const logs = Array.isArray(data) ? data : [];
            for (const l of logs) {
                d1Statements.push(env.DB.prepare(`
                    INSERT INTO activity_logs (id, user_id, action, details, timestamp, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET updated_at=excluded.updated_at
                `).bind(
                    l.id, l.userId, l.action, l.details || null, l.timestamp, now
                ));
            }
        }

        // --- KV WRITES ---
        else if (KV_KEYS_MAP[key]) {
            // e.g. Preferences (opacity) goes here
            kvPromises.push(env.ADMIN_KV.put(KV_KEYS_MAP[key], JSON.stringify(data)));
        }
    }

    // Execute KV Updates
    kvPromises.push(env.ADMIN_KV.put(META_KEY, JSON.stringify(manifest)));
    const kvTask = Promise.all(kvPromises);
    
    // Execute D1 Batch
    let d1Result;
    if (d1Statements.length > 0) {
        d1Result = await env.DB.batch(d1Statements);
    }
    
    await kvTask;

    return new Response(JSON.stringify({ success: true, manifest, d1Stats: d1Statements.length }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error("Sync Error:", err);
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), { status: 500 });
  }
};
