'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Loader2, Trash2, Layers, DoorOpen, BookMarked, CalendarRange, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { api } from './utils'
import type { Lookups } from './types'

interface ClassItem {
  id: string
  name: string
  level: { name: string }
  mainTeacher?: { name: string } | null
  room: string | null
  _count: { students: number }
}

export function SettingsView({ lookups, onRefresh }: { lookups: Lookups | null; onRefresh: () => void }) {
  const { toast } = useToast()
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState<'level' | 'class' | 'subject' | 'period' | null>(null)
  const [saving, setSaving] = useState(false)

  const [levelForm, setLevelForm] = useState({ name: '', cycle: 'Primaire' })
  const [classForm, setClassForm] = useState({ name: '', levelId: '', mainTeacherId: '', room: '', capacity: '30' })
  const [subjectForm, setSubjectForm] = useState({ name: '', color: '#10b981' })
  const [periodForm, setPeriodForm] = useState({ name: '', startDate: '', endDate: '' })

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

  async function remove(entity: string, id: string) {
    try {
      await api(`/api/settings/${entity}?id=${id}`, { method: 'DELETE' })
      toast({ title: 'Élément supprimé' })
      loadClasses()
      onRefresh()
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : "Suppression impossible (des données y sont rattachées).", variant: 'destructive' })
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
            <p className="text-sm text-slate-500">{classes.length} classe(s) configurée(s)</p>
            <Button onClick={() => setDialog('class')} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1" /> Nouvelle classe</Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((c) => (
              <Card key={c.id} className="border-slate-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-bold text-slate-800">{c.name}</div>
                      <div className="text-xs text-slate-400">{c.level.name} · Salle {c.room || '—'}</div>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-400 hover:bg-rose-50" onClick={() => remove('classes', c.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Prof principal : <span className="font-medium text-slate-700">{c.mainTeacher?.name || '—'}</span></span>
                    <Badge variant="outline" className="text-[10px] border-emerald-200 text-emerald-700">{c._count.students} élèves</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* LEVELS */}
        <TabsContent value="levels" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{lookups?.levels.length || 0} niveau(x)</p>
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
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-400 hover:bg-rose-50" onClick={() => remove('levels', l.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
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
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-400 hover:bg-rose-50" onClick={() => remove('subjects', s.id)}>
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
                    <Button size="sm" variant="ghost" className="h-7 text-rose-400 hover:bg-rose-50" onClick={() => remove('periods', p.id)}>
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
  guardianOf: Array<{ student: { firstName: string; lastName: string; klass?: { name: string } | null } }>
}

function UsersTab() {
  const { toast } = useToast()
  const [users, setUsers] = useState<UserItem[]>([])
  const [roleFilter, setRoleFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', role: 'PARENT', phone: '', password: '' })

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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase">
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Téléphone</th>
                <th className="px-4 py-3">Rôle</th>
                <th className="px-4 py-3">Détails</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="px-4 py-10 text-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-600 mx-auto" /></td></tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-slate-800">{u.name}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3 text-slate-500">{u.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={u.role === 'ADMIN' ? 'border-violet-200 text-violet-700' : u.role === 'TEACHER' ? 'border-cyan-200 text-cyan-700' : 'border-emerald-200 text-emerald-700'}>
                      {u.role === 'ADMIN' ? 'Administration' : u.role === 'TEACHER' ? 'Enseignant' : 'Parent'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {u.role === 'PARENT' && u.guardianOf.length > 0
                      ? u.guardianOf.map((g) => `${g.student.firstName} ${g.student.lastName}`).join(', ')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

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
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={handleCreate} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Créer le compte
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
