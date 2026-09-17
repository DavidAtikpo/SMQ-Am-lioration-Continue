# SMQ · Amélioration Continue

Application Next.js de **Système de Management de la Qualité (SMQ)** avec assistance IA, conforme aux principes QHSE européens (ISO 9001).

## Fonctionnalités

- **Tableau de bord** — indicateurs NC, actions en retard, échéances, synthèse IA
- **Non-conformités** — recueil, analyse cause racine, suggestions IA d'actions correctives
- **Actions** — correctives, préventives, amélioration, suivi d'efficacité
- **Planification** — réunions internes (4/an), audits internes (2/an), revue de direction (1/an)
- **Services** — tous les départements (compta, recouvrement, accueil, technique, logistique…)
- **Assistant IA** — copilote pour l'analyse, la planification et le pilotage SMQ

## Démarrage

```bash
npm install
cp .env.example .env
# Renseigner DATABASE_URL, CORDISTE_DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
npm run db:setup
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000) — **connexion administrateur requise** (`/login`).

Les comptes autorisés sont les utilisateurs **ADMIN** de la base webirata (a-finpart), via `CORDISTE_DATABASE_URL`.

## Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS 4**
- **Prisma + SQLite** (persistance des données)
- **Anthropic Claude** (assistance IA côté serveur)

## Structure

```
src/
├── app/
│   ├── (smq)/          # Pages SMQ avec navigation latérale
│   └── api/            # Routes API REST + IA
├── components/         # UI par module
├── hooks/              # Contexte données SMQ
└── lib/                # Constantes, utils, Prisma, IA
```

## Commandes

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build production |
| `npm run db:setup` | Créer la BDD et seed les services |
| `npm run db:seed` | Réinitialiser les services par défaut |
