/**
 * The code that runs a model, as a string: a Bun Worker is made from it (a Blob URL), so the same
 * file works from source and in the bundled build, which has no loose worker file. It imports the
 * runtime package from the folder it was installed into and answers one message at a time.
 *   in:  { id, type: "load", lib, modelsDir, repo, dtype, textOnly }   out: { id, ok: true }
 *        { id, type: "embed", texts, pooling }                out: { id, ok: true, vectors }
 */
export const WORKER_SOURCE = `
let extractor = null;
self.onmessage = async (event) => {
  const m = event.data;
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
      self.postMessage({ id: m.id, ok: true });
    } else if (m.type === "embed") {
      const out = [];
      for (let i = 0; i < m.texts.length; i += 8) {
        const res = await extractor(m.texts.slice(i, i + 8), { pooling: m.pooling, normalize: true });
        out.push(...res.tolist());
      }
      self.postMessage({ id: m.id, ok: true, vectors: out });
    }
  } catch (e) {
    self.postMessage({ id: m.id, ok: false, error: String((e && e.message) || e) });
  }
};
`;
