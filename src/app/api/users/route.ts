import { db } from '@/lib/db'
import { requireAuth, serverError, badRequest } from '@/lib/api-helpers'
import { hashPassword } from '@/lib/auth'

/** GET /api/users?role=PARENT|TEACHER — list users (admin) */
export async function GET(req: Request) {
  const { response } = await requireAuth(['ADMIN'])
  if (response) return response

  try {
    const { searchParams } = new URL(req.url)
    const role = searchParams.get('role')

    const where: Record<string, unknown> = {}
    if (role) where.role = role

    const users = await db.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, role: true, phone: true, active: true, createdAt: true,
        guardianOf: { include: { student: { select: { firstName: true, lastName: true, klass: { select: { name: true } } } } } },
      },
      orderBy: { name: 'asc' },
    })

    return Response.json({ users })
  } catch (e) {
    return serverError(e)
  }
}

/** POST /api/users — create teacher or parent (admin) */
export async function POST(req: Request) {
  const { response } = await requireAuth(['ADMIN'])
  if (response) return response

  try {
    const body = await req.json()
    const { name, email, role, phone, password, children } = body
    if (!name || !email || !role) return badRequest('Nom, email et rôle requis')
    if (!['TEACHER', 'PARENT'].includes(role)) return badRequest('Rôle invalide')

    const exists = await db.user.findUnique({ where: { email: String(email).toLowerCase() } })
    if (exists) return badRequest('Cet email est déjà utilisé')

    const user = await db.user.create({
      data: {
        name,
        email: String(email).toLowerCase(),
        role,
        phone: phone || null,
        password: hashPassword(password || 'demo1234'),
      },
    })

    // link children for parents
    if (role === 'PARENT' && Array.isArray(children)) {
      for (const studentId of children) {
        await db.guardianRelation.create({
          data: { userId: user.id, studentId, relation: 'TUTEUR', isPrimary: true },
        })
      }
    }

    return Response.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } })
  } catch (e) {
    return serverError(e)
  }
}
