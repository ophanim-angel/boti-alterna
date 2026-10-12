'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Search, Plus, ChevronRight, Loader2, X, Download, CheckSquare, Square, Users2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { api, statusStudentBadge, statusStudentLabel, initials, avatarColor, downloadCSV } from './utils'
import type { Lookups, SessionUser, Student } from './types'
import { FicheEleve, type FicheDetail } from './student-fiche'

interface StudentsViewProps {
  user: SessionUser
  lookups: Lookups | null
  focusStudentId?: string | null
  onFocusConsumed?: () => void
}

export function StudentsView({ user, lookups, focusStudentId, onFocusConsumed }: StudentsViewProps) {
  const { toast } = useToast()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<FicheDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', gender: 'M', classId: 'none', birthDate: '', massarCode: '', guardianEmail: '' })
  const [saving, setSaving] = useState(false)

  // bulk selection (ADMIN)
  const isAdmin = user.role === 'ADMIN'
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkClassOpen, setBulkClassOpen] = useState(false)
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false)
  const [bulkClassId, setBulkClassId] = useState('none')
  const [bulkStatus, setBulkStatus] = useState('ACTIVE')
  const [bulkBusy, setBulkBusy] = useState(false)

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

  const loadDetail = useCallback(async () => {
    if (!selectedId) { setDetail(null); return }
    setDetailLoading(true)
    try {
      const d = await api<FicheDetail>(`/api/students/${selectedId}`)
      setDetail(d)
      load()
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setDetailLoading(false)
    }
  }, [selectedId, load, toast])

  useEffect(() => { loadDetail() }, [loadDetail])

  // open a student coming from the global search
  useEffect(() => {
    if (focusStudentId) {
      setSelectedId(focusStudentId)
      onFocusConsumed?.()
    }
  }, [focusStudentId, onFocusConsumed])

  async function handleCreate() {
    if (!form.firstName || !form.lastName) {
      toast({ title: 'Champs requis', description: 'Prénom et nom obligatoires.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await api('/api/students', {
        method: 'POST',
        body: JSON.stringify({ ...form, classId: form.classId === 'none' ? '' : form.classId }),
      })
      toast({ title: 'Élève ajouté', description: `${form.firstName} ${form.lastName} a été enregistré${form.classId !== 'none' ? ' et affecté à sa classe' : ' (sans classe pour le moment)'}.` })
      setCreateOpen(false)
      setForm({ firstName: '', lastName: '', gender: 'M', classId: 'none', birthDate: '', massarCode: '', guardianEmail: '' })
      load()
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // ===== bulk operations =====
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllVisible() {
    if (selected.size === students.length) setSelected(new Set())
    else setSelected(new Set(students.map((s) => s.id)))
  }

  async function applyBulkClass() {
    setBulkBusy(true)
    try {
      const res = await api<{ updated: number }>('/api/students/bulk', {
        method: 'PATCH',
        body: JSON.stringify({ studentIds: Array.from(selected), classId: bulkClassId === 'none' ? null : bulkClassId }),
      })
      const target = bulkClassId === 'none' ? 'Sans classe' : lookups?.classes.find((c) => c.id === bulkClassId)?.name
      toast({ title: 'Affectation groupée réussie', description: `${res.updated} élève(s) affecté(s) : ${target}.` })
      setBulkClassOpen(false)
      setSelected(new Set())
      load()
    } catch (e) {
      toast({ title: 'Affectation impossible', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setBulkBusy(false)
    }
  }

  async function applyBulkStatus() {
    setBulkBusy(true)
    try {
      const res = await api<{ updated: number }>('/api/students/bulk', {
        method: 'PATCH',
        body: JSON.stringify({ studentIds: Array.from(selected), status: bulkStatus }),
      })
      toast({ title: 'Statut appliqué', description: `${res.updated} élève(s) mis à jour : ${statusStudentLabel(bulkStatus)}.` })
      setBulkStatusOpen(false)
      setSelected(new Set())
      load()
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setBulkBusy(false)
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
          <FicheEleve
            detail={detail}
            user={user}
            lookups={lookups}
            onChanged={loadDetail}
            onBack={() => setSelectedId(null)}
          />
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
            <SelectItem value="none">⚠ Non affectés</SelectItem>
            {lookups?.classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!isParentRole(user) && (
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="ACTIVE">Actifs</SelectItem>
              <SelectItem value="INACTIVE">Inactifs</SelectItem>
              <SelectItem value="LEFT">Partis / transférés</SelectItem>
              <SelectItem value="GRADUATED">Diplômés</SelectItem>
            </SelectContent>
          </Select>
        )}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-slate-500">{students.length} élève(s)</span>
          {!isParentRole(user) && (
            <Button variant="outline" onClick={exportStudents} className="border-slate-200 text-slate-600 hover:bg-slate-50">
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
          )}
          {isAdmin && (
            <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-1" /> Nouvel élève
            </Button>
          )}
        </div>
      </div>

      {/* bulk bar (ADMIN) */}
      {isAdmin && students.length > 0 && (
        <div className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-2.5 transition ${selected.size > 0 ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200 bg-white'}`}>
          <button onClick={selectAllVisible} className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-700">
            {selected.size === students.length && students.length > 0 ? (
              <CheckSquare className="h-4 w-4 text-emerald-600" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            Tout sélectionner
          </button>
          <span className="text-xs text-slate-400">·</span>
          <span className="text-sm text-slate-500">
            {selected.size > 0 ? <b className="text-emerald-700">{selected.size} sélectionné(s)</b> : 'Cochez des élèves pour les opérations groupées'}
          </span>
          {selected.size > 0 && (
            <>
              <Button size="sm" className="ml-auto bg-cyan-600 hover:bg-cyan-700" onClick={() => setBulkClassOpen(true)}>
                <Users2 className="h-3.5 w-3.5 mr-1" /> Affecter à une classe
              </Button>
              <Button size="sm" variant="outline" className="border-amber-200 text-amber-700" onClick={() => setBulkStatusOpen(true)}>
                Changer le statut
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Annuler</Button>
            </>
          )}
        </div>
      )}

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
                  <div key={s.id} className={`group relative flex items-center gap-3 rounded-xl border p-3 text-left transition ${selected.has(s.id) ? 'border-emerald-400 bg-emerald-50/60' : 'border-slate-100 hover:border-emerald-300 hover:bg-emerald-50/40'}`}>
                    {isAdmin && (
                      <Checkbox
                        checked={selected.has(s.id)}
                        onCheckedChange={() => toggleSelect(s.id)}
                        className="shrink-0"
                        aria-label={`Sélectionner ${s.firstName}`}
                      />
                    )}
                    <button onClick={() => setSelectedId(s.id)} className="flex flex-1 min-w-0 items-center gap-3 text-left">
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
                          {s.matricule} · {s.klass?.level?.name || '—'} · {s.gender === 'F' ? 'Fille' : 'Garçon'}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-500 shrink-0" />
                    </button>
                  </div>
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
                <Label>Classe & niveau</Label>
                <Select value={form.classId} onValueChange={(v) => setForm({ ...form, classId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Non affecté</SelectItem>
                    {lookups?.classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} — {c.level?.name}{typeof c._count?.students === 'number' ? ` (${c._count.students}/${c.capacity})` : ''}
                      </SelectItem>
                    ))}
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
            <p className="text-[11px] text-slate-400">
              Astuce : le compte parent n&apos;existe pas encore ? Créez-le dans <b>Paramétrage → Comptes</b> puis associez-le
              depuis l&apos;onglet « Famille » de la fiche élève.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
              <Button onClick={handleCreate} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* bulk class dialog */}
      <Dialog open={bulkClassOpen} onOpenChange={setBulkClassOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Affecter {selected.size} élève(s) à une classe</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5"><Label>Classe cible</Label>
              <Select value={bulkClassId} onValueChange={setBulkClassId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sans classe (désaffecter)</SelectItem>
                  {lookups?.classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} — {c.level?.name} ({c._count?.students ?? '—'}/{c.capacity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select></div>
            <p className="text-[11px] text-slate-400">
              Le système refuse l&apos;opération si la capacité de la classe est dépassée. Chaque transfert est consigné
              dans l&apos;historique des fiches concernées.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setBulkClassOpen(false)}>Annuler</Button>
              <Button onClick={applyBulkClass} disabled={bulkBusy} className="bg-cyan-600 hover:bg-cyan-700">
                {bulkBusy && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Appliquer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* bulk status dialog */}
      <Dialog open={bulkStatusOpen} onOpenChange={setBulkStatusOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Changer le statut de {selected.size} élève(s)</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5"><Label>Nouveau statut</Label>
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Actif</SelectItem>
                  <SelectItem value="INACTIVE">Inactif</SelectItem>
                  <SelectItem value="LEFT">Parti / Transféré</SelectItem>
                  <SelectItem value="GRADUATED">Diplômé</SelectItem>
                </SelectContent>
              </Select></div>
            <p className="text-[11px] text-slate-400">« Parti / Diplômé » conserve toute la fiche et son historique — c'est la méthode recommandée pour retirer un élève.</p>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setBulkStatusOpen(false)}>Annuler</Button>
              <Button onClick={applyBulkStatus} disabled={bulkBusy} className="bg-amber-600 hover:bg-amber-700">
                {bulkBusy && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Appliquer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function isParentRole(user: SessionUser): boolean {
  return user.role === 'PARENT'
}
