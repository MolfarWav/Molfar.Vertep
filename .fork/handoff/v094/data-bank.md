# Data Bank: how it works and what to do with it (2026-10-10)

Research by two external models on the same prompt and code (DeepSeek V4.1 Flash, Muse Spark 1.3;
DeepSeek V4 Pro hung 10 min and was killed). Facts marked [v] were checked in the Roleplay code by the
orchestrator; the rest is from the reports.

## Today
- Upload (Tools > Data Bank): text files only (.txt .md .json .csv .log .jsonl), 2 MB, read in the
  browser, `POST /databank`; stored as `data/databank/<id>.json` with `chunks[]`. [v]
- Chunks: 1000 characters, 150 overlap, cut blindly (mid-word, mid-sentence). [v] `chunkText`
- `scope` (global/character/chat) is stored but `scopeTargetId` is always null and the search never
  reads either: every enabled file is searched in every chat. [v] `searchDatabank`, POST /databank
- Query: the pending user text + the last 4 messages. [v] `assemble()` `dbScan`
- Score: lowercase terms >= 3 letters minus ENGLISH stopwords, `indexOf` substring counts per chunk,
  hits per 1000 chars, threshold 2.0, top 3. Ukrainian/Russian stopwords (що, як, але, для...) are
  counted; inflection half-works by accident (query "ліс" hits "лісу", query "лісу" misses "ліс");
  substrings give false hits ("пан" in "компанія"). [v]
- Insertion: one system message "[Data bank — retrieved reference material]" in `extras` (system
  block before the history), no budget, no position/depth/role setting, no source names. [v]
- The prompt preview does not show which passages went in (reports; not checked).
- Every send reads and parses every bank file and scans every chunk (reports; follows from the code).

## Where it comes from (SillyTavern)
Attachments in three scopes (global, character, chat; also per message) plus the Vector Storage
extension: chunks embedded, the last N messages as the query, a score threshold, inserted at a chosen
depth/role. Sources: files, web pages, Fandom, YouTube transcripts, notes. Used for setting bibles,
rules, long backstories, novel text, campaign notes: material too large or loose to cut into
keyed lorebook entries.

## The job it should own here
- Lorebook: exact canon with triggers (names, places, rules).
- Litopys: the memory of THIS chat (chapters, facts, arcs), written by a model from the chat.
- Data Bank: big static reference the author will not cut into keys (a setting bible, a novel, rules,
  campaign notes), retrieved by relevance.

## Proposals (both reports agree on the set; order by value/effort)
1. Real scope (S): character/chat targets on upload and in the list, the search filters by the
   chat's character and chat id. Ends cross-chat leaks.
2. Budget, position and sources (S): a token cap (default for small contexts), chunk count, insert
   in the system block or at a depth with a role, each passage labelled `file #n`.
3. Cyrillic (S): the scanner's `tokens`/`sameWord` (0.9.4 word forms) instead of substring counts,
   UA/RU stopwords; chunk on paragraph/sentence boundaries.
4. Show it (S): the passages that went into a request in the prompt preview / inspector (pairs with
   START.md item 0e).
5. Embeddings (M): vectors per chunk through `/v1/embeddings` (the lorebook vector path already does
   this), term search as the fallback; a cache, re-index on upload.
6. Document -> lorebook entries (M): split a document into proposed entries (by headings or with a
   model) that the user reviews.
