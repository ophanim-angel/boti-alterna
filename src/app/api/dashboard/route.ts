import { db } from '@/lib/db'
import { requireAuth, serverError, getScopeStudentIds, SCHOOL_YEAR } from '@/lib/api-helpers'

export async function GET() {
  const { user, response } = await requireAuth()
  if (response) return response

  try {
    if (user.role === 'ADMIN') {
      const [
        totalStudents, activeStudents, totalTeachers, totalParents,
        classes, payments, complaints, homeworks,
        recentPayments, unpaidPayments, recentComplaints, announcements, recentStudents,
      ] = await Promise.all([
        db.student.count(),
        db.student.count({ where: { status: 'ACTIVE' } }),
        db.user.count({ where: { role: 'TEACHER' } }),
        db.user.count({ where: { role: 'PARENT' } }),
        db.class.count(),
        db.payment.aggregate({
          where: { schoolYear: SCHOOL_YEAR, status: 'PAYE' },
          _sum: { amount: true },
        }),
        db.complaint.findMany({ where: { status: { in: ['OUVERTE', 'EN_COURS'] } } }),
        db.homework.count(),
        db.payment.findMany({
          where: { schoolYear: SCHOOL_YEAR, status: 'PAYE' },
          orderBy: { paidDate: 'desc' },
          take: 6,
          include: { student: { select: { firstName: true, lastName: true } } },
        }),
        db.payment.findMany({
          where: { schoolYear: SCHOOL_YEAR, status: 'EN_RETARD' },
          include: { student: { select: { id: true, firstName: true, lastName: true, klass: { select: { name: true } } } } },
          orderBy: { dueDate: 'asc' },
          take: 50,
        }),
        db.complaint.findMany({
          orderBy: { updatedAt: 'desc' },
          take: 5,
          include: { author: { select: { name: true } }, student: { select: { firstName: true, lastName: true } }, messages: { take: 1, orderBy: { createdAt: 'desc' } } },
        }),
        db.announcement.count(),
        db.student.findMany({
          orderBy: { enrolledAt: 'desc' },
          take: 5,
          include: { klass: { select: { name: true } } },
        }),
      ])

      // attendance evolution last 14 days
      const attendances = await db.attendance.findMany({
        where: { date: { gte: new Date('2026-02-08') } },
        select: { date: true, type: true },
      })
      const byDay: Record<string, { absences: number; retards: number }> = {}
      for (const a of attendances) {
        const key = a.date.toISOString().slice(0, 10)
        if (!byDay[key]) byDay[key] = { absences: 0, retards: 0 }
        if (a.type === 'ABSENCE') byDay[key].absences++
        else byDay[key].retards++
      }
      const attendanceSeries = Object.entries(byDay)
        .map(([day, v]) => ({ day, ...v }))
        .sort((a, b) => a.day.localeCompare(b.day))

      // monthly revenue
      const paid = await db.payment.findMany({
        where: { schoolYear: SCHOOL_YEAR, status: 'PAYE' },
        select: { month: true, amount: true },
      })
      const revenueByMonth: Record<number, number> = {}
      for (const p of paid) {
        revenueByMonth[p.month] = (revenueByMonth[p.month] || 0) + p.amount
      }
      const revenueSeries = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6].map((m) => ({
        month: m,
        amount: revenueByMonth[m] || 0,
      }))

      return Response.json({
        role: 'ADMIN',
        stats: {
          totalStudents, activeStudents, totalTeachers, totalParents,
          classes,
          revenueCollected: payments._sum.amount || 0,
          openComplaints: complaints.length,
          homeworks,
          announcements,
          latePayments: unpaidPayments.length,
          lateAmount: unpaidPayments.reduce((s, p) => s + p.amount, 0),
        },
        recentPayments,
        latePayments: unpaidPayments.slice(0, 8),
        recentComplaints,
        recentStudents,
        attendanceSeries,
        revenueSeries,
      })
    }

    if (user.role === 'TEACHER') {
      const assignments = await db.teachingAssignment.findMany({
        where: { teacherId: user.id },
        include: {
          klass: { include: { _count: { select: { students: true } } } },
          subject: true,
        },
      })

      const classIds = [...new Set(assignments.map((a) => a.classId))]

      const [studentsCount, homeworks, evaluations, complaints, announcements] = await Promise.all([
        db.student.count({ where: { classId: { in: classIds }, status: 'ACTIVE' } }),
        db.homework.findMany({
          where: { teacherId: user.id },
          orderBy: { dueDate: 'desc' },
          take: 6,
          include: { klass: { select: { name: true } }, subject: { select: { name: true } } },
        }),
        db.evaluation.findMany({
          where: { teacherId: user.id },
          orderBy: { date: 'desc' },
          take: 6,
          include: {
            klass: { select: { name: true } },
            subject: { select: { name: true } },
            _count: { select: { grades: true } },
          },
        }),
        db.complaint.count({ where: { status: { in: ['OUVERTE', 'EN_COURS'] } } }),
        db.announcement.findMany({
          where: { audience: { in: ['TOUS', 'ENSEIGNANTS'] } },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { author: { select: { name: true } } },
        }),
      ])

      // upcoming homework deadlines
      const upcoming = await db.homework.findMany({
        where: { teacherId: user.id, dueDate: { gte: new Date('2026-02-20') } },
        orderBy: { dueDate: 'asc' },
        take: 5,
        include: { klass: { select: { name: true } }, subject: { select: { name: true, color: true } } },
      })

      return Response.json({
        role: 'TEACHER',
        stats: {
          classes: classIds.length,
          studentsCount,
          homeworks: homeworks.length,
          evaluations: evaluations.length,
          openComplaints: complaints,
        },
        myClasses: assignments.map((a) => ({
          id: a.klass.id,
          name: a.klass.name,
          subject: a.subject.name,
          color: a.subject.color,
          students: a.klass._count.students,
        })),
        recentHomeworks: homeworks,
        recentEvaluations: evaluations,
        upcomingDeadlines: upcoming,
        announcements,
      })
    }

    // PARENT
    const scopeIds = await getScopeStudentIds(user)
    if (!scopeIds || scopeIds.length === 0) {
      return Response.json({ role: 'PARENT', children: [], stats: {}, announcements: [] })
    }

    const children = await Promise.all(
      scopeIds.map(async (sid) => {
        const student = await db.student.findUnique({
          where: { id: sid },
          include: {
            klass: { include: { level: true, mainTeacher: { select: { name: true } } } },
            payments: { where: { schoolYear: SCHOOL_YEAR } },
            grades: {
              include: { evaluation: { include: { subject: true, period: true } } },
              orderBy: { evaluation: { date: 'desc' } },
            },
            attendances: { where: { date: { gte: new Date('2026-01-01') } }, orderBy: { date: 'desc' } },
            homeworks: undefined,
          },
        })
        if (!student) return null

        const classId = student.classId
        const homeworks = classId
          ? await db.homework.findMany({
              where: { classId },
              orderBy: { dueDate: 'desc' },
              take: 8,
              include: { subject: true, teacher: { select: { name: true } } },
            })
          : []

        // progression by subject (avg /20)
        const bySubject: Record<string, number[]> = {}
        for (const g of student.grades) {
          if (g.absent || g.score == null) continue
          const name = g.evaluation.subject.name
          const normalized = (g.score / g.evaluation.maxScore) * 20
          if (!bySubject[name]) bySubject[name] = []
          bySubject[name].push(normalized)
        }
        const progression = Object.entries(bySubject).map(([subject, scores]) => ({
          subject,
          avg: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100,
        }))

        const pendingPayments = student.payments.filter((p) => p.status !== 'PAYE')
        const recentGrades = student.grades.slice(0, 6)

        return {
          ...student,
          homeworks,
          progression,
          recentGrades,
          pendingPayments: pendingPayments.length,
          latePayments: student.payments.filter((p) => p.status === 'EN_RETARD').length,
          absences: student.attendances.filter((a) => a.type === 'ABSENCE').length,
          retards: student.attendances.filter((a) => a.type === 'RETARD').length,
        }
      })
    )

    const validChildren = children.filter(Boolean)

    const anns = await db.announcement.findMany({
      where: { audience: { in: ['TOUS', 'PARENTS'] } },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: 5,
      include: { author: { select: { name: true } } },
    })

    return Response.json({
      role: 'PARENT',
      children: validChildren,
      stats: {
        childrenCount: validChildren.length,
        pendingPayments: validChildren.reduce((s, c) => s + c.pendingPayments, 0),
        latePayments: validChildren.reduce((s, c) => s + c.latePayments, 0),
      },
      announcements: anns,
    })
  } catch (e) {
    return serverError(e)
  }
}
