'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Loader2, FileSignature, BadgeCheck, Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { api, formatDate, initials, avatarColor, SCHOOL_YEAR } from './utils'
import type { Lookups, Registration, Student } from './types'

export function RegistrationsView({ lookups }: { lookups: Lookups | null }) {
  const { toast } = useToast()
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ studentId: '', type: 'NOUVELLE', feeAmount: '800', feePaid: true, note: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [regs, sts] = await Promise.all([
        api<{ registrations: Registration[] }>('/api/registrations'),
        api<{ students: Student[] }>('/api/students'),
      ])
      setRegistrations(regs.registrations)
      setStudents(sts.students)
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    if (!form.studentId) {
      toast({ title: 'Élève requis', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await api('/api/registrations', {
        method: 'POST',
        body: JSON.stringify({
          studentId: form.studentId,
          type: form.type,
          feeAmount: Number(form.feeAmount) || 800,
          feePaid: form.feePaid,
          note: form.note,
        }),
      })
      toast({ title: 'Inscription enregistrée', description: "L'élève est inscrit pour l'année " + SCHOOL_YEAR })
      setOpen(false)
      setForm({ studentId: '', type: 'NOUVELLE', feeAmount: '800', feePaid: true, note: '' })
      load()
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const filtered = registrations.filter((r) => {
    if (!q) return true
    const hay = `${r.student.firstName} ${r.student.lastName} ${r.student.matricule}`.toLowerCase()
    return hay.includes(q.toLowerCase())
  })
  const notRegistered = students.filter(
    (s) => !registrations.some((r) => r.studentId === s.id) && s.status === 'ACTIVE'
  )
  const newCount = registrations.filter((r) => r.type === 'NOUVELLE').length
  const reCount = registrations.filter((r) => r.type === 'REINSCRIPTION').length

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-600 flex items-center justify-center"><BadgeCheck className="h-5 w-5 text-white" /></div>
            <div>
              <div className="text-2xl font-bold">{registrations.length}</div>
              <div className="text-xs text-slate-500">Inscriptions {SCHOOL_YEAR}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-cyan-600 flex items-center justify-center"><FileSignature className="h-5 w-5 text-white" /></div>
            <div>
              <div className="text-2xl font-bold">{newCount}</div>
              <div className="text-xs text-slate-500">Nouvelles inscriptions</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-amber-500 flex items-center justify-center"><FileSignature className="h-5 w-5 text-white" /></div>
            <div>
              <div className="text-2xl font-bold">{reCount}</div>
              <div className="text-xs text-slate-500">Réinscriptions</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {notRegistered.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ {notRegistered.length} élève(s) actif(s) ne disposent pas encore d&apos;inscription pour {SCHOOL_YEAR}.
          <button className="ml-2 font-semibold underline" onClick={() => setOpen(true)}>Inscrire maintenant</button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-52 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Rechercher un élève..." className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button onClick={() => setOpen(true)} className="ml-auto bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1" /> Nouvelle inscription
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase">
                  <th className="px-4 py-3">Élève</th>
                  <th className="px-4 py-3">Classe</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Frais d&apos;inscription</th>
                  <th className="px-4 py-3">Année</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-600 mx-auto" /></td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Aucune inscription.</td></tr>
                )}
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full ${avatarColor(r.student.firstName + r.student.lastName)} flex items-center justify-center text-white text-xs font-bold`}>
                          {initials(r.student.firstName + ' ' + r.student.lastName)}
                        </div>
                        <div>
                          <div className="font-medium text-slate-800">{r.student.firstName} {r.student.lastName}</div>
                          <div className="text-xs text-slate-400">{r.student.matricule}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.student.klass?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={r.type === 'NOUVELLE' ? 'border-cyan-200 text-cyan-700' : 'border-violet-200 text-violet-700'}>
                        {r.type === 'NOUVELLE' ? 'Nouvelle' : 'Réinscription'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(r.date)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={r.feePaid ? 'border-emerald-200 text-emerald-700' : 'border-amber-200 text-amber-700'}>
                        {r.feeAmount.toLocaleString('fr-MA')} DH · {r.feePaid ? 'payés' : 'impayés'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.schoolYear}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nouvelle inscription — {SCHOOL_YEAR}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label>Élève *</Label>
              <Select value={form.studentId || 'none'} onValueChange={(v) => setForm({ ...form, studentId: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Choisir un élève..." /></SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="none">Choisir un élève...</SelectItem>
                  {notRegistered.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.klass?.name || 'sans classe'})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOUVELLE">Nouvelle inscription</SelectItem>
                    <SelectItem value="REINSCRIPTION">Réinscription</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Frais (DH)</Label>
                <Input type="number" value={form.feeAmount} onChange={(e) => setForm({ ...form, feeAmount: e.target.value })} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.feePaid}
                onChange={(e) => setForm({ ...form, feePaid: e.target.checked })}
                className="h-4 w-4 accent-emerald-600"
              />
              Frais d&apos;inscription réglés
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={handleCreate} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Valider l&apos;inscription
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
