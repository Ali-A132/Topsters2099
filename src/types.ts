export interface Album {
    id: string;
    title: string;
    artist: string;
    imageUrl: string;
    custom?: boolean;
}

export type Slot = Album | null;

export interface ChartOptions {
    background: string;
    backgroundImage: string | null;
    layout: string;
    titled: boolean;
    numbered: boolean;
    collageRows: number;
    collageCols: number; 
    padding: number; 
}

export type AlbumData = Omit<Album, 'id'>;

export interface ChartData {
    id: string;
    name: string;
    options: ChartOptions;
    slots: Slot[];
}