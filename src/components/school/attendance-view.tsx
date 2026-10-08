'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Loader2, CalendarX2, Clock3, Trash2, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { api, formatDate, initials, avatarColor } from './utils'
import type { Attendance, Lookups, SessionUser } from './types'

export function AttendanceView({ user, lookups }: { user: SessionUser; lookups: Lookups | null }) {
  const { toast } = useToast()
  const [records, setRecords] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [students, setStudents] = useState<Array<{ id: string; firstName: string; lastName: string; klass?: { name: string } | null }>>([])
  const [form, setForm] = useState({ studentId: '', date: new Date().toISOString().slice(0, 10), type: 'ABSENCE', reason: '', justified: false })

  const canManage = user.role === 'ADMIN' || user.role === 'TEACHER'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (typeFilter !== 'all') params.set('type', typeFilter)
      const data = await api<{ attendances: Attendance[] }>(`/api/attendance?${params.toString()}`)
      setRecords(data.attendances)
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [typeFilter, toast])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (canManage) {
      api<{ students: Attendance['student'][] }>('/api/students')
        .then((d) => setStudents(d.students.map((s: { id: string; firstName: string; lastName: string; klass?: { name: string } | null }) => s)))
        .catch(() => {})
    }
  }, [canManage])

  async function handleCreate() {
    if (!form.studentId || !form.date) {
      toast({ title: 'Champs requis', description: 'Élève et date obligatoires.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await api('/api/attendance', {
        method: 'POST',
        body: JSON.stringify({ items: [{ ...form, type: form.type }] }),
      })
      toast({ title: form.type === 'ABSENCE' ? 'Absence enregistrée' : 'Retard enregistré' })
      setOpen(false)
      setForm({ studentId: '', date: new Date().toISOString().slice(0, 10), type: 'ABSENCE', reason: '', justified: false })
      load()
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function toggleJustified(a: Attendance) {
    try {
      await api('/api/attendance', {
        method: 'POST',
        body: JSON.stringify({ items: [{ studentId: a.student.id, date: a.date.slice(0, 10), type: a.type, reason: a.reason, justified: !a.justified }] }),
      })
      toast({ title: a.justified ? 'Marquée non justifiée' : 'Marquée justifiée' })
      load()
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  async function handleDelete(id: string) {
    try {
      await api(`/api/attendance?id=${id}`, { method: 'DELETE' })
      toast({ title: 'Enregistrement supprimé' })
      load()
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  const absences = records.filter((r) => r.type === 'ABSENCE').length
  const retards = records.filter((r) => r.type === 'RETARD').length
  const justified = records.filter((r) => r.justified).length

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-rose-500 flex items-center justify-center"><CalendarX2 className="h-5 w-5 text-white" /></div>
            <div>
              <div className="text-2xl font-bold">{absences}</div>
              <div className="text-xs text-slate-500">Absences enregistrées</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-amber-500 flex items-center justify-center"><Clock3 className="h-5 w-5 text-white" /></div>
            <div>
              <div className="text-2xl font-bold">{retards}</div>
              <div className="text-xs text-slate-500">Retards enregistrés</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-600 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-white" /></div>
            <div>
              <div className="text-2xl font-bold">{justified}</div>
              <div className="text-xs text-slate-500">Justifiés / total</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="ABSENCE">Absences</SelectItem>
            <SelectItem value="RETARD">Retards</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-slate-500">{records.length} enregistrement(s)</span>
        {canManage && (
          <Button onClick={() => setOpen(true)} className="ml-auto bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-1" /> Signaler
          </Button>
        )}
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase">
                  <th className="px-4 py-3">Élève</th>
                  <th className="px-4 py-3">Classe</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Motif</th>
                  <th className="px-4 py-3">Justifié</th>
                  {canManage && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-600 mx-auto" /></td></tr>
                )}
                {!loading && records.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Aucun enregistrement.</td></tr>
                )}
                {records.map((a) => (
                  <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full ${avatarColor(a.student.firstName + a.student.lastName)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                          {initials(a.student.firstName + ' ' + a.student.lastName)}
                        </div>
                        <span className="font-medium text-slate-800">{a.student.firstName} {a.student.lastName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{a.student.klass?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={a.type === 'ABSENCE' ? 'border-rose-200 text-rose-700' : 'border-amber-200 text-amber-700'}>
                        {a.type === 'ABSENCE' ? 'Absence' : 'Retard'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(a.date)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{a.reason || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={a.justified ? 'border-emerald-200 text-emerald-700' : 'border-slate-200 text-slate-500'}>
                        {a.justified ? 'Oui' : 'Non'}
                      </Badge>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-600 hover:bg-emerald-50" onClick={() => toggleJustified(a)}>
                            {a.justified ? 'Non justifié' : 'Justifier'}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-rose-500 hover:bg-rose-50" onClick={() => handleDelete(a.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    )}
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
          <DialogHeader><DialogTitle>Signaler une absence / un retard</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label>Élève *</Label>
              <Select value={form.studentId || 'none'} onValueChange={(v) => setForm({ ...form, studentId: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Choisir un élève..." /></SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="none">Choisir...</SelectItem>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.klass?.name || '—'})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ABSENCE">Absence</SelectItem>
                    <SelectItem value="RETARD">Retard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Motif</Label>
              <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Maladie, rendez-vous..." />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.justified} onChange={(e) => setForm({ ...form, justified: e.target.checked })} className="h-4 w-4 accent-emerald-600" />
              Justificatif fourni
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
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
