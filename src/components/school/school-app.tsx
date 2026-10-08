'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  GraduationCap, LayoutDashboard, Users, FileSignature, Wallet, BookOpen,
  ClipboardList, CalendarX2, CalendarDays, Megaphone, MessageSquareWarning,
  Settings, LogOut, Menu, Loader2, Bell, Search, School, CircleUser,
  Wallet as WalletIcon, Megaphone as MegaphoneIcon, BookOpen as BookOpenIcon,
  MessageSquareWarning as MessageIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { AccountView } from './account-view'
import { LoginView } from './login-view'
import { DashboardView } from './dashboard-view'
import { StudentsView } from './students-view'
import { RegistrationsView } from './registrations-view'
import { PaymentsView } from './payments-view'
import { HomeworksView } from './homeworks-view'
import { GradesView } from './grades-view'
import { AttendanceView } from './attendance-view'
import { TimetableView } from './timetable-view'
import { AnnouncementsView } from './announcements-view'
import { ComplaintsView } from './complaints-view'
import { SettingsView } from './settings-view'
import { api, initials, avatarColor, ROLE_LABELS, SCHOOL_YEAR, formatDateTime } from './utils'
import type { Lookups, NotificationItem, SearchResult, SessionUser, ViewKey } from './types'

interface NavItem {
  key: ViewKey
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles: Array<SessionUser['role']>
  section: string
}

const NAV: NavItem[] = [
  { key: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, roles: ['ADMIN', 'TEACHER', 'PARENT'], section: 'Général' },
  { key: 'account', label: 'Mon compte', icon: CircleUser, roles: ['ADMIN', 'TEACHER', 'PARENT'], section: 'Général' },
  { key: 'students', label: 'Base d\u2019élèves', icon: Users, roles: ['ADMIN', 'TEACHER', 'PARENT'], section: 'Scolarité' },
  { key: 'registrations', label: 'Inscriptions', icon: FileSignature, roles: ['ADMIN'], section: 'Scolarité' },
  { key: 'payments', label: 'Abonnements & paiements', icon: Wallet, roles: ['ADMIN', 'PARENT'], section: 'Scolarité' },
  { key: 'attendance', label: 'Absences & retards', icon: CalendarX2, roles: ['ADMIN', 'TEACHER', 'PARENT'], section: 'Vie scolaire' },
  { key: 'timetable', label: 'Emploi du temps', icon: CalendarDays, roles: ['ADMIN', 'TEACHER'], section: 'Vie scolaire' },
  { key: 'homeworks', label: 'Devoirs & prolongements', icon: BookOpen, roles: ['ADMIN', 'TEACHER', 'PARENT'], section: 'Pédagogie' },
  { key: 'grades', label: 'Évaluations & notes', icon: ClipboardList, roles: ['ADMIN', 'TEACHER', 'PARENT'], section: 'Pédagogie' },
  { key: 'announcements', label: 'Notes d\u2019information', icon: Megaphone, roles: ['ADMIN', 'TEACHER', 'PARENT'], section: 'Communication' },
  { key: 'complaints', label: 'Réclamations & discussions', icon: MessageSquareWarning, roles: ['ADMIN', 'TEACHER', 'PARENT'], section: 'Communication' },
  { key: 'settings', label: 'Paramétrage', icon: Settings, roles: ['ADMIN'], section: 'Administration' },
]

const NOTIF_ICON: Record<NotificationItem['type'], React.ComponentType<{ className?: string }>> = {
  complaint: MessageIcon,
  payment: WalletIcon,
  announcement: MegaphoneIcon,
  homework: BookOpenIcon,
}

const NOTIF_COLOR: Record<NotificationItem['type'], string> = {
  complaint: 'bg-amber-100 text-amber-700',
  payment: 'bg-rose-100 text-rose-700',
  announcement: 'bg-cyan-100 text-cyan-700',
  homework: 'bg-emerald-100 text-emerald-700',
}

const TITLES: Record<ViewKey, { title: string; sub: string }> = {
  dashboard: { title: 'Tableau de bord', sub: 'Vue d\u2019ensemble de l\u2019établissement' },
  students: { title: 'Base d\u2019élèves', sub: 'Dossiers, fiches élèves et affectation des classes' },
  registrations: { title: 'Suivi des inscriptions', sub: `Inscriptions et réinscriptions — ${SCHOOL_YEAR}` },
  payments: { title: 'Abonnements & paiements', sub: 'Échéances mensuelles, encaissements et relances' },
  attendance: { title: 'Absences & retards', sub: 'Assiduité et suivi disciplinaire' },
  timetable: { title: 'Emploi du temps', sub: 'Planning hebdomadaire des classes' },
  homeworks: { title: 'Devoirs & prolongements', sub: 'Travail à faire publié par les enseignants' },
  grades: { title: 'Évaluations & notes', sub: 'Contrôles, examens et suivi de progression' },
  announcements: { title: 'Notes d\u2019information', sub: 'Actualités et annonces de l\u2019établissement' },
  complaints: { title: 'Réclamations & discussions', sub: 'Échanges entre familles, enseignants et administration' },
  settings: { title: 'Paramétrage', sub: 'Configuration de l\u2019établissement' },
  account: { title: 'Mon compte', sub: 'Profil, sécurité et mot de passe' },
}

