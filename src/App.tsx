import { useCallback, useEffect, useRef, useState } from 'react';
import Chart from './components/Chart';
import Customizations from './components/Customizations';
import SearchPanel from './components/SearchPanel';
import { withDefaultCharts } from './scripts/defaultCharts';
import { createChart, nextChartName, uniqueName } from './scripts/defaults';
import { downloadBlob } from './scripts/download';
import { resolveDroppedImage } from './scripts/externalImage';
import type { DropPayload } from './scripts/externalImage';
import { exportChart } from './scripts/exportChart';
import type { ExportFormat } from './scripts/exportChart';
import { getLayout, slotCount } from './scripts/layouts';
import { loadState, makeBackup, parseBackup, saveState } from './scripts/storage';
import type { SavedState } from './scripts/storage';
import type { AlbumData, ChartData, ChartOptions } from './types';
import { moveItem, newId } from './scripts/utils';
import { useFitScale } from './scripts/useFitScale';
import { useMediaQuery } from './scripts/useMediaQuery';

function initialState(): SavedState {
    const chart = createChart('Untitled Chart');
    return { charts: [chart], activeId: chart.id };
}

export default function App() {
    const [state, setState] = useState<SavedState>(() => withDefaultCharts(loadState() ?? initialState()));
    const [showOptions, setShowOptions] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [saveFailed, setSaveFailed] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false); 
    const [toast, setToast] = useState<string | null>(null);
    const isMobile = useMediaQuery('(max-width: 800px)'); 

    const { charts, activeId } = state;
    const active = charts.find((c) => c.id === activeId) ?? charts[0];
    const layout = getLayout(active.options);
    const visibleSlots = active.slots.slice(0, slotCount(layout));

    const o = active.options;
    useFitScale(`${active.id}|${o.layout}|${o.collageRows}x${o.collageCols}|${o.titled}`, isMobile);

    const latest = useRef(state);
    useEffect(() => {
        latest.current = state;
        const timer = setTimeout(() => setSaveFailed(!saveState(state)), 300);
        return () => clearTimeout(timer);
    }, [state]);
    useEffect(() => {
        const flush = () => void saveState(latest.current);
        window.addEventListener('pagehide', flush);
        return () => window.removeEventListener('pagehide', flush);
    }, []);

    useEffect(() => {
        const carriesImage = (e: DragEvent) =>
            !!e.dataTransfer && ['Files', 'text/uri-list'].some((t) => e.dataTransfer!.types.includes(t));
        const onDragOver = (e: DragEvent) => {
            if (e.defaultPrevented || !carriesImage(e)) return; 
            e.preventDefault();
            e.dataTransfer!.dropEffect = 'none';
        };
        const onDrop = (e: DragEvent) => {
            if (carriesImage(e)) e.preventDefault();
        };
        window.addEventListener('dragover', onDragOver);
        window.addEventListener('drop', onDrop);
        return () => {
            window.removeEventListener('dragover', onDragOver);
            window.removeEventListener('drop', onDrop);
        };
    }, []);

    const updateActive = useCallback((fn: (c: ChartData) => ChartData) => {
        setState((s) => ({ ...s, charts: s.charts.map((c) => (c.id === s.activeId ? fn(c) : c)) }));
    }, []);

    const changeOptions = (options: ChartOptions) => updateActive((c) => ({ ...c, options }));

    const moveSlot = useCallback(
        (from: number, to: number) => updateActive((c) => ({ ...c, slots: moveItem(c.slots, from, to) })),
        [updateActive],
    );

    const placeAlbum = useCallback(
        (index: number, data: AlbumData | null) => {
            const album = data && { ...data, id: newId() };
            updateActive((c) => ({ ...c, slots: c.slots.map((s, i) => (i === index ? album : s)) }));
        },
        [updateActive],
    );

    const toastTimer = useRef<number | undefined>(undefined);
    const notify = (message: string) => {
        setToast(message);
        window.clearTimeout(toastTimer.current);
        toastTimer.current = window.setTimeout(() => setToast(null), 1600);
    };

    const addAlbum = (data: AlbumData) => {
        const visible = slotCount(layout); 
        const i = active.slots.slice(0, visible).indexOf(null);
        if (i === -1) {
            notify('The chart is full.');
            return;
        }
        const album = { ...data, id: newId() };
        updateActive((c) => ({ ...c, slots: c.slots.map((s, j) => (j === i ? album : s)) }));
        notify(`Added to slot ${i + 1}.`);
    };

    const removeLastAlbum = () => {
        const visible = slotCount(layout);
        let last = -1;
        active.slots.slice(0, visible).forEach((s, i) => {
            if (s) last = i;
        });
        if (last === -1) {
            notify('The chart is empty.');
            return;
        }
        updateActive((c) => ({ ...c, slots: c.slots.map((s, j) => (j === last ? null : s)) }));
        notify(`Removed the album in slot ${last + 1}.`);
    };

    const placeExternal = useCallback(
        async (index: number, payload: DropPayload) => {
            try {
                const imageUrl = await resolveDroppedImage(payload);
                placeAlbum(index, { title: '', artist: '', imageUrl, custom: true });
            } catch (err) {
                window.alert((err as Error).message);
            }
        },
        [placeAlbum],
    );

    const renameAlbum = useCallback(
        (id: string, title: string) =>
            updateActive((c) => ({ ...c, slots: c.slots.map((s) => (s && s.id === id ? { ...s, title } : s)) })),
        [updateActive],
    );

    const selectChart = (id: string) => setState((s) => ({ ...s, activeId: id }));

    const newChart = () =>
        setState((s) => {
            const chart = createChart(nextChartName(s.charts));
            return { ...s, charts: [...s.charts, chart], activeId: chart.id };
        });

    const renameChart = (name: string) => updateActive((c) => ({ ...c, name }));

    const deleteChart = () =>
        setState((s) => {
            const i = s.charts.findIndex((c) => c.id === s.activeId);
            const rest = s.charts.filter((c) => c.id !== s.activeId);
            if (!rest.length) return { ...initialState(), seeded: s.seeded };
            return { ...s, charts: rest, activeId: rest[Math.min(i, rest.length - 1)].id };
        });

    const backup = () => {
        const date = new Date().toISOString().slice(0, 10);
        downloadBlob(new Blob([makeBackup(charts)], { type: 'application/json' }), `topsters-backup-${date}.json`);
    };

    const restore = (fileText: string) => {
        let parsed: ReturnType<typeof parseBackup>;
        try {
            parsed = parseBackup(fileText);
        } catch (err) {
            window.alert((err as Error).message);
            return;
        }
        const { charts: incoming, skipped } = parsed;
        const message =
            `Add ${incoming.length} chart${incoming.length > 1 ? 's' : ''} from this backup to your existing charts?` +
            (skipped ? `\n\n(${skipped} unreadable chart${skipped > 1 ? 's' : ''} in the file will be skipped.)` : '');
        if (!window.confirm(message)) return;

        setState((s) => {
            const taken = new Set(s.charts.map((c) => c.name));
            const added = incoming.map((c) => {
                const name = uniqueName(c.name, taken);
                taken.add(name);
                return { ...c, id: newId(), name };
            });
            return { ...s, charts: [...s.charts, ...added], activeId: added[0].id };
        });
    };

    const download = async (format: ExportFormat) => {
        const wrapper = document.getElementById('chart-wrapper');
        if (!wrapper) return;
        setExporting(true);
        try {
            await exportChart(wrapper, active.name, format);
        } catch (err) {
            window.alert((err as Error).message);
        } finally {
            setExporting(false);
        }
    };

    return (
        <>
            <button
                type="button"
                id="menu-button"
                aria-label="Menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
            >
                ☰
            </button>
            {menuOpen && <div id="menu-backdrop" onClick={() => setMenuOpen(false)} />}
            <div id="buttons">
                {saveFailed && (
                    <span style={{ color: '#c00', marginRight: 8 }}>
                        Couldn&apos;t autosave (browser storage is full). Use Back up to keep your charts.
                    </span>
                )}
                <button type="button" onClick={() => download('jpg')} disabled={exporting}>
                    Download JPG
                </button>{' '}
                <button type="button" onClick={() => download('png')} disabled={exporting}>
                    Download PNG
                </button>
            </div>
            <div id="page">
                <div id="fixed" className={menuOpen ? 'open' : ''}>
                    <div id="fixed-inner">
                        <button type="button" id="menu-close" onClick={() => setMenuOpen(false)}>
                            ✕ Close
                        </button>
                        <Customizations
                            charts={charts}
                            activeId={active.id}
                            onSelect={selectChart}
                            onNew={newChart}
                            onRename={renameChart}
                            onDelete={deleteChart}
                            onBackup={backup}
                            onRestore={restore}
                            options={active.options}
                            onChange={changeOptions}
                            showOptions={showOptions}
                            onToggleOptions={() => setShowOptions((v) => !v)}
                        />
                        <SearchPanel onAdd={addAlbum} onRemoveLast={removeLastAlbum} />
                    </div>
                </div>
                {}
                <Chart
                    key={active.id}
                    layout={layout}
                    slots={visibleSlots}
                    options={active.options}
                    onMove={moveSlot}
                    onPlace={placeAlbum}
                    onPlaceExternal={placeExternal}
                    onRenameAlbum={renameAlbum}
                />
            </div>
            {toast && <div id="toast">{toast}</div>}
        </>
    );
}