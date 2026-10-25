export type DropPayload = { file: File } | { url: string };

const MAX_SIDE = 300; 

export function readDropPayload(dt: DataTransfer): DropPayload | null {
    const file = Array.from(dt.files).find((f) => f.type.startsWith('image/'));
    if (file) return { file };

    const html = dt.getData('text/html');
    if (html) {
        const src = new DOMParser().parseFromString(html, 'text/html').querySelector('img')?.getAttribute('src');
        if (src) return { url: src };
    }
    const uri = dt
        .getData('text/uri-list')
        .split(/\r?\n/)
        .find((line) => line && !line.startsWith('#'));
    return uri ? { url: uri } : null;
}

function normalizeUrl(raw: string): string {
    let url = raw.trim();
    if (url.startsWith('//')) url = `https:${url}`;
    if (url.startsWith('http://')) url = `https://${url.slice('http://'.length)}`; 
    if (url.startsWith('https://') || url.startsWith('data:image/')) return url;
    throw new Error("That doesn't look like an image link.");
}

function loadImage(src: string, cors: boolean): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        if (cors) img.crossOrigin = 'anonymous'; 
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('image failed to load'));
        img.src = src;
    });
}

function toDataUrl(img: HTMLImageElement, maxSide = MAX_SIDE): string {
    const nw = img.naturalWidth || maxSide;
    const nh = img.naturalHeight || maxSide;
    const scale = Math.min(1, maxSide / Math.max(nw, nh));
    const w = Math.max(1, Math.round(nw * scale));
    const h = Math.max(1, Math.round(nh * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Your browser could not process that image.');
    ctx.fillStyle = '#fff'; 
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.85);
}

export async function resolveDroppedImage(payload: DropPayload): Promise<string> {
    if ('file' in payload) {
        const objectUrl = URL.createObjectURL(payload.file);
        try {
            return toDataUrl(await loadImage(objectUrl, false));
        } catch {
            throw new Error("Couldn't read that image file.");
        } finally {
            URL.revokeObjectURL(objectUrl);
        }
    }

    const url = normalizeUrl(payload.url);
    try {
        return toDataUrl(await loadImage(url, true));
    } catch {
    }
    try {
        await loadImage(url, false); 
        return url;
    } catch {
        throw new Error("Couldn't load that image.");
    }
}

const MAX_FILE_BYTES = 20 * 1024 * 1024;

export async function readImageFile(file: File, maxSide: number): Promise<string> {
    if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
    if (file.size > MAX_FILE_BYTES) throw new Error('That image is too large (20 MB max).');
    const objectUrl = URL.createObjectURL(file);
    try {
        return toDataUrl(await loadImage(objectUrl, false), maxSide);
    } catch {
        throw new Error("Couldn't read that image file.");
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}