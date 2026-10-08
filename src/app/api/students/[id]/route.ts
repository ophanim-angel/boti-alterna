import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, serverError, badRequest, getScopeStudentIds, SCHOOL_YEAR } from '@/lib/api-helpers'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAuth()
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
  const { response } = await requireAuth(['ADMIN'])
  if (response) return response

  try {
    const { id } = await params
    const body = await req.json()
    const data: Record<string, unknown> = {}
    const allowed = ['firstName', 'lastName', 'gender', 'classId', 'massarCode', 'notes', 'status']
    for (const k of allowed) {
      if (k in body) data[k] = body[k]
    }
    if ('birthDate' in body) data.birthDate = body.birthDate ? new Date(body.birthDate) : null

    const student = await db.student.update({ where: { id }, data })
    return Response.json({ student })
  } catch (e) {
    return serverError(e)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAuth(['ADMIN'])
  if (response) return response

  try {
    const { id } = await params
    await db.student.delete({ where: { id } })
    return Response.json({ ok: true })
  } catch (e) {
    return serverError(e)
  }
}
