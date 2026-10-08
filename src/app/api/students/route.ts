import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, serverError, badRequest, getScopeStudentIds } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  const { user, response } = await requireAuth()
  if (response) return response

  try {
    const sp = req.nextUrl.searchParams
    const q = sp.get('q')?.trim()
    const classId = sp.get('classId')
    const status = sp.get('status')

    const where: Record<string, unknown> = {}
    if (q) {
      where.OR = [
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { matricule: { contains: q } },
        { massarCode: { contains: q } },
      ]
    }
    if (classId) where.classId = classId
    if (status) where.status = status

    // Parents can only see their own children
    const scopeIds = await getScopeStudentIds(user)
    if (scopeIds) {
      where.id = { in: scopeIds }
      if (!q && !classId && !status) {
        // no extra filter
      }
    }

    const students = await db.student.findMany({
      where,
      include: {
        klass: { include: { level: true } },
        guardians: {
          include: { user: { select: { id: true, name: true, email: true, phone: true } } },
        },
        _count: { select: { payments: true, attendances: true } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })

    return Response.json({ students })
  } catch (e) {
    return serverError(e)
  }
}

export async function POST(req: Request) {
  const { user, response } = await requireAuth(['ADMIN'])
  if (response) return response

  try {
    const body = await req.json()
    const { firstName, lastName, gender, classId, birthDate, massarCode, notes, guardianEmail } = body
    if (!firstName || !lastName) return badRequest('Prénom et nom requis')

    const count = await db.student.count()
    const matricule = `M-${1001 + count}`

    const student = await db.student.create({
      data: {
        matricule,
        firstName,
        lastName,
        gender: gender || 'M',
        birthDate: birthDate ? new Date(birthDate) : null,
        massarCode: massarCode || null,
        classId: classId || null,
        notes: notes || null,
      },
    })

    // optionally link an existing parent account by email
    if (guardianEmail) {
      const parent = await db.user.findFirst({
        where: { email: String(guardianEmail).toLowerCase(), role: 'PARENT' },
      })
      if (parent) {
        await db.guardianRelation.create({
          data: { userId: parent.id, studentId: student.id, relation: 'TUTEUR', isPrimary: true },
        })
      }
    }

    return Response.json({ student })
  } catch (e) {
    return serverError(e)
  }
}
