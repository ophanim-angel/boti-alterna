'use client'

import { useState } from 'react'
import { GraduationCap, Mail, Lock, Loader2, ShieldCheck, Users, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { SessionUser } from './types'

const DEMO_ACCOUNTS = [
  { role: 'Administration', email: 'direction@almanar.ma', desc: 'Gestion complète', icon: ShieldCheck },
  { role: 'Enseignant', email: 's.benali@almanar.ma', desc: 'Classes & devoirs', icon: BookOpen },
  { role: 'Parent', email: 'f.bahatem@gmail.com', desc: 'Suivi des enfants', icon: Users },
]

export function LoginView({ onLogin }: { onLogin: (user: SessionUser) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Connexion impossible')
      onLogin(data.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50">
      {/* Branding panel */}
      <div className="lg:w-[55%] bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white flex flex-col justify-between p-8 lg:p-14">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-emerald-500 flex items-center justify-center">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-lg font-bold leading-tight">EduTrack</div>
            <div className="text-xs text-slate-400">École Al Manar — Casablanca</div>
          </div>
        </div>

        <div className="py-10 max-w-xl">
          <h1 className="text-3xl lg:text-5xl font-bold leading-tight">
            La gestion scolaire,{' '}
            <span className="text-emerald-400">simple et connectée.</span>
          </h1>
          <p className="mt-5 text-slate-300 text-base lg:text-lg leading-relaxed">
            Plateforme tout-en-un pour l&apos;administration, les enseignants et les familles :
            inscriptions, abonnements mensuels, suivi pédagogique, devoirs, notes et communication.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3 max-w-md">
            {[
              ['26+', 'Élèves'],
              ['11', 'Classes'],
              ['100%', 'Connecté'],
            ].map(([v, l]) => (
              <div key={l} className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
                <div className="text-xl font-bold text-emerald-400">{v}</div>
                <div className="text-xs text-slate-400">{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-500">
          © 2026 EduTrack — Plateforme de gestion éducative. Année scolaire 2025/2026.
        </div>
      </div>

      {/* Login panel */}
      <div className="lg:w-[45%] flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="hidden lg:flex items-center gap-2 text-sm font-medium text-slate-500 mb-8">
            <GraduationCap className="h-4 w-4 text-emerald-600" />
            Espace de connexion sécurisé
          </div>

          <h2 className="text-2xl font-bold text-slate-900">Bienvenue 👋</h2>
          <p className="mt-1 text-sm text-slate-500">
            Connectez-vous pour accéder à votre espace.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Adresse email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="vous@exemple.ma"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 h-11" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Connexion...
                </>
              ) : (
                'Se connecter'
              )}
            </Button>
          </form>

          {/* Demo accounts */}
          <div className="mt-8">
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <div className="h-px flex-1 bg-slate-200" />
              Comptes de démonstration (mot de passe : demo1234)
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="mt-4 space-y-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email)
                    setPassword('demo1234')
                  }}
                  className="w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50/50"
                >
                  <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <acc.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800">{acc.role}</div>
                    <div className="text-xs text-slate-500 truncate">{acc.email}</div>
                  </div>
                  <div className="text-xs text-slate-400">{acc.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
