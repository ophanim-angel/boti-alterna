'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Search, Plus, Phone, Mail, CalendarDays, Fingerprint, MapPin, Loader2,
  ChevronRight, TrendingUp, Wallet, CalendarX2, FileText, School, X, Download,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { api, formatDate, statusPaymentBadge, statusPaymentLabel, statusStudentBadge, statusStudentLabel, initials, avatarColor, gradeColor, downloadCSV, SCHOOL_YEAR } from './utils'
import type { Lookups, SessionUser, Student, Payment, Attendance, Complaint, Guardian } from './types'

interface StudentsViewProps {
  user: SessionUser
  lookups: Lookups | null
  focusStudentId?: string | null
  onFocusConsumed?: () => void
}

interface StudentDetail {
  student: Student & {
    guardians: Guardian[]
    klass: (Student['klass'] & { level: { name: string }; mainTeacher?: { name: string } | null }) | null
    registrations: Array<{ id: string; schoolYear: string; type: string; date: string; status: string; feePaid: boolean; feeAmount: number }>
    payments: Payment[]
    attendances: Attendance[]
    grades: Array<{ id: string; score: number | null; absent: boolean; evaluation: { title: string; maxScore: number; date: string; subject: { name: string; color: string | null }; period: { name: string } } }>
    complaints: Complaint[]
  }
  progression: Array<{ subject: string; period: string; avg: number | null; count: number }>
}

