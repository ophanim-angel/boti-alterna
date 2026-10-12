'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Plus, Loader2, Trash2, Layers, DoorOpen, BookMarked, CalendarRange, Users,
  Pencil, KeyRound, X, ShieldAlert, ShieldCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { api, initials, avatarColor } from './utils'
import type { Lookups, Student } from './types'

interface ClassItem {
  id: string
  name: string
  levelId: string
  level: { name: string }
  mainTeacherId?: string | null
  mainTeacher?: { name: string } | null
  room: string | null
  capacity: number
  _count: { students: number }
}

export function SettingsView({ lookups, onRefresh }: { lookups: Lookups | null; onRefresh: () => void }) {
  const { toast } = useToast()
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState<'level' | 'class' | 'subject' | 'period' | 'editClass' | 'editLevel' | null>(null)
  const [saving, setSaving] = useState(false)

  const [levelForm, setLevelForm] = useState({ name: '', cycle: 'Primaire' })
  const [classForm, setClassForm] = useState({ name: '', levelId: '', mainTeacherId: '', room: '', capacity: '30' })
  const [subjectForm, setSubjectForm] = useState({ name: '', color: '#10b981' })
  const [periodForm, setPeriodForm] = useState({ name: '', startDate: '', endDate: '' })
  const [editClassForm, setEditClassForm] = useState<{ id: string; name: string; levelId: string; mainTeacherId: string; room: string; capacity: string } | null>(null)
  const [editLevelForm, setEditLevelForm] = useState<{ id: string; name: string; cycle: string } | null>(null)

  const loadClasses = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<{ items: ClassItem[] }>('/api/settings/classes')
      setClasses(data.items)
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { loadClasses() }, [loadClasses])

  async function create(entity: string, body: Record<string, unknown>, reset: () => void) {
    setSaving(true)
    try {
      await api(`/api/settings/${entity}`, { method: 'POST', body: JSON.stringify(body) })
      toast({ title: 'Élément créé' })
      reset()
      setDialog(null)
      loadClasses()
      onRefresh()
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function saveEdit() {
    if (!editClassForm && !editLevelForm) return
    setSaving(true)
    try {
      if (editClassForm) {
        await api(`/api/settings/classes?id=${editClassForm.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: editClassForm.name,
            levelId: editClassForm.levelId,
            mainTeacherId: editClassForm.mainTeacherId || null,
            room: editClassForm.room || null,
            capacity: Number(editClassForm.capacity) || 30,
          }),
        })
        toast({ title: 'Classe modifiée' })
      }
      if (editLevelForm) {
        await api(`/api/settings/levels?id=${editLevelForm.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: editLevelForm.name, cycle: editLevelForm.cycle }),
        })
        toast({ title: 'Niveau modifié' })
      }
      setDialog(null)
      setEditClassForm(null)
      setEditLevelForm(null)
      loadClasses()
      onRefresh()
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function remove(entity: string, id: string, name?: string) {
    if (!confirm(`Supprimer « ${name || entity} » ? Cette action est définitive.`)) return
    try {
      await api(`/api/settings/${entity}?id=${id}`, { method: 'DELETE' })
      toast({ title: 'Élément supprimé' })
      loadClasses()
      onRefresh()
    } catch (e) {
      toast({ title: 'Suppression impossible', description: e instanceof Error ? e.message : 'Des données y sont rattachées.', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-5">
      <Tabs defaultValue="classes">
        <TabsList className="bg-white border border-slate-200 p-1 flex-wrap h-auto">
          <TabsTrigger value="classes"><DoorOpen className="h-4 w-4 mr-1.5" />Classes</TabsTrigger>
          <TabsTrigger value="levels"><Layers className="h-4 w-4 mr-1.5" />Niveaux</TabsTrigger>
          <TabsTrigger value="subjects"><BookMarked className="h-4 w-4 mr-1.5" />Matières</TabsTrigger>
          <TabsTrigger value="periods"><CalendarRange className="h-4 w-4 mr-1.5" />Périodes</TabsTrigger>
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-1.5" />Comptes</TabsTrigger>
        </TabsList>

        {/* CLASSES */}
        <TabsContent value="classes" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{classes.length} classe(s) configurée(s) — cliquez sur ✏️ pour modifier l'affectation niveau / prof / capacité</p>
            <Button onClick={() => setDialog('class')} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1" /> Nouvelle classe</Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((c) => {
              const full = c._count.students >= c.capacity
              return (
                <Card key={c.id} className="border-slate-200 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-bold text-slate-800">{c.name}</div>
                        <div className="text-xs text-slate-400">{c.level.name} · Salle {c.room || '—'}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          onClick={() => {
                            setEditClassForm({
                              id: c.id,
                              name: c.name,
                              levelId: c.levelId,
                              mainTeacherId: c.mainTeacherId || '',
                              room: c.room || '',
                              capacity: String(c.capacity),
                            })
                            setDialog('editClass')
                          }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-400 hover:bg-rose-50" onClick={() => remove('classes', c.id, c.name)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Prof principal : <span className="font-medium text-slate-700">{c.mainTeacher?.name || '—'}</span></span>
                      <Badge variant="outline" className={`text-[10px] ${full ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 text-emerald-700'}`}>
                        {c._count.students}/{c.capacity} élèves
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* LEVELS */}
        <TabsContent value="levels" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{lookups?.levels.length || 0} niveau(x) — l'ordre définit la progression CP → Lycée</p>
            <Button onClick={() => setDialog('level')} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1" /> Nouveau niveau</Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {lookups?.levels.map((l) => (
              <Card key={l.id} className="border-slate-200 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{l.name}</div>
                    <div className="text-xs text-slate-400">{l.cycle}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      onClick={() => { setEditLevelForm({ id: l.id, name: l.name, cycle: l.cycle }); setDialog('editLevel') }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-400 hover:bg-rose-50" onClick={() => remove('levels', l.id, l.name)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* SUBJECTS */}
        <TabsContent value="subjects" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{lookups?.subjects.length || 0} matière(s)</p>
            <Button onClick={() => setDialog('subject')} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1" /> Nouvelle matière</Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {lookups?.subjects.map((s) => (
              <Card key={s.id} className="border-slate-200 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color || '#10b981' }} />
                    <span className="text-sm font-medium text-slate-800">{s.name}</span>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-400 hover:bg-rose-50" onClick={() => remove('subjects', s.id, s.name)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* PERIODS */}
        <TabsContent value="periods" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{lookups?.periods.length || 0} période(s)</p>
            <Button onClick={() => setDialog('period')} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1" /> Nouvelle période</Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {lookups?.periods.map((p) => (
              <Card key={p.id} className={`border shadow-sm ${p.active ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200'}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-800">{p.name}</div>
                    {p.active && <Badge className="bg-emerald-600 text-white text-[10px]">En cours</Badge>}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {p.startDate ? new Date(p.startDate).toLocaleDateString('fr-FR') : '—'} → {p.endDate ? new Date(p.endDate).toLocaleDateString('fr-FR') : '—'}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button size="sm" variant="ghost" className="h-7 text-rose-400 hover:bg-rose-50" onClick={() => remove('periods', p.id, p.name)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Supprimer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* USERS */}
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
      </Tabs>

      {/* dialogs */}
      <Dialog open={dialog === 'level'} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nouveau niveau</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5"><Label>Nom *</Label>
              <Input value={levelForm.name} onChange={(e) => setLevelForm({ ...levelForm, name: e.target.value })} placeholder="Ex : CE6" /></div>
            <div className="space-y-1.5"><Label>Cycle</Label>
              <Select value={levelForm.cycle} onValueChange={(v) => setLevelForm({ ...levelForm, cycle: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Maternelle">Maternelle</SelectItem>
                  <SelectItem value="Primaire">Primaire</SelectItem>
                  <SelectItem value="Collège">Collège</SelectItem>
                  <SelectItem value="Lycée">Lycée</SelectItem>
                </SelectContent>
              </Select></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialog(null)}>Annuler</Button>
              <Button disabled={saving} className="bg-emerald-600 hover:bg-emerald-700" onClick={() => create('levels', levelForm, () => setLevelForm({ name: '', cycle: 'Primaire' }))}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Créer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'class'} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nouvelle classe</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5"><Label>Nom *</Label>
              <Input value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} placeholder="Ex : CE2 - B" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Niveau *</Label>
                <Select value={classForm.levelId || 'none'} onValueChange={(v) => setClassForm({ ...classForm, levelId: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Choisir...</SelectItem>
                    {lookups?.levels.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select></div>
              <div className="space-y-1.5"><Label>Prof principal</Label>
                <Select value={classForm.mainTeacherId || 'none'} onValueChange={(v) => setClassForm({ ...classForm, mainTeacherId: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {lookups?.teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Salle</Label>
                <Input value={classForm.room} onChange={(e) => setClassForm({ ...classForm, room: e.target.value })} placeholder="P-20" /></div>
              <div className="space-y-1.5"><Label>Capacité</Label>
                <Input type="number" value={classForm.capacity} onChange={(e) => setClassForm({ ...classForm, capacity: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialog(null)}>Annuler</Button>
              <Button disabled={saving} className="bg-emerald-600 hover:bg-emerald-700" onClick={() => create('classes', classForm, () => setClassForm({ name: '', levelId: '', mainTeacherId: '', room: '', capacity: '30' }))}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Créer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* edit class */}
      <Dialog open={dialog === 'editClass'} onOpenChange={(o) => { if (!o) { setDialog(null); setEditClassForm(null) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Modifier la classe</DialogTitle></DialogHeader>
          {editClassForm && (
            <div className="grid gap-3 py-2">
              <div className="space-y-1.5"><Label>Nom</Label>
                <Input value={editClassForm.name} onChange={(e) => setEditClassForm({ ...editClassForm, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Niveau</Label>
                  <Select value={editClassForm.levelId || 'none'} onValueChange={(v) => setEditClassForm({ ...editClassForm, levelId: v === 'none' ? '' : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {lookups?.levels.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                    </SelectContent>
                  </Select></div>
                <div className="space-y-1.5"><Label>Prof principal</Label>
                  <Select value={editClassForm.mainTeacherId || 'none'} onValueChange={(v) => setEditClassForm({ ...editClassForm, mainTeacherId: v === 'none' ? '' : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {lookups?.teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Salle</Label>
                  <Input value={editClassForm.room} onChange={(e) => setEditClassForm({ ...editClassForm, room: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Capacité</Label>
                  <Input type="number" value={editClassForm.capacity} onChange={(e) => setEditClassForm({ ...editClassForm, capacity: e.target.value })} /></div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setDialog(null); setEditClassForm(null) }}>Annuler</Button>
                <Button disabled={saving} className="bg-emerald-600 hover:bg-emerald-700" onClick={saveEdit}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Enregistrer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* edit level */}
      <Dialog open={dialog === 'editLevel'} onOpenChange={(o) => { if (!o) { setDialog(null); setEditLevelForm(null) } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Modifier le niveau</DialogTitle></DialogHeader>
          {editLevelForm && (
            <div className="grid gap-3 py-2">
              <div className="space-y-1.5"><Label>Nom</Label>
                <Input value={editLevelForm.name} onChange={(e) => setEditLevelForm({ ...editLevelForm, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Cycle</Label>
                <Select value={editLevelForm.cycle} onValueChange={(v) => setEditLevelForm({ ...editLevelForm, cycle: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Maternelle">Maternelle</SelectItem>
                    <SelectItem value="Primaire">Primaire</SelectItem>
                    <SelectItem value="Collège">Collège</SelectItem>
                    <SelectItem value="Lycée">Lycée</SelectItem>
                  </SelectContent>
                </Select></div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setDialog(null); setEditLevelForm(null) }}>Annuler</Button>
                <Button disabled={saving} className="bg-emerald-600 hover:bg-emerald-700" onClick={saveEdit}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Enregistrer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'subject'} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nouvelle matière</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5"><Label>Nom *</Label>
              <Input value={subjectForm.name} onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })} placeholder="Ex : Histoire-Géographie" /></div>
            <div className="space-y-1.5"><Label>Couleur</Label>
              <input type="color" value={subjectForm.color} onChange={(e) => setSubjectForm({ ...subjectForm, color: e.target.value })} className="h-10 w-20 rounded border border-slate-200" /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialog(null)}>Annuler</Button>
              <Button disabled={saving} className="bg-emerald-600 hover:bg-emerald-700" onClick={() => create('subjects', subjectForm, () => setSubjectForm({ name: '', color: '#10b981' }))}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Créer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'period'} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nouvelle période</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5"><Label>Nom *</Label>
              <Input value={periodForm.name} onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })} placeholder="Ex : 4ème Trimestre" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Début</Label>
                <Input type="date" value={periodForm.startDate} onChange={(e) => setPeriodForm({ ...periodForm, startDate: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Fin</Label>
                <Input type="date" value={periodForm.endDate} onChange={(e) => setPeriodForm({ ...periodForm, endDate: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialog(null)}>Annuler</Button>
              <Button disabled={saving} className="bg-emerald-600 hover:bg-emerald-700" onClick={() => create('periods', periodForm, () => setPeriodForm({ name: '', startDate: '', endDate: '' }))}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Créer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==================== USERS TAB ====================

interface UserItem {
  id: string
  name: string
  email: string
  role: string
  phone: string | null
  active: boolean
  guardianOf: Array<{ student: { id: string; firstName: string; lastName: string; klass?: { name: string } | null } }>
}

interface StudentOption {
  id: string
  matricule: string
  firstName: string
  lastName: string
  klassName: string | null
  status: string
}

const RELATIONS = [
  { value: 'PERE', label: 'Père' },
  { value: 'MERE', label: 'Mère' },
  { value: 'TUTEUR', label: 'Tuteur' },
]

function UsersTab() {
  const { toast } = useToast()
  const [users, setUsers] = useState<UserItem[]>([])
  const [roleFilter, setRoleFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', role: 'PARENT', phone: '', password: '' })

  // edit state
  const [editUser, setEditUser] = useState<UserItem | null>(null)
  const [editForm, setEditForm] = useState({ name: '', phone: '', active: true, password: '' })
  const [allStudents, setAllStudents] = useState<StudentOption[]>([])
  const [childSelection, setChildSelection] = useState<Array<{ studentId: string; relation: string }>>([])
  const [childPicker, setChildPicker] = useState('')
  const [childRelation, setChildRelation] = useState('TUTEUR')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = roleFilter !== 'all' ? `?role=${roleFilter}` : ''
      const data = await api<{ users: UserItem[] }>(`/api/users${params}`)
      setUsers(data.users)
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [roleFilter, toast])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    if (!form.name || !form.email) {
      toast({ title: 'Champs requis', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await api('/api/users', { method: 'POST', body: JSON.stringify({ ...form, password: form.password || 'demo1234' }) })
      toast({ title: 'Compte créé', description: `${form.name} — mot de passe : ${form.password || 'demo1234'}` })
      setOpen(false)
      setForm({ name: '', email: '', role: 'PARENT', phone: '', password: '' })
      load()
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  function openEdit(u: UserItem) {
    setEditUser(u)
    setEditForm({ name: u.name, phone: u.phone || '', active: u.active, password: '' })
    setChildSelection(u.guardianOf.map((g) => ({ studentId: g.student.id, relation: 'TUTEUR' })))
    setChildPicker('')
    setChildRelation('TUTEUR')
    if (u.role === 'PARENT') {
      api<{ students: Student[] }>('/api/students')
        .then((d) => setAllStudents(d.students.map((s) => ({
          id: s.id,
          matricule: s.matricule,
          firstName: s.firstName,
          lastName: s.lastName,
          klassName: s.klass?.name || null,
          status: s.status,
        }))))
        .catch(() => setAllStudents([]))
    }
  }

  function addChild() {
    if (!childPicker) return
    if (childSelection.some((c) => c.studentId === childPicker)) {
      toast({ title: 'Cet élève est déjà lié au compte', variant: 'destructive' })
      return
    }
    setChildSelection([...childSelection, { studentId: childPicker, relation: childRelation }])
    setChildPicker('')
  }

  async function handleSaveEdit() {
    if (!editUser) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        name: editForm.name,
        phone: editForm.phone,
        active: editForm.active,
      }
      if (editForm.password) body.password = editForm.password
      if (editUser.role === 'PARENT') body.children = childSelection

      await api(`/api/users/${editUser.id}`, { method: 'PATCH', body: JSON.stringify(body) })
      toast({
        title: 'Compte mis à jour',
        description: editForm.password ? `Le mot de passe de ${editForm.name} a été réinitialisé.` : `${editForm.name} a été modifié.`,
      })
      setEditUser(null)
      load()
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteUser(u: UserItem) {
    const what = u.role === 'PARENT'
      ? `Supprimer le compte parent de ${u.name} ? Ses liens avec les élèves seront retirés (les élèves ne sont pas supprimés).`
      : `Supprimer le compte de ${u.name} ?`
    if (!confirm(what)) return
    try {
      await api(`/api/users/${u.id}`, { method: 'DELETE' })
      toast({ title: 'Compte supprimé', description: `${u.name} a été retiré.` })
      load()
    } catch (e) {
      toast({ title: 'Suppression impossible', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Rôle" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les comptes</SelectItem>
            <SelectItem value="TEACHER">Enseignants</SelectItem>
            <SelectItem value="PARENT">Parents</SelectItem>
            <SelectItem value="ADMIN">Administration</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-slate-500">{users.length} compte(s)</span>
        <Button onClick={() => setOpen(true)} className="ml-auto bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1" /> Nouveau compte
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase">
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Téléphone</th>
                  <th className="px-4 py-3">Rôle</th>
                  <th className="px-4 py-3">Détails</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-600 mx-auto" /></td></tr>
                )}
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`h-8 w-8 rounded-full ${avatarColor(u.name)} flex items-center justify-center text-white text-xs font-bold`}>
                          {initials(u.name)}
                        </div>
                        <div>
                          <div className="font-medium text-slate-800">{u.name}</div>
                          {!u.active && <Badge variant="outline" className="border-slate-200 text-slate-400 text-[10px]">Désactivé</Badge>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3 text-slate-500">{u.phone || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={u.role === 'ADMIN' ? 'border-violet-200 text-violet-700' : u.role === 'TEACHER' ? 'border-cyan-200 text-cyan-700' : 'border-emerald-200 text-emerald-700'}>
                        {u.role === 'ADMIN' ? 'Administration' : u.role === 'TEACHER' ? 'Enseignant' : 'Parent'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-56">
                      {u.role === 'PARENT' && u.guardianOf.length > 0
                        ? u.guardianOf.map((g) => `${g.student.firstName} ${g.student.lastName}${g.student.klass ? ` (${g.student.klass.name})` : ''}`).join(' · ')
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-8 text-slate-500 hover:bg-slate-100 hover:text-slate-700" onClick={() => openEdit(u)}>
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Modifier
                        </Button>
                        {u.role !== 'ADMIN' && (
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-rose-400 hover:bg-rose-50" onClick={() => handleDeleteUser(u)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nouveau compte utilisateur</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5"><Label>Nom complet *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Rôle</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PARENT">Parent</SelectItem>
                    <SelectItem value="TEACHER">Enseignant</SelectItem>
                  </SelectContent>
                </Select></div>
              <div className="space-y-1.5"><Label>Téléphone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Mot de passe initial</Label>
              <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="demo1234 par défaut" /></div>
            <p className="text-[11px] text-slate-400">
              Pour un parent : après création, cliquez sur <b>Modifier</b> pour lier ses enfants (ou associez-les depuis la fiche élève → Famille).
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={handleCreate} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Créer le compte
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* edit dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le compte — {editUser?.name}</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="grid gap-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Nom complet</Label>
                  <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Téléphone</Label>
                  <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  {editForm.active ? <ShieldCheck className="h-4 w-4 text-emerald-600" /> : <ShieldAlert className="h-4 w-4 text-slate-400" />}
                  <div>
                    <div className="text-sm font-medium text-slate-700">Compte actif</div>
                    <div className="text-[11px] text-slate-400">Un compte désactivé ne peut plus se connecter (accès bloqué, données conservées).</div>
                  </div>
                </div>
                <Switch checked={editForm.active} onCheckedChange={(v) => setEditForm({ ...editForm, active: v })} />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1"><KeyRound className="h-3.5 w-3.5 text-slate-400" />Réinitialiser le mot de passe</Label>
                <Input type="text" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="Laisser vide pour ne pas changer — min. 6 caractères" />
              </div>

              {editUser.role === 'PARENT' && (
                <div className="space-y-2 rounded-lg border border-emerald-100 bg-emerald-50/40 p-3">
                  <Label className="text-emerald-800">Enfants rattachés ({childSelection.length})</Label>
                  <p className="text-[11px] text-slate-500">
                    Le parent ne voit que ces enfants dans son espace (paiements, notes, devoirs...).
                  </p>
                  <div className="space-y-1.5">
                    {childSelection.map((c) => {
                      const s = allStudents.find((st) => st.id === c.studentId)
                      const current = editUser.guardianOf.find((g) => g.student.id === c.studentId)
                      const label = s ? `${s.firstName} ${s.lastName}${s.klassName ? ` — ${s.klassName}` : ''}` : current ? `${current.student.firstName} ${current.student.lastName}${current.student.klass ? ` — ${current.student.klass.name}` : ''}` : c.studentId
                      return (
                        <div key={c.studentId} className="flex items-center justify-between rounded-lg bg-white border border-emerald-100 px-3 py-2">
                          <span className="text-sm text-slate-700">{label}</span>
                          <div className="flex items-center gap-2">
                            <Select value={c.relation} onValueChange={(v) => setChildSelection(childSelection.map((x) => x.studentId === c.studentId ? { ...x, relation: v } : x))}>
                              <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {RELATIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <button className="h-6 w-6 rounded-full hover:bg-rose-50 text-rose-400 flex items-center justify-center"
                              onClick={() => setChildSelection(childSelection.filter((x) => x.studentId !== c.studentId))}>
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                    {childSelection.length === 0 && <p className="text-xs text-slate-400">Aucun enfant lié — le parent ne verra rien.</p>}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Select value={childPicker || 'none'} onValueChange={setChildPicker}>
                      <SelectTrigger className="flex-1 h-9"><SelectValue placeholder="Ajouter un élève..." /></SelectTrigger>
                      <SelectContent className="max-h-56">
                        <SelectItem value="none">Choisir un élève...</SelectItem>
                        {allStudents.filter((s) => !childSelection.some((c) => c.studentId === s.id)).map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.firstName} {s.lastName} — {s.matricule}{s.klassName ? ` (${s.klassName})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={childRelation} onValueChange={setChildRelation}>
                      <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RELATIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" className="h-9" onClick={addChild}>Ajouter</Button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setEditUser(null)}>Annuler</Button>
                <Button onClick={handleSaveEdit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Enregistrer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
