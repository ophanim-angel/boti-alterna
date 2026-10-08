import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, serverError, badRequest, getScopeStudentIds } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  const { user, response } = await requireAuth()
  if (response) return response

  try {
    const sp = req.nextUrl.searchParams
    const studentId = sp.get('studentId')
    const classId = sp.get('classId')
    const type = sp.get('type')

    const where: Record<string, unknown> = {}

    if (user.role === 'PARENT') {
      const scopeIds = await getScopeStudentIds(user)
      if (scopeIds) where.studentId = { in: scopeIds }
      if (studentId) where.studentId = studentId
    } else if (studentId) {
      where.studentId = studentId
    } else if (classId) {
      where.student = { classId }
    }

    if (type) where.type = type

    const attendances = await db.attendance.findMany({
      where,
      include: {
        student: {
          select: {
            id: true, firstName: true, lastName: true, matricule: true,
            klass: { select: { name: true } },
          },
        },
        recorder: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
      take: 200,
    })

    return Response.json({ attendances })
  } catch (e) {
    return serverError(e)
  }
}

export async function POST(req: Request) {
  const { user, response } = await requireAuth(['ADMIN', 'TEACHER'])
  if (response) return response

  try {
    const body = await req.json()
    const items = Array.isArray(body.items) ? body.items : [body]
    const created: Array<{
      id: string
      studentId: string
      type: string
      date: Date
      justified: boolean
      reason: string | null
      student: { id: string; firstName: string; lastName: string; matricule: string; klass: { name: string } | null }
    }> = []

    for (const item of items) {
      const { studentId, date, type, reason, justified } = item
      if (!studentId || !date || !type) continue

      const attendance = await db.attendance.create({
        data: {
          studentId,
          date: new Date(date),
          type,
          justified: Boolean(justified),
          reason: reason || null,
          recordedById: user.id,
        },
        include: {
          student: {
            select: {
              id: true, firstName: true, lastName: true, matricule: true,
              klass: { select: { name: true } },
            },
          },
        },
      })
      created.push(attendance)
    }

    return Response.json({ attendances: created })
  } catch (e) {
    return serverError(e)
  }
}

export async function DELETE(req: Request) {
  const { response } = await requireAuth(['ADMIN', 'TEACHER'])
  if (response) return response

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return badRequest('ID requis')
    await db.attendance.delete({ where: { id } })
    return Response.json({ ok: true })
  } catch (e) {
    return serverError(e)
  }
}
