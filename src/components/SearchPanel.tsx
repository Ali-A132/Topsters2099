import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { searchAlbums } from '../services/lastfm';
import type { AlbumData } from '../types';
import Results from './Results';
import Welcome from './Welcome';

type Status = 'idle' | 'loading' | 'done' | 'error';

interface Props {
    onAdd: (album: AlbumData) => void;
    onRemoveLast: () => void;
}

export default function SearchPanel({ onAdd, onRemoveLast }: Props) {
    const [mode, setMode] = useState<'music'>('music');
    const [query, setQuery] = useState('');
    const [searched, setSearched] = useState('');
    const [status, setStatus] = useState<Status>('idle');
    const [results, setResults] = useState<AlbumData[]>([]);
    const [error, setError] = useState('');
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => () => abortRef.current?.abort(), []);

    const clearResults = () => {
        abortRef.current?.abort();
        setStatus('idle');
        setResults([]);
        setError('');
    };

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const q = query.trim();
        if (!q) return;

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setStatus('loading');
        setSearched(q);
        try {
            setResults(await searchAlbums(q, controller.signal));
            setStatus('done');
        } catch (err) {
            if ((err as Error).name === 'AbortError') return;
            setError((err as Error).message);
            setStatus('error');
        }
    };

    return (
        <>
            <div id="search-container">
                <div>
                    <select value={mode} onChange={(e) => setMode(e.target.value as 'music')}>
                        <option value="music">Music</option>
                    </select>
                    &nbsp;
                    <form id="new-search-container" onSubmit={onSubmit}>
                        <input
                            id="search-bar"
                            type="search"
                            placeholder="Album, artist, or URL"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                const deleting = (e.nativeEvent as InputEvent).inputType?.startsWith('delete');
                                if (status !== 'idle' && (deleting || e.target.value === '')) clearResults();
                            }}
                        />
                        <input type="submit" value="Go" />
                    </form>
                </div>
            </div>
            <div id="grow">
                <div>
                    <div id="search">
                        {status === 'idle' && <Welcome />}
                        {status === 'loading' && <div className="search-message">Searching…</div>}
                        {status === 'error' && <div className="search-message">{error}</div>}
                        {status === 'done' &&
                            (results.length ? (
                                <Results albums={results} onAdd={onAdd} onRemoveLast={onRemoveLast} />
                            ) : (
                                <div className="search-message">
                                    No albums with artwork found for &quot;{searched}&quot;.
                                </div>
                            ))}
                    </div>
                </div>
            </div>
        </>
    );
}