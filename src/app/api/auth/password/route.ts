import { db } from '@/lib/db'
import { requireAuth, badRequest, serverError } from '@/lib/api-helpers'
import { hashPassword, verifyPassword } from '@/lib/auth'

export async function POST(req: Request) {
  const { user, response } = await requireAuth()
  if (response) return response

  try {
    const body = await req.json().catch(() => null)
    const current = String(body?.current || '')
    const next = String(body?.next || '')
    if (!current || !next) return badRequest('Veuillez remplir tous les champs.')
    if (next.length < 8) return badRequest('Le nouveau mot de passe doit contenir au moins 8 caractères.')

    const u = await db.user.findUnique({ where: { id: user.id } })
    if (!u || !verifyPassword(current, u.password)) {
      return badRequest('Le mot de passe actuel est incorrect.')
    }

    await db.user.update({
      where: { id: user.id },
      data: { password: hashPassword(next) },
    })
    return Response.json({ ok: true })
  } catch (e) {
    return serverError(e)
  }
}