export function StudentsView({ user, lookups, focusStudentId, onFocusConsumed }: StudentsViewProps) {
  const { toast } = useToast()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<StudentDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', gender: 'M', classId: '', birthDate: '', massarCode: '', guardianEmail: '' })
  const [saving, setSaving] = useState(false)

  const isParent = user.role === 'PARENT'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (classFilter !== 'all') params.set('classId', classFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const data = await api<{ students: Student[] }>(`/api/students?${params.toString()}`)
      setStudents(data.students)
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [q, classFilter, statusFilter, toast])

  useEffect(() => { load() }, [load])

  // open a student coming from the global search
  useEffect(() => {
    if (focusStudentId) {
      setSelectedId(focusStudentId)
      onFocusConsumed?.()
    }
  }, [focusStudentId, onFocusConsumed])

  useEffect(() => {
    if (!selectedId) { setDetail(null); return }
    setDetailLoading(true)
    api<StudentDetail>(`/api/students/${selectedId}`)
      .then(setDetail)
      .catch((e) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }))
      .finally(() => setDetailLoading(false))
  }, [selectedId, toast])

  async function handleCreate() {
    if (!form.firstName || !form.lastName) {
      toast({ title: 'Champs requis', description: 'Prénom et nom obligatoires.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await api('/api/students', { method: 'POST', body: JSON.stringify(form) })
      toast({ title: 'Élève ajouté', description: `${form.firstName} ${form.lastName} a été enregistré.` })
      setCreateOpen(false)
      setForm({ firstName: '', lastName: '', gender: 'M', classId: '', birthDate: '', massarCode: '', guardianEmail: '' })
      load()
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const grouped = useMemo(() => {
    const map: Record<string, Student[]> = {}
    for (const s of students) {
      const key = s.klass?.name || 'Non affecté'
      if (!map[key]) map[key] = []
      map[key].push(s)
    }
    return map
  }, [students])

  function exportStudents() {
    downloadCSV(
      `eleves-almanar-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Matricule', 'Prénom', 'Nom', 'Sexe', 'Classe', 'Statut', 'Date de naissance', 'Code Massar'],
      students.map((s) => [
        s.matricule,
        s.firstName,
        s.lastName,
        s.gender === 'M' ? 'Masculin' : 'Féminin',
        s.klass?.name || 'Non affecté',
        statusStudentLabel(s.status),
        s.birthDate ? new Date(s.birthDate).toLocaleDateString('fr-FR') : '',
        s.massarCode || '',
      ])
    )
    toast({ title: 'Export CSV', description: `${students.length} élève(s) exporté(s).` })
  }

  // ====== FICHE ELEVE ======
  if (selectedId) {
    return (
      <div className="space-y-5">
        <Button variant="ghost" onClick={() => setSelectedId(null)} className="pl-0 text-slate-500 hover:text-slate-800">
          <X className="h-4 w-4 mr-1" /> Retour à la liste
        </Button>

        {detailLoading || !detail ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="h-7 w-7 animate-spin text-emerald-600" /></div>
        ) : (
          <FicheEleve detail={detail} />
        )}
      </div>
    )
  }

  // ====== LISTE ======
  return (
    <div className="space-y-5">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-52 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Nom, matricule, code Massar..." className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Classe" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les classes</SelectItem>
            {lookups?.classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!isParent && (
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="ACTIVE">Actifs</SelectItem>
              <SelectItem value="INACTIVE">Inactifs</SelectItem>
            </SelectContent>
          </Select>
        )}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-slate-500">{students.length} élève(s)</span>
          {!isParent && (
            <Button variant="outline" onClick={exportStudents} className="border-slate-200 text-slate-600 hover:bg-slate-50">
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
          )}
          {user.role === 'ADMIN' && (
            <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-1" /> Nouvel élève
            </Button>
          )}
        </div>
      </div>

      {/* list */}
      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="h-7 w-7 animate-spin text-emerald-600" /></div>
      ) : students.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-10 text-center text-sm text-slate-400">Aucun élève trouvé.</CardContent></Card>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([className, list]) => (
            <Card key={className} className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                  {className}
                  <Badge variant="outline" className="text-xs text-slate-500">{list.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {list.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className="group flex items-center gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50/40"
                  >
                    <div className={`h-10 w-10 rounded-full ${avatarColor(s.firstName + s.lastName)} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                      {initials(s.firstName + ' ' + s.lastName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800 truncate">{s.firstName} {s.lastName}</span>
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${statusStudentBadge(s.status)}`}>
                          {statusStudentLabel(s.status)}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {s.matricule} · {s.klass?.level.name || '—'} · {s.gender === 'F' ? 'Fille' : 'Garçon'}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-500 shrink-0" />
                  </button>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvel élève</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prénom *</Label>
                <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="Prénom" />
              </div>
              <div className="space-y-1.5">
                <Label>Nom *</Label>
                <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="Nom" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Genre</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Garçon</SelectItem>
                    <SelectItem value="F">Fille</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date de naissance</Label>
                <Input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Classe</Label>
                <Select value={form.classId || 'none'} onValueChange={(v) => setForm({ ...form, classId: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Non affecté</SelectItem>
                    {lookups?.classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Code Massar</Label>
                <Input value={form.massarCode} onChange={(e) => setForm({ ...form, massarCode: e.target.value })} placeholder="Ex : R130045789" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email du parent (compte existant)</Label>
              <Input value={form.guardianEmail} onChange={(e) => setForm({ ...form, guardianEmail: e.target.value })} placeholder="parent@exemple.com — optionnel" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
              <Button onClick={handleCreate} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==================== FICHE ELEVE ====================

function FicheEleve({ detail }: { detail: StudentDetail }) {
  const { student, progression } = detail
  const paidCount = student.payments.filter((p) => p.status === 'PAYE').length
  const lateCount = student.payments.filter((p) => p.status === 'EN_RETARD').length
  const dues = student.payments.filter((p) => p.status !== 'PAYE')
  const avgOverall = progression.length > 0
    ? Math.round((progression.reduce((s, p) => s + (p.avg || 0), 0) / progression.filter((p) => p.avg != null).length) * 100) / 100
    : null

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
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="scolarite" className="space-y-4">
        <TabsList className="bg-white border border-slate-200 p-1 flex-wrap h-auto">
          <TabsTrigger value="scolarite">Scolarité</TabsTrigger>
          <TabsTrigger value="notes">Notes & progression</TabsTrigger>
          <TabsTrigger value="paiements">Paiements ({lateCount > 0 ? lateCount + ' retard(s)' : paidCount + ' payés'})</TabsTrigger>
          <TabsTrigger value="absences">Absences ({student.attendances.length})</TabsTrigger>
          <TabsTrigger value="famille">Famille</TabsTrigger>
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
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Phone className="h-4 w-4 text-emerald-600" />Tuteurs & contacts</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {student.guardians.length === 0 && <p className="text-sm text-slate-400">Aucun tuteur associé.</p>}
              {student.guardians.map((g) => (
                <div key={g.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-4">
                  <div className={`h-10 w-10 rounded-full ${avatarColor(g.user.name)} flex items-center justify-center text-white text-sm font-bold`}>
                    {initials(g.user.name)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{g.user.name}</div>
                    <div className="text-xs text-slate-500">{g.relation === 'PERE' ? 'Père' : g.relation === 'MERE' ? 'Mère' : 'Tuteur'}</div>
                    <div className="mt-1 flex flex-col gap-0.5 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{g.user.email}</span>
                      {g.user.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{g.user.phone}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
