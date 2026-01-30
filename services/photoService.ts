
import { Photo } from '../types';

export const photoService = {
  // Fetch from D1 via API
  fetchPhotos: async (): Promise<Photo[]> => {
    try {
      const res = await fetch('/api/photos');
      if (!res.ok) throw new Error('Failed to fetch photos');
      return await res.json();
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  addPhoto: async (photo: Omit<Photo, 'id' | 'createdAt'>): Promise<Photo> => {
    const newPhoto: Photo = {
      ...photo,
      id: Date.now().toString(),
      createdAt: Date.now(),
      width: photo.width || 0,
      height: photo.height || 0
    };
    
    try {
      const res = await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPhoto)
      });
      if (!res.ok) throw new Error('Upload failed');
    } catch (e) {
      console.error("API error adding photo", e);
      throw e;
    }
    return newPhoto;
  },

  deletePhoto: async (id: string) => {
    try {
      await fetch(`/api/photos?id=${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error("API error deleting photo", e);
    }
  },

  deletePhotos: async (ids: string[]) => {
    try {
      await fetch('/api/photos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
    } catch (e) {
      console.error("API error bulk deleting photos", e);
    }
  }
};
