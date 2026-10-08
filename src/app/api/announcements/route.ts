import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, serverError, badRequest, getScopeStudentIds } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  const { user, response } = await requireAuth()
  if (response) return response

  try {
    const sp = req.nextUrl.searchParams
    const audienceFilter = sp.get('audience')

    let where: Record<string, unknown> = {}
    if (user.role === 'PARENT') {
      where.audience = { in: ['TOUS', 'PARENTS'] }
    } else if (user.role === 'TEACHER') {
      where.audience = { in: ['TOUS', 'ENSEIGNANTS'] }
    } else if (audienceFilter) {
      where.audience = audienceFilter
    }

    // class-targeted announcements: parents see those of their children's classes
    if (user.role === 'PARENT') {
      const scopeIds = await getScopeStudentIds(user)
      const kids = scopeIds && scopeIds.length
        ? await db.student.findMany({ where: { id: { in: scopeIds } }, select: { classId: true } })
        : []
      const classIds = [...new Set(kids.map((k) => k.classId).filter(Boolean))] as string[]
      where = {
        OR: [{ audience: { in: ['TOUS', 'PARENTS'] } }, ...(classIds.length ? [{ audience: 'CLASSE', classId: { in: classIds } }] : [])],
      }
    }

    const announcements = await db.announcement.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, role: true } },
        klass: { select: { name: true } },
      },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    })

    return Response.json({ announcements })
  } catch (e) {
    return serverError(e)
  }
}

export async function POST(req: Request) {
  const { user, response } = await requireAuth(['ADMIN', 'TEACHER'])
  if (response) return response

  try {
    const body = await req.json()
    const { title, content, audience, classId, pinned } = body
    if (!title || !content) return badRequest('Titre et contenu requis')

    const announcement = await db.announcement.create({
      data: {
        title,
        content,
        audience: audience || 'TOUS',
        classId: audience === 'CLASSE' ? classId : null,
        pinned: Boolean(pinned),
        authorId: user.id,
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
        klass: { select: { name: true } },
      },
    })

    return Response.json({ announcement })
  } catch (e) {
    return serverError(e)
  }
}

export async function DELETE(req: Request) {
  const { user, response } = await requireAuth(['ADMIN', 'TEACHER'])
  if (response) return response

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return badRequest('ID requis')

    const ann = await db.announcement.findUnique({ where: { id } })
    if (!ann) return badRequest('Annonce introuvable')
    if (user.role !== 'ADMIN' && ann.authorId !== user.id) {
      return badRequest('Vous ne pouvez supprimer que vos propres annonces')
    }

    await db.announcement.delete({ where: { id } })
    return Response.json({ ok: true })
  } catch (e) {
    return serverError(e)
  }
}
