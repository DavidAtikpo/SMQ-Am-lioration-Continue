"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { SmqPageHeader } from "@/components/layout/smq-page-header";
import { Btn, TextInput } from "@/components/ui";
import { AiContent } from "@/components/ui/ai-content";

type Message = { role: "user" | "assistant"; text: string };

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  text: "Bonjour, je suis le copilote du système d'amélioration continue. Je peux analyser vos non-conformités, préparer vos réunions, audits internes et revue de direction, et proposer un plan d'actions priorisé, tous services confondus. Que puis-je faire pour vous ?",
};

const QUICK = [
  "Analyse les tendances des non-conformités des 3 derniers mois",
  "Prépare l'ordre du jour de la prochaine revue de direction",
  "Propose une checklist pour le prochain audit interne",
  "Quelles actions sont prioritaires cette semaine, tous services ?",
];

export function AssistantPanel() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

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
          messages: newMessages,
        }),
      });
      const json = (await res.json()) as { text?: string };
      setMessages((cur) => [
        ...cur,
        { role: "assistant", text: json.text ?? "Désolé, je n'ai pas pu générer de réponse." },
      ]);
    } catch {
      setMessages((cur) => [
        ...cur,
        { role: "assistant", text: "Une erreur est survenue lors de l'appel à l'assistant. Réessayez." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] flex-col lg:min-h-0">
      <SmqPageHeader
        title="Assistant IA"
        sub="Copilote du pilotage, du suivi et de la planification du SMQ"
        code="SMQ-IA"
      />

      <div className="mb-3.5 flex flex-wrap gap-2">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => void send(q)}
            className="cursor-pointer rounded-full border-[1.5px] border-line bg-surface px-3 py-1.5 text-xs text-muted"
          >
            {q}
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
            <Loader2 size={13} className="animate-spin" /> L&apos;assistant réfléchit…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <TextInput
          value={input}
          onChange={setInput}
          placeholder="Posez une question ou demandez une analyse…"
          className="flex-1"
        />
        <Btn onClick={() => void send()} disabled={loading} className="w-full sm:w-auto">
          <Send size={14} /> Envoyer
        </Btn>
      </div>
    </div>
  );
}
