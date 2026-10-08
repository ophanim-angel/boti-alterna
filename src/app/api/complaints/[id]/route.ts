import { db } from '@/lib/db'
import { requireAuth, serverError, badRequest, getScopeStudentIds } from '@/lib/api-helpers'

/** GET: complaint detail with full thread */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAuth()
  if (response) return response

  try {
    const { id } = await params
    const complaint = await db.complaint.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, role: true, email: true } },
        student: { select: { id: true, firstName: true, lastName: true, klass: { select: { name: true } } } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, name: true, role: true } } },
        },
      },
    })
    if (!complaint) return Response.json({ error: 'Réclamation introuvable' }, { status: 404 })

    // access control: parents only their own
    if (user.role === 'PARENT') {
      const scopeIds = await getScopeStudentIds(user)
      const allowed = complaint.authorId === user.id || (scopeIds || []).includes(complaint.studentId || '')
      if (!allowed) return Response.json({ error: 'Accès refusé' }, { status: 403 })
    }

    return Response.json({ complaint })
  } catch (e) {
    return serverError(e)
  }
}

/** POST: add a message to the thread */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAuth()
  if (response) return response

  try {
    const { id } = await params
    const body = await req.json()
    const { content } = body
    if (!content || !String(content).trim()) return badRequest('Message vide')

    const complaint = await db.complaint.findUnique({ where: { id } })
    if (!complaint) return badRequest('Réclamation introuvable')

    if (user.role === 'PARENT' && complaint.authorId !== user.id) {
      return badRequest('Accès refusé')
    }

    const message = await db.complaintMessage.create({
      data: { complaintId: id, authorId: user.id, content },
      include: { author: { select: { id: true, name: true, role: true } } },
    })

    // reopen if resolved/closed and parent replies
    if (complaint.status === 'RESOLUE' || complaint.status === 'FERMEE') {
      await db.complaint.update({ where: { id }, data: { status: 'EN_COURS' } })
    } else {
      await db.complaint.update({ where: { id }, data: { updatedAt: new Date() } })
    }

    return Response.json({ message })
  } catch (e) {
    return serverError(e)
  }
}

/** PATCH: change status (ADMIN/TEACHER) */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAuth(['ADMIN', 'TEACHER'])
  if (response) return response

  try {
    const { id } = await params
    const body = await req.json()
    const { status } = body
    if (!['OUVERTE', 'EN_COURS', 'RESOLUE', 'FERMEE'].includes(status)) {
      return badRequest('Statut invalide')
    }

    const complaint = await db.complaint.update({
      where: { id },
      data: { status },
    })
    return Response.json({ complaint })
  } catch (e) {
    return serverError(e)
  }
}
