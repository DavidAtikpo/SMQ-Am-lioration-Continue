import { table } from "@/lib/sync/external-db";

/**
 * Pays d'inscription (Demande.pays) du stagiaire lié à une NC irata.
 *
 * Ordre de résolution :
 * 1. Stagiaire via ReponseFormulaire (formulaireId)
 * 2. Détecteur si rôle USER (stagiaire inscrit)
 * 3. Responsable si rôle USER (stagiaire inscrit)
 * 4. Pays majoritaire des inscriptions sur la session de formation (sessionId)
 */
export function ncInscriptionPaysSql(schema: string, ncAlias = "nc"): string {
  const tDemande = table(schema, "Demande");
  const tReponse = table(schema, "ReponseFormulaire");

  const orderBySessionMatch = `
    CASE
      WHEN ${ncAlias}."sessionId" IS NOT NULL AND d.session = ${ncAlias}."sessionId" THEN 0
      ELSE 1
    END,
    d."createdAt" DESC
  `;

  return `
    COALESCE(
      (
        SELECT d.pays
        FROM ${tReponse} rf
        JOIN ${tDemande} d ON d."userId" = rf."stagiaireId"
        WHERE ${ncAlias}."formulaireId" IS NOT NULL
          AND rf.id = ${ncAlias}."formulaireId"
        ORDER BY ${orderBySessionMatch}
        LIMIT 1
      ),
      (
        SELECT d.pays
        FROM ${tDemande} d
        WHERE det.role = 'USER'
          AND d."userId" = ${ncAlias}."detecteurId"
        ORDER BY ${orderBySessionMatch}
        LIMIT 1
      ),
      (
        SELECT d.pays
        FROM ${tDemande} d
        WHERE resp.role = 'USER'
          AND d."userId" = ${ncAlias}."responsableId"
        ORDER BY ${orderBySessionMatch}
        LIMIT 1
      ),
      (
        SELECT d.pays
        FROM ${tDemande} d
        WHERE ${ncAlias}."sessionId" IS NOT NULL
          AND d.session = ${ncAlias}."sessionId"
          AND d.pays IS NOT NULL
        GROUP BY d.pays
        ORDER BY COUNT(*) DESC, d.pays ASC
        LIMIT 1
      )
    )
  `;
}
