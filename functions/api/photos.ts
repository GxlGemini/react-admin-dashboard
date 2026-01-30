
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
    // Return all photos ordered by creation time
    const { results } = await env.DB.prepare("SELECT * FROM photos ORDER BY created_at DESC").all();
    return new Response(JSON.stringify(results), { 
        headers: { "Content-Type": "application/json" } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

export const onRequestPost = async (context: any) => {
  const { request, env } = context;
  try {
    const photo = await request.json();
    const { id, url, title, description, category, width, height, createdAt } = photo;
    const now = Date.now();
    
    // Insert new photo
    await env.DB.prepare(
      `INSERT INTO photos (id, url, title, description, category, width, height, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
        id, 
        url, 
        title, 
        description || '', 
        category, 
        width || 0, 
        height || 0, 
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
        // Single delete
        await env.DB.prepare("DELETE FROM photos WHERE id = ?").bind(id).run();
    } else {
        // Bulk delete via body
        const body = await request.json();
        if (body.ids && Array.isArray(body.ids)) {
            const stmts = body.ids.map((pid: string) => 
                env.DB.prepare("DELETE FROM photos WHERE id = ?").bind(pid)
            );
            await env.DB.batch(stmts);
        }
    }
    return new Response(JSON.stringify({ success: true }), { 
        headers: { "Content-Type": "application/json" } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
