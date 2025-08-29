const units: string[] = [
    "B",
    "KiB",
    "MiB",
    "GiB",
    "TiB",
    "PiB",
    "EiB",
    "ZiB",
    "YiB",
    "RiB",
    "QiB",
    "SiB",
];

export function formatBytes(
    bytes: number | bigint,
    binary: boolean = true,
): string {
    if (bytes === 0n || bytes === 0) return "0.0 B";

    const base = binary ? 1024 : 1000;
    const absBytes = typeof bytes === "bigint" ? bytes : BigInt(bytes);

    let i = 0;
    let tempBytes = absBytes;
    while (tempBytes >= BigInt(base) && i < units.length - 1) {
        tempBytes /= BigInt(base);
        i++;
    }

    const value = Number(absBytes) / base ** i;
    const roundedValue = Math.round(value * 10) / 10;

    let unit = units[i];
    if (!binary && unit !== "B") unit = unit.replace("i", "");

    return `${roundedValue.toFixed(1)} ${unit}`;
}
