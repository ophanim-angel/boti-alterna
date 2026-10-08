import { db } from '@/lib/db'
import { requireAuth, serverError, badRequest } from '@/lib/api-helpers'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAuth(['ADMIN'])
  if (response) return response

  try {
    const { id } = await params
    const body = await req.json()

    const payment = await db.payment.findUnique({ where: { id } })
    if (!payment) return badRequest('Paiement introuvable')

    if (body.action === 'markPaid') {
      const method = body.method || 'ESPECES'
      const count = await db.payment.count({ where: { receiptNo: { not: null } } })
      const updated = await db.payment.update({
        where: { id },
        data: {
          status: 'PAYE',
          paidDate: new Date(),
          method,
          receiptNo: `RCP-2026-${String(count + 1).padStart(5, '0')}`,
        },
        include: { student: true },
      })
      return Response.json({ payment: updated })
    }

    if (body.action === 'unmark') {
      const updated = await db.payment.update({
        where: { id },
        data: { status: 'EN_ATTENTE', paidDate: null, method: null, receiptNo: null },
        include: { student: true },
      })
      return Response.json({ payment: updated })
    }

    return badRequest('Action inconnue')
  } catch (e) {
    return serverError(e)
  }
}
