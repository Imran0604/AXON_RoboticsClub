"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { askAssistantAction } from "@/app/actions/assistant";
import type { AssistantItem } from "@/lib/assistant";

/**
 * Floating event assistant.
 *
 * Answers come from a deterministic lookup over the live event tables, not a
 * language model — the panel says so, because claiming otherwise would be a
 * lie the first time someone tried to chat with it.
 */

interface Msg {
  role: "user" | "bot";
  text: string;
  items?: AssistantItem[];
  suggestions?: string[];
}

const OPENING: Msg = {
  role: "bot",
  text: "Ask me about any event — dates, fees, deadlines, seats left, or how registration works. I read the live data, so my answers are always current.",
  suggestions: ["What events are open?", "Which events are free?", "When is the line follower?", "How do I register?"],
};

export function Assistant() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([OPENING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) field.current?.focus();
  }, [open]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setBusy(true);
    try {
      const reply = await askAssistantAction(q);
      setMsgs((m) => [...m, { role: "bot", ...reply }]);
    } catch {
      setMsgs((m) => [
        ...m,
        { role: "bot", text: "Something went wrong looking that up. Try again in a moment." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* launcher */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close the event assistant" : "Open the event assistant"}
        className="fixed bottom-5 right-5 z-[60] flex h-12 items-center gap-2 rounded-full border px-4 transition-transform hover:scale-[1.03]"
        style={{
          background: "var(--brand)",
          borderColor: "var(--brand)",
          color: "var(--on-brand)",
          boxShadow: "0 8px 30px -8px var(--glow)",
        }}
      >
        {open ? (
          <svg viewBox="0 0 16 16" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <path d="M14 10.5a1.8 1.8 0 0 1-1.8 1.8H5.5L2 15V3.8A1.8 1.8 0 0 1 3.8 2h8.4A1.8 1.8 0 0 1 14 3.8Z" strokeLinejoin="round" />
          </svg>
        )}
        <span className="text-[0.8125rem] font-semibold">{open ? "Close" : "Ask about events"}</span>
      </button>

      {/* panel */}
      {open && (
        <div
          className="fixed bottom-20 right-5 z-[60] flex w-[min(23rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-lg border"
          style={{
            background: "var(--surface)",
            borderColor: "var(--line-2)",
            maxHeight: "min(32rem, calc(100vh - 7.5rem))",
            boxShadow: "0 24px 60px -24px rgba(0,0,0,.7)",
          }}
          role="dialog"
          aria-label="Event assistant"
        >
          <div className="flex items-center gap-2.5 border-b border-line px-4 py-3" style={{ background: "var(--surface-2)" }}>
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "var(--ok)" }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "var(--ok)" }} />
            </span>
            <div className="min-w-0">
              <p className="text-[0.875rem] font-bold leading-tight">Event assistant</p>
              <p className="text-[0.6875rem] leading-tight text-ink-3">
                Reads the live event data · not a language model
              </p>
            </div>
          </div>

          <div ref={scroller} className="flex-1 overflow-y-auto px-4 py-4" style={{ minHeight: "14rem" }}>
            <div className="flex flex-col gap-3.5">
              {msgs.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex flex-col gap-2"}>
                  {m.role === "user" ? (
                    <p
                      className="max-w-[85%] rounded-lg rounded-br-sm px-3 py-2 text-[0.8125rem]"
                      style={{ background: "var(--brand-soft)", color: "var(--ink)" }}
                    >
                      {m.text}
                    </p>
                  ) : (
                    <>
                      <p className="text-[0.8125rem] leading-relaxed text-ink-2">{m.text}</p>

                      {m.items && m.items.length > 0 && (
                        <ul className="flex flex-col gap-1.5">
                          {m.items.map((it) => (
                            <li key={it.href + it.title}>
                              <Link
                                href={it.href}
                                onClick={() => setOpen(false)}
                                className="block rounded-sm border px-2.5 py-2 transition-colors hover:border-brand"
                                style={{ borderColor: "var(--line)" }}
                              >
                                <span className="block text-[0.8125rem] font-semibold text-ink">{it.title}</span>
                                <span className="mono block text-[0.6875rem] text-ink-3">{it.meta}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}

                      {m.suggestions && m.suggestions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {m.suggestions.map((sg) => (
                            <button
                              key={sg}
                              type="button"
                              onClick={() => send(sg)}
                              className="rounded-full border px-2.5 py-1 text-[0.6875rem] transition-colors hover:border-brand hover:text-ink"
                              style={{ borderColor: "var(--line-2)", color: "var(--ink-2)" }}
                            >
                              {sg}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}

              {busy && (
                <p className="flex gap-1" aria-label="Looking that up">
                  {[0, 1, 2].map((d) => (
                    <span
                      key={d}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        background: "var(--ink-3)",
                        animation: `caret 1.1s ${d * 0.15}s infinite`,
                      }}
                    />
                  ))}
                </p>
              )}
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2 border-t border-line p-3"
          >
            <input
              ref={field}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about an event…"
              aria-label="Your question"
              maxLength={300}
              className="field flex-1 py-2 text-[0.8125rem]"
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !input.trim()}>
              Ask
            </button>
          </form>
        </div>
      )}
    </>
  );
}
