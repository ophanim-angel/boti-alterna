'use client'

import { useEffect, useState } from 'react'
import {
  Phone, Mail, CalendarDays, Fingerprint, MapPin, FileText, School, TrendingUp, Wallet,
  CalendarX2, Pencil, UserMinus, Trash2, History, UserPlus, X, Loader2, AlertTriangle, ShieldCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { api, formatDate, formatDateTime, statusPaymentBadge, statusPaymentLabel, statusStudentBadge, statusStudentLabel, initials, avatarColor, gradeColor, SCHOOL_YEAR } from './utils'
import type { Lookups, SessionUser, Student, Payment, Attendance, Complaint, Guardian, StudentEvent, ParentAccount } from './types'

export interface FicheDetail {
  student: Student & {
    guardians: Guardian[]
    klass: (Student['klass'] & { level: { name: string }; mainTeacher?: { name: string } | null }) | null
    registrations: Array<{ id: string; schoolYear: string; type: string; date: string; status: string; feePaid: boolean; feeAmount: number }>
    payments: Payment[]
    attendances: Attendance[]
    events?: StudentEvent[]
    grades: Array<{ id: string; score: number | null; absent: boolean; evaluation: { title: string; maxScore: number; date: string; subject: { name: string; color: string | null }; period: { name: string } } }>
    complaints: Complaint[]
  }
  progression: Array<{ subject: string; period: string; avg: number | null; count: number }>
}

interface FicheEleveProps {
  detail: FicheDetail
  user: SessionUser
  lookups: Lookups | null
  onChanged: () => void
  onBack: () => void
}

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Actif' },
  { value: 'INACTIVE', label: 'Inactif' },
  { value: 'LEFT', label: 'Parti / Transféré' },
  { value: 'GRADUATED', label: 'Diplômé' },
]

const RELATION_OPTIONS = [
  { value: 'PERE', label: 'Père' },
  { value: 'MERE', label: 'Mère' },
  { value: 'TUTEUR', label: 'Tuteur' },
]

function relationLabel(r: string): string {
  return r === 'PERE' ? 'Père' : r === 'MERE' ? 'Mère' : 'Tuteur'
}

function eventIcon(type: string) {
  switch (type) {
    case 'CREATED': return <School className="h-3.5 w-3.5 text-emerald-600" />
    case 'CLASS_TRANSFER': return <School className="h-3.5 w-3.5 text-cyan-600" />
    case 'STATUS_CHANGE': return <UserMinus className="h-3.5 w-3.5 text-amber-600" />
    case 'GUARDIAN_ADDED': return <UserPlus className="h-3.5 w-3.5 text-violet-600" />
    case 'GUARDIAN_REMOVED': return <UserMinus className="h-3.5 w-3.5 text-rose-500" />
    default: return <Pencil className="h-3.5 w-3.5 text-slate-400" />
  }
}

function eventLabel(type: string): string {
  switch (type) {
    case 'CREATED': return 'Inscription'
    case 'UPDATED': return 'Modification'
    case 'CLASS_TRANSFER': return 'Transfert de classe'
    case 'STATUS_CHANGE': return 'Changement de statut'
    case 'GUARDIAN_ADDED': return 'Tuteur ajouté'
    case 'GUARDIAN_REMOVED': return 'Tuteur retiré'
    case 'BULK_ASSIGN': return 'Opération groupée'
    default: return type
  }
}

