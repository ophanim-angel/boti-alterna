'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Wallet, TrendingUp, AlertTriangle, CheckCircle2, Search, Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { api, formatDate, initials, avatarColor, statusPaymentBadge, statusPaymentLabel, SCHOOL_YEAR } from './utils'
import type { Lookups, Payment, SessionUser, Student } from './types'

export function PaymentsView({ user, lookups }: { user: SessionUser; lookups: Lookups | null }) {
  const { toast } = useToast()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [q, setQ] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [monthFilter, setMonthFilter] = useState('all')

  // create dues dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [form, setForm] = useState({ studentId: '', amount: '650' })
  const [saving, setSaving] = useState(false)

  const isAdmin = user.role === 'ADMIN'
  const isParent = user.role === 'PARENT'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api<{ payments: Payment[] }>('/api/payments')
      setPayments(data.payments)
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (isAdmin) {
      api<{ students: Student[] }>('/api/students').then((d) => setStudents(d.students)).catch(() => {})
    }
  }, [isAdmin])

  async function markPaid(p: Payment, method: string) {
    setActionLoading(p.id)
    try {
      await api(`/api/payments/${p.id}`, { method: 'PATCH', body: JSON.stringify({ action: 'markPaid', method }) })
      toast({ title: 'Paiement enregistré', description: `${p.label} — ${p.student.firstName} ${p.student.lastName} (${p.amount} DH)` })
      load()
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setActionLoading(null)
    }
  }

  async function createDues() {
    if (!form.studentId) return
    setSaving(true)
    try {
      await api('/api/payments', {
        method: 'POST',
        body: JSON.stringify({ studentId: form.studentId, amount: Number(form.amount) || 650 }),
      })
      toast({ title: 'Échéances créées', description: '10 échéances mensuelles ont été générées.' })
      setCreateOpen(false)
      setForm({ studentId: '', amount: '650' })
      load()
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const filtered = useMemo(() => payments.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false
    if (monthFilter !== 'all' && String(p.month) !== monthFilter) return false
    if (q) {
      const hay = `${p.student.firstName} ${p.student.lastName} ${p.student.matricule}`.toLowerCase()
      if (!hay.includes(q.toLowerCase())) return false
    }
    return true
  }), [payments, statusFilter, monthFilter, q])

  const stats = useMemo(() => {
    const paid = payments.filter((p) => p.status === 'PAYE')
    const late = payments.filter((p) => p.status === 'EN_RETARD')
    const pending = payments.filter((p) => p.status === 'EN_ATTENTE')
    return {
      collected: paid.reduce((s, p) => s + p.amount, 0),
      lateCount: late.length,
      lateAmount: late.reduce((s, p) => s + p.amount, 0),
      pendingCount: pending.length,
    }
  }, [payments])

  const studentsWithoutDues = students.filter((s) => s.status === 'ACTIVE' && !payments.some((p) => p.studentId === s.id))

  return (
    <div className="space-y-5">
      {/* stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-600 flex items-center justify-center"><Wallet className="h-5 w-5 text-white" /></div>
            <div>
              <div className="text-xl font-bold">{stats.collected.toLocaleString('fr-MA')} DH</div>
              <div className="text-xs text-slate-500">Encaissé — {SCHOOL_YEAR}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-rose-500 flex items-center justify-center"><AlertTriangle className="h-5 w-5 text-white" /></div>
            <div>
              <div className="text-xl font-bold">{stats.lateCount}</div>
              <div className="text-xs text-slate-500">Échéances en retard ({stats.lateAmount.toLocaleString('fr-MA')} DH)</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-amber-500 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-white" /></div>
            <div>
              <div className="text-xl font-bold">{stats.pendingCount}</div>
              <div className="text-xs text-slate-500">En attente de règlement</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-52 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Élève, matricule..." className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Mois" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les mois</SelectItem>
            {[['9','Septembre'],['10','Octobre'],['11','Novembre'],['12','Décembre'],['1','Janvier'],['2','Février'],['3','Mars'],['4','Avril'],['5','Mai'],['6','Juin']].map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="PAYE">Payés</SelectItem>
            <SelectItem value="EN_ATTENTE">En attente</SelectItem>
            <SelectItem value="EN_RETARD">En retard</SelectItem>
          </SelectContent>
        </Select>
        {isAdmin && (
          <Button onClick={() => setCreateOpen(true)} className="ml-auto bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-1" /> Générer les échéances
          </Button>
        )}
      </div>

      {studentsWithoutDues.length > 0 && isAdmin && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ {studentsWithoutDues.length} élève(s) n&apos;ont pas encore d&apos;échéances mensuelles pour {SCHOOL_YEAR}.
        </div>
      )}

      {/* table */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase">
                  <th className="px-4 py-3">Élève</th>
                  <th className="px-4 py-3">Échéance</th>
                  <th className="px-4 py-3">Montant</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Reçu / Méthode</th>
                  {isAdmin && <th className="px-4 py-3 text-right">Action</th>}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-600 mx-auto" /></td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Aucun paiement trouvé.</td></tr>
                )}
                {filtered.slice(0, 100).map((p) => (
                  <tr key={p.id} className={`border-b border-slate-50 hover:bg-slate-50/60 ${p.status === 'EN_RETARD' ? 'bg-rose-50/40' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full ${avatarColor(p.student.firstName + p.student.lastName)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                          {initials(p.student.firstName + ' ' + p.student.lastName)}
                        </div>
                        <div>
                          <div className="font-medium text-slate-800">{p.student.firstName} {p.student.lastName}</div>
                          <div className="text-xs text-slate-400">{p.student.klass?.name || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{p.label}</div>
                      <div className="text-xs text-slate-400">due le {formatDate(p.dueDate)}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{p.amount.toLocaleString('fr-MA')} DH</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={statusPaymentBadge(p.status)}>{statusPaymentLabel(p.status)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {p.receiptNo ? <>{p.receiptNo}<br />{p.method}</> : '—'}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        {p.status !== 'PAYE' ? (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50" disabled={actionLoading === p.id} onClick={() => markPaid(p, 'ESPECES')}>
                              {actionLoading === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />} Espèces
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs border-cyan-200 text-cyan-700 hover:bg-cyan-50" disabled={actionLoading === p.id} onClick={() => markPaid(p, 'VIREMENT')}>
                              Virement
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Réglé le {formatDate(p.paidDate)}</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length > 100 && (
            <div className="px-4 py-3 text-xs text-slate-400 border-t border-slate-100">
              Affichage de 100 échéances sur {filtered.length} — affinez votre recherche.
            </div>
          )}
        </CardContent>
      </Card>

      {/* create dues */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Générer les échéances mensuelles</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <p className="text-sm text-slate-500">
              Crée 10 échéances (Septembre → Juin) pour l&apos;élève sélectionné, année {SCHOOL_YEAR}.
            </p>
            <div className="space-y-1.5">
              <Label>Élève *</Label>
              <Select value={form.studentId || 'none'} onValueChange={(v) => setForm({ ...form, studentId: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Choisir un élève..." /></SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="none">Choisir un élève...</SelectItem>
                  {studentsWithoutDues.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.klass?.name || 'sans classe'})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Montant mensuel (DH)</Label>
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button>
              <Button onClick={createDues} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Générer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
