// ============ Shared utils ============

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) + ' à ' +
    d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export function avatarColor(seed: string): string {
  const colors = [
    'bg-emerald-500', 'bg-teal-500', 'bg-cyan-600', 'bg-violet-500',
    'bg-amber-500', 'bg-rose-500', 'bg-orange-500', 'bg-lime-600',
  ]
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return colors[Math.abs(hash) % colors.length]
}

export function fullName(s: { firstName: string; lastName: string }): string {
  return `${s.firstName} ${s.lastName}`
}

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administration',
  TEACHER: 'Enseignant',
  PARENT: 'Parent',
}

export function statusPaymentBadge(status: string): string {
  switch (status) {
    case 'PAYE': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case 'EN_RETARD': return 'bg-rose-100 text-rose-800 border-rose-200'
    default: return 'bg-amber-100 text-amber-800 border-amber-200'
  }
}

export function statusPaymentLabel(status: string): string {
  switch (status) {
    case 'PAYE': return 'Payé'
    case 'EN_RETARD': return 'En retard'
    default: return 'En attente'
  }
}

export function statusComplaintBadge(status: string): string {
  switch (status) {
    case 'OUVERTE': return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'EN_COURS': return 'bg-cyan-100 text-cyan-800 border-cyan-200'
    case 'RESOLUE': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case 'FERMEE': return 'bg-slate-100 text-slate-700 border-slate-200'
    default: return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

export function statusComplaintLabel(status: string): string {
  switch (status) {
    case 'OUVERTE': return 'Ouverte'
    case 'EN_COURS': return 'En cours'
    case 'RESOLUE': return 'Résolue'
    case 'FERMEE': return 'Fermée'
    default: return status
  }
}

export function statusStudentBadge(status: string): string {
  switch (status) {
    case 'ACTIVE': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case 'INACTIVE': return 'bg-slate-100 text-slate-700 border-slate-200'
    case 'LEFT': return 'bg-rose-100 text-rose-800 border-rose-200'
    default: return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

export function statusStudentLabel(status: string): string {
  switch (status) {
    case 'ACTIVE': return 'Actif'
    case 'INACTIVE': return 'Inactif'
    case 'LEFT': return 'Parti'
    case 'GRADUATED': return 'Diplômé'
    default: return status
  }
}

export function gradeColor(score: number | null, max: number): string {
  if (score == null) return 'text-slate-400'
  const pct = (score / max) * 100
  if (pct >= 80) return 'text-emerald-600'
  if (pct >= 60) return 'text-teal-600'
  if (pct >= 50) return 'text-amber-600'
  return 'text-rose-600'
}

export async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Une erreur est survenue')
  }
  return data as T
}

export const SCHOOL_YEAR = '2025/2026'

export const DAYS_FR = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
