/**
 * The code that runs a model, as a string. It is written to a file in the embed-local folder and run by
 * its own Bun process (not a Worker: the native addon under the model crashed Bun itself when a second
 * Worker loaded it after the first was let go, #352; a process of its own takes only itself down, and
 * letting it go really frees its memory). It imports the runtime package from the folder it was installed
 * into and answers one message at a time. Messages are one JSON object per line: in on stdin, out on stdout
 * behind a \u0001 mark (a library may print to stdout too; only marked lines are answers).
 *   in:  { id, type: "load", lib, modelsDir, repo, dtype, textOnly }   out: { id, ok: true }
 *        { id, type: "embed", texts, pooling }                out: { id, ok: true, vectors }
 * It ends when stdin closes, so it never outlives the engine.
 */
export const CHILD_SOURCE = `
let extractor = null;
const send = (o) => process.stdout.write("\\u0001" + JSON.stringify(o) + "\\n");
async function handle(m) {
  try {
    if (m.type === "load") {
      const tf = await import(m.lib);
      tf.env.allowRemoteModels = false;
      tf.env.allowLocalModels = true;
      tf.env.localModelPath = m.modelsDir;
      const opts = { dtype: m.dtype, device: "cpu" };
      if (m.textOnly) {
        const fs = await import("node:fs");
        const config = JSON.parse(fs.readFileSync(m.modelsDir + m.repo + "/config.json", "utf8"));
        delete config.vision_config;
        delete config.audio_config;
        opts.config = config;
      }
      extractor = await tf.pipeline("feature-extraction", m.repo, opts);
      send({ id: m.id, ok: true });
    } else if (m.type === "embed") {
      const out = [];
      for (let i = 0; i < m.texts.length; i += 8) {
        const res = await extractor(m.texts.slice(i, i + 8), { pooling: m.pooling, normalize: true });
        out.push(...res.tolist());
      }
      send({ id: m.id, ok: true, vectors: out });
    }
  } catch (e) {
    send({ id: m.id, ok: false, error: String((e && e.message) || e) });
  }
}
let buf = "";
let chain = Promise.resolve();
process.stdin.setEncoding("utf8");
process.stdin.on("data", (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf("\\n")) >= 0) {
    const line = buf.slice(0, i);
    buf = buf.slice(i + 1);
    if (!line.trim()) continue;
    let m;
    try { m = JSON.parse(line); } catch { continue; }
    chain = chain.then(() => handle(m));
  }
});
process.stdin.on("end", () => process.exit(0));
`;
