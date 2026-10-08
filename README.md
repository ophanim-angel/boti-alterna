# EduTrack — Plateforme de gestion scolaire

Alternative open-source à [boti.education](https://boti.education) : un CRM/ERP scolaire complet qui connecte **l'administration**, **les enseignants** et **les parents** autour du suivi des élèves.

Démo : École Al Manar, Casablanca — année scolaire 2025/2026.

## ✨ Fonctionnalités

| Module | Administration | Enseignant | Parent |
|---|---|---|---|
| Tableau de bord (stats, graphiques, alertes) | ✅ | ✅ | ✅ |
| Base d'élèves + fiche détaillée (progression, paiements, absences, notes) | ✅ | ✅ | ✅ (ses enfants) |
| Inscriptions & réinscriptions | ✅ | — | — |
| Abonnements mensuels & paiements (encaissement, reçus imprimables, export CSV) | ✅ | — | ✅ (ses enfants) |
| Absences & retards (saisie multi-élèves, justification) | ✅ | ✅ | ✅ (consultation) |
| Emploi du temps des classes | ✅ | ✅ | — |
| Devoirs & prolongements | ✅ | ✅ (publication) | ✅ (consultation) |
| Évaluations & saisie des notes (contrôles, examens, oraux, projets) | ✅ | ✅ | ✅ (consultation) |
| Notes d'information (annonces globales ou par classe) | ✅ | ✅ | ✅ |
| Réclamations & discussions (fils de messagerie famille ↔ école) | ✅ | ✅ | ✅ |
| Recherche globale d'élèves | ✅ | ✅ | ✅ (ses enfants) |
| Notifications (cloche temps réel selon le rôle) | ✅ | ✅ | ✅ |
| Paramétrage (niveaux, classes, matières, périodes, comptes) | ✅ | — | — |
| Mon compte (profil, changement de mot de passe) | ✅ | ✅ | ✅ |

Points forts :
- **Progression scolaire** : moyennes par matière et par trimestre, calculées à partir des notes.
- **Abonnements mensuels** : génération automatique des 10 échéances (Sept. → Juin), encaissements espèces/virement, reçus numérotés imprimables, alertes retards.
- **Communication** : fils de discussion entre parents, enseignants et direction, avec catégories et priorités.

## 🚀 Démarrage

### Prérequis
- [Bun](https://bun.sh) (ou Node.js 20+)
- Une base SQLite (créée automatiquement)

### Installation

```bash
# 1. Dépendances
bun install

# 2. Variables d'environnement
cp .env.example .env

# 3. Schéma Prisma
bun run db:push

# 4. Données de démonstration (70 élèves, paiements, notes, devoirs, réclamations…)
bun scripts/seed.ts

# 5. Lancer le serveur de développement
bun run dev
```

L'application est disponible sur http://localhost:3000.

## 🔑 Comptes de démonstration

Mot de passe pour tous les comptes : `demo1234`

| Rôle | Email |
|---|---|
| Administration | `direction@almanar.ma` |
| Enseignant | `s.benali@almanar.ma` |
| Parent | `f.bahatem@gmail.com` |

> 19 comptes sont créés par le seed (1 admin, 6 enseignants, 12 parents) — 70 élèves répartis de la Petite Section à la 1ère année collège.

## 🛠 Stack technique

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS 4** + shadcn/ui (Radix UI)
- **Prisma** + SQLite
- **Recharts** (graphiques du tableau de bord)
- Auth maison : hash **scrypt** + cookie de session signé HMAC (httpOnly)

## 📁 Structure

```
prisma/schema.prisma        # 18 modèles (User, Student, Class, Payment, Grade, Complaint…)
scripts/seed.ts             # Données de démonstration réalistes
src/app/api/                # API REST (auth, students, payments, homeworks, evaluations…)
src/components/school/      # SPA française (11 modules + login + compte)
src/lib/auth.ts             # Sessions & hachage de mots de passe
```

## 📄 Licence

Voir [LICENSE](LICENSE).
