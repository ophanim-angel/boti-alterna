import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, serverError, badRequest, getScopeStudentIds, SCHOOL_YEAR } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  const { user, response } = await requireAuth()
  if (response) return response

  try {
    const sp = req.nextUrl.searchParams
    const studentId = sp.get('studentId')
    const status = sp.get('status')

    const where: Record<string, unknown> = { schoolYear: SCHOOL_YEAR }
    if (studentId) where.studentId = studentId
    if (status) where.status = status

    const scopeIds = await getScopeStudentIds(user)
    if (scopeIds) where.studentId = { in: scopeIds }

    const payments = await db.payment.findMany({
      where,
      include: {
        student: {
          include: { klass: { include: { level: true } } },
        },
      },
      orderBy: [{ student: { lastName: 'asc' } }, { month: 'asc' }],
    })

    return Response.json({ payments, schoolYear: SCHOOL_YEAR })
  } catch (e) {
    return serverError(e)
  }
}

/** Create the monthly subscription rows for a student (school year) */
export async function POST(req: Request) {
  const { response } = await requireAuth(['ADMIN'])
  if (response) return response

  try {
    const body = await req.json()
    const { studentId, amount } = body
    if (!studentId) return badRequest('Élève requis')

    const existing = await db.payment.count({ where: { studentId, schoolYear: SCHOOL_YEAR } })
    if (existing > 0) return badRequest('Des échéances existent déjà pour cet élève')

    const months = [
      { m: 9, label: 'Septembre 2025', due: '2025-09-10' },
      { m: 10, label: 'Octobre 2025', due: '2025-10-10' },
      { m: 11, label: 'Novembre 2025', due: '2025-11-10' },
      { m: 12, label: 'Décembre 2025', due: '2025-12-10' },
      { m: 1, label: 'Janvier 2026', due: '2026-01-10' },
      { m: 2, label: 'Février 2026', due: '2026-02-10' },
      { m: 3, label: 'Mars 2026', due: '2026-03-10' },
      { m: 4, label: 'Avril 2026', due: '2026-04-10' },
      { m: 5, label: 'Mai 2026', due: '2026-05-10' },
      { m: 6, label: 'Juin 2026', due: '2026-06-10' },
    ]
    await db.payment.createMany({
      data: months.map((mo) => ({
        studentId,
        schoolYear: SCHOOL_YEAR,
        month: mo.m,
        label: mo.label,
        amount: Number(amount) || 650,
        dueDate: new Date(mo.due),
        status: 'EN_ATTENTE',
      })),
    })

    return Response.json({ ok: true, count: months.length })
  } catch (e) {
    return serverError(e)
  }
}
