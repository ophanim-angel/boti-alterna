import { db } from '@/lib/db'
import { requireAuth, serverError, getScopeStudentIds, SCHOOL_YEAR } from '@/lib/api-helpers'

interface NotifItem {
  id: string
  type: 'complaint' | 'payment' | 'announcement' | 'homework'
  title: string
  detail: string
  view: string
  date: string
}

// Role-aware notification feed for the topbar bell
export async function GET() {
  const { user, response } = await requireAuth()
  if (response) return response

  try {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000)
    const nextWeek = new Date(now.getTime() + 7 * 24 * 3600 * 1000)
    const items: NotifItem[] = []

    if (user.role === 'ADMIN') {
      const [complaints, latePayments, anns] = await Promise.all([
        db.complaint.findMany({
          where: { status: { in: ['OUVERTE', 'EN_COURS'] } },
          orderBy: { updatedAt: 'desc' },
          take: 4,
          include: {
            author: { select: { name: true } },
            student: { select: { firstName: true, lastName: true } },
          },
        }),
        db.payment.findMany({
          where: { schoolYear: SCHOOL_YEAR, status: 'EN_RETARD' },
          orderBy: { dueDate: 'asc' },
          take: 4,
          include: { student: { select: { firstName: true, lastName: true } } },
        }),
        db.announcement.findMany({
          where: { createdAt: { gte: weekAgo } },
          orderBy: { createdAt: 'desc' },
          take: 3,
        }),
      ])

      for (const c of complaints) {
        items.push({
          id: `c-${c.id}`,
          type: 'complaint',
          title: `Réclamation : ${c.subject}`,
          detail: `${c.author.name}${c.student ? ` · ${c.student.firstName} ${c.student.lastName}` : ''}`,
          view: 'complaints',
          date: c.updatedAt.toISOString(),
        })
      }
      for (const p of latePayments) {
        items.push({
          id: `p-${p.id}`,
          type: 'payment',
          title: `Impayé — ${p.label}`,
          detail: `${p.student.firstName} ${p.student.lastName} · ${p.amount.toLocaleString('fr-MA')} DH`,
          view: 'payments',
          date: p.dueDate.toISOString(),
        })
      }
      for (const a of anns) {
        items.push({
          id: `a-${a.id}`,
          type: 'announcement',
          title: `Nouvelle note : ${a.title}`,
          detail: a.content.slice(0, 80) + (a.content.length > 80 ? '…' : ''),
          view: 'announcements',
          date: a.createdAt.toISOString(),
        })
      }
    }

    if (user.role === 'TEACHER') {
      const [complaints, anns, deadlines] = await Promise.all([
        db.complaint.findMany({
          where: { status: { in: ['OUVERTE', 'EN_COURS'] } },
          orderBy: { updatedAt: 'desc' },
          take: 4,
          include: {
            author: { select: { name: true } },
            student: { select: { firstName: true, lastName: true } },
          },
        }),
        db.announcement.findMany({
          where: { audience: { in: ['TOUS', 'ENSEIGNANTS'] }, createdAt: { gte: weekAgo } },
          orderBy: { createdAt: 'desc' },
          take: 3,
        }),
        db.homework.findMany({
          where: { teacherId: user.id, dueDate: { gte: now, lte: nextWeek } },
          orderBy: { dueDate: 'asc' },
          take: 4,
          include: { klass: { select: { name: true } }, subject: { select: { name: true } } },
        }),
      ])

      for (const c of complaints) {
        items.push({
          id: `c-${c.id}`,
          type: 'complaint',
          title: `Réclamation : ${c.subject}`,
          detail: `${c.author.name}${c.student ? ` · ${c.student.firstName} ${c.student.lastName}` : ''}`,
          view: 'complaints',
          date: c.updatedAt.toISOString(),
        })
      }
      for (const h of deadlines) {
        items.push({
          id: `h-${h.id}`,
          type: 'homework',
          title: `Devoir à rendre bientôt : ${h.title}`,
          detail: `${h.klass.name} · ${h.subject.name}`,
          view: 'homeworks',
          date: h.dueDate.toISOString(),
        })
      }
      for (const a of anns) {
        items.push({
          id: `a-${a.id}`,
          type: 'announcement',
          title: `Note d'information : ${a.title}`,
          detail: a.content.slice(0, 80) + (a.content.length > 80 ? '…' : ''),
          view: 'announcements',
          date: a.createdAt.toISOString(),
        })
      }
    }

    if (user.role === 'PARENT') {
      const scopeIds = (await getScopeStudentIds(user)) || []
      if (scopeIds.length > 0) {
        const students = await db.student.findMany({
          where: { id: { in: scopeIds } },
          select: { id: true, classId: true, firstName: true, lastName: true },
        })
        const classIds = [...new Set(students.map((s) => s.classId).filter(Boolean))] as string[]

        const [payments, anns, homeworks] = await Promise.all([
          db.payment.findMany({
            where: {
              studentId: { in: scopeIds },
              schoolYear: SCHOOL_YEAR,
              status: { in: ['EN_ATTENTE', 'EN_RETARD'] },
            },
            orderBy: { dueDate: 'asc' },
            take: 5,
            include: { student: { select: { firstName: true, lastName: true } } },
          }),
          db.announcement.findMany({
            where: {
              OR: [
                { audience: { in: ['TOUS', 'PARENTS'] }, createdAt: { gte: weekAgo } },
                { audience: 'CLASSE', classId: { in: classIds }, createdAt: { gte: weekAgo } },
              ],
            },
            orderBy: { createdAt: 'desc' },
            take: 4,
          }),
          db.homework.findMany({
            where: { classId: { in: classIds }, dueDate: { gte: now, lte: nextWeek } },
            orderBy: { dueDate: 'asc' },
            take: 4,
            include: { klass: { select: { name: true } }, subject: { select: { name: true } } },
          }),
        ])

        for (const p of payments) {
          items.push({
            id: `p-${p.id}`,
            type: 'payment',
            title: `${p.label} — ${p.status === 'EN_RETARD' ? 'échéance en retard' : 'à régler'}`,
            detail: `${p.student.firstName} ${p.student.lastName} · ${p.amount.toLocaleString('fr-MA')} DH`,
            view: 'payments',
            date: p.dueDate.toISOString(),
          })
        }
        for (const h of homeworks) {
          items.push({
            id: `h-${h.id}`,
            type: 'homework',
            title: `Nouveau devoir : ${h.title}`,
            detail: `${h.klass.name} · ${h.subject.name}`,
            view: 'homeworks',
            date: h.dueDate.toISOString(),
          })
        }
        for (const a of anns) {
          items.push({
            id: `a-${a.id}`,
            type: 'announcement',
            title: `Note d'information : ${a.title}`,
            detail: a.content.slice(0, 80) + (a.content.length > 80 ? '…' : ''),
            view: 'announcements',
            date: a.createdAt.toISOString(),
          })
        }
      }
    }

    items.sort((a, b) => b.date.localeCompare(a.date))
    return Response.json({ items: items.slice(0, 12) })
  } catch (e) {
    return serverError(e)
  }
}
