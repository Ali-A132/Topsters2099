import { useRef } from 'react';
import { readImageFile } from '../scripts/externalImage';
import { COLLAGE_ID, COLLAGE_MAX, LAYOUT_CHOICES, PADDING_MAX } from '../scripts/layouts';
import type { ChartOptions } from '../types';

interface Props {
    options: ChartOptions;
    onChange: (o: ChartOptions) => void;
}

export default function OptionsPanel({ options, onChange }: Props) {
    const set = <K extends keyof ChartOptions>(key: K, value: ChartOptions[K]) =>
        onChange({ ...options, [key]: value });

    const fileInput = useRef<HTMLInputElement>(null);

    const uploadBackground = async (file: File) => {
        try {
            set('backgroundImage', await readImageFile(file, 1600));
        } catch (err) {
            window.alert((err as Error).message);
        }
    };

    return (
        <div id="options">
            <label>
                Layout{' '}
                <select value={options.layout} onChange={(e) => set('layout', e.target.value)}>
                    {LAYOUT_CHOICES.map((l) => (
                        <option key={l.id} value={l.id}>
                            {l.label}
                        </option>
                    ))}
                </select>
            </label>
            {options.layout === COLLAGE_ID && (
                <>
                    <label>
                        Rows{' '}
                        <input
                            style={{height: '1px'}}
                            type="range"
                            min={1}
                            max={COLLAGE_MAX}
                            value={options.collageRows}
                            onChange={(e) => set('collageRows', Number(e.target.value))}
                        />{' '}
                        {options.collageRows}
                    </label>
                    <label>
                        Columns{' '}
                        <input
                            style={{height: '1px'}}
                            type="range"
                            min={1}
                            max={COLLAGE_MAX}
                            value={options.collageCols}
                            onChange={(e) => set('collageCols', Number(e.target.value))}
                        />{' '}
                        {options.collageCols}
                    </label>
                </>
            )}
            <label>
                Padding{' '}
                <input
                    style={{height: '1px'}}
                    type="range"
                    min={0}
                    max={PADDING_MAX}
                    value={options.padding}
                    onChange={(e) => set('padding', Number(e.target.value))}
                />{' '}
                {options.padding}
            </label>
            <label>
                Background Colour{' '}
                <input
                    className="colour-input"
                    type="color"
                    value={options.background}
                    onChange={(e) => set('background', e.target.value)}
                />
            </label>
            <div>
                Upload Backdrop{' '}
                <button style = {{height: '25px'}} type="button" onClick={() => fileInput.current?.click()}>
                    {options.backgroundImage ? 'Change' : 'Browse'}
                </button>
                {options.backgroundImage && (
                    <>
                        {' '}
                        <button type="button" style = {{height: '25px'}} onClick={() => set('backgroundImage', null)}>
                            Remove
                        </button>
                    </>
                )}
                <input
                    ref={fileInput}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file) void uploadBackground(file);
                    }}
                />
            </div>
            <label>
                <input
                    type="checkbox"
                    checked={options.titled}
                    onChange={(e) => set('titled', e.target.checked)}
                />{' '}
                Show titles
            </label>
            <label>
                &nbsp;↳&nbsp;
                <input
                    type="checkbox"
                    checked={options.numbered}
                    onChange={(e) => set('numbered', e.target.checked)}
                />{' '}
                Number albums
            </label>
        </div>
    );
}