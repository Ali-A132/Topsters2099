import type { AlbumData } from '../types';

const API_KEY = import.meta.env.VITE_LASTFM_API_KEY as string | undefined;
const ENDPOINT = 'https://ws.audioscrobbler.com/2.0/';

const PLACEHOLDER_HASH_PREFIX = '2a96cbd8b46e442f';

interface LfmImage {
    '#text': string;
    size: string;
}
interface LfmAlbum {
    name: string;
    artist: string;
    image?: LfmImage[];
}

const SIZE_PREFERENCE = ['extralarge', 'mega', 'large'];

function pickImage(images: LfmImage[] = []): string | null {
    for (const size of SIZE_PREFERENCE) {
        const url = images.find((i) => i.size === size)?.['#text'];
        if (url && !url.includes(PLACEHOLDER_HASH_PREFIX)) return url.replace(/^http:/, 'https:');
    }
    return null;
}

export async function searchAlbums(query: string, signal?: AbortSignal): Promise<AlbumData[]> {
    if (!API_KEY) {
        throw new Error('No Last.fm API key. Add VITE_LASTFM_API_KEY to .env.local and restart the dev server.');
    }

    const params = new URLSearchParams({
        method: 'album.search',
        album: query,
        api_key: API_KEY,
        format: 'json',
        limit: '50',
    });
    const res = await fetch(`${ENDPOINT}?${params}`, { signal });
    const data = await res.json().catch(() => null);
    if (!res.ok || data?.error) {
        throw new Error(data?.message ?? `Last.fm request failed (${res.status})`);
    }

    const albums: LfmAlbum[] = data?.results?.albummatches?.album ?? [];
    const seen = new Set<string>();
    const out: AlbumData[] = [];
    for (const a of albums) {
        const imageUrl = pickImage(a.image);
        const key = `${a.artist}|${a.name}`.toLowerCase();
        if (!imageUrl || seen.has(key)) continue; 
        seen.add(key);
        out.push({ title: a.name, artist: a.artist, imageUrl });
    }
    return out;
}
