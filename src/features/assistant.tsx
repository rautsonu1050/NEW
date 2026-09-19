/**
 * Assistant Component
 *
 * Handles UI rendering and state management for the assistant feature.
 */
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowUp, ArrowRight, Loader2 } from "lucide-react";
import { useYatra } from "../store";
import { Button, SourceBadge, PageTitle } from "../components/shared";
/** Renders the Assistant view. */
export default function Assistant() {
  const { state, trip, mutate } = useYatra();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const messages = state?.chat || [];
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length, busy]);
  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setMessage("");
    try {
      await mutate("assistant", { message: text });
    } catch {
      setMessage(text);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageTitle
        eyebrow="A LITTLE HELP, WHEREVER YOU ARE"
        title="Your journey has a companion."
        description="Ask, explore, and find a way forward together."
      />
      <section className="chat-layout">
        <header className="chat-header">
          <div className="feature-icon purple">
            <Sparkles size={22} />
          </div>
          <div>
            <h2>YATRA AI</h2>
            <p>
              {trip
                ? trip.title + " · Your trip context is included"
                : "Ready when you are"}
            </p>
          </div>
        </header>
        <div className="chat-messages">
          {!messages.length && (
            <div className="chat-empty">
              <div className="feature-icon purple">
                <Sparkles size={28} />
              </div>
              <h2>What’s on your mind?</h2>
              <p>
                Something delicious, a quieter place, or a plan that needs a
                little adapting.
              </p>
              <div className="chat-quick">
                {[
                  "Find vegetarian food nearby",
                  "Reduce my hotel budget",
                  "What should I do this evening?",
                  "Replan because of rain",
                ].map((q) => (
                  <button key={q} onClick={() => void send(q)}>
                    {q}
                    <ArrowRight size={13} className="mt-2" />
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <div className={"chat-message " + m.role} key={m.id}>
              {m.text}
              {m.source && <SourceBadge source={m.source} />}{" "}
              {m.action && (
                <Link href={m.action}>
                  Explore this option
                  <ArrowRight size={14} />
                </Link>
              )}
            </div>
          ))}
          {busy && (
            <div className="chat-message assistant flex items-center gap-2">
              <Loader2 size={16} className="spin" />
              Thinking about your journey...
            </div>
          )}
          <div ref={bottom} />
        </div>
        <form
          className="chat-form"
          onSubmit={(e) => {
            e.preventDefault();
            void send(message);
          }}
        >
          <input
            aria-label="Message YATRA AI"
            placeholder="Ask about your trip, food, budget, or a change of plans..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={2000}
            required
          />
          <Button type="submit" busy={busy} disabled={!message.trim()}>
            <ArrowUp size={18} />
            <span className="sr-only">Send message</span>
          </Button>
        </form>
      </section>
    </>
  );
}
