'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, CalendarDays } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { api, DAYS_FR } from './utils'
import type { Lookups } from './types'

interface Session {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  room: string | null
  subject: { name: string; color: string | null }
  teacher?: { name: string } | null
}

const SLOTS = ['08:00', '09:00', '10:15', '11:15', '14:00', '15:00']

export function TimetableView({ lookups, defaultClassId }: { lookups: Lookups | null; defaultClassId?: string }) {
  const { toast } = useToast()
  const [classId, setClassId] = useState(defaultClassId || lookups?.classes[0]?.id || '')
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!classId) return
    setLoading(true)
    try {
      const data = await api<{ sessions: Session[] }>(`/api/timetable?classId=${classId}`)
      setSessions(data.sessions)
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : '', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [classId, toast])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Choisir une classe" /></SelectTrigger>
          <SelectContent>
            {lookups?.classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm text-slate-500">{sessions.length} séance(s) par semaine</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="h-7 w-7 animate-spin text-emerald-600" /></div>
      ) : sessions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center">
            <CalendarDays className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400">Aucun emploi du temps défini pour cette classe.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-200 shadow-sm overflow-x-auto">
          <CardContent className="p-4 min-w-[760px]">
            <div className="grid grid-cols-[80px_repeat(5,1fr)] gap-2">
              <div />
              {DAYS_FR.slice(1, 6).map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-slate-500 uppercase py-2">{d}</div>
              ))}
              {SLOTS.map((slot) => (
                <div key={slot} className="contents">
                  <div className="flex items-center justify-center text-[11px] font-medium text-slate-400 rounded-lg bg-slate-50 py-3">{slot}</div>
                  {[1, 2, 3, 4, 5].map((day) => {
                    const s = sessions.find((x) => x.dayOfWeek === day && x.startTime === slot)
                    return (
                      <div key={day + slot} className="min-h-16">
                        {s ? (
                          <div
                            className="h-full rounded-lg p-2 border"
                            style={{ backgroundColor: (s.subject.color || '#10b981') + '14', borderColor: (s.subject.color || '#10b981') + '40' }}
                          >
                            <div className="text-xs font-semibold" style={{ color: s.subject.color || '#10b981' }}>{s.subject.name}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{s.teacher?.name || '—'}</div>
                            {s.room && <div className="text-[10px] text-slate-400">Salle {s.room}</div>}
                          </div>
                        ) : (
                          <div className="h-full rounded-lg border border-dashed border-slate-100" />
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
