import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, serverError, badRequest } from '@/lib/api-helpers'

export async function GET(req: NextRequest, { params }: { params: Promise<{ entity: string }> }) {
  const { response } = await requireAuth(req, ['ADMIN'])
  if (response) return response

  try {
    const { entity } = await params
    if (entity === 'classes') {
      const items = await db.class.findMany({
        include: {
          level: true,
          mainTeacher: { select: { id: true, name: true } },
          _count: { select: { students: true } },
        },
        orderBy: { name: 'asc' },
      })
      return Response.json({ items })
    }
    if (entity === 'levels') {
      const items = await db.level.findMany({
        include: { _count: { select: { classes: true } } },
        orderBy: { order: 'asc' },
      })
      return Response.json({ items })
    }
    if (entity === 'subjects') {
      const items = await db.subject.findMany({
        include: { _count: { select: { assignments: true } } },
        orderBy: { name: 'asc' },
      })
      return Response.json({ items })
    }
    if (entity === 'periods') {
      const items = await db.period.findMany({
        include: { _count: { select: { evaluations: true } } },
        orderBy: { order: 'asc' },
      })
      return Response.json({ items })
    }
    return badRequest('Entité inconnue')
  } catch (e) {
    return serverError(e)
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ entity: string }> }) {
  const { response } = await requireAuth(req, ['ADMIN'])
  if (response) return response

  try {
    const { entity } = await params
    const body = await req.json()

    if (entity === 'levels') {
      if (!body.name) return badRequest('Nom requis')
      const maxOrder = await db.level.aggregate({ _max: { order: true } })
      const item = await db.level.create({
        data: {
          name: body.name,
          cycle: body.cycle || 'Primaire',
          order: (maxOrder._max.order || 0) + 1,
        },
      })
      return Response.json({ item })
    }
    if (entity === 'classes') {
      if (!body.name || !body.levelId) return badRequest('Nom et niveau requis')
      const item = await db.class.create({
        data: {
          name: body.name,
          levelId: body.levelId,
          mainTeacherId: body.mainTeacherId || null,
          room: body.room || null,
          capacity: Number(body.capacity) || 30,
        },
      })
      return Response.json({ item })
    }
    if (entity === 'subjects') {
      if (!body.name) return badRequest('Nom requis')
      const item = await db.subject.create({
        data: { name: body.name, color: body.color || '#10b981' },
      })
      return Response.json({ item })
    }
    if (entity === 'periods') {
      if (!body.name) return badRequest('Nom requis')
      const maxOrder = await db.period.aggregate({ _max: { order: true } })
      const item = await db.period.create({
        data: {
          name: body.name,
          order: (maxOrder._max.order || 0) + 1,
          startDate: body.startDate ? new Date(body.startDate) : null,
          endDate: body.endDate ? new Date(body.endDate) : null,
          active: Boolean(body.active),
        },
      })
      return Response.json({ item })
    }
    return badRequest('Entité inconnue')
  } catch (e) {
    return serverError(e)
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ entity: string }> }) {
  const { response } = await requireAuth(req, ['ADMIN'])
  if (response) return response

  try {
    const { entity } = await params
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return badRequest('ID requis')
    const body = await req.json()

    if (entity === 'classes') {
      const data: Record<string, unknown> = {}
      if (body.name) data.name = body.name
      if (body.levelId) data.levelId = body.levelId
      if ('mainTeacherId' in body) data.mainTeacherId = body.mainTeacherId || null
      if ('room' in body) data.room = body.room || null
      if (body.capacity) data.capacity = Number(body.capacity) || 30
      const item = await db.class.update({ where: { id }, data })
      return Response.json({ item })
    }
    if (entity === 'levels') {
      const data: Record<string, unknown> = {}
      if (body.name) data.name = body.name
      if (body.cycle) data.cycle = body.cycle
      const item = await db.level.update({ where: { id }, data })
      return Response.json({ item })
    }
    if (entity === 'subjects') {
      const data: Record<string, unknown> = {}
      if (body.name) data.name = body.name
      if (body.color) data.color = body.color
      const item = await db.subject.update({ where: { id }, data })
      return Response.json({ item })
    }
    if (entity === 'periods') {
      const data: Record<string, unknown> = {}
      if (body.name) data.name = body.name
      if ('startDate' in body) data.startDate = body.startDate ? new Date(body.startDate) : null
      if ('endDate' in body) data.endDate = body.endDate ? new Date(body.endDate) : null
      if ('active' in body) data.active = Boolean(body.active)
      const item = await db.period.update({ where: { id }, data })
      return Response.json({ item })
    }
    return badRequest('Entité inconnue')
  } catch (e) {
    return serverError(e)
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ entity: string }> }) {
  const { response } = await requireAuth(req, ['ADMIN'])
  if (response) return response

  try {
    const { entity } = await params
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return badRequest('ID requis')

    if (entity === 'levels') await db.level.delete({ where: { id } })
    else if (entity === 'classes') await db.class.delete({ where: { id } })
    else if (entity === 'subjects') await db.subject.delete({ where: { id } })
    else if (entity === 'periods') await db.period.delete({ where: { id } })
    else return badRequest('Entité inconnue')

    return Response.json({ ok: true })
  } catch (e) {
    return serverError(e)
  }
}
