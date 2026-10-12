import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, serverError, badRequest } from '@/lib/api-helpers'

const RELATIONS = ['PERE', 'MERE', 'TUTEUR']

/**
 * POST /api/students/[id]/guardians — link a parent account to a student (admin)
 * Body: { userId? , email?, relation: PERE|MERE|TUTEUR, isPrimary?: boolean }
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAuth(['ADMIN'])
  if (response) return response

  try {
    const { id } = await params
    const body = await req.json()
    const relation = RELATIONS.includes(body.relation) ? body.relation : 'TUTEUR'

    const student = await db.student.findUnique({ where: { id } })
    if (!student) return Response.json({ error: 'Élève introuvable' }, { status: 404 })

    // resolve the parent account by id or by email
    let parent: { id: string; name: string } | null = null
    if (body.userId) {
      const found = await db.user.findFirst({ where: { id: body.userId, role: 'PARENT' }, select: { id: true, name: true } })
      if (found) parent = found
    } else if (body.email) {
      const found = await db.user.findFirst({
        where: { email: String(body.email).toLowerCase().trim(), role: 'PARENT' },
        select: { id: true, name: true },
      })
      if (found) parent = found
    }
    if (!parent) return badRequest("Compte parent introuvable — vérifiez l'email ou créez le compte d'abord")

    const existing = await db.guardianRelation.findUnique({
      where: { userId_studentId: { userId: parent.id, studentId: id } },
    })
    if (existing) return badRequest(`${parent.name} est déjà tuteur de cet élève`)

    if (body.isPrimary) {
      await db.guardianRelation.updateMany({ where: { studentId: id }, data: { isPrimary: false } })
    }

    const rel = await db.guardianRelation.create({
      data: {
        userId: parent.id,
        studentId: id,
        relation,
        isPrimary: Boolean(body.isPrimary),
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    })

    await db.studentEvent.create({
      data: {
        studentId: id,
        type: 'GUARDIAN_ADDED',
        detail: `${parent.name} lié comme ${relation === 'PERE' ? 'père' : relation === 'MERE' ? 'mère' : 'tuteur'}`,
        actorId: body.actorId || null,
      },
    })

    return Response.json({ guardian: rel })
  } catch (e) {
    return serverError(e)
  }
}

/** DELETE /api/students/[id]/guardians?userId=... — unlink a guardian (admin) */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAuth(['ADMIN'])
  if (response) return response

  try {
    const { id } = await params
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return badRequest('userId requis')

    const rel = await db.guardianRelation.findUnique({
      where: { userId_studentId: { userId, studentId: id } },
      include: { user: { select: { name: true } } },
    })
    if (!rel) return Response.json({ error: 'Lien introuvable' }, { status: 404 })

    await db.guardianRelation.delete({ where: { userId_studentId: { userId, studentId: id } } })

    await db.studentEvent.create({
      data: {
        studentId: id,
        type: 'GUARDIAN_REMOVED',
        detail: `Lien retiré avec ${rel.user.name}`,
      },
    })

    return Response.json({ ok: true })
  } catch (e) {
    return serverError(e)
  }
}
