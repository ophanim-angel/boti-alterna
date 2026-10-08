import { db } from '@/lib/db'
import { requireAuth, serverError, getScopeStudentIds } from '@/lib/api-helpers'

// Global student search (role-scoped: parents only see their children)
export async function GET(req: Request) {
  const { user, response } = await requireAuth()
  if (response) return response

  try {
    const q = (new URL(req.url).searchParams.get('q') || '').trim()
    if (q.length < 2) return Response.json({ results: [] })

    const where: Record<string, unknown> = {
      OR: [
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { matricule: { contains: q } },
        { massarCode: { contains: q } },
      ],
    }
    const scope = await getScopeStudentIds(user)
    if (scope) where.id = { in: scope.length > 0 ? scope : ['__none__'] }

    const students = await db.student.findMany({
      where,
      include: { klass: { select: { name: true } } },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      take: 8,
    })

    return Response.json({
      results: students.map((s) => ({
        id: s.id,
        matricule: s.matricule,
        firstName: s.firstName,
        lastName: s.lastName,
        status: s.status,
        klassName: s.klass?.name || null,
      })),
    })
  } catch (e) {
    return serverError(e)
  }
}
