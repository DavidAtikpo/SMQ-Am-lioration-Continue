import { SYSTEM_PROMPT } from "@/lib/constants";
import type { AiRequest } from "@/lib/types";

const DEFAULT_MODEL = "claude-sonnet-4-6";
const FALLBACK_MODELS = ["claude-sonnet-4-5", "claude-3-5-sonnet-20241022"];

function buildPrompt(kind: AiRequest["kind"], payload?: Record<string, unknown>): string {
  if (kind === "synthese") {
    return "Donne une synthèse courte (8 lignes max) de l'état actuel du SMQ : priorités du moment, risques, et 2-3 recommandations concrètes.";
  }
  if (kind === "nc-suggest") {
    return `Propose une action corrective concrète et réaliste pour cette non-conformité : ${JSON.stringify(payload)}. Réponds en 5 lignes maximum : cause probable, action proposée, service pilote, délai suggéré.`;
  }
  if (kind === "agenda") {
    return `Génère un ordre du jour structuré pour cet événement à venir : ${JSON.stringify(payload)}. Adapte le contenu au type d'événement (réunion interne trimestrielle, audit interne, ou revue de direction) en t'appuyant sur les données du SMQ.`;
  }
  if (kind === "audit-prep") {
    return `Prépare le contenu d'un audit interne SMQ. Identifie le ou les points les plus faibles à partir des NC, actions, indicateurs stagiaires, satisfaction et délais processus. Structure : constats, preuves, gravité, actions recommandées. Format prêt pour validation dirigeant.`;
  }
  if (kind === "revue-prep") {
    return `Prépare le dossier de revue de direction : synthèse des 2 audits internes, état NC/actions, KPI formation et satisfaction, décisions proposées et plan d'actions. Le dirigeant ne doit que valider et ajouter une note si besoin.`;
  }
  return "";
}

function getApiKey(): string | null {
  const key = process.env.ANTHROPIC_API_KEY?.trim().replace(/^["']|["']$/g, "");
  return key || null;
}

function getModelsToTry(): string[] {
  const configured = process.env.ANTHROPIC_MODEL?.trim().replace(/^["']|["']$/g, "");
  const models = configured ? [configured] : [DEFAULT_MODEL];
  for (const fallback of FALLBACK_MODELS) {
    if (!models.includes(fallback)) models.push(fallback);
  }
  return models;
}

async function readAnthropicError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: { message?: string; type?: string } };
    if (body.error?.message) return body.error.message;
  } catch {
    // ignore parse errors
  }
  return `HTTP ${res.status}`;
}

async function callAnthropic(
  apiKey: string,
  model: string,
  body: Record<string, unknown>,
): Promise<{ ok: true; text: string } | { ok: false; status: number; message: string }> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, ...body }),
  });

  if (!res.ok) {
    return { ok: false, status: res.status, message: await readAnthropicError(res) };
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const text =
    data.content
      ?.filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("\n") || "Pas de réponse.";

  return { ok: true, text };
}

function normalizeChatMessages(messages: Array<{ role: "user" | "assistant"; text: string }>) {
  return messages
    .filter((m) => m.text.trim())
    .filter((m, index, arr) => {
      if (index === 0) return m.role === "user";
      return m.role !== arr[index - 1].role;
    })
    .map((m) => ({ role: m.role, content: m.text }));
}

export async function callSmqAi(request: AiRequest, context: string): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return "Configurez ANTHROPIC_API_KEY dans le fichier .env pour activer l'assistant IA.";
  }

  const payload =
    request.kind === "chat"
      ? {
          max_tokens: 1200,
          system: `${SYSTEM_PROMPT}\n\nDonnées actuelles du SMQ (JSON) :\n${context}`,
          messages: normalizeChatMessages(request.messages),
        }
      : {
          max_tokens: 1200,
          messages: [
            {
              role: "user" as const,
              content: `${SYSTEM_PROMPT}\n\nDonnées SMQ (JSON) :\n${context}\n\n${buildPrompt(
                request.kind,
                "payload" in request ? request.payload : undefined,
              )}`,
            },
          ],
        };

  if (request.kind === "chat" && payload.messages.length === 0) {
    return "Posez une question pour démarrer la conversation.";
  }

  let lastError = "Erreur inconnue";

  for (const model of getModelsToTry()) {
    const result = await callAnthropic(apiKey, model, payload);
    if (result.ok) return result.text;

    lastError = result.message;
    if (result.status !== 404) {
      throw new Error(`Anthropic API: ${result.message}`);
    }
  }

  throw new Error(
    `Aucun modèle Anthropic disponible. Dernière erreur: ${lastError}. Mettez à jour ANTHROPIC_MODEL dans .env (ex: claude-sonnet-4-6).`,
  );
}
