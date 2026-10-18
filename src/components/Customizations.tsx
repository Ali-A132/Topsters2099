import { useRef } from 'react';
import type { ChartData, ChartOptions } from '../types';
import OptionsPanel from './OptionsPanel';

interface Props {
    charts: ChartData[];
    activeId: string;
    onSelect: (id: string) => void;
    onNew: () => void;
    onRename: (name: string) => void;
    onDelete: () => void;
    onBackup: () => void;
    onRestore: (fileText: string) => void;
    options: ChartOptions;
    onChange: (o: ChartOptions) => void;
    showOptions: boolean;
    onToggleOptions: () => void;
}

export default function Customizations({
    charts,
    activeId,
    onSelect,
    onNew,
    onRename,
    onDelete,
    onBackup,
    onRestore,
    options,
    onChange,
    showOptions,
    onToggleOptions,
}: Props) {
    const active = charts.find((c) => c.id === activeId);
    const fileInput = useRef<HTMLInputElement>(null);

    const rename = () => {
        const name = window.prompt('Rename chart:', active?.name ?? '')?.trim();
        if (name) onRename(name);
    };

    const remove = () => {
        if (window.confirm(`Delete "${active?.name}"? This can't be undone.`)) onDelete();
    };

    return (
        <div id="customizations-container">
            <div>
                <div id="customizations">
                    <label id="chooser" style={{ lineHeight: 2 }}>
                        <select value={activeId} onChange={(e) => onSelect(e.target.value)}>
                            {charts.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>{' '}
                        ← Active chart
                    </label>
                    <br />
                    <button type="button" onClick={onNew}>New</button>
                    <button type="button" onClick={rename}>Rename</button>
                    <button type="button" onClick={remove}>Delete</button>
                    <br />
                    <br />
                    <button type="button" onClick={onBackup}>Back up</button> {' '}
                    <button type="button" onClick={() => fileInput.current?.click()}>Restore</button>
                    <input
                        ref={fileInput}
                        type="file"
                        accept="application/json,.json"
                        hidden
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (file) onRestore(await file.text());
                        }}
                    />
                    <br />
                    <button
                        type="button"
                        style={{ marginTop: '0.3em', marginBottom: '0.3em' }}
                        onClick={onToggleOptions}
                        aria-expanded={showOptions}
                    >
                        {showOptions ? 'Hide Options' : 'Show Options'}
                    </button>
                    {showOptions && <OptionsPanel options={options} onChange={onChange} />}
                </div>
            </div>
        </div>
    );
}