'use client'

import { useEffect, useState } from 'react'
import {
  Users, UserCheck, Wallet, MessageSquareWarning, BookOpen, ClipboardList,
  School, Megaphone, TrendingUp, AlertTriangle, CalendarDays, GraduationCap,
  FileText, Clock, ArrowUpRight, Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar,
} from 'recharts'
import { api, formatDate, formatDateTime, statusComplaintLabel, statusComplaintBadge, initials, avatarColor } from './utils'
import type { SessionUser } from './types'

const MONTH_SHORT: Record<number, string> = {
  9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Déc', 1: 'Jan', 2: 'Fév', 3: 'Mar', 4: 'Avr', 5: 'Mai', 6: 'Juin',
}

interface AdminData {
  role: 'ADMIN'
  stats: Record<string, number>
  recentPayments: Array<{ id: string; label: string; amount: number; paidDate: string; method: string | null; student: { firstName: string; lastName: string } }>
  latePayments: Array<{ id: string; label: string; amount: number; dueDate: string; student: { id: string; firstName: string; lastName: string; klass?: { name: string } } }>
  recentComplaints: Array<{ id: string; subject: string; status: string; updatedAt: string; author: { name: string }; student?: { firstName: string; lastName: string } | null }>
  recentStudents: Array<{ id: string; firstName: string; lastName: string; klass?: { name: string } | null; matricule: string }>
  attendanceSeries: Array<{ day: string; absences: number; retards: number }>
  revenueSeries: Array<{ month: number; amount: number }>
}

interface TeacherData {
  role: 'TEACHER'
  stats: Record<string, number>
  myClasses: Array<{ id: string; name: string; subject: string; color: string | null; students: number }>
  recentHomeworks: Array<{ id: string; title: string; dueDate: string; klass: { name: string }; subject: { name: string } }>
  recentEvaluations: Array<{ id: string; title: string; date: string; klass: { name: string }; subject: { name: string }; _count: { grades: number } }>
  upcomingDeadlines: Array<{ id: string; title: string; dueDate: string; klass: { name: string }; subject: { name: string; color: string | null } }>
  announcements: Array<{ id: string; title: string; content: string; createdAt: string; author: { name: string } }>
}

interface ParentChild {
  id: string
  firstName: string
  lastName: string
  klass?: { name: string; level: { name: string }; mainTeacher?: { name: string } | null } | null
  payments: Array<{ status: string; amount: number }>
  grades: Array<{ score: number | null; absent: boolean; evaluation: { subject: { name: string; color: string | null }; maxScore: number; date: string; title: string } }>
  homeworks: Array<{ id: string; title: string; dueDate: string; subject: { name: string; color: string | null }; teacher: { name: string } }>
  progression: Array<{ subject: string; avg: number }>
  pendingPayments: number
  latePayments: number
  absences: number
  retards: number
}

interface ParentData {
  role: 'PARENT'
  children: ParentChild[]
  stats: Record<string, number>
  announcements: Array<{ id: string; title: string; content: string; createdAt: string; author: { name: string }; pinned: boolean }>
}

type DashData = AdminData | TeacherData | ParentData

export function DashboardView({ user, onNavigate }: {
  user: SessionUser
  onNavigate: (view: string) => void
}) {
  const [data, setData] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<DashData>('/api/dashboard')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }
  if (!data) return <div className="p-6 text-sm text-slate-500">Impossible de charger le tableau de bord.</div>

  if (data.role === 'ADMIN') return <AdminDashboard data={data} onNavigate={onNavigate} />
  if (data.role === 'TEACHER') return <TeacherDashboard data={data} onNavigate={onNavigate} />
  return <ParentDashboard data={data} user={user} onNavigate={onNavigate} />
}

// ==================== ADMIN ====================

