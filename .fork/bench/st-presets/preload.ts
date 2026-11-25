import { plugin } from "bun";
const STUBS = import.meta.dir.replace(/\\/g, "/") + "/stubs/";
const names = ["lib", "utils", "script", "i18n", "popup", "power-user", "AccountStorage", "SimpleMutex", "textgen-settings", "constants", "group-chats", "RossAscends-mods", "instruct-mode"];
plugin({
  name: "st-stubs",
  setup(build) {
    build.onResolve({ filter: /\.js$/ }, (args) => {
      const imp = String(args.importer || "").replace(/\\/g, "/");
      if (!imp.includes("/public/scripts/") || args.path.includes("/macros/") || args.path.startsWith("./")) return undefined;
      const base = args.path.split("/").pop()!.replace(/\.js$/, "");
      if (names.includes(base)) return { path: STUBS + "stub-" + base + ".js" };
      return undefined;
    });
  },
});
