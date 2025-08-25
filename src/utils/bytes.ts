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

export function formatBytes(bytes: number, binary: boolean = true): string {
  if (bytes === 0) return "0.0 B";

  const base = binary ? 1024 : 1000;
  let i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(base));
  if (i >= units.length) i = units.length - 1;

  let value = bytes / Math.pow(base, i);
  value = Math.round(value * 10) / 10;

  let unit = units[i];
  if (!binary && unit !== "B") unit = unit.replace("i", "");

  return `${value.toFixed(1)} ${unit}`;
}
