import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, serverError, badRequest, getScopeStudentIds } from '@/lib/api-helpers'

/** GET: grades of one evaluation (for saisie) */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAuth(['ADMIN', 'TEACHER'])
  if (response) return response

  try {
    const { id } = await params
    const evaluation = await db.evaluation.findUnique({
      where: { id },
      include: {
        klass: { include: { level: true } },
        subject: true,
        period: true,
        teacher: { select: { name: true } },
        grades: {
          include: {
            student: {
              select: { id: true, firstName: true, lastName: true, matricule: true },
            },
          },
          orderBy: { student: { lastName: 'asc' } },
        },
      },
    })
    if (!evaluation) return Response.json({ error: 'Évaluation introuvable' }, { status: 404 })
    return Response.json({ evaluation })
  } catch (e) {
    return serverError(e)
  }
}

/** POST: bulk save grades { grades: [{gradeId, score?, absent?}] } */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAuth(['ADMIN', 'TEACHER'])
  if (response) return response

  try {
    const { id } = await params
    const body = await req.json()
    const grades = body.grades as Array<{ gradeId: string; score?: number | null; absent?: boolean }>
    if (!Array.isArray(grades)) return badRequest('Notes invalides')

    for (const g of grades) {
      const data: { score?: number | null; absent?: boolean } = {}
      if ('absent' in g) data.absent = Boolean(g.absent)
      if ('score' in g) {
        data.score = g.score === null || g.score === undefined || g.score === ('' as unknown)
          ? null
          : Number(g.score)
      }
      await db.grade.update({ where: { id: g.gradeId }, data })
    }

    return Response.json({ ok: true, count: grades.length })
  } catch (e) {
    return serverError(e)
  }
}

/** DELETE an evaluation */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAuth(['ADMIN', 'TEACHER'])
  if (response) return response

  try {
    const { id } = await params
    await db.evaluation.delete({ where: { id } })
    return Response.json({ ok: true })
  } catch (e) {
    return serverError(e)
  }
}
