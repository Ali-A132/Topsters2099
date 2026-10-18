import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { DragEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ALBUM_MIME, ERASE_MIME, SLOT_MIME, readAlbumData } from '../scripts/dnd';
import { readDropPayload } from '../scripts/externalImage';
import type { DropPayload } from '../scripts/externalImage';
import type { Layout } from '../scripts/layouts';
import { slotSections } from '../scripts/layouts';
import type { AlbumData, ChartOptions, Slot } from '../types';
import { useMediaQuery } from '../scripts/useMediaQuery';
import { moveItem } from '../scripts/utils';

interface Props {
    layout: Layout;
    slots: Slot[];
    options: ChartOptions;
    onMove: (from: number, to: number) => void;
    onPlace: (index: number, album: AlbumData | null) => void;
    onPlaceExternal: (index: number, payload: DropPayload) => void;
    onRenameAlbum: (id: string, title: string) => void;
}

interface DragState {
    from: number; 
    over: number;
}

interface CardProps {
    slot: Slot;
    size: number; 
    pad: number; 
    index: number; 
    touch: boolean; 
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
    ghost?: boolean; 
    hidden?: boolean; 
    target?: boolean; 
    onDragStart: (e: DragEvent) => void;
    onDragOver: (e: DragEvent) => void;
    onDragEnd: (e: DragEvent) => void;
}

function Card({ slot, size, pad, index, touch, ghost, hidden, target, ...handlers }: CardProps) {
    const bottomExtra = size >= 125 ? Math.min(4, pad * 2) : 0;
    const padding = `${pad}px ${pad}px ${pad + bottomExtra}px`;
    const style = hidden
        ? { display: 'none' }
        : ghost
          ? { opacity: 0.4 }
          : target
            ? { outlineOffset: -2 }
            : undefined;
    return (
        <div className="card white" data-slot={index} draggable={!ghost && !touch} style={{ padding, ...style }} {...handlers}>
            <div
                className="inner" draggable={!ghost && !touch} {...handlers}
                style={{
                    width: size,
                    height: size,
                    ...(slot ? { backgroundImage: `url(${JSON.stringify(slot.imageUrl)})` } : {}),
                }}
                title={slot ? [slot.artist, slot.title].filter(Boolean).join(' - ') || undefined : undefined}
            />
        </div>
    );
}

const TITLE_LINE_MAX = 14;
const TITLE_FONT_RATIO = 15 / 14;
const SECTION_GAP_LINES = 1.5;

