
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
  DB: D1Database;
}

export const onRequestGet = async (context: any) => {
  const { env } = context;
  try {
    // Return all snippets ordered by update time
    const { results } = await env.DB.prepare("SELECT * FROM snippets ORDER BY updated_at DESC").all();
    
    // Parse tags (JSON string -> Array)
    const parsedResults = results.map((s: any) => ({
        ...s,
        tags: s.tags ? JSON.parse(s.tags) : []
    }));

    return new Response(JSON.stringify(parsedResults), { 
        headers: { "Content-Type": "application/json" } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

export const onRequestPost = async (context: any) => {
  const { request, env } = context;
  try {
    const snippet = await request.json();
    const { id, title, code, language, description, tags, createdAt } = snippet;
    const now = Date.now();
    const tagsStr = JSON.stringify(tags || []);
    
    // Upsert (Insert or Replace)
    await env.DB.prepare(
      `INSERT INTO snippets (id, title, code, language, description, tags, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
       title=excluded.title, code=excluded.code, language=excluded.language, 
       description=excluded.description, tags=excluded.tags, updated_at=excluded.updated_at`
    ).bind(
        id || Date.now().toString(), 
        title, 
        code, 
        language, 
        description || '', 
        tagsStr, 
        createdAt || now, 
        now
    ).run();
    
    return new Response(JSON.stringify({ success: true }), { 
        headers: { "Content-Type": "application/json" } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

export const onRequestDelete = async (context: any) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  
  try {
    if (id) {
        await env.DB.prepare("DELETE FROM snippets WHERE id = ?").bind(id).run();
    } 
    return new Response(JSON.stringify({ success: true }), { 
        headers: { "Content-Type": "application/json" } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
