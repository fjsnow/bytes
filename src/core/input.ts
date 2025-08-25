if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}
process.stdin.resume();
process.stdin.setEncoding("utf8");

type KeyHandler = (key: string) => void;

const handlers: KeyHandler[] = [];

process.stdin.on("data", (key: string) => {
  if (key === "\u0003") process.exit();
  for (const h of handlers) h(key);
});

export function onKey(handler: KeyHandler) {
  handlers.push(handler);
}
