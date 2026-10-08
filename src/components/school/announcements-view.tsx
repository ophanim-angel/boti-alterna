'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Loader2, Megaphone, Pin, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { api, formatDateTime, initials, avatarColor } from './utils'
import type { Announcement, Lookups, SessionUser } from './types'

export function AnnouncementsView({ user, lookups }: { user: SessionUser; lookups: Lookups | null }) {
  const { toast } = useToast()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', audience: 'TOUS', classId: '', pinned: false })

  const canCreate = user.role === 'ADMIN' || user.role === 'TEACHER'

  const load = useCallback(async () => {
    setLoading(true)
    api<{ announcements: Announcement[] }>('/api/announcements')
      .then((d) => setAnnouncements(d.announcements))
      .catch((e) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [toast])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    if (!form.title || !form.content) {
      toast({ title: 'Champs requis', description: 'Titre et contenu obligatoires.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await api('/api/announcements', { method: 'POST', body: JSON.stringify(form) })
      toast({ title: 'Annonce publiée' })
      setOpen(false)
      setForm({ title: '', content: '', audience: 'TOUS', classId: '', pinned: false })
      load()
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await api(`/api/announcements?id=${id}`, { method: 'DELETE' })
      toast({ title: 'Annonce supprimée' })
      load()
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-slate-500">{announcements.length} annonce(s)</span>
        {canCreate && (
          <Button onClick={() => setOpen(true)} className="ml-auto bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-1" /> Publier une note
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="h-7 w-7 animate-spin text-emerald-600" /></div>
      ) : announcements.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-10 text-center text-sm text-slate-400">Aucune annonce publiée.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id} className={`border shadow-sm ${a.pinned ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'}`}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-11 w-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                    {a.pinned ? <Pin className="h-5 w-5" /> : <Megaphone className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{a.title}</h3>
                      <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-500">
                        {a.audience === 'TOUS' ? 'Toute l\u2019école' : a.audience === 'PARENTS' ? 'Parents' : a.audience === 'ENSEIGNANTS' ? 'Enseignants' : `Classe : ${a.klass?.name || ''}`}
                      </Badge>
                      {a.pinned && <Badge className="bg-emerald-600 text-white text-[10px]">Épinglé</Badge>}
                    </div>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{a.content}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <div className={`h-6 w-6 rounded-full ${avatarColor(a.author.name)} flex items-center justify-center text-white text-[10px] font-bold`}>
                          {initials(a.author.name)}
                        </div>
                        {a.author.name} · {formatDateTime(a.createdAt)}
                      </div>
                      {canCreate && (user.role === 'ADMIN' || a.author.id === user.id) && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-rose-500 hover:bg-rose-50" onClick={() => handleDelete(a.id)}>
                          <Trash2 className="h-3 w-3 mr-1" /> Supprimer
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Publier une note d&apos;information</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label>Titre *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex : Réunion parents-professeurs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Destinataires</Label>
                <Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TOUS">Toute l&apos;école</SelectItem>
                    <SelectItem value="PARENTS">Parents</SelectItem>
                    {user.role === 'ADMIN' && <SelectItem value="ENSEIGNANTS">Enseignants</SelectItem>}
                    <SelectItem value="CLASSE">Une classe précise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.audience === 'CLASSE' && (
                <div className="space-y-1.5">
                  <Label>Classe</Label>
                  <Select value={form.classId || 'none'} onValueChange={(v) => setForm({ ...form, classId: v === 'none' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Choisir...</SelectItem>
                      {lookups?.classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Contenu *</Label>
              <Textarea rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Détaillez l'information à partager..." />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} className="h-4 w-4 accent-emerald-600" />
              Épingler en haut de la liste
            </label>
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
