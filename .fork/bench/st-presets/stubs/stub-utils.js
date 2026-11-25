export function isFalseBoolean(arg) { return ['off', 'false', '0'].includes(arg?.trim()?.toLowerCase()); }
export function isTrueBoolean(arg) { return ['on', 'true', '1'].includes(arg?.trim()?.toLowerCase()); }
export function getStringHash(str, seed = 0) { if (typeof str !== 'string') return 0; let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed; for (let i = 0, ch; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909); return 4294967296 * (2097151 & h2) + (h1 >>> 0); }
export function escapeRegex(s) { return s.replace(/[/\-\^$*+?.()|[\]{}]/g, '\$&'); }
export function timestampToMoment() { return null; }
