import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, serverError, badRequest, getScopeStudentIds } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  const { user, response } = await requireAuth()
  if (response) return response

  try {
    const sp = req.nextUrl.searchParams
    const classId = sp.get('classId')

    const where: Record<string, unknown> = {}

    if (user.role === 'TEACHER') {
      // teachers see homework for their assigned classes (theirs first)
      const assignments = await db.teachingAssignment.findMany({ where: { teacherId: user.id } })
      const classIds = [...new Set(assignments.map((a) => a.classId))]
      where.classId = classId ? classId : { in: classIds }
    } else if (user.role === 'PARENT') {
      const scopeIds = await getScopeStudentIds(user)
      const kids = scopeIds && scopeIds.length
        ? await db.student.findMany({ where: { id: { in: scopeIds } }, select: { classId: true } })
        : []
      const classIds = [...new Set(kids.map((k) => k.classId).filter(Boolean))]
      if (classIds.length === 0) return Response.json({ homeworks: [] })
      where.classId = { in: classIds }
    } else if (classId) {
      where.classId = classId
    }

    const homeworks = await db.homework.findMany({
      where,
      include: {
        klass: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true, color: true } },
        teacher: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'desc' },
      take: 100,
    })

    return Response.json({ homeworks })
  } catch (e) {
    return serverError(e)
  }
}

export async function POST(req: Request) {
  const { user, response } = await requireAuth(['ADMIN', 'TEACHER'])
  if (response) return response

  try {
    const body = await req.json()
    const { title, description, classId, subjectId, dueDate } = body
    if (!title || !classId || !subjectId || !dueDate) {
      return badRequest('Titre, classe, matière et date limite requis')
    }

    const homework = await db.homework.create({
      data: {
        title,
        description: description || '',
        classId,
        subjectId,
        teacherId: user.id,
        dueDate: new Date(dueDate),
      },
      include: {
        klass: { select: { name: true } },
        subject: { select: { name: true, color: true } },
        teacher: { select: { name: true } },
      },
    })

    return Response.json({ homework })
  } catch (e) {
    return serverError(e)
  }
}

export async function DELETE(req: Request) {
  const { user, response } = await requireAuth(['ADMIN', 'TEACHER'])
  if (response) return response

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return badRequest('ID requis')

    const hw = await db.homework.findUnique({ where: { id } })
    if (!hw) return badRequest('Devoir introuvable')
    if (user.role === 'TEACHER' && hw.teacherId !== user.id) {
      return badRequest('Vous ne pouvez supprimer que vos propres devoirs')
    }

    await db.homework.delete({ where: { id } })
    return Response.json({ ok: true })
  } catch (e) {
    return serverError(e)
  }
}
