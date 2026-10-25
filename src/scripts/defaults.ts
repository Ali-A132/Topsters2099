import { DEFAULT_LAYOUT, MAX_SLOTS } from './layouts';
import type { ChartData, ChartOptions, Slot } from '../types';
import { newId } from './utils';

export const DEFAULT_OPTIONS: ChartOptions = {
    background: '#000000',
    backgroundImage: null,
    layout: DEFAULT_LAYOUT,
    titled: false,
    numbered: false,
    collageRows: 5,
    collageCols: 5,
    padding: 2,
};

export function createChart(name: string): ChartData {
    return {
        id: newId(),
        name,
        options: { ...DEFAULT_OPTIONS },
        slots: Array<Slot>(MAX_SLOTS).fill(null),
    };
}

export function nextChartName(charts: ChartData[]): string {
    const base = 'Untitled Chart';
    const names = new Set(charts.map((c) => c.name));
    if (!names.has(base)) return base;
    let n = 2;
    while (names.has(`${base} ${n}`)) n++;
    return `${base} ${n}`;
}

export function uniqueName(name: string, taken: Set<string>): string {
    if (!taken.has(name)) return name;
    let n = 2;
    while (taken.has(`${name} (${n})`)) n++;
    return `${name} (${n})`;
}