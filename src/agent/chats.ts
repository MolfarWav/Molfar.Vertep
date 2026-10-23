/**
 * The chats tool: look through the user's chats, then archive, rename, move or delete some.
 * The sidebar does the same through the session routes; without a tool the agent could only
 * read the transcripts, so "delete my old chats" ended in an apology.
 *
 * Deleting is the one step that cannot be taken back (the transcripts live outside git), so it
 * always goes through a card the user answers, and never touches the chat the request came
 * from or a chat that is working. Archiving, renaming and moving are the user's own words,
 * and undone as easily as done, so they run at once.
 */
import fs from "node:fs";
import { Type } from "typebox";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import type { AskRequest } from "./tools.js";

export interface ChatRow {
  sessionId: string;
  runs: number;
  lastAt: number | null;
  title: string | null;
  archived: boolean;
  project: string | null;
}

export interface ChatsOps {
  list: () => ChatRow[];
  rename: (id: string, title: string) => void;
  archive: (id: string, archived: boolean) => void;
  move: (id: string, project: string | null) => void;
  /** Remove the transcript. */
  remove: (id: string) => void;
  /** The user's projects: id and title, for a move. */
  projects: () => { id: string; title: string }[];
}

export interface ChatsToolOptions {
  ops: ChatsOps;
  /** The chat this request came from: never deleted. */
  sessionId: string;
  /** A run holds the chat right now: never deleted. */
  isWorking: (id: string) => boolean;
  ask?: (q: AskRequest) => Promise<string>;
  /** After a chat is gone: drop what the engine keeps for it, and tell the open pages. */
  forgotten?: (ids: string[]) => void;
}

const MAX_IDS = 50;
const LIST_DEFAULT = 50;
const LIST_MAX = 200;

const day = (ms: number | null): string => (ms ? new Date(ms).toISOString().slice(0, 10) : "never");
const titleOf = (r: ChatRow): string => r.title?.trim() || "Untitled";
const text = (t: string, details: unknown = {}) => ({ content: [{ type: "text" as const, text: t }], details });

