import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-helpers'

export async function GET(req: Request) {
  const { response } = await requireAuth(req)
  if (response) return response

  const [levels, classes, subjects, periods, teachers] = await Promise.all([
    db.level.findMany({ orderBy: { order: 'asc' } }),
    db.class.findMany({
      include: { level: true, mainTeacher: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    }),
    db.subject.findMany({ orderBy: { name: 'asc' } }),
    db.period.findMany({ orderBy: { order: 'asc' } }),
    db.user.findMany({
      where: { role: 'TEACHER', active: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return Response.json({ levels, classes, subjects, periods, teachers })
}
