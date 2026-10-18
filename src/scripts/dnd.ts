import type { AlbumData } from '../types';

export const SLOT_MIME = 'application/x-topsters-slot'; 
export const ALBUM_MIME = 'application/x-topsters-album'; 
export const ERASE_MIME = 'application/x-topsters-erase'; 

export function readAlbumData(raw: string): AlbumData | null {
    try {
        const a = JSON.parse(raw);
        if (
            typeof a?.title === 'string' &&
            typeof a?.artist === 'string' &&
            typeof a?.imageUrl === 'string' &&
            a.imageUrl.startsWith('https://')
        ) {
            return { title: a.title, artist: a.artist, imageUrl: a.imageUrl };
        }
    } catch {

    }
    return null;
}