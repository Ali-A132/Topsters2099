import rymBackup from '../data/RYMTopAlbums.json';
import { uniqueName } from './defaults';
import { readBackupData } from './storage';
import type { SavedState } from './storage';
import type { ChartData } from '../types';
import { newId } from './utils';

function defaultCharts(): ChartData[] {
    try {
        return readBackupData(rymBackup).charts.map((chart) => ({ ...chart, id: newId() }));
    } catch {
        return [];
    }
}

export function withDefaultCharts(state: SavedState): SavedState {
    if (state.seeded) return state;
    const taken = new Set(state.charts.map((c) => c.name));
    const added = defaultCharts().map((chart) => {
        const name = uniqueName(chart.name, taken);
        taken.add(name);
        return { ...chart, name };
    });
    return { ...state, charts: [...state.charts, ...added], seeded: true };
}
