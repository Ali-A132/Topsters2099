import type { ChartOptions } from '../types';

export interface RowSpec {
    size: number; 
    count: number;
}

export interface Layout {
    id: string;
    label: string;
    width: number; 
    rows: RowSpec[];
    sectionPerRow?: boolean;
}

const WIDTH = 790;

const repeat = (rows: number, size: number, count: number): RowSpec[] =>
    Array.from({ length: rows }, () => ({ size, count }));

const make = (rows: RowSpec[]): Layout => {
    const total = rows.reduce((sum, r) => sum + r.count, 0);
    return { id: String(total), label: `Top ${total}`, width: WIDTH, rows };
};

export const LAYOUTS: Record<string, Layout> = {
    '42': make([...repeat(2, 150, 5), ...repeat(2, 125, 6), ...repeat(2, 75, 10)]),
    '100': make([...repeat(2, 150, 5), ...repeat(3, 125, 6), ...repeat(3, 75, 10), ...repeat(3, 52, 14)]),
};

export const DEFAULT_LAYOUT = '42';

export const COLLAGE_ID = 'collage';
export const COLLAGE_MAX = 12;
export const PADDING_MAX = 20;
const COLLAGE_MAX_COVER = 150;

export const MAX_SLOTS = COLLAGE_MAX * COLLAGE_MAX;

const clamp = (n: number) => Math.min(COLLAGE_MAX, Math.max(1, Math.round(n) || 1));

export function makeCollage(rows: number, cols: number): Layout {
    const r = clamp(rows);
    const c = clamp(cols);
    const size = Math.min(COLLAGE_MAX_COVER, Math.floor(WIDTH / c) - 4);
    return { id: COLLAGE_ID, label: 'Collage', width: c * (size + 4), rows: repeat(r, size, c), sectionPerRow: true };
}

export const LAYOUT_CHOICES = [
    { id: '42', label: LAYOUTS['42'].label },
    { id: '100', label: LAYOUTS['100'].label },
    { id: COLLAGE_ID, label: 'Collage' },
];

type LayoutOptions = Pick<ChartOptions, 'layout' | 'collageRows' | 'collageCols'>;

export function getLayout(options: LayoutOptions): Layout {
    if (options.layout === COLLAGE_ID) return makeCollage(options.collageRows, options.collageCols);
    return LAYOUTS[options.layout] ?? LAYOUTS[DEFAULT_LAYOUT];
}

export const slotCount = (layout: Layout) => layout.rows.reduce((sum, r) => sum + r.count, 0);

export function slotSections(layout: Layout): number[] {
    const sections: number[] = [];
    let section = -1;
    let lastSize = -1;
    for (const row of layout.rows) {
        if (layout.sectionPerRow || row.size !== lastSize) {
            section++;
            lastSize = row.size;
        }
        for (let i = 0; i < row.count; i++) sections.push(section);
    }
    return sections;
}