function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  sub?: string
  accent: string
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
            {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
          </div>
          <div className={`h-10 w-10 rounded-lg ${accent} flex items-center justify-center`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AdminDashboard({ data, onNavigate }: { data: AdminData; onNavigate: (v: string) => void }) {
  const s = data.stats
  const collected = s.revenueCollected || 0
  const expected = 26 * 650 * 6 // expected Sep-Feb
  const pct = Math.min(100, Math.round((collected / expected) * 100))

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Élèves actifs" value={s.activeStudents} sub={`${s.totalStudents} au total — ${s.classes} classes`} accent="bg-emerald-600" />
        <StatCard icon={UserCheck} label="Comptes" value={`${s.totalTeachers} profs · ${s.totalParents} parents`} sub="Utilisateurs de la plateforme" accent="bg-teal-600" />
        <StatCard icon={Wallet} label="Encaissements 2025/2026" value={`${collected.toLocaleString('fr-MA')} DH`} sub={`${pct}% de l'attendu (6 mois)`} accent="bg-cyan-600" />
        <StatCard icon={AlertTriangle} label="Paiements en retard" value={s.latePayments} sub={`${s.lateAmount?.toLocaleString('fr-MA') || 0} DH à recouvrer`} accent="bg-rose-500" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue chart */}
        <Card className="lg:col-span-2 border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Encaissements par mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.revenueSeries.map((r) => ({ ...r, label: MONTH_SHORT[r.month] || String(r.month) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v / 1000}k`} />
                  <Tooltip formatter={(v: number) => [`${v.toLocaleString('fr-MA')} DH`, 'Encaissé']} />
                  <Bar dataKey="amount" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Open complaints */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquareWarning className="h-4 w-4 text-amber-500" />
              Réclamations en cours
              <Badge className="ml-auto bg-amber-100 text-amber-800 border-amber-200">{s.openComplaints}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-64 overflow-y-auto">
            {data.recentComplaints.length === 0 && (
              <p className="text-sm text-slate-400">Aucune réclamation en cours 🎉</p>
            )}
            {data.recentComplaints.map((c) => (
              <button
                key={c.id}
                onClick={() => onNavigate('complaints')}
                className="w-full text-left rounded-lg border border-slate-100 p-3 hover:border-emerald-200 hover:bg-emerald-50/40 transition"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-800 truncate">{c.subject}</span>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${statusComplaintBadge(c.status)}`}>
                    {statusComplaintLabel(c.status)}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {c.author.name} {c.student ? `· ${c.student.firstName} ${c.student.lastName}` : ''} · {formatDateTime(c.updatedAt)}
                </p>
              </button>
            ))}
            <button onClick={() => onNavigate('complaints')} className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              Voir toutes les réclamations <ArrowUpRight className="h-3 w-3" />
            </button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Late payments */}
        <Card className="lg:col-span-2 border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-rose-500" />
              Échéances en retard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {data.latePayments.length === 0 && <p className="text-sm text-slate-400">Aucun retard de paiement 👌</p>}
              {data.latePayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-8 w-8 rounded-full ${avatarColor(p.student.firstName + p.student.lastName)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                      {initials(p.student.firstName + ' ' + p.student.lastName)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">
                        {p.student.firstName} {p.student.lastName}
                        <span className="ml-2 text-xs text-slate-400">{p.student.klass?.name}</span>
                      </div>
                      <div className="text-xs text-slate-400">{p.label} — échéance {formatDate(p.dueDate)}</div>
                    </div>
                  </div>
                  <Badge className="bg-rose-100 text-rose-800 border-rose-200">{p.amount.toLocaleString('fr-MA')} DH</Badge>
                </div>
              ))}
            </div>
            <button onClick={() => onNavigate('payments')} className="mt-3 text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              Gérer les paiements <ArrowUpRight className="h-3 w-3" />
            </button>
          </CardContent>
        </Card>

        {/* Absence evolution */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-cyan-600" />
              Absences (février)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.attendanceSeries.map((a) => ({ ...a, label: a.day.slice(8) + '/02' }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="absences" stroke="#f43f5e" fill="#fecdd3" strokeWidth={2} name="Absences" />
                  <Area type="monotone" dataKey="retards" stroke="#f59e0b" fill="#fde68a" strokeWidth={2} name="Retards" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New students */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-emerald-600" />
            Dernières inscriptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {data.recentStudents.map((st) => (
              <div key={st.id} className="rounded-xl border border-slate-100 p-3 hover:border-emerald-200 transition">
                <div className={`h-9 w-9 rounded-full ${avatarColor(st.firstName + st.lastName)} flex items-center justify-center text-white text-xs font-bold`}>
                  {initials(st.firstName + ' ' + st.lastName)}
                </div>
                <div className="mt-2 text-sm font-medium text-slate-800">{st.firstName} {st.lastName}</div>
                <div className="text-xs text-slate-400">{st.matricule} · {st.klass?.name || 'Non affecté'}</div>
              </div>
            ))}
          </div>
          <button onClick={() => onNavigate('students')} className="mt-4 text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
            Voir la base d&apos;élèves <ArrowUpRight className="h-3 w-3" />
          </button>
        </CardContent>
      </Card>
    </div>
  )
}

// ==================== TEACHER ====================

function TeacherDashboard({ data, onNavigate }: { data: TeacherData; onNavigate: (v: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={School} label="Mes classes" value={data.stats.classes} sub={`${data.stats.studentsCount} élèves suivis`} accent="bg-emerald-600" />
        <StatCard icon={BookOpen} label="Devoirs publiés" value={data.stats.homeworks} sub="Cette année" accent="bg-teal-600" />
        <StatCard icon={ClipboardList} label="Évaluations créées" value={data.stats.evaluations} sub="Contrôles & examens" accent="bg-cyan-600" />
        <StatCard icon={MessageSquareWarning} label="Réclamations en cours" value={data.stats.openComplaints} sub="À traiter" accent="bg-amber-500" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600" />
              Prochaines échéances de devoirs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.upcomingDeadlines.length === 0 && <p className="text-sm text-slate-400">Aucune échéance à venir.</p>}
            {data.upcomingDeadlines.map((h) => (
              <div key={h.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{h.title}</div>
                  <div className="text-xs text-slate-400">{h.klass.name} · {h.subject.name}</div>
                </div>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0">
                  {formatDate(h.dueDate)}
                </Badge>
              </div>
            ))}
            <button onClick={() => onNavigate('homeworks')} className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              Gérer les devoirs <ArrowUpRight className="h-3 w-3" />
            </button>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-600" />
              Mes classes & matières
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 max-h-64 overflow-y-auto">
              {data.myClasses.map((c, i) => (
                <div key={c.id + i} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2">
                  <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color || '#10b981' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800">{c.name}</div>
                    <div className="text-xs text-slate-400">{c.subject}</div>
                  </div>
                  <Badge variant="outline" className="text-xs text-slate-600">{c.students} élèves</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-violet-500" />
              Dernières évaluations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recentEvaluations.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{e.title}</div>
                  <div className="text-xs text-slate-400">{e.klass.name} · {e.subject.name} · {e._count.grades} notes</div>
                </div>
                <span className="text-xs text-slate-500 shrink-0">{formatDate(e.date)}</span>
              </div>
            ))}
            <button onClick={() => onNavigate('grades')} className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              Gérer les évaluations <ArrowUpRight className="h-3 w-3" />
            </button>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-amber-500" />
              Notes d&apos;information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-72 overflow-y-auto">
            {data.announcements.map((a) => (
              <div key={a.id} className="rounded-lg border border-slate-100 p-3">
                <div className="text-sm font-medium text-slate-800">{a.title}</div>
                <p className="mt-1 text-xs text-slate-500 line-clamp-2">{a.content}</p>
                <div className="mt-1.5 text-[11px] text-slate-400">{a.author.name} · {formatDateTime(a.createdAt)}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ==================== PARENT ====================

function ParentDashboard({ data, user, onNavigate }: { data: ParentData; user: SessionUser; onNavigate: (v: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Users} label="Mes enfants" value={data.stats.childrenCount} sub="Suivis sur la plateforme" accent="bg-emerald-600" />
        <StatCard icon={Wallet} label="Échéances à payer" value={data.stats.pendingPayments} sub={data.stats.latePayments > 0 ? `${data.stats.latePayments} en retard !` : 'Tout est à jour'} accent={data.stats.latePayments > 0 ? 'bg-rose-500' : 'bg-cyan-600'} />
        <StatCard icon={MessageSquareWarning} label="Réclamations" value="—" sub="Échanger avec l'école" accent="bg-amber-500" />
      </div>

      {/* Children cards */}
      {data.children.map((child) => {
        const generalAvg = child.progression.length > 0
          ? Math.round((child.progression.reduce((s, p) => s + p.avg, 0) / child.progression.length) * 100) / 100
          : null
        return (
          <Card key={child.id} className="border-slate-200 shadow-sm overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <CardContent className="p-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className={`h-14 w-14 rounded-2xl ${avatarColor(child.firstName + child.lastName)} flex items-center justify-center text-white text-lg font-bold`}>
                  {initials(child.firstName + ' ' + child.lastName)}
                </div>
                <div className="flex-1 min-w-40">
                  <h3 className="text-lg font-bold text-slate-900">{child.firstName} {child.lastName}</h3>
                  <p className="text-sm text-slate-500">
                    {child.klass ? `${child.klass.level.name} · ${child.klass.name}` : 'Non affecté'}
                    {child.klass?.mainTeacher ? ` · Prof principal : ${child.klass.mainTeacher.name}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {generalAvg != null && (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                      Moyenne générale : {generalAvg}/20
                    </Badge>
                  )}
                  <Badge variant="outline" className="border-rose-200 text-rose-700">{child.absences} absences</Badge>
                  <Badge variant="outline" className="border-amber-200 text-amber-700">{child.retards} retards</Badge>
                  {child.pendingPayments > 0 && (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200">{child.pendingPayments} échéance(s) à payer</Badge>
                  )}
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {/* progression */}
                <div>
                  <div className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-emerald-600" /> Progression par matière
                  </div>
                  <div className="space-y-2.5">
                    {child.progression.length === 0 && <p className="text-xs text-slate-400">Aucune note pour le moment.</p>}
                    {child.progression.map((p) => (
                      <div key={p.subject}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-600">{p.subject}</span>
                          <span className={`font-semibold ${p.avg >= 10 ? 'text-emerald-600' : 'text-rose-600'}`}>{p.avg}/20</span>
                        </div>
                        <Progress value={(p.avg / 20) * 100} className="h-2 [&>div]:bg-emerald-500" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* recent homeworks */}
                <div>
                  <div className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-cyan-600" /> Devoirs récents
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {child.homeworks.length === 0 && <p className="text-xs text-slate-400">Aucun devoir publié.</p>}
                    {child.homeworks.slice(0, 4).map((h) => (
                      <div key={h.id} className="rounded-lg border border-slate-100 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-slate-800 truncate">{h.title}</span>
                          <span className="text-[11px] text-slate-400 shrink-0">{formatDate(h.dueDate)}</span>
                        </div>
                        <div className="text-xs text-slate-400">{h.subject.name} · {h.teacher.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => onNavigate('grades')}>
                  Suivi scolaire
                </Button>
                <Button size="sm" variant="outline" className="border-cyan-200 text-cyan-700 hover:bg-cyan-50" onClick={() => onNavigate('payments')}>
                  Paiements
                </Button>
                <Button size="sm" variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50" onClick={() => onNavigate('complaints')}>
                  Contacter l&apos;école
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Announcements */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-amber-500" />
            Notes d&apos;information de l&apos;école
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.announcements.map((a) => (
            <div key={a.id} className={`rounded-xl border p-4 ${a.pinned ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-100'}`}>
              <div className="flex items-center gap-2">
                {a.pinned && <Badge className="bg-emerald-600 text-white">Important</Badge>}
                <span className="text-sm font-semibold text-slate-800">{a.title}</span>
              </div>
              <p className="mt-1.5 text-sm text-slate-600">{a.content}</p>
              <div className="mt-2 text-[11px] text-slate-400">{a.author.name} · {formatDateTime(a.createdAt)}</div>
            </div>
          ))}
          <button onClick={() => onNavigate('announcements')} className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
            Toutes les annonces <ArrowUpRight className="h-3 w-3" />
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
