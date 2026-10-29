"use client";

import { ComposerSettings } from "@/Header";
import { ContextActions } from "@/ContextActions";

import {
  ComposerAddAttachment,
  UserMessageAttachments,
} from "@/components/assistant-ui/elements/attachment.aui";
import { ContextDisplay } from "@/components/assistant-ui/elements/context-display";
import { File } from "@/components/assistant-ui/elements/file";
import { ThreadFollowupSuggestions } from "@/components/assistant-ui/elements/follow-up-suggestions.aui";
import { Image } from "@/components/assistant-ui/elements/image";
import { MarkdownText } from "@/components/assistant-ui/elements/markdown-text";
import { ChainOfThought, ReasoningStep } from "@/components/assistant-ui/elements/chain-of-thought";
import { ToolFallback } from "@/components/assistant-ui/elements/tool-fallback.aui";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AskBar } from "@/AskBar"
import { FileMentions } from "@/FileMentions";
import { QuickActions, QuickGrid, ReplyQuickActions, templateIcon, usePickTemplate, useTemplates } from "@/QuickActions";
import { SlashCommands } from "@/SlashCommands";
import { cn, copyText } from "@/lib/utils";
import {
  ActionBarMorePrimitive,
  ActionBarPrimitive,
  AuiIf,
  type AssistantState,
  BranchPickerPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  groupPartByType,
  MessagePrimitive,
  SuggestionPrimitive,
  ThreadPrimitive,
  type FileMessagePartComponent,
  type ImageMessagePartComponent,
  type ToolCallMessagePartComponent,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import { ArrowDown, ArrowUp, Check, CaretLeft, CaretRight, Copy, DownloadSimple, ClockCounterClockwise, Microphone, DotsThree, PencilSimple, ArrowsClockwise, Square } from "@phosphor-icons/react";
import { useEnterSends } from "@/hooks/use-touch-ui";
import { currentProjectId, effectiveModel, useAgent as useAgentStore } from "@/store";
import type { EngineSession } from "@/api";
import { RunCheckpoints } from "@/Checkpoints";
import { RunInfo } from "@/RunInfo";
import { modelShowsCost } from "@/lib/cost-display";
import { compactTokens, usd, whenLabel } from "@/lib/format";
import { MolfarAvatar, MolfarHalo } from "@/MolfarAvatar";
import { ComposerProjectRow, ProjectAttachButton, ProjectContextLine, SaveToProjectAction } from "@/ProjectChat";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type FC,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";

/**
 * Optional component overrides for the thread. `AssistantMessage` and
 * `Welcome` replace whole sections; `ToolFallback` renders tool calls that
 * have no UI registered by name (toolkit `render`, `useAssistantDataUI`).
 */
export type ThreadComponents = {
  AssistantMessage?: ComponentType | undefined;
  Welcome?: ComponentType | undefined;
  ToolFallback?: ToolCallMessagePartComponent | undefined;
};

export type ThreadProps = {
  components?: ThreadComponents | undefined;
  autoFocus?: boolean | undefined;
};

const EMPTY_COMPONENTS: ThreadComponents = {};

const ThreadComponentsContext =
  createContext<ThreadComponents>(EMPTY_COMPONENTS);

// Startup exposes a loading placeholder thread; treat it as a new chat so
// the composer mounts centered. Loads after startup keep the docked layout.
const isNewChatView = (s: AssistantState) =>
  s.thread.messages.length === 0 &&
  (!s.thread.isLoading || s.threads.isLoading);

// A switched thread that is still fetching its history: skeleton, not welcome.
const isHistoryLoadingView = (s: AssistantState) =>
  s.thread.messages.length === 0 &&
  s.thread.isLoading &&
  !s.thread.isDisabled &&
  !s.threads.isLoading;

const ThreadHistorySkeleton: FC = () => (
  <div
    data-slot="aui_thread-history-skeleton"
    role="status"
    className="animate-in fade-in fill-mode-both flex flex-col gap-y-6 [animation-delay:150ms] [animation-duration:200ms]"
  >
    <span className="sr-only">Loading conversation</span>
    <Skeleton className="ml-auto h-9 w-2/5 rounded-xl motion-reduce:animate-none" />
    <div className="flex flex-col gap-y-2">
      <Skeleton className="h-4 w-11/12 motion-reduce:animate-none" />
      <Skeleton className="h-4 w-4/5 motion-reduce:animate-none" />
      <Skeleton className="h-4 w-3/5 motion-reduce:animate-none" />
    </div>
    <Skeleton className="ml-auto h-9 w-1/3 rounded-xl motion-reduce:animate-none" />
    <div className="flex flex-col gap-y-2">
      <Skeleton className="h-4 w-10/12 motion-reduce:animate-none" />
      <Skeleton className="h-4 w-2/3 motion-reduce:animate-none" />
    </div>
  </div>
);

export const Thread: FC<ThreadProps> = ({
  components = EMPTY_COMPONENTS,
  autoFocus = true,
}) => {
  return (
    <ThreadComponentsContext.Provider value={components}>
      <ThreadRoot autoFocus={autoFocus} />
    </ThreadComponentsContext.Provider>
  );
};

/**
 * Keeps the thread on its newest line while the reader is at the bottom. The
 * viewport's own follow reacts to DOM changes, but a step panel opening grows
 * the thread through a height animation that changes no DOM, and a phone
 * keyboard shrinks the viewport without touching its content: both left the
 * reader a little above the bottom with the jump-to-bottom arrow showing. So
 * sizes are watched here too — at the bottom before a change, back at the
 * bottom after it. Scrolling up is the only thing that stops the follow.
 */
function useFollowBottom(contentRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const content = contentRef.current;
    const viewport = content?.closest<HTMLElement>('[data-slot="aui_thread-viewport"]');
    if (!content || !viewport) return;
    const atBottom = () =>
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= 2;
    let following = atBottom();
    const onScroll = () => {
      following = atBottom();
    };
    const onResize = () => {
      if (following && !atBottom()) viewport.scrollTop = viewport.scrollHeight;
    };
    viewport.addEventListener("scroll", onScroll, { passive: true });
    const observer = new ResizeObserver(onResize);
    observer.observe(content);
    observer.observe(viewport);
    return () => {
      viewport.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, [contentRef]);
}

const ThreadRoot: FC<{ autoFocus: boolean }> = ({ autoFocus }) => {
  const { Welcome = ThreadWelcome } = useContext(ThreadComponentsContext);
  const messagesRef = useRef<HTMLDivElement>(null);
  useFollowBottom(messagesRef);

  return (
    <ThreadPrimitive.Root
      className="aui-root aui-thread-root bg-background @container flex min-h-0 flex-1 flex-col"
      style={{
        ["--thread-max-width" as string]: "min(1100px, 100%)",
        ["--composer-bg" as string]: "var(--color-card)",
        ["--composer-radius" as string]: "1.5rem",
        ["--composer-padding" as string]: "8px",
      }}
    >
      <ThreadPrimitive.Viewport
        data-slot="aui_thread-viewport"
        turnAnchor="bottom"
        autoScroll
        className="relative flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain px-4 pt-4 md:px-6 vertep:bg-[radial-gradient(color-mix(in_oklab,var(--border)_70%,transparent)_1px,transparent_1px)] vertep:bg-[size:14px_14px]"
      >
        <ProjectContextLine />
        {/* a new chat keeps the composer at the bottom like any other; the
            welcome takes the room above it and sits in the middle of it */}
        <AuiIf condition={isNewChatView}>
          <div className="flex flex-1 flex-col">
            <Welcome />
          </div>
        </AuiIf>
        <AuiIf condition={isHistoryLoadingView}>
          <ThreadHistorySkeleton />
        </AuiIf>

        <div
          ref={messagesRef}
          data-slot="aui_message-group"
          className="mx-auto mb-8 flex w-full max-w-(--thread-max-width) shrink-0 flex-col gap-y-6 empty:hidden"
        >
          <ThreadPrimitive.Messages>
            {() => <ThreadMessage />}
          </ThreadPrimitive.Messages>
        </div>

        <ThreadPrimitive.ViewportFooter className="aui-thread-viewport-footer bg-background sticky bottom-0 mx-auto mt-auto flex w-full max-w-(--thread-max-width) shrink-0 flex-col gap-4 overflow-visible rounded-t-(--composer-radius) pt-2 pb-4 md:pb-6">
          <ThreadScrollToBottom />
          <ThreadFollowupSuggestions />
          <AskBar />
          {/* an empty chat already offers the templates as cards (desktop) or a grid (phone) */}
          <AuiIf condition={(s) => !isNewChatView(s) && s.composer.isEmpty && !s.thread.isRunning}>
            <QuickActions />
          </AuiIf>
          <AuiIf condition={(s) => isNewChatView(s) && s.composer.isEmpty}>
            <QuickGrid />
          </AuiIf>
          <Composer autoFocus={autoFocus} />
          <AuiIf condition={(s) => isNewChatView(s) && s.composer.isEmpty}>
            <ThreadSuggestions />
          </AuiIf>
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const ThreadMessage: FC = () => {
  const { AssistantMessage: AssistantMessageComponent = AssistantMessage } =
    useContext(ThreadComponentsContext);
  const role = useAuiState((s) => s.message.role);
  const isEditing = useAuiState((s) => s.message.composer.isEditing);

  if (isEditing) return <EditComposer />;
  if (role === "user") return <UserMessage />;
  return <AssistantMessageComponent />;
};

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip="Scroll to bottom"
        variant="outline"
        className="aui-thread-scroll-to-bottom dark:border-border dark:bg-background dark:hover:bg-accent absolute -top-12 z-10 self-center rounded-full p-4 disabled:invisible"
      >
        <ArrowDown />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};

const ThreadWelcome: FC = () => {
  const project = useAgentStore(currentProjectId);
  const title = useAgentStore((st) => {
    const p = st.projects.find((x) => x.id === currentProjectId(st));
    return p ? p.title || p.name : null;
  });
  return (
    <div className="aui-thread-welcome-root my-auto flex flex-col items-center px-4 text-center">
      {/* smaller on phones: the welcome and three recent chats must fit above the grid */}
      <MolfarHalo size={60} className="fade-in animate-in fill-mode-both mb-2 duration-200 md:hidden" />
      <MolfarHalo size={88} className="fade-in animate-in fill-mode-both mb-3 duration-200 max-md:hidden" />
      <h1 className="aui-thread-welcome-message-inner fade-in slide-in-from-bottom-1 animate-in fill-mode-both font-heading text-2xl font-normal tracking-tight duration-200 md:text-3xl">
        How can I help you today?
      </h1>
      {project && title ? (
        <p className="text-muted-foreground mt-2 text-sm">
          Working in <span className="text-foreground">{title}</span> · Molfar sees its instructions, memory and skills.
        </p>
      ) : null}
      <StarterCards project={project} />
    </div>
  );
};

const cardClass =
  "bg-card hover:bg-muted hover:border-brand-line hover:-translate-y-px border-border/60 fade-in slide-in-from-bottom-2 animate-in fill-mode-both flex min-h-16 min-w-0 items-start gap-3 rounded-xl border p-3 text-left transition duration-200";

/** Starter cards on an empty chat: pick up the last chat, or start one of the
 *  task templates. A phone lists the last three chats instead: its templates
 *  are the grid above the composer. */
const StarterCards: FC<{ project: string | null }> = ({ project }) => {
  const sessions = useAgentStore((s) => s.sessions);
  const projects = useAgentStore((s) => s.projects);
  const open = useAgentStore((s) => s.open);
  const templates = useTemplates();
  const pick = usePickTemplate();
  // the newest chat of this project, or of any when there is no project
  const recent: EngineSession[] = sessions
    .filter((x) => !x.archived && x.lastAt && (!project || x.project === project))
    .sort((a, b) => (b.lastAt ?? 0) - (a.lastAt ?? 0))
    .slice(0, 3);
  const last = recent[0];
  const projectOf = (id?: string | null) => {
    const p = projects.find((x) => x.id === id);
    return p ? p.title || p.name : null;
  };
  if (!last && !templates.length) return null;
  return (
    <div data-testid="starter-cards" className="mt-6 flex w-full max-w-4xl flex-col gap-4">
      {recent.length ? (
        <section aria-label="Continue" data-testid="continue-row" className="flex flex-col gap-1.5">
          <h2 className="text-muted-foreground text-start text-xs font-medium tracking-wide uppercase">Continue</h2>
          <div className="flex flex-col gap-2">
            {recent.map((chat, i) => (
              <button
                key={chat.sessionId}
                type="button"
                className={cn(cardClass, "min-h-14 w-full items-center", i === 0 ? "border-brand-line bg-brand-soft hover:bg-brand-soft" : "md:hidden")}
                onClick={() => void open(chat.sessionId)}
              >
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", i === 0 ? "bg-brand text-brand-foreground" : "bg-brand-soft text-brand")}>
                  <ClockCounterClockwise aria-hidden size={18} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="line-clamp-2 text-sm font-medium">{chat.title || "New chat"}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {whenLabel(chat.lastAt ?? 0)}
                    {projectOf(chat.project) ? ` · ${projectOf(chat.project)}` : ""}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
      {templates.length ? (
        <section aria-label="Start something new" data-guide="agent.quick" className="flex flex-col gap-1.5 max-md:hidden">
          <h2 className="text-muted-foreground text-start text-xs font-medium tracking-wide uppercase">Start something new</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.slice(0, 6).map((t) => {
              const Icon = templateIcon(t.id);
              return (
                <button key={t.id} type="button" className={cardClass} onClick={() => pick(t)}>
                  <span className="bg-brand-soft text-brand flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <Icon aria-hidden size={18} />
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm font-medium">{t.label}</span>
                    <span className="text-muted-foreground line-clamp-2 text-xs">{t.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
};

const ThreadSuggestions: FC = () => {
  return (
    <div className="aui-thread-welcome-suggestions flex w-full flex-wrap items-center justify-center gap-2 px-4">
      <ThreadPrimitive.Suggestions>
        {() => <ThreadSuggestionItem />}
      </ThreadPrimitive.Suggestions>
    </div>
  );
};

const ThreadSuggestionItem: FC = () => {
  return (
    <div className="aui-thread-welcome-suggestion-display fade-in slide-in-from-bottom-2 animate-in fill-mode-both duration-200">
      <SuggestionPrimitive.Trigger send asChild>
        <Button
          variant="ghost"
          className="aui-thread-welcome-suggestion text-foreground hover:bg-muted border-border/60 h-auto gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-normal whitespace-nowrap transition-colors"
        >
          <SuggestionPrimitive.Title className="aui-thread-welcome-suggestion-text-1" />
          <SuggestionPrimitive.Description className="aui-thread-welcome-suggestion-text-2 empty:hidden" />
        </Button>
      </SuggestionPrimitive.Trigger>
    </div>
  );
};

/** Context fill of the last run (input + cached input) against the selected
 *  model's window — engine-reported numbers only; hidden while unknown. */
const ComposerContextRing: FC = () => {
  const usage = useAgentStore((s) => s.usage)
  const model = useAgentStore(effectiveModel)
  const models = useAgentStore((s) => s.models)
  if (!usage) return null
  // no model picked: the engine ran the first shown one
  const window = (model ? models.find((m) => `${m.provider}/${m.modelId}` === model) : models.find((m) => m.shown))?.contextWindow
  if (!window) return null
  return (
    <ContextDisplay.Ring
      modelContextWindow={window}
      usage={{
        totalTokens: usage.input + usage.cacheRead,
        inputTokens: usage.input,
        cachedInputTokens: usage.cacheRead,
        outputTokens: usage.output,
      }}
      side="top"
    />
  )
};

/** What this chat has cost so far: tokens over every model call of every run,
 *  and their price where the model has one. Tool-heavy runs make many calls,
 *  so this is usually far more than the context ring's last-call figure. */
const ComposerSpend: FC = () => {
  const spend = useAgentStore((s) => s.spend)
  const showCost = useAgentStore((s) => modelShowsCost(s.models, effectiveModel(s)))
  if (!spend) return null
  const priced = showCost && spend.cost > 0
  const label = `chat ${compactTokens(spend.tokens)} tok${priced ? ` · ${spend.unpriced ? "≥" : ""}${usd(spend.cost)}` : ""}`
  const title = !showCost
    ? `This chat used ${spend.tokens.toLocaleString()} tokens.`
    : !priced
    ? `This chat used ${spend.tokens.toLocaleString()} tokens. Its model has no known price: set one in Settings to see the cost.`
    : spend.unpriced
      ? `This chat used ${spend.tokens.toLocaleString()} tokens. Some runs have no known price, so the cost is at least ${usd(spend.cost)}.`
      : `This chat used ${spend.tokens.toLocaleString()} tokens, costing ${usd(spend.cost)}.`
  return (
    <span className="text-muted-foreground hidden text-xs tabular-nums whitespace-nowrap sm:inline" title={title}>
      {label}
    </span>
  )
};

/** Unsent composer text lives under a per-thread key so a reload — the app's
 *  own reload after a rebuild included — never eats a half-written message. */
/** The external-store runtime's id for a chat with no session yet. */
const DEFAULT_THREAD_ID = "DEFAULT_THREAD_ID";
const draftKey = (sessionId: string | null) =>
  `molfar.agent.draft.${sessionId ?? "new"}`;
const readDraft = (key: string): string => {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
};

const Composer: FC<{ autoFocus: boolean }> = ({ autoFocus }) => {
  const aui = useAui();
  const enterSends = useEnterSends();
  const sessionId = useAgentStore((s) => s.sessionId);
  // bumped when a draft is placed in the new chat from outside (a skill's "Improve with the agent")
  const draftSeed = useAgentStore((s) => s.draftSeed);
  const booting = useRef(true);
  // The runtime swaps its thread, and with it the composer, in an effect of
  // App, which runs AFTER this one: a draft set before the swap went into the
  // old composer and the new empty one then erased it. Load only once the
  // runtime is on this chat's thread (an unsaved chat is its default thread).
  const onThread = useAuiState((s) => s.threads.mainThreadId) === (sessionId ?? DEFAULT_THREAD_ID);
  const running = useAuiState((s) => s.thread.isRunning);
  // While Molfar works the runtime ignores Enter (no queue adapter); the store's
  // send() turns a send during a run into a steer, so submit the form ourselves.
  const steerOnEnter = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!running || !enterSends || e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    e.currentTarget.closest("form")?.requestSubmit();
  };
  const steerOnSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (!running) return;
    // the runtime's own submit is off during a run; send() reaches onNew, which steers
    e.preventDefault();
    if (aui.composer.getState().canSend) void aui.composer.send();
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: draftSeed only re-runs the load for an unchanged thread
  useEffect(() => {
    if (!onThread) return;
    const key = draftKey(sessionId);
    const stored = readDraft(key);
    // The thread the tab was on is reopened a beat after boot, so text typed
    // into the empty composer in that window belongs to it and carries over.
    // Every later thread switch loads that thread's own draft, empty or not.
    const carry = booting.current && !stored && aui.composer.getState().text;
    booting.current = false;
    if (!carry) aui.composer.setText(stored);
    // every client state change lands here, streaming tokens included: only a
    // real edit of the composer is worth a write
    let written = carry ? aui.composer.getState().text : stored;
    return aui.subscribe(() => {
      const text = aui.composer.getState().text;
      if (text === written) return;
      written = text;
      try {
        if (text) localStorage.setItem(key, text);
        else localStorage.removeItem(key);
      } catch { /* storage unavailable */ }
    });
  }, [aui, sessionId, draftSeed, onThread]);
  return (
    <ComposerPrimitive.Unstable_TriggerPopoverRoot>
      <ComposerPrimitive.Root className="aui-composer-root relative flex w-full flex-col" onSubmit={steerOnSubmit}>
        <ComposerPrimitive.AttachmentDropzone asChild>
          <div
            data-slot="aui_composer-shell"
            data-guide="agent.composer"
            className="border-border/60 data-[dragging=true]:border-ring focus-within:border-border dark:border-muted-foreground/15 dark:focus-within:border-muted-foreground/30 flex w-full cursor-text flex-col gap-2 rounded-(--composer-radius) border bg-(--composer-bg) p-(--composer-padding) transition-[border-color] data-[dragging=true]:border-dashed data-[dragging=true]:bg-[color-mix(in_oklab,var(--color-accent)_50%,var(--color-background))]"
          >
            <ComposerProjectRow />
            <ComposerPrimitive.Input
              placeholder={running ? "Add to what Molfar is doing…" : "Ask Molfar…"}
              className="aui-composer-input caret-primary placeholder:text-muted-foreground/60 max-h-48 min-h-10 w-full resize-none bg-transparent px-2.5 py-1 text-base leading-6 outline-none"
              rows={1}
              autoFocus={autoFocus}
              submitOnEnter={enterSends}
              onKeyDown={steerOnEnter}
              enterKeyHint={enterSends ? "send" : "enter"}
              aria-label="Message input"
            />
            <SlashCommands />
            <FileMentions />
            <ComposerAction />
          </div>
        </ComposerPrimitive.AttachmentDropzone>
      </ComposerPrimitive.Root>
    </ComposerPrimitive.Unstable_TriggerPopoverRoot>
  );
};

// Shown for the whole run so the option is visible before typing (#71). Empty
// box: dimmed and inert, but not `disabled`, so the tooltip still explains it.
// The form's submit handler already ignores an empty composer.
const SteerButton: FC = () => {
  const empty = useAuiState((s) => s.composer.isEmpty);
  return (
    <TooltipIconButton
      tooltip={empty ? "Type a message to send it to Molfar now" : "Send to Molfar now"}
      side="bottom"
      type="submit"
      variant="default"
      size="icon"
      aria-disabled={empty}
      onClick={(e) => {
        if (empty) e.preventDefault();
      }}
      className={cn(
        "aui-composer-steer bg-brand text-brand-foreground hover:bg-brand/90 size-8 rounded-full",
        empty && "bg-muted text-muted-foreground hover:bg-muted cursor-default",
      )}
      aria-label="Send to Molfar now"
    >
      <ArrowUp className="aui-composer-send-icon size-4" />
    </TooltipIconButton>
  );
};

const ComposerAction: FC = () => {
  return (
    // one row at every width; on a narrow one the model name moves to a row of its own above
    <div className="aui-composer-action-wrapper relative flex items-center justify-between gap-1">
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <ComposerAddAttachment />
        <ProjectAttachButton />
        <ComposerSettings />
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <ComposerSpend />
        <ComposerContextRing />
        <ContextActions />
        <AuiIf condition={(s) => s.thread.capabilities.dictation}>
          <AuiIf condition={(s) => s.composer.dictation == null}>
            <ComposerPrimitive.Dictate asChild>
              <TooltipIconButton
                tooltip="Voice input"
                side="bottom"
                type="button"
                variant="ghost"
                size="icon"
                className="aui-composer-dictate text-muted-foreground hover:text-foreground size-7 rounded-full"
                aria-label="Start voice input"
              >
                <Microphone className="aui-composer-dictate-icon size-4" />
              </TooltipIconButton>
            </ComposerPrimitive.Dictate>
          </AuiIf>
          <AuiIf condition={(s) => s.composer.dictation != null}>
            <ComposerPrimitive.StopDictation asChild>
              <TooltipIconButton
                tooltip="Stop dictation"
                side="bottom"
                type="button"
                variant="ghost"
                size="icon"
                className="aui-composer-stop-dictation text-destructive size-7 rounded-full"
                aria-label="Stop voice input"
              >
                <Square className="aui-composer-stop-dictation-icon size-3.5 animate-pulse fill-current" />
              </TooltipIconButton>
            </ComposerPrimitive.StopDictation>
          </AuiIf>
        </AuiIf>
        <AuiIf condition={(s) => !s.thread.isRunning}>
          <ComposerPrimitive.Send asChild>
            <TooltipIconButton
              tooltip="Send message"
              side="bottom"
              type="button"
              variant="default"
              size="icon"
              className="aui-composer-send bg-brand text-brand-foreground hover:bg-brand/90 disabled:bg-muted disabled:text-muted-foreground size-8 rounded-full"
              aria-label="Send message"
            >
              <ArrowUp className="aui-composer-send-icon size-4" />
            </TooltipIconButton>
          </ComposerPrimitive.Send>
        </AuiIf>
        <AuiIf condition={(s) => s.thread.isRunning}>
          <SteerButton />
        </AuiIf>
        <AuiIf condition={(s) => s.thread.isRunning}>
          <ComposerPrimitive.Cancel asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="aui-composer-cancel border-brand text-brand hover:bg-brand-soft hover:text-brand size-8 rounded-full"
              aria-label="Stop generating"
            >
              <Square className="aui-composer-cancel-icon size-3.5 fill-current" />
            </Button>
          </ComposerPrimitive.Cancel>
        </AuiIf>
      </div>
    </div>
  );
};

const MessageError: FC = () => {
  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className="aui-message-error-root border-destructive bg-destructive/10 text-destructive dark:bg-destructive/5 mt-2 rounded-md border p-3 text-sm dark:text-red-200">
        <ErrorPrimitive.Message className="aui-message-error-message line-clamp-2" />
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
};

const AssistantMessage: FC = () => {
  const { ToolFallback: ToolFallbackComponent = ToolFallback } =
    useContext(ThreadComponentsContext);

  const ACTION_BAR_PT = "pt-1.5";
  // Keep the action bar inside the contained root's paint box, then cancel its reserved space in flow.
  const ACTION_BAR_HEIGHT = `min-h-7.5 ${ACTION_BAR_PT}`;

  return (
    <MessagePrimitive.Root
      data-slot="aui_assistant-message-root"
      data-role="assistant"
      className="fade-in slide-in-from-bottom-1 animate-in relative -mb-7.5 pb-7.5 duration-150 [contain-intrinsic-size:auto_200px] [content-visibility:auto]"
    >
      <div className="flex items-start gap-2.5 ps-2">
      <MolfarAvatar size={28} className="mt-0.5" />
      <div className="min-w-0 flex-1">
      <div
        data-slot="aui_assistant-message-content"
        className="text-foreground pe-2 leading-relaxed wrap-break-word"
      >
        {/* reasoning and tool calls between two pieces of the answer are one
            step list, interleaved in the order the model produced them */}
        <MessagePrimitive.GroupedParts
          groupBy={groupPartByType({
            reasoning: ["group-chainOfThought"],
            "tool-call": ["group-chainOfThought"],
            "standalone-tool-call": [],
          })}
        >
          {({ part, children }) => {
            switch (part.type) {
              case "group-chainOfThought":
                return (
                  <ChainOfThought
                    indices={part.indices}
                    running={part.status.type === "running"}
                  >
                    {children}
                  </ChainOfThought>
                );
              case "text":
                return <MarkdownText />;
              case "reasoning":
                return <ReasoningStep running={part.status.type === "running"} />;
              case "tool-call":
                return part.toolUI ?? <ToolFallbackComponent {...part} />;
              case "data":
                return part.dataRendererUI;
              case "file":
                return (
                  <div data-slot="aui_assistant-message-file" className="py-1">
                    <File {...part} />
                  </div>
                );
              case "image":
                return (
                  <div data-slot="aui_assistant-message-image" className="py-1">
                    <Image {...part} />
                  </div>
                );
              case "indicator":
                return (
                  <span
                    data-slot="aui_assistant-message-indicator"
                    className="animate-pulse font-sans"
                    aria-label="Molfar is working"
                  >
                    {"●"}
                  </span>
                );
              default:
                return null;
            }
          }}
        </MessagePrimitive.GroupedParts>
        <MessageError />
      </div>
      <div className="-ms-2">
        <RunCheckpoints />
        <RunInfo />
      </div>

      <div
        data-slot="aui_assistant-message-footer"
        className={cn("flex items-center", ACTION_BAR_HEIGHT)}
      >
        <BranchPicker />
        <AssistantActionBar />
      </div>
      </div>
      </div>
    </MessagePrimitive.Root>
  );
};

/** The library's copy action writes through `navigator.clipboard`, which is
 *  absent off a secure origin (a phone reaching the engine over plain http on
 *  a LAN address), so it silently rejected there. Same message text, our
 *  clipboard helper, and the check mark only after a write that landed. */
const CopyAction: FC = () => {
  const aui = useAui();
  const isEditing = useAuiState((s) => s.composer.isEditing);
  const composerText = useAuiState((s) => s.composer.text);
  const [isCopied, setIsCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const onCopy = () => {
    const text = isEditing ? composerText : aui.message.getCopyText();
    if (!text) return;
    void copyText(text).then((ok) => {
      if (!ok) return;
      setIsCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setIsCopied(false), 2000);
    });
  };

  return (
    <TooltipIconButton tooltip="Copy" onClick={onCopy}>
      {isCopied ? (
        <Check className="animate-in zoom-in-50 fade-in duration-200 ease-out" />
      ) : (
        <Copy className="animate-in zoom-in-75 fade-in duration-150" />
      )}
    </TooltipIconButton>
  );
};

const AssistantActionBar: FC = () => {
  const [saving, setSaving] = useState(false);
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide={saving ? "never" : "not-last"}
      className="aui-assistant-action-bar-root text-muted-foreground animate-in fade-in col-start-3 row-start-2 -ms-1 flex flex-wrap items-center gap-1 duration-200 [&>button:hover]:bg-brand-soft [&>button:hover]:text-brand"
    >
      <CopyAction />
      <ActionBarPrimitive.Reload asChild>
        <TooltipIconButton tooltip="Refresh">
          <ArrowsClockwise />
        </TooltipIconButton>
      </ActionBarPrimitive.Reload>
      <SaveToProjectAction open={saving} onOpenChange={setSaving} />
      <ActionBarMorePrimitive.Root>
        <ActionBarMorePrimitive.Trigger asChild>
          <TooltipIconButton
            tooltip="More"
            className="data-[state=open]:bg-accent"
          >
            <DotsThree />
          </TooltipIconButton>
        </ActionBarMorePrimitive.Trigger>
        <ActionBarMorePrimitive.Content
          side="bottom"
          align="start"
          sideOffset={6}
          className="aui-action-bar-more-content bg-popover text-popover-foreground data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:animate-out data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] overflow-hidden rounded-xl border p-1.5"
        >
          <ActionBarPrimitive.ExportMarkdown asChild>
            <ActionBarMorePrimitive.Item className="aui-action-bar-more-item hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none select-none">
              <DownloadSimple className="size-4" />
              Export as Markdown
            </ActionBarMorePrimitive.Item>
          </ActionBarPrimitive.ExportMarkdown>
        </ActionBarMorePrimitive.Content>
      </ActionBarMorePrimitive.Root>
      <ReplyQuickActions />
    </ActionBarPrimitive.Root>
  );
};

const UserFilePart: FileMessagePartComponent = (part) => (
  <div data-slot="aui_user-message-file" className="py-1">
    <File {...part} />
  </div>
);

const UserImagePart: ImageMessagePartComponent = (part) => (
  <div data-slot="aui_user-message-image" className="py-1">
    <Image {...part} />
  </div>
);

const UserMessage: FC = () => {
  const messageId = useAuiState((s) => s.message.id);
  // a correction sent mid-run is read when the current step ends (#73)
  const unread = useAgentStore((s) => s.steerPending.some((p) => p.id === messageId));
  return (
    <MessagePrimitive.Root
      data-slot="aui_user-message-root"
      className="fade-in slide-in-from-bottom-1 animate-in grid auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 duration-150 [contain-intrinsic-size:auto_200px] [content-visibility:auto] [&:where(>*)]:col-start-2"
      data-role="user"
    >
      <UserMessageAttachments />

      <div className="aui-user-message-content-wrapper relative col-start-2 min-w-0">
        <div className="aui-user-message-content peer bg-card text-foreground rounded-xl border px-4 py-2 wrap-break-word empty:hidden">
          <MessagePrimitive.Parts
            components={{ File: UserFilePart, Image: UserImagePart }}
          />
        </div>
        <div className="aui-user-action-bar-wrapper absolute start-0 top-1/2 -translate-x-full -translate-y-1/2 pe-2 peer-empty:hidden rtl:translate-x-full">
          <UserActionBar />
        </div>
      </div>
      {unread ? (
        <p className="aui-user-message-unread text-muted-foreground col-start-2 text-end text-xs" role="status">
          Molfar reads this after its current step. Stop ends the run now.
        </p>
      ) : null}

      <BranchPicker
        data-slot="aui_user-branch-picker"
        className="col-span-full col-start-1 row-start-3 -me-1 justify-end"
      />
    </MessagePrimitive.Root>
  );
};

const UserActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="aui-user-action-bar-root flex flex-col items-end"
    >
      <ActionBarPrimitive.Edit asChild>
        <TooltipIconButton tooltip="Edit" className="aui-user-action-edit">
          <PencilSimple />
        </TooltipIconButton>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};

const EditComposer: FC = () => {
  const enterSends = useEnterSends();
  return (
    <MessagePrimitive.Root
      data-slot="aui_edit-composer-wrapper"
      className="flex flex-col px-2 [contain-intrinsic-size:auto_200px] [content-visibility:auto]"
    >
      <ComposerPrimitive.Root className="aui-edit-composer-root border-border/60 dark:border-muted-foreground/15 ms-auto flex w-full max-w-[85%] cursor-text flex-col rounded-(--composer-radius) border bg-(--composer-bg)">
        <ComposerPrimitive.Input
          className="aui-edit-composer-input text-foreground min-h-14 w-full resize-none bg-transparent px-4 pt-3 pb-1 text-base outline-none"
          autoFocus
          submitOnEnter={enterSends}
          enterKeyHint={enterSends ? "send" : "enter"}
        />
        <div className="aui-edit-composer-footer mx-2.5 mb-2.5 flex items-center gap-1.5 self-end">
          <ComposerPrimitive.Cancel asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 rounded-full px-3.5"
            >
              Cancel
            </Button>
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send asChild>
            <Button size="sm" className="h-8 rounded-full px-3.5">
              Update
            </Button>
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  );
};

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({
  className,
  ...rest
}) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        "aui-branch-picker-root text-muted-foreground -ms-2 me-2 inline-flex items-center text-xs",
        className,
      )}
      {...rest}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip="Previous">
          <CaretLeft />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <span className="aui-branch-picker-state font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip="Next">
          <CaretRight />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};
