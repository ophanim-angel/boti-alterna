import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, serverError, badRequest } from '@/lib/api-helpers'

const STATUSES = ['ACTIVE', 'INACTIVE', 'LEFT', 'GRADUATED']

/**
 * PATCH /api/students/bulk — bulk operations on students (admin)
 * Body: { studentIds: string[], classId?: string | null, status?: string, exitReason?: string }
 * - classId : assign all selected students to this class (capacity enforced, null = unassign)
 * - status  : set the same lifecycle status on all selected students
 */
export async function PATCH(req: NextRequest) {
  const { user, response } = await requireAuth(['ADMIN'])
  if (response) return response

  try {
    const body = await req.json()
    const ids: string[] = Array.isArray(body.studentIds) ? body.studentIds : []
    if (ids.length === 0) return badRequest('Aucun élève sélectionné')
    if (!('classId' in body) && !('status' in body)) {
      return badRequest('Indiquez une classe ou un statut')
    }

    const students = await db.student.findMany({
      where: { id: { in: ids } },
      include: { klass: { select: { name: true } } },
    })
    if (students.length === 0) return badRequest('Élèves introuvables')

    let classId = body.classId
    if ('classId' in body && classId) {
      const klass = await db.class.findUnique({
        where: { id: classId },
        include: { level: { select: { name: true } }, _count: { select: { students: true } } },
      })
      if (!klass) return badRequest('Classe introuvable')

      // capacity check: students already in the class don't count against it
      const movingIn = students.filter((s) => s.classId !== classId && s.classId !== null).length
      const alreadyThere = students.filter((s) => s.classId === classId).length
      const incoming = students.filter((s) => s.classId === null).length
      const net = movingIn + incoming
      const projected = klass._count.students + net - alreadyThere
      if (projected > klass.capacity) {
        return badRequest(
          `Classe ${klass.name} complète : capacité ${klass.capacity}, ${klass._count.students} élève(s) actuellement, ${net} à ajouter. Augmentez la capacité ou choisissez une autre classe.`
        )
      }
      void klass.level
    }

    const status: string | undefined = body.status
    if (status && !STATUSES.includes(status)) return badRequest('Statut invalide')

    let updated = 0
    for (const s of students) {
      const data: Record<string, unknown> = {}
      const events: Array<{ studentId: string; type: string; detail: string; actorId: string | null }> = []

      if ('classId' in body && s.classId !== (classId || null)) {
        data.classId = classId || null
        const from = s.klass?.name || 'Non affecté'
        const to = classId
          ? (await db.class.findUnique({ where: { id: classId }, select: { name: true } }))?.name || '?'
          : 'Non affecté'
        events.push({ studentId: s.id, type: 'CLASS_TRANSFER', detail: `${from} → ${to}`, actorId: user.id })
        events.push({ studentId: s.id, type: 'BULK_ASSIGN', detail: `Affectation groupée vers ${to}`, actorId: user.id })
      }
      if (status && s.status !== status) {
        data.status = status
        if (status === 'LEFT' || status === 'GRADUATED') {
          data.exitDate = new Date()
          if (body.exitReason) data.exitReason = String(body.exitReason)
        } else {
          data.exitDate = null
          data.exitReason = null
        }
        events.push({ studentId: s.id, type: 'STATUS_CHANGE', detail: `${s.status} → ${status}`, actorId: user.id })
      }

      if (Object.keys(data).length === 0) continue
      await db.student.update({ where: { id: s.id }, data })
      for (const ev of events) {
        await db.studentEvent.create({ data: ev })
      }
      updated++
    }

    return Response.json({ ok: true, updated })
  } catch (e) {
    return serverError(e)
  }
}
