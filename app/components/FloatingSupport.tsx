"use client";

import { Fragment, KeyboardEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  Globe2,
  MessageCircle,
  Phone,
  RefreshCw,
  Sparkles,
  Square,
  SquarePen,
  X,
} from "lucide-react";
import { useLanguage } from "./LanguageContext";

type Language = "en" | "bn";
type Source = { title: string; url: string };
type Message = {
  id: string;
  from: "user" | "bot";
  text: string;
  sources?: Source[];
  webSearch?: boolean;
  /** Reveal this reply progressively, like a streamed model response. */
  animate?: boolean;
  error?: boolean;
};

const SUGGESTIONS = {
  en: [
    { title: "Our services", prompt: "What services do you offer?" },
    { title: "Get a quotation", prompt: "How can I get a quotation?" },
    { title: "Project timeline", prompt: "How long does a project take?" },
    { title: "Visit our office", prompt: "Where is your office located?" },
  ],
  bn: [
    { title: "আমাদের সেবা", prompt: "আপনারা কী কী সেবা দেন?" },
    { title: "কোটেশন নিন", prompt: "আমি কীভাবে কোটেশন পাব?" },
    { title: "প্রজেক্টের সময়", prompt: "একটি প্রজেক্ট কত সময় নেয়?" },
    { title: "অফিসের ঠিকানা", prompt: "আপনাদের অফিস কোথায়?" },
  ],
} as const;

const COPY = {
  en: {
    title: "Rong Dhonu Assistant",
    status: "Answers from our website, then the web",
    greeting: "How can I help with your space?",
    sub: "Ask about services, finishes, our process or a quotation.",
    placeholder: "Message Rong Dhonu…",
    thinking: "Thinking",
    searching: "Looking that up",
    disclaimer: "AI can make mistakes. For exact prices, please call our team.",
    newChat: "New chat",
    close: "Close chat",
    open: "Open chat",
    send: "Send message",
    stop: "Stop generating",
    copy: "Copy",
    copied: "Copied",
    retry: "Regenerate",
    webUsed: "Web search used",
    sources: "Sources",
    contact: "Contact Rong Dhonu",
    toBottom: "Scroll to latest",
    error: "I couldn’t reach my answer service just now. Please try again, or call our team directly and we’ll help you.",
    label: "Rong Dhonu chat assistant",
  },
  bn: {
    title: "রংধনু অ্যাসিস্ট্যান্ট",
    status: "আগে ওয়েবসাইট, তারপর ওয়েব থেকে উত্তর",
    greeting: "আপনার স্পেস নিয়ে কীভাবে সাহায্য করতে পারি?",
    sub: "সেবা, ফিনিশ, কাজের প্রক্রিয়া বা কোটেশন সম্পর্কে জিজ্ঞাসা করুন।",
    placeholder: "রংধনুকে বার্তা লিখুন…",
    thinking: "ভাবছি",
    searching: "খুঁজে দেখছি",
    disclaimer: "এআই ভুল করতে পারে। সঠিক মূল্যের জন্য আমাদের টিমকে কল করুন।",
    newChat: "নতুন চ্যাট",
    close: "চ্যাট বন্ধ করুন",
    open: "চ্যাট খুলুন",
    send: "বার্তা পাঠান",
    stop: "থামান",
    copy: "কপি",
    copied: "কপি হয়েছে",
    retry: "আবার তৈরি করুন",
    webUsed: "ওয়েব সার্চ ব্যবহার করা হয়েছে",
    sources: "সূত্র",
    contact: "রংধনুর সাথে যোগাযোগ করুন",
    toBottom: "সর্বশেষে যান",
    error: "দুঃখিত—এই মুহূর্তে উত্তর সেবায় সংযোগ করা যাচ্ছে না। আবার চেষ্টা করুন, অথবা সরাসরি আমাদের টিমে কল করুন।",
    label: "রংধনু চ্যাট সহায়তা",
  },
} as const;

const welcomeMessage = (language: Language): Message => ({
  id: "welcome",
  from: "bot",
  text: language === "bn"
    ? "হ্যালো! আমি রংধনু অ্যাসিস্ট্যান্ট। আমাদের সেবা, ফিনিশিং ও কাজের প্রক্রিয়া সম্পর্কে প্রশ্ন করতে পারেন।"
    : "Hi! I’m the Rong Dhonu assistant. Ask me about our services, finishes and process.",
});

/* ---- tiny, safe markdown: **bold**, lists, links, paragraphs -------------- */
const INLINE = /(\*\*[^*]+\*\*|https?:\/\/[^\s)]+)/g;