export function buildChatsTool(o: ChatsToolOptions): AgentTool {
  return {
    name: "chats",
    label: "Chats",
    description:
      'The user\'s chats (the list in the sidebar). action "list" shows them: id, title, last used, runs, project; query matches the title, olderThanDays keeps only chats not used for that long (oldest first), archived: true includes archived ones. "archive" / "unarchive", "rename" (one id + title), "move" (project: a project id or title, or "none" to take the chats out of their project) change the chats named in ids. "delete" removes chats for good: the user always confirms in a card, so call it only for chats the user asked to remove, and list first so the card names the right ones. Never delete this chat or a chat that is working; they are skipped.',
    parameters: Type.Object({
      action: Type.Union([Type.Literal("list"), Type.Literal("archive"), Type.Literal("unarchive"), Type.Literal("rename"), Type.Literal("move"), Type.Literal("delete")]),
      ids: Type.Optional(Type.Array(Type.String(), { description: "Chat ids from list (at most 50)" })),
      title: Type.Optional(Type.String({ description: "rename: the new title" })),
      project: Type.Optional(Type.String({ description: 'move: a project id ("project:ideas", "app:roleplay") or its title; "none" for no project' })),
      query: Type.Optional(Type.String({ description: "list: words in the title" })),
      olderThanDays: Type.Optional(Type.Number({ description: "list: only chats last used more than this many days ago" })),
      archived: Type.Optional(Type.Boolean({ description: "list: include archived chats" })),
      limit: Type.Optional(Type.Number({ description: `list: how many to show (default ${LIST_DEFAULT}, at most ${LIST_MAX})` })),
    }),
    async execute(_id, params) {
      const p = params as { action: string; ids?: unknown; title?: string; project?: string; query?: string; olderThanDays?: number; archived?: boolean; limit?: number };
      const rows = o.ops.list();
      const byId = new Map(rows.map((r) => [r.sessionId, r]));
      const projectName = (id: string | null): string => (id ? (o.ops.projects().find((x) => x.id === id)?.title ?? id) : "none");

      if (p.action === "list") {
        const words = (p.query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
        const cutoff = typeof p.olderThanDays === "number" && p.olderThanDays >= 0 ? Date.now() - p.olderThanDays * 86_400_000 : null;
        let hit = rows.filter((r) => (p.archived === true || !r.archived) && words.every((w) => titleOf(r).toLowerCase().includes(w)) && (cutoff === null || (r.lastAt ?? 0) < cutoff));
        // old ones first when the question is "which are old"; otherwise as the sidebar lists them
        if (cutoff !== null) hit = hit.sort((a, b) => (a.lastAt ?? 0) - (b.lastAt ?? 0));
        const limit = Math.min(Math.max(1, Math.floor(p.limit ?? LIST_DEFAULT)), LIST_MAX);
        const shown = hit.slice(0, limit);
        const lines = shown.map((r) => {
          const marks = [r.archived ? "archived" : "", o.isWorking(r.sessionId) ? "working" : "", r.sessionId === o.sessionId ? "this chat" : ""].filter(Boolean);
          return `- ${r.sessionId} | ${titleOf(r)} | last used ${day(r.lastAt)} | ${r.runs} run${r.runs === 1 ? "" : "s"} | project: ${projectName(r.project)}${marks.length ? ` | ${marks.join(", ")}` : ""}`;
        });
        const projects = o.ops.projects();
        return text(
          `${hit.length} chat${hit.length === 1 ? "" : "s"}${hit.length > shown.length ? `, the first ${shown.length} shown` : ""}${lines.length ? `:\n${lines.join("\n")}` : "."}${projects.length ? `\nProjects: ${projects.map((x) => `${x.id} (${x.title})`).join(", ")}` : ""}`,
          { count: hit.length },
        );
      }

      const ids = Array.isArray(p.ids) ? [...new Set(p.ids.filter((x): x is string => typeof x === "string"))] : [];
      if (!ids.length) throw new Error(`${p.action} needs ids: the chat ids from list.`);
      if (ids.length > MAX_IDS) throw new Error(`At most ${MAX_IDS} chats at a time.`);
      const unknown = ids.filter((id) => !byId.has(id));
      const known = ids.filter((id) => byId.has(id));
      const missing = unknown.length ? `\nNot found: ${unknown.join(", ")}.` : "";

      if (p.action === "rename") {
        const [only] = known;
        if (known.length !== 1 || !only) throw new Error("rename takes exactly one chat id.");
        const title = (p.title ?? "").trim();
        if (!title) throw new Error("rename needs title.");
        o.ops.rename(only, title);
        o.forgotten?.([]);
        return text(`Renamed ${only} to "${title}".`, { done: known });
      }

      if (p.action === "archive" || p.action === "unarchive") {
        for (const id of known) o.ops.archive(id, p.action === "archive");
        o.forgotten?.([]);
        return text(`${p.action === "archive" ? "Archived" : "Brought back"} ${known.length} chat${known.length === 1 ? "" : "s"}.${missing}`, { done: known });
      }

      if (p.action === "move") {
        const want = (p.project ?? "").trim();
        if (!want) throw new Error('move needs project: a project id or title, or "none".');
        let target: string | null = null;
        if (want.toLowerCase() !== "none") {
          const all = o.ops.projects();
          const hit = all.find((x) => x.id === want) ?? all.find((x) => x.title.toLowerCase() === want.toLowerCase());
          if (!hit) throw new Error(`No project "${want}". The user's projects: ${all.map((x) => `${x.id} (${x.title})`).join(", ") || "none"}.`);
          target = hit.id;
        }
        for (const id of known) o.ops.move(id, target);
        o.forgotten?.([]);
        return text(`Moved ${known.length} chat${known.length === 1 ? "" : "s"} ${target ? `into ${projectName(target)}` : "out of their project"}.${missing}`, { done: known });
      }

      if (p.action === "delete") {
        const skipped: string[] = [];
        const doomed: ChatRow[] = [];
        for (const id of known) {
          const r = byId.get(id);
          if (!r) continue;
          if (id === o.sessionId) skipped.push(`${titleOf(r)} (this chat)`);
          else if (o.isWorking(id)) skipped.push(`${titleOf(r)} (working now)`);
          else doomed.push(r);
        }
        const tail = `${skipped.length ? `\nSkipped: ${skipped.join("; ")}.` : ""}${missing}`;
        if (!doomed.length) return text(`Nothing to delete.${tail}`, { done: [] });
        if (!o.ask) throw new Error("Refused: deleting chats needs the user to confirm, and the user is not available to answer.");
        const n = doomed.length;
        const answer = (
          await o.ask({
            question: `Delete ${n} chat${n === 1 ? "" : "s"} for good?`,
            options: [
              { label: "Delete", description: "removes the chat and its history; this cannot be undone" },
              { label: "Don't delete", description: "keep them" },
            ],
            detail: doomed.map((r) => `${titleOf(r)} — last used ${day(r.lastAt)}, ${r.runs} run${r.runs === 1 ? "" : "s"}`).join("\n"),
          })
        ).trim();
        if (answer !== "Delete") {
          return text(`The user did not delete them${answer && answer !== "Don't delete" && answer !== "(no answer)" ? ` and said: ${answer}` : ""}. Nothing was removed.${tail}`, { done: [] });
        }
        const gone: string[] = [];
        for (const r of doomed) {
          try {
            o.ops.remove(r.sessionId);
            gone.push(r.sessionId);
          } catch (e) {
            skipped.push(`${titleOf(r)} (${(e as Error).message})`);
          }
        }
        o.forgotten?.(gone);
        return text(`Deleted ${gone.length} chat${gone.length === 1 ? "" : "s"}.${skipped.length ? `\nSkipped: ${skipped.join("; ")}.` : ""}${missing}`, { done: gone });
      }

      throw new Error(`Unknown action "${p.action}". Use list, archive, unarchive, rename, move or delete.`);
    },
  };
}

/** Remove a transcript file (the sidebar's delete does the same). Throws when it is not there. */
export function removeTranscript(file: string): void {
  if (!fs.existsSync(file)) throw new Error("already gone");
  fs.rmSync(file);
}
