import { db } from '@/lib/db'
import { requireAuth, serverError, badRequest, SCHOOL_YEAR } from '@/lib/api-helpers'

export async function GET() {
  const { response } = await requireAuth(['ADMIN', 'TEACHER'])
  if (response) return response

  try {
    const registrations = await db.registration.findMany({
      include: {
        student: {
          include: { klass: { include: { level: true } } },
        },
      },
      orderBy: { date: 'desc' },
    })
    return Response.json({ registrations, schoolYear: SCHOOL_YEAR })
  } catch (e) {
    return serverError(e)
  }
}

export async function POST(req: Request) {
  const { response } = await requireAuth(['ADMIN'])
  if (response) return response

  try {
    const body = await req.json()
    const { studentId, type, feeAmount, feePaid, note } = body
    if (!studentId) return badRequest('Élève requis')

    // prevent duplicate registration for same year
    const existing = await db.registration.findFirst({
      where: { studentId, schoolYear: SCHOOL_YEAR },
    })
    if (existing) return badRequest("Cet élève est déjà inscrit pour l'année en cours")

    const registration = await db.registration.create({
      data: {
        studentId,
        schoolYear: SCHOOL_YEAR,
        type: type || 'NOUVELLE',
        status: 'VALIDEE',
        feePaid: Boolean(feePaid),
        feeAmount: Number(feeAmount) || 800,
        note: note || null,
      },
    })

    // reactivate student
    await db.student.update({ where: { id: studentId }, data: { status: 'ACTIVE' } })

    return Response.json({ registration })
  } catch (e) {
    return serverError(e)
  }
}