export default function Chart({ layout, slots, options, onMove, onPlace, onPlaceExternal, onRenameAlbum }: Props) {
    const fromRef = useRef<number | null>(null);
    const [drag, setDrag] = useState<DragState | null>(null);
    const [target, setTarget] = useState<number | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);

    const touchMode = useMediaQuery('(pointer: coarse)');
    const isMobile = useMediaQuery('(max-width: 800px)'); 
    const pointer = useRef<{
        from: number; 
        over: number; 
        id: number; 
        x0: number;
        y0: number;
        w: number; 
        h: number;
        active: boolean;
    } | null>(null);
    const [float, setFloat] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
    const floatRef = useRef<HTMLDivElement>(null); 
    const [overTrash, setOverTrash] = useState(false);

    useEffect(() => {
        if (!touchMode) return;
        const move = (e: PointerEvent) => {
            const p = pointer.current;
            if (!p || e.pointerId !== p.id) return;
            if (!p.active) {
                if (Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 8) return; 
                p.active = true;
                setDrag({ from: p.from, over: p.from });
                setFloat({ x: e.clientX, y: e.clientY, w: p.w, h: p.h });
            }
            e.preventDefault();
            if (floatRef.current) {
                floatRef.current.style.transform = `translate(${e.clientX - p.w / 2}px, ${e.clientY - p.h / 2}px)`;
            }
            const under = document.elementFromPoint(e.clientX, e.clientY);
            const onTrash = !!under?.closest('#trash');
            setOverTrash(onTrash);
            const card = onTrash ? null : under?.closest<HTMLElement>('[data-slot]');
            if (card) {
                const idx = Number(card.dataset.slot);
                if (idx !== p.over) {
                    p.over = idx;
                    setDrag({ from: p.from, over: idx }); 
                }
            }
        };
        const end = (e: PointerEvent) => {
            const p = pointer.current;
            if (!p || e.pointerId !== p.id) return;
            pointer.current = null;
            if (p.active && e.type === 'pointerup') {
                if (document.elementFromPoint(e.clientX, e.clientY)?.closest('#trash')) onPlace(p.from, null);
                else if (p.over !== p.from) onMove(p.from, p.over);
            }
            setDrag(null);
            setFloat(null);
            setOverTrash(false);
        };
        window.addEventListener('pointermove', move, { passive: false });
        window.addEventListener('pointerup', end);
        window.addEventListener('pointercancel', end);
        return () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', end);
            window.removeEventListener('pointercancel', end);
        };
    }, [touchMode, onMove, onPlace]);

    const chartRef = useRef<HTMLDivElement>(null);
    const [chartHeight, setChartHeight] = useState(0);
    useLayoutEffect(() => {
        const el = chartRef.current;
        if (!el) return;
        const measure = () => setChartHeight(el.offsetHeight);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const reset = () => {
        fromRef.current = null;
        setDrag(null);
    };

    const commit = () => {
        if (drag && drag.from !== drag.over) onMove(drag.from, drag.over);
        reset();
    };

    const isExternalDrag = (e: DragEvent) => {
        const types = e.dataTransfer.types;
        return [ALBUM_MIME, ERASE_MIME, 'Files', 'text/uri-list', 'text/html'].some((t) => types.includes(t));
    };

    const shown = drag ? moveItem(slots, drag.from, drag.over) : slots;

    const startPointerDrag = (e: ReactPointerEvent<HTMLElement>, index: number) => {
        if (!touchMode || e.pointerType === 'mouse' || pointer.current) return; 
        const touched = e.target as Element;
        if (touched.hasPointerCapture?.(e.pointerId)) touched.releasePointerCapture(e.pointerId);
        const rect = (e.currentTarget.closest('.card') ?? e.currentTarget).getBoundingClientRect();
        pointer.current = {
            from: index,
            over: index,
            id: e.pointerId,
            x0: e.clientX,
            y0: e.clientY,
            w: rect.width,
            h: rect.height,
            active: false,
        };
    };

    const cardHandlers = (index: number) => ({
        onPointerDown: (e: ReactPointerEvent<HTMLElement>) => startPointerDrag(e, index),
        onDragStart: (e: DragEvent) => {
            fromRef.current = index;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData(SLOT_MIME, String(index));
            setTimeout(() => setDrag({ from: index, over: index }), 0);
        },
        onDragOver: (e: DragEvent) => {
            if (fromRef.current !== null) {
                setDrag((d) => (d && d.over !== index ? { ...d, over: index } : d));
            } else if (isExternalDrag(e)) {
                setTarget(index);
            }
        },
        onDragEnd: reset,
    });

    let start = 0;

    const titleClass = [options.titled ? 'show' : '', options.numbered ? 'numbered' : ''].join(' ').trim();

    const sections = slotSections(layout);
    let lastSection = -1;
    let breaks = 0;
    const entries = slots.flatMap((s, i) => {
        if (!s) return [];
        const section = sections[i] ?? 0;
        const newSection = lastSection !== -1 && section !== lastSection;
        if (newSection) breaks++;
        lastSection = section;
        return [{ s, newSection }];
    });
    const titleLine =
        !isMobile && entries.length && chartHeight
            ? Math.min(
                  TITLE_LINE_MAX,
                  Math.floor((chartHeight / (entries.length + breaks * SECTION_GAP_LINES)) * 100) / 100,
              )
            : TITLE_LINE_MAX;
    const numWidth = String(entries.length).length + 2;

    const titlesList = (
        <ul
            id="titles"
            className={titleClass}
            style={{
                lineHeight: `${titleLine}px`,
                fontSize: `${titleLine * TITLE_FONT_RATIO}px`,
                listStyle: 'none',
                paddingLeft: 0,
                whiteSpace: 'nowrap',
            }}
        >
            {entries.map(({ s, newSection }, idx) => {
                const num = options.numbered ? (
                    <span className="title-num" style={{ display: 'inline-block', verticalAlign: 'top', width: `${numWidth}ch` }}>
                        {idx + 1}.
                    </span>
                ) : null;
                const gap = newSection ? { marginTop: `${titleLine * SECTION_GAP_LINES}px` } : undefined;
                if (s.custom && (s.title === '' || editingId === s.id)) {
                    return (
                        <li key={s.id} style={gap}>
                            {num}
                            <input
                                type="text"
                                value={s.title}
                                placeholder="Artist - Album"
                                autoFocus={editingId === s.id}
                                onFocus={(e) => {
                                    setEditingId(s.id);
                                    e.currentTarget.select();
                                }}
                                onChange={(e) => onRenameAlbum(s.id, e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur();
                                }}
                                onBlur={() => setEditingId(null)}
                                style={{
                                    font: 'inherit',
                                    color: 'inherit',
                                    background: 'transparent',
                                    border: 0,
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    height: `${titleLine}px`,
                                    width: '16em',
                                    padding: 0,
                                    margin: 0,
                                    display: 'inline-block',
                                    verticalAlign: 'top',
                                }}
                            />
                        </li>
                    );
                }
                return (
                    <li
                        key={s.id}
                        style={gap}
                        onDoubleClick={s.custom ? () => setEditingId(s.id) : undefined}
                        title={s.custom ? 'Double-click to rename' : undefined}
                    >
                        {num}
                        <span className="title-name">{s.custom ? s.title : `${s.artist} - ${s.title}`}</span>
                    </li>
                );
            })}
        </ul>
    );

    return (
        <>
            <div
                id="chart-wrapper"
                className={`container-${layout.id}`}
                style={{ background: options.background, fontFamily: 'monospace, sans-serif', flex: 'none' }}
            >
                <div
                    id="chart"
                    ref={chartRef}
                    style={{ width: 'max-content' }}
                    onDragOver={(e) => {
                        const external = fromRef.current === null && isExternalDrag(e);
                        if (fromRef.current === null && !external) return; 
                        e.preventDefault(); 
                        const types = e.dataTransfer.types;
                        if (fromRef.current !== null) e.dataTransfer.dropEffect = 'move';
                        else if (types.includes(ALBUM_MIME) || types.includes(ERASE_MIME)) e.dataTransfer.dropEffect = 'copy';
                    }}
                    onDragLeave={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setTarget(null);
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        if (fromRef.current !== null) return commit();
                        if (target !== null) {
                            const types = e.dataTransfer.types;
                            if (types.includes(ERASE_MIME)) {
                                onPlace(target, null);
                            } else if (types.includes(ALBUM_MIME)) {
                                const album = readAlbumData(e.dataTransfer.getData(ALBUM_MIME));
                                if (album) onPlace(target, album);
                            } else {
                                const payload = readDropPayload(e.dataTransfer);
                                if (payload) onPlaceExternal(target, payload);
                            }
                        }
                        setTarget(null);
                    }}
                >
                    {layout.rows.map((row, r) => {
                        const rowStart = start;
                        const rowEnd = rowStart + row.count;
                        start = rowEnd;

                        const children: ReactNode[] = [];
                        shown.slice(rowStart, rowEnd).forEach((slot, i) => {
                            const index = rowStart + i;
                            const ghost = drag?.over === index;
                            const key = ghost ? 'ghost' : slot ? slot.id : drag ? `gap-${index}` : `empty-${index}`;
                            if (i > 0) children.push(<span key={`z-${key}`} className="zero">{' '}</span>);
                            children.push(
                                <Card
                                    key={key}
                                    slot={slot}
                                    size={row.size}
                                    pad={options.padding}
                                    index={index}
                                    touch={touchMode}
                                    ghost={ghost}
                                    target={target === index}
                                    {...cardHandlers(index)}
                                />,
                            );
                        });

                        if (drag && drag.from >= rowStart && drag.from < rowEnd) {
                            const source = slots[drag.from];
                            children.push(
                                <Card
                                    key={source ? source.id : `empty-${drag.from}`}
                                    slot={source}
                                    size={row.size}
                                    pad={options.padding}
                                    index={drag.from}
                                    touch={touchMode}
                                    hidden
                                    {...cardHandlers(drag.from)}
                                />,
                            );
                        }

                        return (
                            <div key={r} className={`card-row size-${row.size} align-justify`}>
                                {children}
                            </div>
                        );
                    })}
                </div>
                {!isMobile && titlesList}
                {}
                {touchMode &&
                    drag &&
                    float &&
                    createPortal(
                        <div
                            id="drag-float"
                            ref={floatRef}
                            style={{
                                width: float.w,
                                height: float.h,
                                transform: `translate(${float.x - float.w / 2}px, ${float.y - float.h / 2}px)`,
                                backgroundImage: slots[drag.from]
                                    ? `url(${JSON.stringify(slots[drag.from]!.imageUrl)})`
                                    : undefined,
                            }}
                        />,
                        document.body,
                    )}
                {touchMode &&
                    drag &&
                    createPortal(
                        <div id="trash" className={overTrash ? 'over' : ''}>
                            Drop here to erase
                        </div>,
                        document.body,
                    )}
            </div>
            {isMobile && options.titled && (
                <div id="titles-box" style={{ background: options.background }}>
                    {titlesList}
                </div>
            )}
        </>
    );
}