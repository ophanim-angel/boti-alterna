import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, serverError, badRequest } from '@/lib/api-helpers'
import { hashPassword } from '@/lib/auth'

const RELATIONS = ['PERE', 'MERE', 'TUTEUR']

/** GET /api/users/[id] — one user with linked children (admin) */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAuth(req, ['ADMIN'])
  if (response) return response

  try {
    const { id } = await params
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, role: true, phone: true, active: true, createdAt: true,
        guardianOf: {
          include: {
            student: {
              select: { id: true, firstName: true, lastName: true, matricule: true, klass: { select: { name: true } } },
            },
          },
        },
      },
    })
    if (!user) return Response.json({ error: 'Compte introuvable' }, { status: 404 })
    return Response.json({ user })
  } catch (e) {
    return serverError(e)
  }
}

/**
 * PATCH /api/users/[id] — edit an account (admin)
 * Body: { name?, phone?, active?, password?, children?: Array<{ studentId, relation?, isPrimary? }> }
 * When `children` is provided, guardian links are synchronized (add missing, remove absent).
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAuth(req, ['ADMIN'])
  if (response) return response

  try {
    const { id } = await params
    const body = await req.json()
    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: 'Compte introuvable' }, { status: 404 })

    const data: Record<string, unknown> = {}
    if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
    if ('phone' in body) data.phone = body.phone || null
    if (typeof body.active === 'boolean') data.active = body.active
    if (typeof body.password === 'string' && body.password.length >= 6) {
      data.password = hashPassword(body.password)
    }

    const updated = await db.user.update({ where: { id }, data })

    // Synchronize guardian links when `children` is provided (PARENT accounts)
    if (Array.isArray(body.children)) {
      const wanted = body.children as Array<{ studentId: string; relation?: string; isPrimary?: boolean }>
      for (const c of wanted) {
        if (!c.studentId) continue
        const relation = c.relation && RELATIONS.includes(c.relation) ? c.relation : 'TUTEUR'
        await db.guardianRelation.upsert({
          where: { userId_studentId: { userId: id, studentId: c.studentId } },
          create: { userId: id, studentId: c.studentId, relation, isPrimary: Boolean(c.isPrimary) },
          update: { relation, ...(c.isPrimary !== undefined ? { isPrimary: Boolean(c.isPrimary) } : {}) },
        })
      }
      const wantedIds = wanted.map((c) => c.studentId).filter(Boolean)
      const current = await db.guardianRelation.findMany({ where: { userId: id }, select: { studentId: true } })
      for (const rel of current) {
        if (!wantedIds.includes(rel.studentId)) {
          await db.guardianRelation.delete({
            where: { userId_studentId: { userId: id, studentId: rel.studentId } },
          })
        }
      }
    }

    return Response.json({
      user: { id: updated.id, name: updated.name, email: updated.email, role: updated.role, active: updated.active },
    })
  } catch (e) {
    return serverError(e)
  }
}

/**
 * DELETE /api/users/[id] — remove an account (admin).
 * Parents: links are removed, the account is deleted (children are kept).
 * Teachers: blocked when still referenced (assignments, classes, devoirs...) — deactivate instead.
 * Admins: cannot be deleted from the app.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAuth(req, ['ADMIN'])
  if (response) return response

  try {
    const { id } = await params
    if (user.id === id) return badRequest('Vous ne pouvez pas supprimer votre propre compte')
    const target = await db.user.findUnique({ where: { id } })
    if (!target) return Response.json({ error: 'Compte introuvable' }, { status: 404 })

    if (target.role === 'ADMIN') {
      return badRequest("Un compte administrateur ne peut pas être supprimé depuis l'application")
    }

    if (target.role === 'TEACHER') {
      const [assignments, mainClasses, homeworks, evaluations, sessions, attendance] = await Promise.all([
        db.teachingAssignment.count({ where: { teacherId: id } }),
        db.class.count({ where: { mainTeacherId: id } }),
        db.homework.count({ where: { teacherId: id } }),
        db.evaluation.count({ where: { teacherId: id } }),
        db.timetableSession.count({ where: { teacherId: id } }),
        db.attendance.count({ where: { recordedById: id } }),
      ])
      const refs = assignments + mainClasses + homeworks + evaluations + sessions + attendance
      if (refs > 0) {
        return badRequest(
          `Impossible de supprimer ce compte : ${refs} donnée(s) pédagogique(s) y sont rattachées (cours, devoirs, évaluations...). Désactivez plutôt le compte.`
        )
      }
    }

    await db.user.delete({ where: { id } })
    return Response.json({ ok: true })
  } catch (e) {
    return serverError(e)
  }
}
