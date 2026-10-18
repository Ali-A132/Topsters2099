import { downloadBlob, safeFileName } from './download';

const EXPORT_SCALE = 2; 
const JPEG_QUALITY = 0.92;

const isTransparent = (color: string) => color === 'transparent' || color === 'rgba(0, 0, 0, 0)';

const parseCssUrl = (bg: string): string | null => /url\(\s*(['"]?)(.*?)\1\s*\)/.exec(bg)?.[2] ?? null;

function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Could not load ${url}`));
        img.src = url;
    });
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
    const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const sw = w / s;
    const sh = h / s;
    ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}

export async function exportChartAsJpg(wrapper: HTMLElement, chartName: string): Promise<void> {
    const box = wrapper.getBoundingClientRect();
    const cssScale = box.width / wrapper.offsetWidth || 1;
    const local = (r: DOMRect) => ({
        x: (r.left - box.left) / cssScale,
        y: (r.top - box.top) / cssScale,
        w: r.width / cssScale,
        h: r.height / cssScale,
    });

    const cards = Array.from(wrapper.querySelectorAll<HTMLElement>('.card')).filter((c) => c.offsetParent !== null);
    const tiles = cards.map((card) => {
        const inner = card.querySelector<HTMLElement>('.inner');
        const innerStyle = inner ? getComputedStyle(inner) : null;
        return {
            card: local(card.getBoundingClientRect()),
            cardBg: getComputedStyle(card).backgroundColor,
            inner: inner ? local(inner.getBoundingClientRect()) : null,
            url: innerStyle ? parseCssUrl(innerStyle.backgroundImage) : null,
        };
    });

    const urls = [...new Set(tiles.flatMap((t) => (t.url ? [t.url] : [])))];
    const loaded = await Promise.allSettled(urls.map(loadImage));
    const images = new Map<string, HTMLImageElement>();
    let failed = 0;
    loaded.forEach((r, i) => (r.status === 'fulfilled' ? images.set(urls[i], r.value) : failed++));
    if (failed) {
        throw new Error(
            `Couldn't load ${failed} cover image${failed > 1 ? 's' : ''} for the download. ` +
                `The image host probably doesn't allow it (CORS). Check the browser console for details.`,
        );
    }

    const width = wrapper.offsetWidth;
    const height = wrapper.offsetHeight;
    const outside = document.getElementById('titles');
    const below = outside && !wrapper.contains(outside) && outside.offsetParent !== null ? outside : null;
    const belowItems = below ? Array.from(below.querySelectorAll('li')) : [];
    const BELOW_PAD = 12;
    const belowTop = belowItems[0]?.getBoundingClientRect().top ?? 0;
    const belowHeight = belowItems.length
        ? belowItems[belowItems.length - 1].getBoundingClientRect().bottom - belowTop + BELOW_PAD * 2
        : 0;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * EXPORT_SCALE);
    canvas.height = Math.round((height + belowHeight) * EXPORT_SCALE);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Your browser could not create a canvas for the download.');
    ctx.scale(EXPORT_SCALE, EXPORT_SCALE);
    ctx.imageSmoothingQuality = 'high';

    const bg = getComputedStyle(wrapper).backgroundColor;
    ctx.fillStyle = isTransparent(bg) ? '#000000' : bg;
    ctx.fillRect(0, 0, width, height + belowHeight);

    for (const t of tiles) {
        if (!isTransparent(t.cardBg)) {
            ctx.fillStyle = t.cardBg;
            ctx.fillRect(t.card.x, t.card.y, t.card.w, t.card.h);
        }
        if (!t.inner) continue;
        const img = t.url ? images.get(t.url) : undefined;
        if (img) {
            drawCover(ctx, img, t.inner.x, t.inner.y, t.inner.w, t.inner.h);
        } else {
            ctx.fillStyle = '#000000';
            ctx.fillRect(t.inner.x, t.inner.y, t.inner.w, t.inner.h);
        }
    }

    const drawTitle = (li: HTMLLIElement, originX: number, midY: number, k: number) => {
        const liLeft = li.getBoundingClientRect().left;
        const numEl = li.querySelector<HTMLElement>('.title-num');
        const nameEl = li.querySelector<HTMLElement>('input, .title-name');
        const text = (nameEl instanceof HTMLInputElement ? nameEl.value : nameEl?.textContent)?.trim();
        const s = getComputedStyle(li);
        ctx.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
        ctx.fillStyle = s.color;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        const xOf = (el: HTMLElement) => originX + (el.getBoundingClientRect().left - liLeft) / k;
        if (numEl?.textContent) ctx.fillText(numEl.textContent, xOf(numEl), midY);
        if (text && nameEl) ctx.fillText(text, xOf(nameEl), midY);
    };

    const titles = wrapper.querySelector<HTMLElement>('#titles');
    if (titles && titles.offsetParent !== null) {
        titles.querySelectorAll('li').forEach((li) => {
            const r = local(li.getBoundingClientRect());
            drawTitle(li, r.x, r.y + r.h / 2, cssScale);
        });
    }

    belowItems.forEach((li) => {
        const r = li.getBoundingClientRect();
        drawTitle(li, BELOW_PAD, height + BELOW_PAD + (r.top - belowTop) + r.height / 2, 1);
    });

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    if (!blob) throw new Error('Could not create the JPG.');
    downloadBlob(blob, `${safeFileName(chartName)}.jpg`);
}