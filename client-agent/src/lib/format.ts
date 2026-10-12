// Number formatting shared by the thread (chat spend) and the per-run line.
export const compactTokens = (n: number): string =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)

export const usd = (n: number): string => `$${n < 0.01 ? n.toFixed(4) : n < 1 ? n.toFixed(3) : n.toFixed(2)}`

/** "Today, 18:42", "Yesterday, 18:42" or "6 Oct": when a chat was last used. */
export function whenLabel(at: number): string {
  const d = new Date(at);
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(new Date()) - day(d)) / 86_400_000);
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff === 0) return `Today, ${time}`;
  if (diff === 1) return `Yesterday, ${time}`;
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}
