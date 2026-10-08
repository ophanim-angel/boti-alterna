import { db } from '@/lib/db'
import { requireAuth, serverError, badRequest, getScopeStudentIds } from '@/lib/api-helpers'

export async function GET() {
  const { user, response } = await requireAuth()
  if (response) return response

  try {
    const where: Record<string, unknown> = {}
    if (user.role === 'PARENT') {
      const scopeIds = await getScopeStudentIds(user)
      where.authorId = user.id
      if (scopeIds) where.OR = [{ authorId: user.id }, { studentId: { in: scopeIds } }]
    }

    const complaints = await db.complaint.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, role: true } },
        student: { select: { id: true, firstName: true, lastName: true, klass: { select: { name: true } } } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { author: { select: { name: true, role: true } } },
        },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return Response.json({ complaints })
  } catch (e) {
    return serverError(e)
  }
}

export async function POST(req: Request) {
  const { user, response } = await requireAuth()
  if (response) return response

  try {
    const body = await req.json()
    const { subject, category, priority, studentId, content } = body
    if (!subject || !content) return badRequest('Objet et message requis')

    const complaint = await db.complaint.create({
      data: {
        subject,
        category: category || 'AUTRE',
        priority: priority || 'NORMALE',
        authorId: user.id,
        studentId: user.role === 'PARENT' ? studentId || null : studentId || null,
        status: 'OUVERTE',
      },
    })

    await db.complaintMessage.create({
      data: {
        complaintId: complaint.id,
        authorId: user.id,
        content,
      },
    })

    return Response.json({ complaint })
  } catch (e) {
    return serverError(e)
  }
}