export function SchoolApp() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [booting, setBooting] = useState(true)
  const [view, setView] = useState<ViewKey>('dashboard')
  const [lookups, setLookups] = useState<Lookups | null>(null)
  const [mobileNav, setMobileNav] = useState(false)

  // global search
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchBoxRef = useRef<HTMLDivElement | null>(null)
  // student to open directly in the students view
  const [focusStudentId, setFocusStudentId] = useState<string | null>(null)
  // notifications
  const [notifs, setNotifs] = useState<NotificationItem[]>([])
  const [notifsOpen, setNotifsOpen] = useState(false)

  const loadNotifs = useCallback(() => {
    api<{ items: NotificationItem[] }>('/api/notifications')
      .then((d) => setNotifs(d.items))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!user) return
    loadNotifs()
    const t = setInterval(loadNotifs, 60_000)
    return () => clearInterval(t)
  }, [user, loadNotifs])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function onSearchChange(value: string) {
    setSearchQ(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (value.trim().length < 2) {
      setSearchResults([])
      setSearchOpen(false)
      return
    }
    searchTimer.current = setTimeout(() => {
      setSearchLoading(true)
      api<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(value.trim())}`)
        .then((d) => {
          setSearchResults(d.results)
          setSearchOpen(true)
        })
        .catch(() => {})
        .finally(() => setSearchLoading(false))
    }, 250)
  }

  function goToStudent(id: string) {
    setFocusStudentId(id)
    setSearchOpen(false)
    setSearchQ('')
    setSearchResults([])
    setMobileNav(false)
    setView('students')
  }

  const loadLookups = useCallback(() => {
    api<Lookups>('/api/lookups')
      .then(setLookups)
      .catch(() => {})
  }, [])

  useEffect(() => {
    api<{ user: SessionUser | null }>('/api/auth/me')
      .then((d) => {
        if (d.user) {
          setUser(d.user)
          loadLookups()
        }
      })
      .catch(() => {})
      .finally(() => setBooting(false))
  }, [loadLookups])

  function handleLogin(u: SessionUser) {
    setUser(u)
    setView('dashboard')
    loadLookups()
  }

  async function handleLogout() {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {})
    setUser(null)
    setLookups(null)
  }

  function navigate(v: string) {
    setView(v as ViewKey)
    setMobileNav(false)
    setSearchOpen(false)
  }

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-emerald-600 flex items-center justify-center">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
        </div>
      </div>
    )
  }

  if (!user) return <LoginView onLogin={handleLogin} />

  const nav = NAV.filter((n) => n.roles.includes(user.role))
  const sections = [...new Set(nav.map((n) => n.section))]
  const currentTitle = TITLES[view]

  const sidebar = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300 w-64">
      {/* logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
        <div className="h-9 w-9 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="text-sm font-bold text-white leading-tight">EduTrack</div>
          <div className="text-[11px] text-slate-400">École Al Manar</div>
        </div>
      </div>

      {/* nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {sections.map((section) => (
          <div key={section}>
            <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {section}
            </div>
            <div className="space-y-0.5">
              {nav.filter((n) => n.section === section).map((item) => {
                const active = view === item.key
                return (
                  <button
                    key={item.key}
                    onClick={() => navigate(item.key)}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                      active
                        ? 'bg-emerald-600 text-white font-medium'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* user */}
      <div className="border-t border-white/5 p-4">
        <div className="flex items-center gap-3">
          <div className={`h-9 w-9 rounded-full ${avatarColor(user.name)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
            {initials(user.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">{user.name}</div>
            <div className="text-[11px] text-slate-400">{ROLE_LABELS[user.role]}</div>
          </div>
          <button
            onClick={handleLogout}
            title="Se déconnecter"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-white/5 hover:text-white transition"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* desktop sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 z-30">{sidebar}</aside>

      {/* main */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* topbar */}
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
          <div className="flex items-center gap-3 px-4 lg:px-8 py-3.5">
            {/* mobile menu */}
            <Sheet open={mobileNav} onOpenChange={setMobileNav}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden text-slate-500">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 border-0">
                {sidebar}
              </SheetContent>
            </Sheet>

            <div className="flex-1 min-w-0">
              <h1 className="text-base lg:text-lg font-bold text-slate-900 leading-tight truncate">
                {currentTitle.title}
              </h1>
              <p className="text-xs text-slate-400 truncate">{currentTitle.sub}</p>
            </div>

            <Badge variant="outline" className="hidden md:inline-flex border-emerald-200 text-emerald-700">
              {SCHOOL_YEAR}
            </Badge>

            {/* global search */}
            <div ref={searchBoxRef} className="relative hidden sm:block w-40 md:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                value={searchQ}
                onChange={(e) => onSearchChange(e.target.value)}
                onFocus={() => { if (searchResults.length > 0) setSearchOpen(true) }}
                placeholder="Rechercher un élève..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-8 py-1.5 text-sm outline-none focus:border-emerald-300 focus:bg-white transition"
              />
              {searchLoading && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-slate-400" />}
              {searchOpen && searchResults.length > 0 && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden z-50">
                  <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    Élèves ({searchResults.length})
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {searchResults.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => goToStudent(r.id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-emerald-50/60 text-left transition"
                      >
                        <div className={`h-8 w-8 rounded-full ${avatarColor(r.firstName + r.lastName)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                          {initials(r.firstName + ' ' + r.lastName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-slate-800 truncate">{r.firstName} {r.lastName}</div>
                          <div className="text-xs text-slate-400">{r.matricule} · {r.klassName || 'Sans classe'}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {searchOpen && !searchLoading && searchQ.trim().length >= 2 && searchResults.length === 0 && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg px-4 py-3 text-sm text-slate-400 z-50">
                  Aucun élève trouvé.
                </div>
              )}
            </div>

            {/* notifications */}
            <DropdownMenu open={notifsOpen} onOpenChange={(o) => { setNotifsOpen(o); if (o) loadNotifs() }}>
              <DropdownMenuTrigger asChild>
                <button className="relative h-9 w-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition">
                  <Bell className="h-4.5 w-4.5" />
                  {notifs.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {notifs.length > 9 ? '9+' : notifs.length}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-96 max-w-[calc(100vw-2rem)]">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Notifications</span>
                  {notifs.length > 0 && <span className="text-[10px] font-normal text-slate-400">{notifs.length} élément(s)</span>}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifs.length === 0 && (
                  <div className="px-4 py-6 text-center text-sm text-slate-400">Aucune notification pour le moment.</div>
                )}
                <div className="max-h-96 overflow-y-auto">
                  {notifs.map((n) => {
                    const Icon = NOTIF_ICON[n.type] || Bell
                    return (
                      <DropdownMenuItem
                        key={n.id}
                        onClick={() => navigate(n.view)}
                        className="items-start gap-3 py-3 cursor-pointer"
                      >
                        <div className={`h-8 w-8 rounded-lg ${NOTIF_COLOR[n.type]} flex items-center justify-center shrink-0 mt-0.5`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-800 leading-snug">{n.title}</div>
                          <div className="text-xs text-slate-400 truncate">{n.detail}</div>
                          <div className="text-[10px] text-slate-300 mt-0.5">{formatDateTime(n.date)}</div>
                        </div>
                      </DropdownMenuItem>
                    )
                  })}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="outline-none">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className={`${avatarColor(user.name)} text-white text-xs font-bold`}>
                      {initials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>
                  <div className="text-sm font-semibold text-slate-800">{user.name}</div>
                  <div className="text-xs text-slate-400 font-normal">{user.email}</div>
                  <div className="mt-1 text-[11px] font-medium text-emerald-600">{ROLE_LABELS[user.role]}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('account')} className="text-emerald-700 focus:text-emerald-800">
                  <CircleUser className="h-4 w-4 mr-2" /> Mon compte
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-rose-600 focus:text-rose-700">
                  <LogOut className="h-4 w-4 mr-2" /> Se déconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* content */}
        <main className="flex-1 px-4 lg:px-8 py-6">
          {view === 'dashboard' && <DashboardView user={user} onNavigate={navigate} />}
          {view === 'students' && (
            <StudentsView
              user={user}
              lookups={lookups}
              focusStudentId={focusStudentId}
              onFocusConsumed={() => setFocusStudentId(null)}
            />
          )}
          {view === 'registrations' && <RegistrationsView lookups={lookups} />}
          {view === 'payments' && <PaymentsView user={user} lookups={lookups} />}
          {view === 'attendance' && <AttendanceView user={user} lookups={lookups} />}
          {view === 'timetable' && <TimetableView lookups={lookups} />}
          {view === 'homeworks' && <HomeworksView user={user} lookups={lookups} />}
          {view === 'grades' && <GradesView user={user} lookups={lookups} />}
          {view === 'announcements' && <AnnouncementsView user={user} lookups={lookups} />}
          {view === 'complaints' && <ComplaintsView user={user} lookups={lookups} />}
          {view === 'settings' && <SettingsView lookups={lookups} onRefresh={loadLookups} />}
          {view === 'account' && <AccountView user={user} />}
        </main>

        {/* footer */}
        <footer className="mt-auto border-t border-slate-200 bg-white">
          <div className="px-4 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <School className="h-3.5 w-3.5 text-emerald-600" />
              EduTrack — École Al Manar, Casablanca · Année scolaire {SCHOOL_YEAR}
            </div>
            <div>Plateforme alternative — inspirée de Boti School</div>
          </div>
        </footer>
      </div>
    </div>
  )
}
