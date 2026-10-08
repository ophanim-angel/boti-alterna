import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, serverError, badRequest } from '@/lib/api-helpers'

// GET /api/timetable?classId=xxx
export async function GET(req: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const classId = req.nextUrl.searchParams.get('classId')
    if (!classId) return badRequest('Classe requise')

    const sessions = await db.timetableSession.findMany({
      where: { classId },
      include: {
        subject: { select: { name: true, color: true } },
        teacher: { select: { name: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    })

    return Response.json({ sessions })
  } catch (e) {
    return serverError(e)
  }
}
