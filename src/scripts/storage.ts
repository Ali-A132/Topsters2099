import { DEFAULT_OPTIONS } from './defaults';
import { COLLAGE_ID, COLLAGE_MAX, DEFAULT_LAYOUT, LAYOUTS, MAX_SLOTS, PADDING_MAX } from './layouts';
import type { Album, ChartData, ChartOptions, Slot } from '../types';
import { newId } from './utils';

const KEY = 'topsters-clone:charts:v2';
const LEGACY_KEY = 'topsters-clone:chart:v1';

export interface SavedState {
    charts: ChartData[];
    activeId: string;
}

interface RawChart {
    id?: unknown;
    name?: unknown;
    options?: {
        background?: unknown;
        layout?: unknown;
        titled?: unknown;
        numbered?: unknown;
        collageRows?: unknown;
        collageCols?: unknown;
        padding?: unknown;
    } | null;
    slots?: unknown;
}

const isAlbum = (v: unknown): v is Album => {
    const a = v as Album | null;
    return (
        !!a &&
        typeof a.id === 'string' &&
        typeof a.title === 'string' &&
        typeof a.artist === 'string' &&
        typeof a.imageUrl === 'string' &&
        (a.imageUrl.startsWith('https://') || a.imageUrl.startsWith('data:image/'))
    );
};

const toPadding = (v: unknown) =>
    typeof v === 'number' && Number.isFinite(v)
        ? Math.min(PADDING_MAX, Math.max(0, Math.round(v)))
        : DEFAULT_OPTIONS.padding;

const toCollageSize = (v: unknown, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(COLLAGE_MAX, Math.max(1, Math.round(v))) : fallback;

function sanitizeChart(raw: RawChart | null | undefined, fallbackName: string): ChartData | null {
    const o = raw?.options;
    if (!raw || !o || !Array.isArray(raw.slots)) return null;
    const rawSlots: unknown[] = raw.slots;

    const requested = typeof o.layout === 'string' ? o.layout : '';
    const layout =
        requested === COLLAGE_ID || LAYOUTS[requested] ? requested : rawSlots.length > 42 ? '100' : DEFAULT_LAYOUT;

    const options: ChartOptions = {
        background: typeof o.background === 'string' ? o.background : DEFAULT_OPTIONS.background,
        layout,
        titled: !!o.titled,
        numbered: !!o.numbered,
        collageRows: toCollageSize(o.collageRows, DEFAULT_OPTIONS.collageRows),
        collageCols: toCollageSize(o.collageCols, DEFAULT_OPTIONS.collageCols),
        padding: toPadding(o.padding),
    };
    const slots: Slot[] = Array.from({ length: MAX_SLOTS }, (_, i) => {
        const a = rawSlots[i];
        return isAlbum(a) ? a : null;
    });
    return {
        id: typeof raw.id === 'string' && raw.id ? raw.id : newId(),
        name: typeof raw.name === 'string' && raw.name.trim() ? raw.name : fallbackName,
        options,
        slots,
    };
}

export function loadState(): SavedState | null {
    try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
            const data = JSON.parse(raw);
            const list: RawChart[] = Array.isArray(data?.charts) ? data.charts : [];
            const charts = list
                .map((c, i) => sanitizeChart(c, `Untitled Chart ${i + 1}`))
                .filter((c): c is ChartData => c !== null);
            if (charts.length) {
                const activeId = charts.some((c) => c.id === data.activeId) ? data.activeId : charts[0].id;
                return { charts, activeId };
            }
        }

        const legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy) {
            const chart = sanitizeChart(JSON.parse(legacy), 'Untitled Chart');
            if (chart) return { charts: [chart], activeId: chart.id };
        }
        return null;
    } catch {
        return null;
    }
}

export function saveState(state: SavedState): boolean {
    try {
        localStorage.setItem(KEY, JSON.stringify(state));
        localStorage.removeItem(LEGACY_KEY);
        return true;
    } catch {
        return false;
    }
}

const MAX_BACKUP_CHARS = 25_000_000;

export function makeBackup(charts: ChartData[]): string {
    return JSON.stringify(
        { app: 'topsters-clone', version: 2, exportedAt: new Date().toISOString(), charts },
        null,
        2,
    );
}

export function parseBackup(text: string): { charts: ChartData[]; skipped: number } {
    if (text.length > MAX_BACKUP_CHARS) throw new Error('That file is too large to be a chart backup.');

    let data: unknown;
    try {
        data = JSON.parse(text);
    } catch {
        throw new Error("That file isn't valid JSON.");
    }

    const d = data as ({ charts?: unknown } & RawChart) | null;
    const list: RawChart[] = Array.isArray(d?.charts) ? d.charts : d?.options ? [d] : [];

    const charts = list
        .map((c, i) => sanitizeChart(c, `Restored Chart ${i + 1}`))
        .filter((c): c is ChartData => c !== null);
    if (!charts.length) throw new Error("No charts found in that file. Is it a backup made with this app?");
    return { charts, skipped: list.length - charts.length };
}