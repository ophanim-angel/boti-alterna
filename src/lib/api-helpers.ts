import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, type SessionUser } from '@/lib/auth'

export function unauthorized() {
  return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
}

export function forbidden() {
  return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export function serverError(e: unknown) {
  console.error('[API ERROR]', e)
  return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 })
}

/**
 * Require an authenticated user, optionally with one of the given roles.
 * Returns { user } or { response } when denied.
 */
export async function requireAuth(
  roles?: Array<SessionUser['role']>
): Promise<{ user: SessionUser; response?: undefined } | { user?: undefined; response: NextResponse }> {
  const user = await getSessionUser()
  if (!user) return { response: unauthorized() }
  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    return { response: forbidden() }
  }
  return { user }
}

/**
 * For PARENT users, returns the list of their children's student IDs.
 * For ADMIN / TEACHER, returns null (no scoping).
 */
export async function getScopeStudentIds(user: SessionUser): Promise<string[] | null> {
  if (user.role !== 'PARENT') return null
  const rels = await db.guardianRelation.findMany({
    where: { userId: user.id },
    select: { studentId: true },
  })
  return rels.map((r) => r.studentId)
}

export const SCHOOL_YEAR = '2025/2026'

export const MONTH_LABELS: Record<number, string> = {
  9: 'Septembre',
  10: 'Octobre',
  11: 'Novembre',
  12: 'Décembre',
  1: 'Janvier',
  2: 'Février',
  3: 'Mars',
  4: 'Avril',
  5: 'Mai',
  6: 'Juin',
}