export function FicheEleve({ detail, user, lookups, onChanged, onBack }: FicheEleveProps) {
  const { toast } = useToast()
  const { student, progression } = detail
  const isAdmin = user.role === 'ADMIN'

  const paidCount = student.payments.filter((p) => p.status === 'PAYE').length
  const lateCount = student.payments.filter((p) => p.status === 'EN_RETARD').length
  const dues = student.payments.filter((p) => p.status !== 'PAYE')
  const avgOverall = progression.length > 0
    ? Math.round((progression.reduce((s, p) => s + (p.avg || 0), 0) / progression.filter((p) => p.avg != null).length) * 100) / 100
    : null

  // ===== dialogs =====
  const [editOpen, setEditOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [guardianOpen, setGuardianOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    firstName: student.firstName,
    lastName: student.lastName,
    gender: student.gender,
    birthDate: student.birthDate ? student.birthDate.slice(0, 10) : '',
    massarCode: student.massarCode || '',
    classId: student.classId || 'none',
    status: student.status,
    exitReason: student.exitReason || '',
    notes: student.notes || '',
  })

  const [leaveForm, setLeaveForm] = useState({ status: 'LEFT', exitReason: '' })

  const [parents, setParents] = useState<ParentAccount[]>([])
  const [guardianForm, setGuardianForm] = useState({ userId: '', relation: 'TUTEUR', isPrimary: false })

  useEffect(() => {
    setForm({
      firstName: student.firstName,
      lastName: student.lastName,
      gender: student.gender,
      birthDate: student.birthDate ? student.birthDate.slice(0, 10) : '',
      massarCode: student.massarCode || '',
      classId: student.classId || 'none',
      status: student.status,
      exitReason: student.exitReason || '',
      notes: student.notes || '',
    })
  }, [student])

  useEffect(() => {
    if (guardianOpen) {
      api<{ users: ParentAccount[] }>('/api/users?role=PARENT')
        .then((d) => setParents(d.users))
        .catch(() => setParents([]))
    }
  }, [guardianOpen])

  async function handleEdit() {
    setSaving(true)
    try {
      const classId = form.classId === 'none' ? null : form.classId
      await api(`/api/students/${student.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          gender: form.gender,
          birthDate: form.birthDate || null,
          massarCode: form.massarCode || null,
          classId,
          status: form.status,
          exitReason: (form.status === 'LEFT' || form.status === 'GRADUATED') ? (form.exitReason || null) : null,
          notes: form.notes || null,
        }),
      })
      toast({ title: 'Fiche mise à jour', description: 'Les modifications ont été enregistrées dans l\'historique.' })
      setEditOpen(false)
      onChanged()
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleLeave() {
    setSaving(true)
    try {
      await api(`/api/students/${student.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: leaveForm.status,
          exitReason: leaveForm.exitReason || (leaveForm.status === 'LEFT' ? 'Départ' : 'Diplômé'),
        }),
      })
      toast({ title: 'Statut mis à jour', description: 'L\'élève a été retiré des effectifs actifs. Historique conservé.' })
      setLeaveOpen(false)
      onChanged()
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setSaving(true)
    try {
      await api(`/api/students/${student.id}`, { method: 'DELETE' })
      toast({ title: 'Élève supprimé', description: `${student.firstName} ${student.lastName} a été définitivement supprimé.` })
      onBack()
    } catch (e) {
      toast({ title: 'Suppression impossible', description: e instanceof Error ? e.message : '', variant: 'destructive' })
      setDeleteOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleAddGuardian() {
    if (!guardianForm.userId) {
      toast({ title: 'Choisissez un parent', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await api(`/api/students/${student.id}/guardians`, {
        method: 'POST',
        body: JSON.stringify(guardianForm),
      })
      toast({ title: 'Tuteur associé', description: 'Le compte parent est maintenant lié à cet élève.' })
      setGuardianOpen(false)
      setGuardianForm({ userId: '', relation: 'TUTEUR', isPrimary: false })
      onChanged()
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveGuardian(userId: string, name: string) {
    if (!confirm(`Retirer le lien avec ${name} ? Le compte parent sera conservé, mais ne verra plus cet élève.`)) return
    try {
      await api(`/api/students/${student.id}/guardians?userId=${userId}`, { method: 'DELETE' })
      toast({ title: 'Lien retiré', description: `${name} n'est plus tuteur de cet élève.` })
      onChanged()
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-5">
      {/* header */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className={`h-16 w-16 rounded-2xl ${avatarColor(student.firstName + student.lastName)} flex items-center justify-center text-white text-xl font-bold`}>
              {initials(student.firstName + ' ' + student.lastName)}
            </div>
            <div className="flex-1 min-w-52">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">{student.firstName} {student.lastName}</h2>
                <Badge variant="outline" className={statusStudentBadge(student.status)}>{statusStudentLabel(student.status)}</Badge>
                {student.exitDate && (student.status === 'LEFT' || student.status === 'GRADUATED') && (
                  <Badge variant="outline" className="border-rose-200 text-rose-700 text-[10px]">
                    Sortie le {formatDate(student.exitDate)}{student.exitReason ? ` · ${student.exitReason}` : ''}
                  </Badge>
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                <span className="flex items-center gap-1"><Fingerprint className="h-3.5 w-3.5" />{student.matricule}</span>
                {student.massarCode && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />Massar : {student.massarCode}</span>}
                {student.birthDate && <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDate(student.birthDate)}</span>}
                <span className="flex items-center gap-1"><School className="h-3.5 w-3.5" />{student.klass ? `${student.klass.level.name} — ${student.klass.name}` : 'Non affecté'}</span>
              </div>
            </div>
            {avgOverall != null && (
              <div className="text-center rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3">
                <div className={`text-2xl font-bold ${gradeColor(avgOverall, 20)}`}>{avgOverall}</div>
                <div className="text-[11px] text-slate-500">moyenne /20</div>
              </div>
            )}
            {isAdmin && (
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" className="border-slate-200 text-slate-700" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Modifier
                </Button>
                {student.status === 'ACTIVE' || student.status === 'INACTIVE' ? (
                  <Button size="sm" variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50" onClick={() => setLeaveOpen(true)}>
                    <UserMinus className="h-3.5 w-3.5 mr-1" /> Retirer des effectifs
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    onClick={async () => {
                      try {
                        await api(`/api/students/${student.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'ACTIVE' }) })
                        toast({ title: 'Élève réactivé', description: 'Le statut est redevenu Actif.' })
                        onChanged()
                      } catch (e) {
                        toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
                      }
                    }}>
                    <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Réactiver
                  </Button>
                )}
                <Button size="sm" variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Supprimer
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="scolarite" className="space-y-4">
        <TabsList className="bg-white border border-slate-200 p-1 flex-wrap h-auto">
          <TabsTrigger value="scolarite">Scolarité</TabsTrigger>
          <TabsTrigger value="notes">Notes & progression</TabsTrigger>
          <TabsTrigger value="paiements">Paiements ({lateCount > 0 ? lateCount + ' retard(s)' : paidCount + ' payés'})</TabsTrigger>
          <TabsTrigger value="absences">Absences ({student.attendances.length})</TabsTrigger>
          <TabsTrigger value="famille">Famille ({student.guardians.length})</TabsTrigger>
          {isAdmin && <TabsTrigger value="historique"><History className="h-3.5 w-3.5 mr-1" />Historique</TabsTrigger>}
        </TabsList>

        {/* SCOLARITE */}
        <TabsContent value="scolarite" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-slate-200">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-emerald-600" />Inscriptions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {student.registrations.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                    <div>
                      <div className="text-sm font-medium text-slate-800">{r.schoolYear}</div>
                      <div className="text-xs text-slate-400">{r.type === 'NOUVELLE' ? 'Nouvelle inscription' : 'Réinscription'} · {formatDate(r.date)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={r.feePaid ? 'border-emerald-200 text-emerald-700' : 'border-amber-200 text-amber-700'}>
                        Frais : {r.feePaid ? 'payés' : 'impayés'}
                      </Badge>
                      <Badge variant="outline" className="bg-slate-50 text-slate-600">{r.status}</Badge>
                    </div>
                  </div>
                ))}
                {student.registrations.length === 0 && <p className="text-sm text-slate-400">Aucune inscription enregistrée.</p>}
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><School className="h-4 w-4 text-cyan-600" />Informations classe</CardTitle></CardHeader>
              <CardContent className="text-sm text-slate-600 space-y-2">
                <div className="flex justify-between"><span>Classe</span><span className="font-medium text-slate-800">{student.klass?.name || '—'}</span></div>
                <div className="flex justify-between"><span>Niveau</span><span className="font-medium text-slate-800">{student.klass?.level.name || '—'}</span></div>
                <div className="flex justify-between"><span>Professeur principal</span><span className="font-medium text-slate-800">{student.klass?.mainTeacher?.name || '—'}</span></div>
                <div className="flex justify-between"><span>Salle</span><span className="font-medium text-slate-800">{student.klass?.room || '—'}</span></div>
                <div className="flex justify-between"><span>Date d&apos;entrée</span><span className="font-medium text-slate-800">{formatDate(student.enrolledAt)}</span></div>
                {student.notes && (
                  <div className="mt-2 rounded-lg bg-amber-50 border border-amber-100 p-3 text-xs text-amber-800">
                    <span className="font-semibold">Particularités :</span> {student.notes}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* NOTES */}
        <TabsContent value="notes" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-slate-200">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-600" />Progression par matière</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {progression.length === 0 && <p className="text-sm text-slate-400">Aucune note enregistrée.</p>}
                {progression.map((p, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-600">{p.subject} <span className="text-slate-400">({p.period})</span></span>
                      <span className={`font-semibold ${gradeColor(p.avg, 20)}`}>{p.avg != null ? `${p.avg}/20` : '—'}</span>
                    </div>
                    <Progress value={((p.avg || 0) / 20) * 100} className="h-2 [&>div]:bg-emerald-500" />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-violet-500" />Dernières évaluations</CardTitle></CardHeader>
              <CardContent className="space-y-2 max-h-80 overflow-y-auto">
                {student.grades.slice(0, 12).map((g) => (
                  <div key={g.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-sm text-slate-800 truncate">{g.evaluation.title}</div>
                      <div className="text-xs text-slate-400">{g.evaluation.subject.name} · {g.evaluation.period.name} · {formatDate(g.evaluation.date)}</div>
                    </div>
                    {g.absent ? (
                      <Badge variant="outline" className="border-slate-200 text-slate-500">Absent</Badge>
                    ) : (
                      <span className={`text-sm font-bold ${gradeColor(g.score, g.evaluation.maxScore)}`}>
                        {g.score != null ? `${g.score}/${g.evaluation.maxScore}` : '—'}
                      </span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* PAIEMENTS */}
        <TabsContent value="paiements">
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wallet className="h-4 w-4 text-cyan-600" />
                Abonnements mensuels {SCHOOL_YEAR}
                {dues.length > 0 && <Badge className="bg-amber-100 text-amber-800 border-amber-200">{dues.length} échéance(s) restante(s)</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {student.payments.map((p) => (
                  <div key={p.id} className={`rounded-xl border p-3 ${p.status === 'EN_RETARD' ? 'border-rose-200 bg-rose-50/50' : p.status === 'PAYE' ? 'border-emerald-100' : 'border-slate-100'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-800">{p.label}</span>
                      <Badge variant="outline" className={`text-[10px] ${statusPaymentBadge(p.status)}`}>{statusPaymentLabel(p.status)}</Badge>
                    </div>
                    <div className="mt-1 text-lg font-bold text-slate-900">{p.amount.toLocaleString('fr-MA')} <span className="text-xs font-normal text-slate-400">DH</span></div>
                    <div className="text-xs text-slate-400">
                      {p.paidDate ? `Payé le ${formatDate(p.paidDate)} · ${p.method}` : `Échéance : ${formatDate(p.dueDate)}`}
                    </div>
                    {p.receiptNo && <div className="mt-1 text-[10px] text-slate-400">Reçu : {p.receiptNo}</div>}
                  </div>
                ))}
                {student.payments.length === 0 && <p className="text-sm text-slate-400">Aucune échéance créée pour cet élève.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABSENCES */}
        <TabsContent value="absences">
          <Card className="border-slate-200">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CalendarX2 className="h-4 w-4 text-rose-500" />Absences & retards</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {student.attendances.length === 0 && <p className="text-sm text-slate-400">Aucune absence — parfait assiduité !</p>}
              {student.attendances.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={a.type === 'ABSENCE' ? 'border-rose-200 text-rose-700' : 'border-amber-200 text-amber-700'}>
                      {a.type === 'ABSENCE' ? 'Absence' : 'Retard'}
                    </Badge>
                    <span className="text-sm text-slate-700">{formatDate(a.date)}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {a.reason || 'Sans motif'} · {a.justified ? 'justifiée' : 'non justifiée'}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FAMILLE */}
        <TabsContent value="famille">
          <Card className="border-slate-200">
            <CardHeader className="pb-2 flex-row flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><Phone className="h-4 w-4 text-emerald-600" />Tuteurs & contacts</CardTitle>
              {isAdmin && (
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setGuardianOpen(true)}>
                  <UserPlus className="h-3.5 w-3.5 mr-1" /> Associer un parent
                </Button>
              )}
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {student.guardians.length === 0 && (
                <p className="text-sm text-slate-400 sm:col-span-2">
                  Aucun tuteur associé. {isAdmin ? 'Utilisez « Associer un parent » pour lier un compte parent — il verra cet élève dans son espace.' : ''}
                </p>
              )}
              {student.guardians.map((g) => (
                <div key={g.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-4">
                  <div className={`h-10 w-10 rounded-full ${avatarColor(g.user.name)} flex items-center justify-center text-white text-sm font-bold`}>
                    {initials(g.user.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">{g.user.name}</span>
                      {g.isPrimary && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">Responsable principal</Badge>}
                    </div>
                    <div className="text-xs text-slate-500">{relationLabel(g.relation)}</div>
                    <div className="mt-1 flex flex-col gap-0.5 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{g.user.email}</span>
                      {g.user.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{g.user.phone}</span>}
                    </div>
                  </div>
                  {isAdmin && (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-400 hover:bg-rose-50" onClick={() => handleRemoveGuardian(g.user.id, g.user.name)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* HISTORIQUE */}
        {isAdmin && (
          <TabsContent value="historique">
            <Card className="border-slate-200">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><History className="h-4 w-4 text-violet-600" />Journal d&apos;activité (audit trail)</CardTitle></CardHeader>
              <CardContent>
                {(student.events || []).length === 0 && (
                  <p className="text-sm text-slate-400">Aucun événement enregistré. Chaque modification (classe, statut, tuteurs...) apparaîtra ici.</p>
                )}
                <div className="relative space-y-4 pl-2">
                  {(student.events || []).map((ev) => (
                    <div key={ev.id} className="flex items-start gap-3">
                      <div className="mt-0.5 h-7 w-7 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                        {eventIcon(ev.type)}
                      </div>
                      <div className="flex-1 min-w-0 pb-1 border-b border-slate-50">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-slate-800">{eventLabel(ev.type)}</span>
                          <span className="text-[11px] text-slate-400">{formatDateTime(ev.createdAt)}{ev.actor ? ` · par ${ev.actor.name}` : ''}</span>
                        </div>
                        <div className="text-xs text-slate-500">{ev.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* ===== edit dialog ===== */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Modifier la fiche de {student.firstName}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Prénom</Label>
                <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Nom</Label>
                <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Genre</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Garçon</SelectItem>
                    <SelectItem value="F">Fille</SelectItem>
                  </SelectContent>
                </Select></div>
              <div className="space-y-1.5"><Label>Date de naissance</Label>
                <Input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Classe (affectation)</Label>
                <Select value={form.classId} onValueChange={(v) => setForm({ ...form, classId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Non affecté</SelectItem>
                    {lookups?.classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}{typeof c._count?.students === 'number' ? ` (${c._count.students}/${c.capacity})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select></div>
              <div className="space-y-1.5"><Label>Code Massar</Label>
                <Input value={form.massarCode} onChange={(e) => setForm({ ...form, massarCode: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Statut</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select></div>
              {(form.status === 'LEFT' || form.status === 'GRADUATED') && (
                <div className="space-y-1.5"><Label>Motif de sortie</Label>
                  <Input value={form.exitReason} onChange={(e) => setForm({ ...form, exitReason: e.target.value })}
                    placeholder={form.status === 'LEFT' ? 'Ex : déménagement' : 'Ex : obtenu le certificat'} /></div>
              )}
            </div>
            <div className="space-y-1.5"><Label>Notes / particularités</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Allergies, PAI, remarques..." /></div>
            <p className="text-[11px] text-slate-400">Tout changement de classe ou de statut sera consigné dans l&apos;onglet Historique.</p>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Annuler</Button>
              <Button onClick={handleEdit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== leave (withdraw) dialog ===== */}
      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Retirer {student.firstName} des effectifs</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                La fiche et l&apos;historique (notes, paiements, absences) sont <b>conservés</b>. L&apos;élève disparaît des listes actives
                mais reste consultable via le filtre de statut correspondant.
              </span>
            </div>
            <div className="space-y-1.5"><Label>Type de sortie</Label>
              <Select value={leaveForm.status} onValueChange={(v) => setLeaveForm({ ...leaveForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LEFT">Parti / Transféré vers une autre école</SelectItem>
                  <SelectItem value="GRADUATED">Diplômé (fin de scolarité)</SelectItem>
                  <SelectItem value="INACTIVE">Inactif temporairement</SelectItem>
                </SelectContent>
              </Select></div>
              {leaveForm.status !== 'INACTIVE' && (
                <div className="space-y-1.5"><Label>Motif (visible dans l&apos;historique)</Label>
                  <Input value={leaveForm.exitReason} onChange={(e) => setLeaveForm({ ...leaveForm, exitReason: e.target.value })}
                    placeholder="Ex : déménagement à Rabat" /></div>
              )}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setLeaveOpen(false)}>Annuler</Button>
              <Button onClick={handleLeave} disabled={saving} className="bg-amber-600 hover:bg-amber-700">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Confirmer la sortie
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== delete dialog ===== */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Supprimer définitivement ?</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                <b>{student.firstName} {student.lastName}</b> ({student.matricule}) sera supprimé avec ses tuteurs associés.
                Si des paiements, notes ou absences existent, la suppression sera refusée — préférez alors
                « Retirer des effectifs » qui conserve tout l&apos;historique.
              </span>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>Annuler</Button>
              <Button onClick={handleDelete} disabled={saving} variant="destructive">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Supprimer définitivement
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== add guardian dialog ===== */}
      <Dialog open={guardianOpen} onOpenChange={setGuardianOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Associer un compte parent</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5"><Label>Compte parent *</Label>
              <Select value={guardianForm.userId || 'none'} onValueChange={(v) => setGuardianForm({ ...guardianForm, userId: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Choisir un parent..." /></SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="none">Choisir...</SelectItem>
                  {parents.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — {p.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Lien de parenté</Label>
                <Select value={guardianForm.relation} onValueChange={(v) => setGuardianForm({ ...guardianForm, relation: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RELATION_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select></div>
              <label className="flex items-end gap-2 pb-2.5 cursor-pointer">
                <Checkbox checked={guardianForm.isPrimary} onCheckedChange={(v) => setGuardianForm({ ...guardianForm, isPrimary: v === true })} />
                <span className="text-sm text-slate-600">Responsable principal</span>
              </label>
            </div>
            <p className="text-[11px] text-slate-400">
              Le compte n&apos;existe pas encore ? Créez-le d&apos;abord dans <b>Paramétrage → Comptes</b>, ou tapez simplement son email
              lors de la création d&apos;un nouvel élève.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setGuardianOpen(false)}>Annuler</Button>
              <Button onClick={handleAddGuardian} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Associer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