function renderInline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index} className="font-semibold">{part.slice(2, -2)}</strong>;
    if (/^https?:\/\//.test(part)) return <a key={index} href={part} target="_blank" rel="noreferrer noopener">{part}</a>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

function Prose({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) blocks.push(<p key={`p${blocks.length}`}>{renderInline(paragraph.join(" "))}</p>);
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(<Tag key={`l${blocks.length}`}>{list.items.map((item, i) => <li key={i}>{renderInline(item)}</li>)}</Tag>);
    list = null;
  };

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const bullet = line.match(/^[-*•]\s+(.*)/);
    const numbered = line.match(/^\d+[.)]\s+(.*)/);
    if (bullet || numbered) {
      flushParagraph();
      const ordered = Boolean(numbered);
      if (list && list.ordered !== ordered) flushList();
      list = list ?? { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
    } else if (!line) {
      flushParagraph();
      flushList();
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushList();
  return <div className="chat-prose">{blocks}</div>;
}

/* ---- progressive reveal ---------------------------------------------------- */
function Streamed({ text, animate, onTick, onDone, stopSignal }: {
  text: string;
  animate: boolean;
  onTick: () => void;
  onDone: () => void;
  stopSignal: number;
}) {
  const glyphs = useMemo(() => Array.from(text), [text]);
  // -1 means "fully shown"; 0..n is the number of glyphs revealed so far.
  const [count, setCount] = useState(animate ? 0 : -1);
  const callbacks = useRef({ onTick, onDone });
  const seenStop = useRef(stopSignal);

  useEffect(() => { callbacks.current = { onTick, onDone }; });

  useEffect(() => {
    if (!animate) { setCount(-1); return; }
    setCount(0);
    const step = Math.max(2, Math.ceil(glyphs.length / 140));
    const id = window.setInterval(() => {
      setCount((current) => (current < 0 ? current : Math.min(glyphs.length, current + step)));
      callbacks.current.onTick();
    }, 18);
    return () => window.clearInterval(id);
  }, [animate, glyphs]);

  useEffect(() => {
    if (animate && count >= glyphs.length) {
      setCount(-1);
      callbacks.current.onDone();
    }
  }, [count, animate, glyphs.length]);

  // "Stop generating": jump straight to the full answer.
  useEffect(() => {
    if (stopSignal === seenStop.current) return;
    seenStop.current = stopSignal;
    if (animate) {
      setCount(-1);
      callbacks.current.onDone();
    }
  }, [stopSignal, animate]);

  const streaming = animate && count >= 0;
  return (
    <>
      <Prose text={count < 0 ? text : glyphs.slice(0, count).join("")} />
      {streaming && <span className="chat-caret" aria-hidden="true" />}
    </>
  );
}

export default function FloatingSupport() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const c = COPY[language];

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<null | "think" | "web">(null);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [stopSignal, setStopSignal] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showJump, setShowJump] = useState(false);
  const [messages, setMessages] = useState<Message[]>([welcomeMessage("en")]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  const busy = pending !== null || streamingId !== null;
  const hasConversation = messages.some((message) => message.from === "user");

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "end" });
  }, []);

  // Keep the latest message in view unless the reader has scrolled up.
  useEffect(() => {
    if (stickToBottom.current) scrollToBottom();
  }, [messages, pending, open, scrollToBottom]);

  const onScroll = () => {
    const node = scrollRef.current;
    if (!node) return;
    const away = node.scrollHeight - node.scrollTop - node.clientHeight;
    stickToBottom.current = away < 80;
    setShowJump(away > 160);
  };

  useEffect(() => {
    if (open) window.setTimeout(() => textareaRef.current?.focus(), 120);
  }, [open]);

  // Welcome copy follows the language toggle until the conversation starts.
  useEffect(() => {
    setMessages((current) => current.map((message, index) =>
      index === 0 && message.id === "welcome" ? welcomeMessage(language) : message
    ));
  }, [language]);

  // Escape closes; auto-grow the composer up to five lines.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 128)}px`;
  }, [input, open]);

  // Lock page scroll behind the full-screen mobile sheet.
  useEffect(() => {
    if (!open || typeof window === "undefined" || !window.matchMedia("(max-width: 639px)").matches) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  if (!pathname || pathname.startsWith("/admin")) return null;

  const resetChat = () => {
    abortRef.current?.abort();
    setPending(null);
    setStreamingId(null);
    setInput("");
    stickToBottom.current = true;
    setMessages([welcomeMessage(language)]);
    textareaRef.current?.focus();
  };

  const ask = async (text: string, base: Message[]) => {
    const userMessage: Message = { id: `${Date.now()}-user`, from: "user", text };
    const thread = [...base, userMessage];
    setMessages(thread);
    setInput("");
    stickToBottom.current = true;
    setPending(/(search|find|news|latest|weather|খুঁজ)/i.test(text) ? "web" : "think");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message: text,
          history: thread.slice(-8).map(({ from, text: value }) => ({ role: from, content: value })),
          language,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to answer right now.");

      const id = `${Date.now()}-bot`;
      setMessages((prev) => [...prev, {
        id,
        from: "bot",
        text: data.answer,
        sources: data.sources,
        webSearch: data.webSearch,
        animate: true,
      }]);
      setStreamingId(id);
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return;
      setMessages((prev) => [...prev, { id: `${Date.now()}-error`, from: "bot", text: c.error, error: true }]);
    } finally {
      setPending(null);
    }
  };

  const send = (forced?: string) => {
    const text = (forced ?? input).trim();
    if (!text || busy) return;
    void ask(text, messages);
  };

  const regenerate = () => {
    if (busy) return;
    const lastUserIndex = [...messages].map((m) => m.from).lastIndexOf("user");
    if (lastUserIndex < 0) return;
    void ask(messages[lastUserIndex].text, messages.slice(0, lastUserIndex));
  };

  const stop = () => {
    if (pending) {
      abortRef.current?.abort();
      setPending(null);
    } else if (streamingId) {
      setStopSignal((value) => value + 1);
    }
  };

  const copy = async (message: Message) => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopiedId(message.id);
      window.setTimeout(() => setCopiedId((current) => (current === message.id ? null : current)), 1600);
    } catch {
      /* clipboard can be unavailable on insecure origins */
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  };

  const lastBotId = [...messages].reverse().find((m) => m.from === "bot" && m.id !== "welcome")?.id;

  return (
    <div className="public-support fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <section role="dialog" aria-label={c.label} className="support-chat">
          {/* Header */}
          <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rainbow text-white shadow-sm">
                <Sparkles size={17} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight text-foreground">{c.title}</p>
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-muted">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rd-green" aria-hidden="true" />
                  {c.status}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <button type="button" onClick={resetChat} aria-label={c.newChat} title={c.newChat} className="grid h-9 w-9 place-items-center rounded-full text-muted-strong transition hover:bg-surface-2">
                <SquarePen size={17} />
              </button>
              <button type="button" onClick={() => setOpen(false)} aria-label={c.close} title={c.close} className="grid h-9 w-9 place-items-center rounded-full text-muted-strong transition hover:bg-surface-2">
                <X size={19} />
              </button>
            </div>
          </header>

          {/* Conversation */}
          <div className="relative min-h-0 flex-1">
            <div ref={scrollRef} onScroll={onScroll} className="chat-scroll h-full overflow-y-auto px-4 py-5" aria-live={streamingId ? "off" : "polite"}>
              {!hasConversation ? (
                <div className="flex min-h-full flex-col items-center justify-center gap-6 text-center">
                  <div className="chat-row">
                    <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-rainbow text-white shadow-md">
                      <Sparkles size={22} aria-hidden="true" />
                    </span>
                    <h2 className="text-lg font-semibold text-foreground">{c.greeting}</h2>
                    <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-muted">{c.sub}</p>
                  </div>
                  <div className="chat-row grid w-full grid-cols-2 gap-2">
                    {SUGGESTIONS[language].map((item) => (
                      <button
                        key={item.prompt}
                        type="button"
                        onClick={() => send(item.prompt)}
                        className="rounded-2xl border border-border bg-surface px-3.5 py-3 text-left transition duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-surface-2"
                      >
                        <span className="block text-[13px] font-semibold text-foreground">{item.title}</span>
                        <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-muted">{item.prompt}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.filter((m) => m.id !== "welcome").map((message) => message.from === "user" ? (
                    <div key={message.id} className="chat-row flex justify-end">
                      <p className="max-w-[85%] whitespace-pre-wrap rounded-3xl bg-surface-2 px-4 py-2.5 text-sm leading-relaxed text-foreground">{message.text}</p>
                    </div>
                  ) : (
                    <div key={message.id} className="chat-row flex gap-3">
                      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-rainbow text-white">
                        <Sparkles size={14} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1 text-sm leading-relaxed text-foreground">
                        <Streamed
                          text={message.text}
                          animate={Boolean(message.animate) && streamingId === message.id}
                          stopSignal={stopSignal}
                          onTick={() => { if (stickToBottom.current) scrollToBottom(false); }}
                          onDone={() => setStreamingId((current) => (current === message.id ? null : current))}
                        />

                        {streamingId !== message.id && (
                          <>
                            {message.webSearch && (
                              <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted"><Globe2 size={12} aria-hidden="true" />{c.webUsed}</p>
                            )}
                            {!!message.sources?.length && (
                              <div className="mt-2 flex flex-wrap gap-1.5" aria-label={c.sources}>
                                {message.sources.slice(0, 3).map((source, index) => (
                                  <a key={source.url} href={source.url} target="_blank" rel="noreferrer noopener" title={source.title} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-muted-strong transition hover:border-primary/50 hover:text-primary">
                                    <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-surface-2 text-[9px] font-bold">{index + 1}</span>
                                    <span className="truncate">{source.title}</span>
                                  </a>
                                ))}
                              </div>
                            )}
                            {!message.error && (
                              <div className="mt-2 -ml-1.5 flex items-center gap-0.5 text-muted">
                                <button type="button" onClick={() => void copy(message)} aria-label={c.copy} title={copiedId === message.id ? c.copied : c.copy} className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-surface-2 hover:text-foreground">
                                  {copiedId === message.id ? <Check size={15} className="text-rd-green" /> : <Copy size={15} />}
                                </button>
                                {message.id === lastBotId && (
                                  <button type="button" onClick={regenerate} disabled={busy} aria-label={c.retry} title={c.retry} className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-surface-2 hover:text-foreground disabled:opacity-40">
                                    <RefreshCw size={15} />
                                  </button>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  {pending && (
                    <div className="chat-row flex gap-3">
                      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-rainbow text-white">
                        <Sparkles size={14} aria-hidden="true" />
                      </span>
                      <div className="flex items-center gap-2.5 pt-1 text-sm text-muted" role="status">
                        <span>{pending === "web" ? c.searching : c.thinking}</span>
                        <span className="flex items-center gap-1" aria-hidden="true"><i className="chat-dot" /><i className="chat-dot" /><i className="chat-dot" /></span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {showJump && (
              <button
                type="button"
                onClick={() => { stickToBottom.current = true; scrollToBottom(); }}
                aria-label={c.toBottom}
                title={c.toBottom}
                className="chat-row absolute bottom-3 left-1/2 grid h-9 w-9 -translate-x-1/2 place-items-center rounded-full border border-border bg-background text-muted-strong shadow-lg transition hover:bg-surface-2"
              >
                <ChevronDown size={18} />
              </button>
            )}
          </div>

          {/* Composer */}
          <footer className="px-3 pb-3 pt-1">
            <div className="chat-composer flex items-end gap-2 rounded-3xl py-2 pl-4 pr-2">
              <textarea
                ref={textareaRef}
                value={input}
                rows={1}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder={c.placeholder}
                aria-label={c.placeholder}
                autoComplete="off"
                className="max-h-32 min-h-9 min-w-0 flex-1 resize-none bg-transparent py-1.5 text-sm leading-6 text-foreground outline-none placeholder:text-muted"
              />
              {busy ? (
                <button type="button" onClick={stop} aria-label={c.stop} title={c.stop} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foreground text-background transition hover:opacity-85">
                  <Square size={13} fill="currentColor" />
                </button>
              ) : (
                <button type="button" onClick={() => send()} disabled={!input.trim()} aria-label={c.send} title={c.send} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition hover:scale-105 disabled:scale-100 disabled:bg-surface-2 disabled:text-muted">
                  <ArrowUp size={18} />
                </button>
              )}
            </div>
            <p className="mt-2 px-2 text-center text-[10.5px] leading-snug text-muted">{c.disclaimer}</p>
          </footer>
        </section>
      )}

      {/* Launchers: hidden on phones while the full-screen sheet is open */}
      <div className={`flex items-center gap-3 ${open ? "max-sm:hidden" : ""}`}>
        <a
          href="tel:+8801712345678"
          aria-label={c.contact}
          title={c.contact}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-background text-foreground shadow-xl transition duration-300 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rd-green"
        >
          <span className="absolute inset-0 rounded-full bg-rainbow opacity-50 blur-[3px] transition group-hover:opacity-35" />
          <span className="relative flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface">
            <Phone size={21} className="text-rd-green transition-transform group-hover:-rotate-12" />
          </span>
        </a>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? c.close : c.open}
          aria-expanded={open}
          title={open ? c.close : c.open}
          className={`group relative flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition duration-300 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            open ? "bg-foreground text-background" : "bg-primary text-white"
          }`}
        >
          <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-rd-green" />
          {open ? <X size={23} /> : <MessageCircle size={24} />}
        </button>
      </div>
    </div>
  );
}
