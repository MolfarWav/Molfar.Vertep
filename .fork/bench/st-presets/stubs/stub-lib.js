// The browser libraries SillyBunny's macro engine imports, from its own node_modules (SILLYBUNNY = its folder).
const SB = String(process.env.SILLYBUNNY || "").replace(/\\/g, "/");
if (!SB) throw new Error("set SILLYBUNNY to a SillyBunny or SillyTavern folder");
export const chevrotain = await import(`${SB}/node_modules/chevrotain/lib/src/api.js`);
export const seedrandom = (await import(`${SB}/node_modules/seedrandom/index.js`)).default;
export const droll = (await import(`${SB}/node_modules/droll/droll.js`)).default;
export const moment = (await import(`${SB}/node_modules/moment/moment.js`)).default;
