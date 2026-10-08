'use client'

import { useState } from 'react'
import { KeyRound, Loader2, ShieldCheck, UserCircle2, Mail, Phone } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { api, ROLE_LABELS, avatarColor, initials } from './utils'
import type { SessionUser } from './types'

export function AccountView({ user }: { user: SessionUser }) {
  const { toast } = useToast()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  async function changePassword() {
    if (!current || !next || !confirm) {
      toast({ title: 'Champs requis', description: 'Veuillez remplir les trois champs.', variant: 'destructive' })
      return
    }
    if (next !== confirm) {
      toast({ title: 'Confirmation différente', description: 'Le nouveau mot de passe et sa confirmation ne correspondent pas.', variant: 'destructive' })
      return
    }
    if (next.length < 8) {
      toast({ title: 'Mot de passe trop court', description: '8 caractères minimum.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await api('/api/auth/password', { method: 'POST', body: JSON.stringify({ current, next }) })
      toast({ title: 'Mot de passe modifié', description: 'Votre nouveau mot de passe est actif dès maintenant.' })
      setCurrent('')
      setNext('')
      setConfirm('')
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-5">
      {/* profile */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <UserCircle2 className="h-4 w-4 text-emerald-600" />
            Mon profil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className={`h-14 w-14 rounded-full ${avatarColor(user.name)} flex items-center justify-center text-white text-lg font-bold shrink-0`}>
              {initials(user.name)}
            </div>
            <div className="min-w-0">
              <div className="text-lg font-bold text-slate-900 truncate">{user.name}</div>
              <Badge variant="outline" className="mt-1 border-emerald-200 text-emerald-700">
                {ROLE_LABELS[user.role]}
              </Badge>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5">
              <Mail className="h-4 w-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wide text-slate-400">Email de connexion</div>
                <div className="text-sm font-medium text-slate-800 truncate">{user.email}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5">
              <ShieldCheck className="h-4 w-4 text-slate-400 shrink-0" />
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-400">Sécurité de session</div>
                <div className="text-sm font-medium text-slate-800">Cookie signé · 7 jours</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* password */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-emerald-600" />
            Changer mon mot de passe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Mot de passe actuel</Label>
              <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
            </div>
            <div className="space-y-1.5">
              <Label>Nouveau mot de passe</Label>
              <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" placeholder="8 caractères minimum" />
            </div>
            <div className="space-y-1.5">
              <Label>Confirmer</Label>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={changePassword} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <KeyRound className="h-4 w-4 mr-1" />}
              Mettre à jour
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
