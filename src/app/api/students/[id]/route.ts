import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, serverError, badRequest, getScopeStudentIds, SCHOOL_YEAR, logStudentEvent } from '@/lib/api-helpers'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAuth(req)
  if (response) return response

  try {
    const { id } = await params
    const scopeIds = await getScopeStudentIds(user)
    if (scopeIds && !scopeIds.includes(id)) {
      return badRequest('Accès non autorisé à cet élève')
    }

    const student = await db.student.findUnique({
      where: { id },
      include: {
        klass: { include: { level: true, mainTeacher: { select: { id: true, name: true } } } },
        guardians: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
        registrations: { orderBy: { date: 'desc' } },
        payments: { orderBy: { month: 'asc' } },
        attendances: { orderBy: { date: 'desc' }, take: 30, include: { recorder: { select: { name: true } } } },
        events: { orderBy: { createdAt: 'desc' }, take: 30, include: { actor: { select: { name: true } } } },
        grades: {
          include: {
            evaluation: {
              include: {
                subject: true,
                period: true,
              },
            },
          },
        },
        complaints: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    })

    if (!student) return Response.json({ error: 'Élève introuvable' }, { status: 404 })

    // progression: average per subject per period
    const progression: Array<{ subject: string; period: string; avg: number | null; count: number }> = []
    const bySubjectPeriod: Record<string, { subject: string; period: string; scores: number[]; max: number[] }> = {}
    for (const g of student.grades) {
      if (g.absent || g.score == null) continue
      const key = `${g.evaluation.subject.name}|${g.evaluation.period.name}`
      if (!bySubjectPeriod[key]) {
        bySubjectPeriod[key] = {
          subject: g.evaluation.subject.name,
          period: g.evaluation.period.name,
          scores: [],
          max: [],
        }
      }
      bySubjectPeriod[key].scores.push(g.score)
      bySubjectPeriod[key].max.push(g.evaluation.maxScore)
    }
    for (const v of Object.values(bySubjectPeriod)) {
      const normalized = v.scores.map((s, i) => (s / (v.max[i] || 20)) * 20)
      progression.push({
        subject: v.subject,
        period: v.period,
        avg: Math.round((normalized.reduce((a, b) => a + b, 0) / normalized.length) * 100) / 100,
        count: v.scores.length,
      })
    }

    return Response.json({ student, progression, schoolYear: SCHOOL_YEAR })
  } catch (e) {
    return serverError(e)
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAuth(req, ['ADMIN'])
  if (response) return response

  try {
    const { id } = await params
    const body = await req.json()
    const before = await db.student.findUnique({
      where: { id },
      include: { klass: { select: { name: true } } },
    })
    if (!before) return Response.json({ error: 'Élève introuvable' }, { status: 404 })

    const data: Record<string, unknown> = {}
    const allowed = ['firstName', 'lastName', 'gender', 'classId', 'massarCode', 'notes', 'status', 'exitReason']
    for (const k of allowed) {
      if (k in body) data[k] = body[k]
    }
    if ('birthDate' in body) data.birthDate = body.birthDate ? new Date(body.birthDate) : null
    if ('exitDate' in body) data.exitDate = body.exitDate ? new Date(body.exitDate) : null

    // lifecycle: when leaving / graduating, stamp the exit date automatically
    if ('status' in body && (body.status === 'LEFT' || body.status === 'GRADUATED')) {
      if (!('exitDate' in body)) data.exitDate = new Date()
      if (!('exitReason' in body) && !before.exitReason) data.exitReason = body.status === 'LEFT' ? 'Départ' : 'Diplômé'
    }
    // coming back / reactivating clears the exit
    if ('status' in body && (body.status === 'ACTIVE' || body.status === 'INACTIVE')) {
      data.exitDate = null
      data.exitReason = null
    }

    const student = await db.student.update({ where: { id }, data })

    // ===== audit trail =====
    const events: Array<{ type: string; detail: string }> = []

    if ('classId' in body && (body.classId || null) !== (before.classId || null)) {
      const to = body.classId
        ? (await db.class.findUnique({ where: { id: body.classId }, select: { name: true } }))?.name || '?'
        : 'Non affecté'
      events.push({ type: 'CLASS_TRANSFER', detail: `${before.klass?.name || 'Non affecté'} → ${to}` })
    }
    if ('status' in body && body.status !== before.status) {
      events.push({ type: 'STATUS_CHANGE', detail: `${before.status} → ${body.status}` })
    }
    const labelFields: Array<[string, string]> = [
      ['firstName', 'Prénom'], ['lastName', 'Nom'], ['gender', 'Genre'],
      ['birthDate', 'Date de naissance'], ['massarCode', 'Code Massar'], ['notes', 'Notes'],
    ]
    const changed = labelFields.filter(([k]) => k in body && String(body[k] ?? '') !== String((before as unknown as Record<string, unknown>)[k] ?? ''))
    if (changed.length > 0) {
      events.push({ type: 'UPDATED', detail: `Fiche modifiée : ${changed.map(([, l]) => l).join(', ')}` })
    }

    for (const ev of events) {
      await logStudentEvent({ studentId: id, type: ev.type, detail: ev.detail, actorId: user.id })
    }

    return Response.json({ student })
  } catch (e) {
    return serverError(e)
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAuth(req, ['ADMIN'])
  if (response) return response

  try {
    const { id } = await params
    await db.student.delete({ where: { id } })
    return Response.json({ ok: true })
  } catch {
    return badRequest('Suppression impossible — des données (paiements, notes, absences...) sont rattachées à cet élève. Préférez le changement de statut (radiation).')
  }
}
