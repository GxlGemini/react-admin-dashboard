
import { Snippet } from '../types';

export const snippetService = {
  fetchSnippets: async (): Promise<Snippet[]> => {
    try {
      const res = await fetch('/api/snippets');
      if (!res.ok) throw new Error('Failed to fetch snippets');
      return await res.json();
    } catch (e) {
      console.error(e);
      // Fallback for dev/demo if API fails
      return [];
    }
  },

  saveSnippet: async (snippet: Partial<Snippet>): Promise<void> => {
    const payload = {
        ...snippet,
        id: snippet.id || Date.now().toString(),
        createdAt: snippet.createdAt || Date.now(),
        updatedAt: Date.now()
    };
    
    try {
      const res = await fetch('/api/snippets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Save failed');
    } catch (e) {
      console.error("API error saving snippet", e);
      throw e;
    }
  },

  deleteSnippet: async (id: string) => {
    try {
      await fetch(`/api/snippets?id=${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error("API error deleting snippet", e);
    }
  }
};
