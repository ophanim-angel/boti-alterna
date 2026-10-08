'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Loader2, BookOpen, CalendarClock, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { api, formatDate, initials, avatarColor } from './utils'
import type { Homework, Lookups, SessionUser } from './types'

export function HomeworksView({ user, lookups }: { user: SessionUser; lookups: Lookups | null }) {
  const { toast } = useToast()
  const [homeworks, setHomeworks] = useState<Homework[]>([])
  const [loading, setLoading] = useState(true)
  const [classFilter, setClassFilter] = useState('all')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', classId: '', subjectId: '', dueDate: '' })

  const canCreate = user.role === 'ADMIN' || user.role === 'TEACHER'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = classFilter !== 'all' ? `?classId=${classFilter}` : ''
      const data = await api<{ homeworks: Homework[] }>(`/api/homeworks${params}`)
      setHomeworks(data.homeworks)
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [classFilter, toast])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    if (!form.title || !form.classId || !form.subjectId || !form.dueDate) {
      toast({ title: 'Champs requis', description: 'Titre, classe, matière et date limite sont obligatoires.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await api('/api/homeworks', { method: 'POST', body: JSON.stringify(form) })
      toast({ title: 'Devoir publié', description: 'Les familles concernées en sont informées.' })
      setOpen(false)
      setForm({ title: '', description: '', classId: '', subjectId: '', dueDate: '' })
      load()
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await api(`/api/homeworks?id=${id}`, { method: 'DELETE' })
      toast({ title: 'Devoir supprimé' })
      load()
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const grouped: Record<string, Homework[]> = {}
  for (const h of homeworks) {
    const key = h.klass.name
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(h)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        {user.role !== 'PARENT' && (
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Classe" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{user.role === 'TEACHER' ? 'Mes classes' : 'Toutes les classes'}</SelectItem>
              {lookups?.classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <span className="text-sm text-slate-500">{homeworks.length} devoir(s)</span>
        {canCreate && (
          <Button onClick={() => setOpen(true)} className="ml-auto bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-1" /> Publier un devoir
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="h-7 w-7 animate-spin text-emerald-600" /></div>
      ) : homeworks.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-10 text-center text-sm text-slate-400">Aucun devoir publié.</CardContent></Card>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([className, list]) => (
            <div key={className}>
              <h3 className="text-sm font-semibold text-slate-600 mb-2">{className}</h3>
              <div className="grid gap-3 lg:grid-cols-2">
                {list.map((h) => {
                  const overdue = h.dueDate.slice(0, 10) < today
                  return (
                    <Card key={h.id} className={`border shadow-sm ${overdue ? 'border-slate-100 opacity-75' : 'border-emerald-100'}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: (h.subject.color || '#10b981') + '18' }}>
                            <BookOpen className="h-5 w-5" style={{ color: h.subject.color || '#10b981' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-sm font-semibold text-slate-800">{h.title}</span>
                              <Badge variant="outline" className={`shrink-0 text-[10px] ${overdue ? 'border-slate-200 text-slate-500' : 'border-emerald-200 text-emerald-700'}`}>
                                <CalendarClock className="h-3 w-3 mr-1" />{formatDate(h.dueDate)}
                              </Badge>
                            </div>
                            <div className="mt-0.5 text-xs text-slate-500">{h.subject.name}</div>
                            {h.description && <p className="mt-2 text-sm text-slate-600 leading-relaxed">{h.description}</p>}
                            <div className="mt-3 flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <div className={`h-6 w-6 rounded-full ${avatarColor(h.teacher.name)} flex items-center justify-center text-white text-[10px] font-bold`}>
                                  {initials(h.teacher.name)}
                                </div>
                                {h.teacher.name}
                              </div>
                              {user.role !== 'PARENT' && h.teacher.id === user.id && (
                                <Button size="sm" variant="ghost" className="h-7 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(h.id)}>
                                  <Trash2 className="h-3 w-3 mr-1" /> Supprimer
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Publier un devoir</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label>Titre *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex : Exercices sur les fractions" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Classe *</Label>
                <Select value={form.classId || 'none'} onValueChange={(v) => setForm({ ...form, classId: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent className="max-h-56">
                    <SelectItem value="none">Choisir...</SelectItem>
                    {lookups?.classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Matière *</Label>
                <Select value={form.subjectId || 'none'} onValueChange={(v) => setForm({ ...form, subjectId: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent className="max-h-56">
                    <SelectItem value="none">Choisir...</SelectItem>
                    {lookups?.subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Date limite *</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Consignes</Label>
              <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Détaillez les exercices, pages du manuel, matériel nécessaire..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={handleCreate} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Publier
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
