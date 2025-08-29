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
