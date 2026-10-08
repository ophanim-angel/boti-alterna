'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, Loader2, MessageSquareWarning, Send, Paperclip, CircleDot } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { api, formatDateTime, statusComplaintBadge, statusComplaintLabel, initials, avatarColor } from './utils'
import type { Complaint, ComplaintMessage, Lookups, SessionUser, Student } from './types'

const CATEGORIES = [
  { value: 'SCOLARITE', label: 'Scolarité' },
  { value: 'PAIEMENT', label: 'Paiement / Facturation' },
  { value: 'DISCIPLINE', label: 'Discipline' },
  { value: 'SANTE', label: 'Santé' },
  { value: 'AUTRE', label: 'Autre' },
]

export function ComplaintsView({ user }: { user: SessionUser; lookups: Lookups | null }) {
  const { toast } = useToast()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [thread, setThread] = useState<(Complaint & { messages: ComplaintMessage[] }) | null>(null)
  const [threadLoading, setThreadLoading] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [myStudents, setMyStudents] = useState<Student[]>([])
  const [form, setForm] = useState({ subject: '', category: 'SCOLARITE', priority: 'NORMALE', studentId: '', content: '' })
  const threadEndRef = useRef<HTMLDivElement>(null)

  const isStaff = user.role === 'ADMIN' || user.role === 'TEACHER'

  const load = useCallback(async () => {
    setLoading(true)
    api<{ complaints: Complaint[] }>('/api/complaints')
      .then((d) => setComplaints(d.complaints))
      .catch((e) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [toast])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (user.role === 'PARENT') {
      api<{ students: Student[] }>('/api/students').then((d) => setMyStudents(d.students)).catch(() => {})
    }
  }, [user.role])

  const loadThread = useCallback(async (id: string) => {
    setThreadLoading(true)
    try {
      const data = await api<{ complaint: Complaint & { messages: ComplaintMessage[] } }>(`/api/complaints/${id}`)
      setThread(data.complaint)
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setThreadLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (selectedId) loadThread(selectedId)
    else setThread(null)
  }, [selectedId, loadThread])

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread?.messages.length])

  async function handleCreate() {
    if (!form.subject || !form.content) {
      toast({ title: 'Champs requis', description: 'Objet et message obligatoires.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await api('/api/complaints', { method: 'POST', body: JSON.stringify(form) })
      toast({ title: 'Réclamation envoyée', description: "L'administration vous répondra dans les plus brefs délais." })
      setOpen(false)
      setForm({ subject: '', category: 'SCOLARITE', priority: 'NORMALE', studentId: '', content: '' })
      load()
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function sendReply() {
    if (!thread || !reply.trim()) return
    setSending(true)
    try {
      await api(`/api/complaints/${thread.id}`, { method: 'POST', body: JSON.stringify({ content: reply }) })
      setReply('')
      loadThread(thread.id)
      load()
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  async function changeStatus(status: string) {
    if (!thread) return
    try {
      await api(`/api/complaints/${thread.id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      toast({ title: 'Statut mis à jour', description: statusComplaintLabel(status) })
      loadThread(thread.id)
      load()
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  // ====== THREAD DETAIL ======
  if (selectedId) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => setSelectedId(null)} className="pl-0 text-slate-500 hover:text-slate-800">
          ← Retour à la liste
        </Button>

        {threadLoading || !thread ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="h-7 w-7 animate-spin text-emerald-600" /></div>
        ) : (
          <Card className="border-slate-200 shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">{thread.subject}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {thread.author.name} {thread.student ? `· concernant ${thread.student.firstName} ${thread.student.lastName} (${thread.student.klass?.name})` : ''}
                    {' · '}ouvert le {formatDateTime(thread.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={statusComplaintBadge(thread.status)}>{statusComplaintLabel(thread.status)}</Badge>
                  <Badge variant="outline" className="border-slate-200 text-slate-500 text-[10px]">
                    {CATEGORIES.find((c) => c.value === thread.category)?.label || thread.category}
                  </Badge>
                  {thread.priority === 'HAUTE' && <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-[10px]">Priorité haute</Badge>}
                </div>
              </div>
              {isStaff && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-slate-400">Changer le statut :</span>
                  {['OUVERTE', 'EN_COURS', 'RESOLUE', 'FERMEE'].map((s) => (
                    <button
                      key={s}
                      onClick={() => changeStatus(s)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition ${thread.status === s ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-700'}`}
                    >
                      {statusComplaintLabel(s)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* messages */}
            <div className="p-5 space-y-4 max-h-[480px] overflow-y-auto bg-slate-50/50">
              {thread.messages.map((m) => {
                const own = m.author.id === user.id
                const staff = m.author.role !== 'PARENT'
                return (
                  <div key={m.id} className={`flex gap-3 ${own ? 'flex-row-reverse' : ''}`}>
                    <div className={`h-8 w-8 rounded-full shrink-0 ${own ? 'bg-emerald-600' : staff ? 'bg-violet-500' : 'bg-slate-400'} flex items-center justify-center text-white text-[10px] font-bold`}>
                      {initials(m.author.name)}
                    </div>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${own ? 'bg-emerald-600 text-white' : staff ? 'bg-violet-50 border border-violet-100' : 'bg-white border border-slate-200'}`}>
                      <div className={`text-[11px] font-semibold mb-1 ${own ? 'text-emerald-100' : 'text-slate-500'}`}>
                        {m.author.name} {staff && !own ? '· École' : own ? '· Vous' : ''}
                      </div>
                      <p className={`text-sm leading-relaxed whitespace-pre-wrap ${own ? 'text-white' : 'text-slate-700'}`}>{m.content}</p>
                      <div className={`mt-1.5 text-[10px] ${own ? 'text-emerald-200' : 'text-slate-400'}`}>{formatDateTime(m.createdAt)}</div>
                    </div>
                  </div>
                )
              })}
              <div ref={threadEndRef} />
            </div>

            {/* reply box */}
            <div className="border-t border-slate-100 p-4">
              <div className="flex gap-2">
                <Textarea
                  rows={2}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={user.role === 'PARENT' ? 'Écrire un message à l\'administration...' : 'Répondre au parent...'}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendReply()
                    }
                  }}
                />
                <Button onClick={sendReply} disabled={sending || !reply.trim()} className="bg-emerald-600 hover:bg-emerald-700 px-4 self-end">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    )
  }

  // ====== LIST ======
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Badge className="bg-amber-100 text-amber-800 border-amber-200">
            {complaints.filter((c) => c.status === 'OUVERTE').length} ouvertes
          </Badge>
          <Badge className="bg-cyan-100 text-cyan-800 border-cyan-200">
            {complaints.filter((c) => c.status === 'EN_COURS').length} en cours
          </Badge>
        </div>
        <Button onClick={() => setOpen(true)} className="ml-auto bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1" /> {user.role === 'PARENT' ? 'Nouvelle réclamation' : 'Nouvelle demande'}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="h-7 w-7 animate-spin text-emerald-600" /></div>
      ) : complaints.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center">
            <MessageSquareWarning className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400">
              {user.role === 'PARENT'
                ? "Aucune réclamation. Utilisez ce canal pour toute question ou réclamation auprès de l'école."
                : 'Aucune demande reçue pour le moment.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {complaints.map((c) => {
            const lastMsg = Array.isArray(c.lastMessage) ? c.lastMessage[0] : c.lastMessage
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className="w-full text-left rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:bg-emerald-50/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`h-10 w-10 rounded-full ${avatarColor(c.author.name)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                      {initials(c.author.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">{c.subject}</span>
                        {c.priority === 'HAUTE' && (
                          <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-[10px]">
                            <CircleDot className="h-2.5 w-2.5 mr-1" /> Haute
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500 truncate">
                        {lastMsg ? `${lastMsg.author.name} : ${lastMsg.content}` : ''}
                      </p>
                      <div className="mt-1 text-[11px] text-slate-400">
                        {c.author.name} · {c.student ? `${c.student.firstName} ${c.student.lastName}` : ''} · {c._count?.messages || 0} message(s) · {formatDateTime(c.updatedAt)}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className={`shrink-0 ${statusComplaintBadge(c.status)}`}>
                    {statusComplaintLabel(c.status)}
                  </Badge>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{user.role === 'PARENT' ? 'Nouvelle réclamation' : 'Nouvelle demande'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label>Objet *</Label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Résumé en quelques mots" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Catégorie</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priorité</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BASSE">Basse</SelectItem>
                    <SelectItem value="NORMALE">Normale</SelectItem>
                    <SelectItem value="HAUTE">Haute</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {user.role === 'PARENT' && myStudents.length > 0 && (
              <div className="space-y-1.5">
                <Label>Enfant concerné</Label>
                <Select value={form.studentId || 'none'} onValueChange={(v) => setForm({ ...form, studentId: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun / Général</SelectItem>
                    {myStudents.map((s) => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Message *</Label>
              <Textarea rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Décrivez votre demande en détail..." />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Paperclip className="h-3.5 w-3.5" /> Les pièces jointes seront disponibles prochainement.
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={handleCreate} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Envoyer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
