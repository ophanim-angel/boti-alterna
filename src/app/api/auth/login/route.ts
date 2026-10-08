import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, setSessionCookie, type SessionUser } from '@/lib/auth'
import { serverError, badRequest } from '@/lib/api-helpers'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) return badRequest('Email et mot de passe requis')

    const user = await db.user.findUnique({ where: { email: String(email).toLowerCase().trim() } })
    if (!user || !user.active) {
      return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 })
    }
    if (!verifyPassword(String(password), user.password)) {
      return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 })
    }

    const sessionUser: SessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as SessionUser['role'],
    }
    await setSessionCookie(sessionUser)
    return NextResponse.json({ user: sessionUser })
  } catch (e) {
    return serverError(e)
  }
}
