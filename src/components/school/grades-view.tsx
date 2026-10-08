'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Loader2, ClipboardList, TrendingUp, Save, Trash2, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { api, formatDate, gradeColor, initials, avatarColor } from './utils'
import type { Evaluation, Lookups, SessionUser, Student } from './types'

export function GradesView({ user, lookups }: { user: SessionUser; lookups: Lookups | null }) {
  if (user.role === 'PARENT') return <ParentGrades user={user} />
  return <TeacherGrades user={user} lookups={lookups} />
}

// ==================== TEACHER / ADMIN ====================

function TeacherGrades({ user, lookups }: { user: SessionUser; lookups: Lookups | null }) {
  const { toast } = useToast()
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [classFilter, setClassFilter] = useState('all')
  const [periodFilter, setPeriodFilter] = useState('all')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', type: 'CONTROLE', classId: '', subjectId: '', periodId: '', maxScore: '20', date: '' })

  // saisie state
  const [saisie, setSaisie] = useState<{
    evaluation: Evaluation
    grades: Array<{ gradeId: string; student: { id: string; firstName: string; lastName: string; matricule: string }; score: number | null; absent: boolean }>
  } | null>(null)
  const [saisieLoading, setSaisieLoading] = useState(false)
  const [savingGrades, setSavingGrades] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (classFilter !== 'all') params.set('classId', classFilter)
      if (periodFilter !== 'all') params.set('periodId', periodFilter)
      const data = await api<{ evaluations: Evaluation[] }>(`/api/evaluations?${params.toString()}`)
      setEvaluations(data.evaluations)
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [classFilter, periodFilter, toast])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    if (!form.title || !form.classId || !form.subjectId || !form.periodId || !form.date) {
      toast({ title: 'Champs requis', description: 'Titre, classe, matière, période et date obligatoires.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await api('/api/evaluations', { method: 'POST', body: JSON.stringify(form) })
      toast({ title: 'Évaluation créée', description: 'Les notes peuvent être saisies immédiatement.' })
      setOpen(false)
      setForm({ title: '', type: 'CONTROLE', classId: '', subjectId: '', periodId: '', maxScore: '20', date: '' })
      load()
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function openSaisie(ev: Evaluation) {
    setSaisieLoading(true)
    try {
      const data = await api<{
        evaluation: {
          id: string; title: string; type: string; maxScore: number; date: string
          klass: { name: string }; subject: { name: string }; period: { name: string }
          grades: Array<{ id: string; score: number | null; absent: boolean; student: { id: string; firstName: string; lastName: string; matricule: string } }>
        }
      }>(`/api/evaluations/${ev.id}`)
      setSaisie({
        evaluation: { ...ev, maxScore: data.evaluation.maxScore },
        grades: data.evaluation.grades.map((g) => ({
          gradeId: g.id,
          student: g.student,
          score: g.score,
          absent: g.absent,
        })),
      })
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setSaisieLoading(false)
    }
  }

  async function saveGrades() {
    if (!saisie) return
    setSavingGrades(true)
    try {
      await api(`/api/evaluations/${saisie.evaluation.id}`, {
        method: 'POST',
        body: JSON.stringify({
          grades: saisie.grades.map((g) => ({ gradeId: g.gradeId, score: g.absent ? null : g.score, absent: g.absent })),
        }),
      })
      toast({ title: 'Notes enregistrées', description: `${saisie.grades.length} élèves.` })
      setSaisie(null)
      load()
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setSavingGrades(false)
    }
  }

  async function deleteEval(id: string) {
    try {
      await api(`/api/evaluations/${id}`, { method: 'DELETE' })
      toast({ title: 'Évaluation supprimée' })
      load()
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  if (saisieLoading) {
    return <div className="flex items-center justify-center h-48"><Loader2 className="h-7 w-7 animate-spin text-emerald-600" /></div>
  }

  if (saisie) {
    const filled = saisie.grades.filter((g) => !g.absent && g.score != null).length
    const classAvg = filled > 0
      ? Math.round((saisie.grades.filter((g) => !g.absent && g.score != null).reduce((s, g) => s + (g.score || 0), 0) / filled) * 100) / 100
      : null
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{saisie.evaluation.title}</h2>
            <p className="text-sm text-slate-500">
              {saisie.evaluation.klass?.name || saisie.grades[0]?.student && ''} · {saisie.evaluation.subject?.name} · {saisie.evaluation.period?.name} · /{saisie.evaluation.maxScore}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {classAvg != null && <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Moyenne classe : {classAvg}/{saisie.evaluation.maxScore}</Badge>}
            <Button variant="outline" onClick={() => setSaisie(null)}>Annuler</Button>
            <Button onClick={saveGrades} disabled={savingGrades} className="bg-emerald-600 hover:bg-emerald-700">
              {savingGrades ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Enregistrer ({filled}/{saisie.grades.length})
            </Button>
          </div>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase">
                  <th className="px-4 py-3">Élève</th>
                  <th className="px-4 py-3">Matricule</th>
                  <th className="px-4 py-3 w-40">Note /{saisie.evaluation.maxScore}</th>
                  <th className="px-4 py-3">Absent</th>
                </tr>
              </thead>
              <tbody>
                {saisie.grades.map((g) => (
                  <tr key={g.gradeId} className="border-b border-slate-50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full ${avatarColor(g.student.firstName + g.student.lastName)} flex items-center justify-center text-white text-xs font-bold`}>
                          {initials(g.student.firstName + ' ' + g.student.lastName)}
                        </div>
                        <span className="font-medium text-slate-800">{g.student.firstName} {g.student.lastName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">{g.student.matricule}</td>
                    <td className="px-4 py-2.5">
                      <Input
                        type="number"
                        min={0}
                        max={saisie.evaluation.maxScore}
                        step="0.5"
                        disabled={g.absent}
                        value={g.score ?? ''}
                        onChange={(e) => {
                          const v = e.target.value === '' ? null : Number(e.target.value)
                          setSaisie({
                            ...saisie,
                            grades: saisie.grades.map((x) => x.gradeId === g.gradeId ? { ...x, score: v } : x),
                          })
                        }}
                        className="h-8 w-28"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={g.absent}
                        onChange={(e) => setSaisie({
                          ...saisie,
                          grades: saisie.grades.map((x) => x.gradeId === g.gradeId ? { ...x, absent: e.target.checked } : x),
                        })}
                        className="h-4 w-4 accent-rose-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Classe" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{user.role === 'TEACHER' ? 'Mes classes' : 'Toutes les classes'}</SelectItem>
            {lookups?.classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Période" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les périodes</SelectItem>
            {lookups?.periods.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm text-slate-500">{evaluations.length} évaluation(s)</span>
        <Button onClick={() => setOpen(true)} className="ml-auto bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1" /> Nouvelle évaluation
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="h-7 w-7 animate-spin text-emerald-600" /></div>
      ) : evaluations.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-10 text-center text-sm text-slate-400">Aucune évaluation.</CardContent></Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {evaluations.map((ev) => (
            <Card key={ev.id} className="border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 shrink-0" style={{ color: ev.subject.color || '#10b981' }} />
                      <span className="text-sm font-semibold text-slate-800 truncate">{ev.title}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {ev.klass.name} · {ev.subject.name} · {ev.period.name}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                      <span>{formatDate(ev.date)}</span>
                      <span>·</span>
                      <span>{ev.type === 'EXAMEN' ? 'Examen' : ev.type === 'ORAL' ? 'Oral' : ev.type === 'PROJET' ? 'Projet' : 'Contrôle'}</span>
                      <span>·</span>
                      <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-600">/{ev.maxScore}</Badge>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{ev._count?.grades || 0}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => openSaisie(ev)}>
                      Saisir les notes
                    </Button>
                    {user.role !== 'TEACHER' || true ? (
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => deleteEval(ev.id)}>
                        <Trash2 className="h-3 w-3 mr-1" /> Supprimer
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* create evaluation */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nouvelle évaluation</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label>Titre *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex : Contrôle n°2 — Grammaire" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Classe *</Label>
                <Select value={form.classId || 'none'} onValueChange={(v) => setForm({ ...form, classId: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent className="max-h-52">
                    <SelectItem value="none">Choisir...</SelectItem>
                    {lookups?.classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Matière *</Label>
                <Select value={form.subjectId || 'none'} onValueChange={(v) => setForm({ ...form, subjectId: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent className="max-h-52">
                    <SelectItem value="none">Choisir...</SelectItem>
                    {lookups?.subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONTROLE">Contrôle</SelectItem>
                    <SelectItem value="EXAMEN">Examen</SelectItem>
                    <SelectItem value="ORAL">Oral</SelectItem>
                    <SelectItem value="PROJET">Projet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Barème</Label>
                <Input type="number" value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Période *</Label>
              <Select value={form.periodId || 'none'} onValueChange={(v) => setForm({ ...form, periodId: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Choisir...</SelectItem>
                  {lookups?.periods.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={handleCreate} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Créer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==================== PARENT ====================

interface ChildProgress {
  student: Student & { grades: Array<{ id: string; score: number | null; absent: boolean; evaluation: { title: string; maxScore: number; date: string; subject: { name: string; color: string | null }; period: { name: string } } }> }
  progression: Array<{ subject: string; period: string; avg: number | null; count: number }>
}

function ParentGrades({ user }: { user: SessionUser }) {
  const { toast } = useToast()
  const [children, setChildren] = useState<ChildProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(0)

  useEffect(() => {
    api<{ students: Student[] }>('/api/students')
      .then(async (d) => {
        const details = await Promise.all(
          d.students.map(async (s) => {
            const det = await api<{ student: ChildProgress['student']; progression: ChildProgress['progression'] }>(`/api/students/${s.id}`)
            return { student: det.student, progression: det.progression }
          })
        )
        setChildren(details)
      })
      .catch((e) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [toast])

  if (loading) return <div className="flex items-center justify-center h-48"><Loader2 className="h-7 w-7 animate-spin text-emerald-600" /></div>

  if (children.length === 0) {
    return <Card className="border-dashed"><CardContent className="p-10 text-center text-sm text-slate-400">Aucun enfant associé à votre compte. Contactez l&apos;administration.</CardContent></Card>
  }

  const child = children[Math.min(selected, children.length - 1)]
  const periods = [...new Set(child.progression.map((p) => p.period))]

  return (
    <div className="space-y-5">
      {/* child selector */}
      {children.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {children.map((c, i) => (
            <button
              key={c.student.id}
              onClick={() => setSelected(i)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm transition ${i === selected ? 'border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
            >
              <div className={`h-6 w-6 rounded-full ${avatarColor(c.student.firstName)} flex items-center justify-center text-white text-[10px] font-bold`}>
                {initials(c.student.firstName + ' ' + c.student.lastName)}
              </div>
              {c.student.firstName} {c.student.lastName}
            </button>
          ))}
        </div>
      )}

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            Suivi de progression — {child.student.firstName} {child.student.lastName}
            <Badge variant="outline" className="ml-1 text-xs border-slate-200 text-slate-600">{child.student.klass?.name}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {child.progression.length === 0 ? (
            <p className="text-sm text-slate-400">Aucune note disponible pour le moment.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {child.progression.map((p, i) => (
                <div key={i} className="rounded-xl border border-slate-100 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">{p.subject}</span>
                    <span className={`text-lg font-bold ${gradeColor(p.avg, 20)}`}>{p.avg != null ? p.avg : '—'}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mb-2">{p.period} · {p.count} évaluation(s)</div>
                  <Progress value={((p.avg || 0) / 20) * 100} className="h-2 [&>div]:bg-emerald-500" />
                  <div className="mt-1.5 text-[11px] text-slate-400">
                    {p.avg != null && (p.avg >= 14 ? 'Très bon niveau 👏' : p.avg >= 10 ? 'Niveau satisfaisant' : 'Besoin de soutien')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue={periods[0] || 'all'}>
        <TabsList className="bg-white border border-slate-200 p-1">
          {periods.map((p) => <TabsTrigger key={p} value={p}>{p}</TabsTrigger>)}
        </TabsList>
        {periods.map((p) => (
          <TabsContent key={p} value={p}>
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase">
                      <th className="px-4 py-3">Évaluation</th>
                      <th className="px-4 py-3">Matière</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {child.student.grades
                      .filter((g) => g.evaluation.period.name === p)
                      .map((g) => (
                        <tr key={g.id} className="border-b border-slate-50">
                          <td className="px-4 py-2.5 font-medium text-slate-800">{g.evaluation.title}</td>
                          <td className="px-4 py-2.5 text-slate-600">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: g.evaluation.subject.color || '#10b981' }} />
                              {g.evaluation.subject.name}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-500">{formatDate(g.evaluation.date)}</td>
                          <td className="px-4 py-2.5 text-right">
                            {g.absent ? (
                              <Badge variant="outline" className="border-slate-200 text-slate-500">Absent</Badge>
                            ) : (
                              <span className={`font-bold ${gradeColor(g.score, g.evaluation.maxScore)}`}>
                                {g.score != null ? `${g.score}/${g.evaluation.maxScore}` : '—'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
