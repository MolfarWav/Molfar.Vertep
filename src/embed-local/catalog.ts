/**
 * The embeddings models the engine can download and run on this computer (#255, research #216).
 * Both are int8 ONNX files from Hugging Face, pinned to one commit and checked by size and sha256,
 * run by transformers.js. File sizes and hashes come from the repository listing at that commit.
 */
export type LocalModelId = "bge-m3" | "embeddinggemma-2";

export interface LocalFile {
  /** Path inside the repository. */
  path: string;
  size: number;
  /** sha256 of the file (Hugging Face lists it for the large files only). */
  sha256?: string;
}

export interface LocalModelDef {
  id: LocalModelId;
  title: string;
  /** Hugging Face repository (also the folder under models/). */
  repo: string;
  /** The commit the files are fetched from. */
  revision: string;
  license: string;
  /** Memory the loaded model takes, MB (measured in the #216 bench). */
  ramMb: number;
  dtype: "q8";
  pooling: "cls" | "mean";
  /** The repository holds a model for text, pictures and sound; only the text part is downloaded and the
   *  config is read without the other two, so transformers.js loads no encoders for them. */
  textOnly?: boolean;
  /** Prefixes the model was trained with; "" = none. A text to search is a query, a stored one a document. */
  queryPrefix: string;
  docPrefix: string;
  files: LocalFile[];
}

export const RUNTIME_PACKAGE = { name: "@huggingface/transformers", version: "4.3.2" } as const;
export const HF_HOST = "https://huggingface.co";

export const LOCAL_MODELS: readonly LocalModelDef[] = [
  {
    id: "bge-m3",
    title: "bge-m3",
    repo: "Xenova/bge-m3",
    revision: "4de13258303883538bd53b696b452bf8099f0858",
    license: "MIT",
    ramMb: 1100,
    dtype: "q8",
    pooling: "cls",
    queryPrefix: "",
    docPrefix: "",
    files: [
      { path: "config.json", size: 770 },
      { path: "tokenizer_config.json", size: 1173 },
      { path: "tokenizer.json", size: 17082821, sha256: "6710678b12670bc442b99edc952c4d996ae309a7020c1fa0096dd245c2faf790" },
      { path: "onnx/model_quantized.onnx", size: 569694530, sha256: "0826f8c1ab9edf1801db86c61919d4d108e8bfc0b809ec823ad366882ff0b77d" },
    ],
  },
  {
    id: "embeddinggemma-2",
    title: "EmbeddingGemma 2",
    repo: "onnx-community/embeddinggemma-2-ONNX",
    revision: "daa72c51243991dfcaf9f9137d2c573d8f7790c0",
    license: "Apache 2.0",
    ramMb: 600,
    dtype: "q8",
    pooling: "mean",
    textOnly: true,
    queryPrefix: "task: search result | query: ",
    docPrefix: "title: none | text: ",
    files: [
      { path: "config.json", size: 5031 },
      { path: "tokenizer_config.json", size: 1599 },
      { path: "tokenizer.json", size: 32170510, sha256: "4d777ef5bdc1aa36227abdfb77c3e49e7b9c892d16e1b6bda41c393504828be4" },
      { path: "onnx/model_quantized.onnx", size: 495165, sha256: "d06edd601f851c633a2519304cbeb8dc6170d7ceb61b436625c17fb9b6e74953" },
      { path: "onnx/model_quantized.onnx_data", size: 313724928, sha256: "278a7ff1248c3618e4bd11a607fc54f7bdc7778854230f3956d3f86bd9db4f3b" },
    ],
  },
];

export const modelBytes = (m: LocalModelDef): number => m.files.reduce((a, f) => a + f.size, 0);
export const findLocalModel = (id: unknown, models: readonly LocalModelDef[] = LOCAL_MODELS): LocalModelDef | null =>
  models.find((m) => m.id === id) ?? null;
