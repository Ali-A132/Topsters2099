import { ALBUM_MIME, ERASE_MIME } from '../scripts/dnd';
import type { AlbumData } from '../types';
import '../style.css';

interface Props {
    albums: AlbumData[];
    onAdd: (album: AlbumData) => void;
    onRemoveLast: () => void;
}

export default function Results({ albums, onAdd, onRemoveLast }: Props) {
    return (
        <div className="sr-grid">
            {albums.map((a, i) => (
                <div
                    key={`${a.artist}|${a.title}|${i}`}
                    className="sr-item"
                    draggable
                    title="Drag onto the chart, or click to add to the next empty slot"
                    onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'copy';
                        e.dataTransfer.setData(ALBUM_MIME, JSON.stringify(a));
                    }}
                    onClick={() => onAdd(a)}
                >
                    {}
                    <img className="sr-img" src={a.imageUrl} alt="" loading="lazy" draggable={false} />
                    <div className="sr-caption">
                        <b>{a.artist}</b>
                        <br />
                        {a.title}
                    </div>
                </div>
            ))}

            {}
            <div
                className="sr-item"
                draggable
                title="Click to remove the last album, or drag onto a chart slot to empty it"
                onClick={onRemoveLast}
                onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'copy';
                    e.dataTransfer.setData(ERASE_MIME, 'erase');
                }}
            >
                <div className="sr-erase" />
            </div>
        </div>
    );
}