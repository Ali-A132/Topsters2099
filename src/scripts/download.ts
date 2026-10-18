export function safeFileName(name: string, fallback = 'topsters'): string {
    return name.replace(/[\\/:*?"<>|]+/g, '').trim() || fallback;
}

export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
