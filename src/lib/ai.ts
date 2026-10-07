import { SYSTEM_PROMPT } from "@/lib/constants";
import { aiLocaleInstruction, parseSmqLocale, type SmqLocale } from "@/lib/smq-i18n";
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
    const draft =
      typeof payload?.ordreDuJour === "string" ? payload.ordreDuJour.trim() : "";
    const mode =
      payload?.mode === "improve" || (draft.length > 0 && payload?.mode !== "create")
        ? "improve"
        : "create";

    if (mode === "improve") {
      return `L'utilisateur a rédigé un BROUILLON d'ordre du jour. Tu dois le REFORMULER en style professionnel SMQ (audit interne / préparation IRATA) SANS supprimer aucun axe, partie ou point qu'il a mentionnés.

RÈGLES STRICTES :
- Conserve EXACTEMENT le même nombre de parties/axes (ex. Axe 1, Axe 2, Axe 3).
- Ne fusionne pas deux axes en un seul.
- N'invente pas de nouveaux sujets majeurs non présents dans le brouillon.
- Retourne UNIQUEMENT le texte final de l'ordre du jour (pas de commentaire).

Événement : ${JSON.stringify({
        type: payload?.type,
        date: payload?.date,
        statut: payload?.statut,
        services: payload?.servicesConcernes,
      })}

Brouillon ordre du jour :
${draft}`;
    }

    return `Génère un ordre du jour structuré pour cet événement : ${JSON.stringify(payload)}. Adapte au type (réunion interne, audit interne, revue de direction) en t'appuyant sur les données SMQ. Numérote clairement chaque axe.`;
  }
  if (kind === "compte-rendu-improve") {
    const draft =
      typeof payload?.compteRendu === "string" ? payload.compteRendu.trim() : "";
    return `L'utilisateur a rédigé un BROUILLON de compte-rendu / constats d'audit ou de réunion. REFORMULE en style professionnel SMQ en conservant TOUS les faits, constats et décisions mentionnés. Structure par axes si l'ordre du jour en contient. Retourne UNIQUEMENT le texte final du compte-rendu.

Événement : ${JSON.stringify({
      id: payload?.id,
      type: payload?.type,
      date: payload?.date,
      ordre_du_jour: payload?.ordreDuJour,
    })}

Brouillon compte-rendu :
${draft}`;
  }
  if (kind === "audit-prep") {
    const event = payload?.event as Record<string, unknown> | undefined;
    if (event && typeof event === "object") {
      return `Prépare une FICHE DE SYNTHÈSE d'audit interne SMQ prête à transmettre à un auditeur (contexte confirmation / audit IRATA).

PRIORITÉ ABSOLUE : partir des notes DÉJÀ SAISIES par l'équipe (ordre du jour + compte-rendu). Ne les remplace pas par un audit générique sur d'autres dates.

Complète avec les NC, actions et indicateurs du JSON SMQ uniquement si cela étaye les constats déjà notés.

Structure :
1. Contexte et périmètre (services audités, date, statut)
2. Déroulé — reprendre CHAQUE axe de l'ordre du jour
3. Constats et preuves
4. Points forts / points d'amélioration
5. Actions recommandées
6. Conclusion

Audit enregistré :
${JSON.stringify(event)}`;
    }
    return `Prépare le contenu d'un audit interne SMQ. Identifie les points faibles à partir des NC, actions, indicateurs. Si un audit interne récent existe dans evenements avec ordre_du_jour/compte_rendu, PARTIR de ces notes. Structure : constats, preuves, gravité, actions recommandées.`;
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

function resolveLocale(request: AiRequest): SmqLocale {
  return parseSmqLocale("locale" in request ? request.locale : undefined);
}

export async function callSmqAi(request: AiRequest, context: string): Promise<string> {
  const locale = resolveLocale(request);
  const localeLine = aiLocaleInstruction(locale);
  const apiKey = getApiKey();
  if (!apiKey) {
    return "Configurez ANTHROPIC_API_KEY dans le fichier .env pour activer l'assistant IA.";
  }

  const payload =
    request.kind === "chat"
      ? {
          max_tokens: 1200,
          system: `${SYSTEM_PROMPT}\n\n${localeLine}\n\nDonnées actuelles du SMQ (JSON) :\n${context}`,
          messages: normalizeChatMessages(request.messages),
        }
      : {
          max_tokens: 1200,
          messages: [
            {
              role: "user" as const,
              content: `${SYSTEM_PROMPT}\n\n${localeLine}\n\nDonnées SMQ (JSON) :\n${context}\n\n${buildPrompt(
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
