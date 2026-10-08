import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, serverError, badRequest, getScopeStudentIds } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  const { user, response } = await requireAuth()
  if (response) return response

  try {
    const sp = req.nextUrl.searchParams
    const classId = sp.get('classId')
    const periodId = sp.get('periodId')

    const where: Record<string, unknown> = {}
    if (periodId) where.periodId = periodId

    if (user.role === 'TEACHER') {
      const assignments = await db.teachingAssignment.findMany({ where: { teacherId: user.id } })
      const classIds = [...new Set(assignments.map((a) => a.classId))]
      where.classId = classId ? classId : { in: classIds }
    } else if (user.role === 'PARENT') {
      // parents see evaluations of their children's classes
      const scopeIds = await getScopeStudentIds(user)
      const kids = scopeIds && scopeIds.length
        ? await db.student.findMany({ where: { id: { in: scopeIds } }, select: { classId: true } })
        : []
      const classIds = [...new Set(kids.map((k) => k.classId).filter(Boolean))]
      if (classIds.length === 0) return Response.json({ evaluations: [] })
      where.classId = { in: classIds }
    } else if (classId) {
      where.classId = classId
    }

    const evaluations = await db.evaluation.findMany({
      where,
      include: {
        klass: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true, color: true } },
        teacher: { select: { id: true, name: true } },
        period: { select: { id: true, name: true } },
        _count: { select: { grades: true } },
      },
      orderBy: { date: 'desc' },
      take: 100,
    })

    return Response.json({ evaluations })
  } catch (e) {
    return serverError(e)
  }
}

export async function POST(req: Request) {
  const { user, response } = await requireAuth(['ADMIN', 'TEACHER'])
  if (response) return response

  try {
    const body = await req.json()
    const { title, type, classId, subjectId, periodId, maxScore, date } = body
    if (!title || !classId || !subjectId || !periodId || !date) {
      return badRequest('Titre, classe, matière, période et date requis')
    }

    const evaluation = await db.evaluation.create({
      data: {
        title,
        type: type || 'CONTROLE',
        classId,
        subjectId,
        teacherId: user.id,
        periodId,
        maxScore: Number(maxScore) || 20,
        date: new Date(date),
      },
    })

    // pre-create empty grades for all students in the class
    const students = await db.student.findMany({
      where: { classId, status: 'ACTIVE' },
      select: { id: true },
    })
    if (students.length > 0) {
      await db.grade.createMany({
        data: students.map((s) => ({ evaluationId: evaluation.id, studentId: s.id, score: null })),
      })
    }

    return Response.json({ evaluation })
  } catch (e) {
    return serverError(e)
  }
}
