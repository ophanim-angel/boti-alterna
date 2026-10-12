'use client'

import { ReactNode } from 'react'
import {
  UserPlus, UserMinus, School, Users2, Contact, ShieldCheck, KeyRound,
  GraduationCap, Trash2, BookOpenCheck, Building2, Wallet, MessageSquareWarning, ClipboardList,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { SessionUser } from './types'

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="h-6 w-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
        {n}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-800">{title}</div>
        <div className="text-sm text-slate-500 leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

function GuideCard({ icon, title, subtitle, children }: { icon: ReactNode; title: string; subtitle: string; children: ReactNode }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>
        </div>
        <div className="space-y-3">{children}</div>
      </CardContent>
    </Card>
  )
}

function Tip({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800 leading-relaxed">
      💡 {children}
    </div>
  )
}

function Warn({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-800 leading-relaxed">
      ⚠️ {children}
    </div>
  )
}

export function HelpView({ user }: { user: SessionUser }) {
  const isAdmin = user.role === 'ADMIN'

  if (!isAdmin) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Guide d&apos;utilisation</h1>
          <p className="text-sm text-slate-500">Tout ce qu'il faut savoir pour utiliser l'espace {user.role === 'TEACHER' ? 'enseignant' : 'parent'}.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {user.role === 'PARENT' && (
            <>
              <GuideCard icon={<GraduationCap className="h-5 w-5" />} title="Suivre la scolarité de mes enfants" subtitle="Base d'élèves → fiche de l'enfant">
                <Step n={1} title="Ouvrir « Base d'élèves »">Vous ne voyez que vos enfants rattachés par l'administration.</Step>
                <Step n={2} title="Cliquer sur un enfant">Sa fiche complète s'ouvre : classe, niveau, professeur principal.</Step>
                <Step n={3} title="Consulter les onglets">Notes & progression, paiements, absences — tout est réuni sur une seule page.</Step>
                <Tip>Un problème de rattachement (un enfant manquant ?) contactez l'administration via les réclamations.</Tip>
              </GuideCard>
              <GuideCard icon={<Wallet className="h-5 w-5" />} title="Abonnements & paiements" subtitle="Suivi mensuel">
                <Step n={1} title="Onglet Paiements">Chaque mois scolaire apparaît avec son montant (650 DH) et son échéance.</Step>
                <Step n={2} title="Statuts">Payé (vert), En attente (orange), En retard (rouge). Le reçu apparaît après encaissement.</Step>
              </GuideCard>
              <GuideCard icon={<MessageSquareWarning className="h-5 w-5" />} title="Réclamations & discussion" subtitle="Échange direct avec l'école">
                <Step n={1} title="Créer une réclamation">Communication → « Nouvelle réclamation », choisissez la catégorie et éventuellement l'enfant concerné.</Step>
                <Step n={2} title="Discuter">Chaque réclamation est un fil de discussion : l'administration et les enseignants vous répondent dessus.</Step>
              </GuideCard>
              <GuideCard icon={<KeyRound className="h-5 w-5" />} title="Mon compte & mot de passe" subtitle="Général → Mon compte">
                <Step n={1} title="Changer votre mot de passe">Mon compte → section sécurité. Utilisez 6 caractères minimum.</Step>
                <Step n={2} title="Notifications">La cloche en haut à droite vous alerte sur les nouvelles notes, devoirs et réponses.</Step>
              </GuideCard>
            </>
          )}
          {user.role === 'TEACHER' && (
            <>
              <GuideCard icon={<BookOpenCheck className="h-5 w-5" />} title="Publier un devoir" subtitle="Pédagogie → Devoirs & prolongements">
                <Step n={1} title="Nouveau devoir">Choisissez la classe et la matière (uniquement vos affectations), la date d'échéance, puis rédigez la consigne.</Step>
                <Step n={2} title="Visibilité">Les parents des élèves de la classe voient immédiatement le devoir dans leur espace.</Step>
              </GuideCard>
              <GuideCard icon={<ClipboardList className="h-5 w-5" />} title="Saisir les notes" subtitle="Pédagogie → Évaluations & notes">
                <Step n={1} title="Créer une évaluation">Contrôle, examen, oral ou projet — rattachée à une période (trimestre).</Step>
                <Step n={2} title="Saisie en masse">Ouvrez l'évaluation puis saisissez les notes de toute la classe en un seul écran, « Enregistrer » conserve tout.</Step>
              </GuideCard>
              <GuideCard icon={<School className="h-5 w-5" />} title="Ma classe" subtitle="Vie scolaire">
                <Step n={1} title="Emploi du temps">Consultez vos créneaux hebdomadaires par classe.</Step>
                <Step n={2} title="Absences & retards">Vie scolaire → pointage quotidien avec motif et justification.</Step>
              </GuideCard>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-900">Guide d&apos;utilisation — gestion CRM/ERP</h1>
        <p className="text-sm text-slate-500">
          Procédures détaillées pour administrer les élèves, les parents, les classes et les niveaux. Chaque action est
          tracée dans l&apos;historique des fiches.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GuideCard icon={<UserPlus className="h-5 w-5" />} title="1 · Ajouter un élève" subtitle="Scolarité → Base d'élèves → « Nouvel élève »">
          <Step n={1} title="Ouvrir la Base d'élèves">Menu Scolarité → Base d&apos;élèves, puis bouton vert <b>« Nouvel élève »</b>.</Step>
          <Step n={2} title="Renseigner l'état civil">Prénom et nom (obligatoires), genre, date de naissance, code Massar. Le <b>matricule est généré automatiquement</b> (M-10xx).</Step>
          <Step n={3} title="Affecter la classe et le niveau">Dans <b>« Classe & niveau »</b>, choisissez une classe — le niveau est porté par la classe (ex : CE2-B → Primaire). Le compteur (effectif/capacité) aide à choisir. Vous pouvez laisser <b>« Non affecté »</b> et affecter plus tard.</Step>
          <Step n={4} title="Lier un parent (optionnel)">Tapez l&apos;email d&apos;un compte parent existant : il sera immédiatement rattaché à l&apos;élève et verra sa fiche depuis son espace.</Step>
          <Tip>Nouveau élèves sans classe remontent automatiquement dans le filtre <b>« Non affectés »</b> de la liste.</Tip>
        </GuideCard>

        <GuideCard icon={<School className="h-5 w-5" />} title="2 · Affecter / transférer un élève (classe & niveau)" subtitle="3 méthodes selon le contexte">
          <Step n={1} title="Cas unique → la fiche élève">Ouvrez l&apos;élève puis bouton <b>« Modifier »</b> : changez la classe dans le formulaire. Le transfert (ancienne classe → nouvelle) est consigné dans l&apos;onglet <b>Historique</b>.</Step>
          <Step n={2} title="Plusieurs élèves à la fois → opération groupée">Dans la liste, <b>cochez les élèves</b> puis cliquez <b>« Affecter à une classe »</b> : choisissez la classe cible et appliquez. Idéal en début d&apos;année ou après une inscription tardive.</Step>
          <Step n={3} title="Éléments de contrôle">La classe affiche son effectif <b>X/capacité</b> partout (fiche, dialogs). Une classe pleine est marquée en rouge et le serveur <b>refuse le dépassement de capacité</b>.</Step>
          <Warn>Le niveau se modifie via la classe (Paramétrage → Niveaux). Pour changer un élève de niveau, changez-le de classe.</Warn>
        </GuideCard>

        <GuideCard icon={<UserMinus className="h-5 w-5" />} title="3 · Retirer / radier un élève" subtitle="Radiation recommandée — suppression en dernier recours">
          <Step n={1} title="Méthode recommandée : retirer des effectifs">Fiche élève → <b>« Retirer des effectifs »</b> → choisissez <i>Parti/Transféré</i>, <i>Diplômé</i> ou <i>Inactif</i> + motif. La fiche, les notes, paiements et absences sont <b>conservés</b> ; l&apos;élève sort des listes actives. Bouton <b>« Réactiver »</b> pour annuler.</Step>
          <Step n={2} title="Par lot">Cochez plusieurs élèves → <b>« Changer le statut »</b> → même effet pour toute la sélection (fin d&apos;année, classe partie).</Step>
          <Step n={3} title="Suppression définitive">Fiche élève → <b>« Supprimer »</b>. Refusée par le serveur si des paiements/notes/absences existent — dans ce cas utilisez la radiation. À réserver aux doublons créés par erreur.</Step>
          <Tip>Retrouvez les élèves radiés via le filtre de statut (Partis/Diplômés) — leur fiche reste consultable avec tout l&apos;historique.</Tip>
        </GuideCard>

        <GuideCard icon={<Contact className="h-5 w-5" />} title="4 · Créer un compte parent et lier les enfants" subtitle="Paramétrage → Comptes">
          <Step n={1} title="Créer le compte">Paramétrage → onglet <b>Comptes</b> → <b>« Nouveau compte »</b> → rôle <i>Parent</i>, nom, email (identifiant de connexion), téléphone. Mot de passe par défaut : <code className="text-[11px] bg-slate-100 px-1 rounded">demo1234</code> (modifiable).</Step>
          <Step n={2} title="Lier les enfants">Dans la liste des comptes → <b>« Modifier »</b> sur le parent → section <b>« Enfants rattachés »</b> : ajoutez chaque enfant (recherche par élève) et précisez le lien (père/mère/tuteur). L&apos;enfant peut aussi être lié depuis la fiche élève → onglet <b>Famille</b> → « Associer un parent ».</Step>
          <Step n={3} title="Ce que voit le parent">Uniquement ses enfants : notes, devoirs, paiements, absences, annonces. Il peut créer des réclamations et discuter avec l&apos;administration.</Step>
          <Tip>Un enfant peut avoir plusieurs tuteurs (père + mère) ; un parent peut avoir plusieurs enfants (fratrie) — liaison libre dans les deux sens.</Tip>
        </GuideCard>

        <GuideCard icon={<Users2 className="h-5 w-5" />} title="5 · Modifier, désactiver ou supprimer un compte" subtitle="Paramétrage → Comptes → colonne Actions">
          <Step n={1} title="Modifier">Changez nom/téléphone, <b>réinitialisez le mot de passe</b> (6 caractères min.) et gérez les enfants rattachés.</Step>
          <Step n={2} title="Désactiver (recommandé pour un enseignant)">Interrupteur <b>« Compte actif »</b> : la connexion est bloquée, les données et liens sont conservés. Parfait pour un départ temporaire.</Step>
          <Step n={3} title="Supprimer">Icône corbeille. Un parent : les liens sont retirés, les élèves conservés. Un enseignant : refusé s&apos;il a des cours/devoirs/évaluations rattachés — désactivez-le alors.</Step>
          <Warn>Les comptes Administration ne peuvent pas être supprimés depuis l&apos;application (sécurité).</Warn>
        </GuideCard>

        <GuideCard icon={<Building2 className="h-5 w-5" />} title="6 · Classes, niveaux & structure" subtitle="Paramétrage → Classes / Niveaux">
          <Step n={1} title="Créer un niveau">Paramétrage → Niveaux → « Nouveau niveau » (ex : CP, CE1... + cycle Maternelle/Primaire/Collège/Lycée). L&apos;ordre détermine la progression.</Step>
          <Step n={2} title="Créer une classe">Classes → « Nouvelle classe » : nom (ex : CE2-B), <b>niveau rattaché</b>, prof principal, salle, capacité.</Step>
          <Step n={3} title="Modifier une classe">Bouton ✏️ sur la carte : renommer, changer de niveau, changer de prof principal, ajuster la capacité.</Step>
          <Tip>La suppression d&apos;une classe/niveau est refusée si des élèves y sont rattachés — transférez d&apos;abord les élèves (opération groupée).</Tip>
        </GuideCard>

        <GuideCard icon={<ShieldCheck className="h-5 w-5" />} title="7 · Traçabilité & bonnes pratiques CRM" subtitle="Ce que le système enregistre pour vous">
          <Step n={1} title="Historique des fiches">Chaque fiche élève a un onglet <b>Historique</b> : création, transferts de classe, changements de statut, tuteurs ajoutés/retirés — avec date et auteur.</Step>
          <Step n={2} title="Effectifs maîtrisés">Compteurs X/capacité partout, alerte rouge quand une classe est pleine, refus automatique du dépassement.</Step>
          <Step n={3} title="Exports">Base d&apos;élèves et paiements → bouton <b>Export CSV</b> (compatible Excel, accents gérés).</Step>
        </GuideCard>

        <GuideCard icon={<Trash2 className="h-5 w-5" />} title="8 · Comptes de démonstration" subtitle="Pour tester chaque rôle">
          <Step n={1} title="Administration">direction@almanar.ma — accès total, gestion élèves/parents/classes.</Step>
          <Step n={2} title="Enseignant">s.benali@almanar.ma — devoirs, notes, absences de ses classes.</Step>
          <Step n={3} title="Parent">f.bahatem@gmail.com — vue restreinte à ses enfants.</Step>
          <Tip>Mot de passe de tous les comptes de démo : <code className="text-[11px] bg-slate-100 px-1 rounded">demo1234</code></Tip>
        </GuideCard>
      </div>
    </div>
  )
}
