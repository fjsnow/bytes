export function wrapText(text: string, width: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
        if ((current + word).length > width && current.length > 0) {
            lines.push(current.trim());
            current = word + " ";
        } else if (word.length > width) {
            if (current.length > 0) lines.push(current.trim());
            lines.push(word.substring(0, width));
            current = word.substring(width) + " ";
        } else {
            current += word + " ";
        }
    }
    if (current.trim().length > 0) lines.push(current.trim());
    return lines;
}

export function formatTime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);

    return parts.join(", ");
}
