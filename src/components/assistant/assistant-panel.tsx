"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { SmqPageHeader } from "@/components/layout/smq-page-header";
import { Btn, TextInput } from "@/components/ui";
import { AiContent } from "@/components/ui/ai-content";
import { useSmqLocale } from "@/hooks/use-smq-locale";
import type { SmqUiKey } from "@/lib/smq-i18n-ui";

type Message = { role: "user" | "assistant"; text: string };

const QUICK_KEYS: SmqUiKey[] = ["quick1", "quick2", "quick3", "quick4"];

export function AssistantPanel() {
  const { t, locale } = useSmqLocale();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([{ role: "assistant", text: t("assistantInitial") }]);
  }, [locale, t]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text?: string) {
    const userText = (text ?? input).trim();
    if (!userText || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", text: userText }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "chat",
          locale,
          messages: newMessages,
        }),
      });
      const json = (await res.json()) as { text?: string };
      setMessages((cur) => [
        ...cur,
        { role: "assistant", text: json.text ?? t("assistantSorry") },
      ]);
    } catch {
      setMessages((cur) => [
        ...cur,
        { role: "assistant", text: t("assistantCallError") },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] flex-col lg:min-h-0">
      <SmqPageHeader title={t("assistantTitle")} sub={t("assistantSub")} code="SMQ-IA" />

      <div className="mb-3.5 flex flex-wrap gap-2">
        {QUICK_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => void send(t(key))}
            className="cursor-pointer rounded-full border-[1.5px] border-line bg-surface px-3 py-1.5 text-xs text-muted"
          >
            {t(key)}
          </button>
        ))}
      </div>

      <div className="flex min-h-[240px] flex-1 flex-col gap-3 overflow-y-auto rounded-[10px] border-[1.5px] border-line bg-surface p-3 sm:p-4 lg:max-h-[calc(100dvh-18rem)]">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[92%] rounded-[10px] px-3 py-2.5 sm:max-w-[78%] sm:px-3.5 ${
                m.role === "user"
                  ? "bg-ink text-paper"
                  : "bg-paper-alt text-ink"
              }`}
            >
              {m.role === "assistant" ? (
                <AiContent content={m.text} />
              ) : (
                <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed">{m.text}</p>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-1.5 text-[12.5px] text-muted-light">
            <Loader2 size={13} className="animate-spin" /> {t("assistantThinking")}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <TextInput
          value={input}
          onChange={setInput}
          placeholder={t("phAssistant")}
          className="flex-1"
        />
        <Btn onClick={() => void send()} disabled={loading || !input.trim()}>
          <Send size={14} /> {t("assistantSend")}
        </Btn>
      </div>
    </div>
  );
}
