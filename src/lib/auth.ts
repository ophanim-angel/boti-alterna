import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'

const SECRET = process.env.AUTH_SECRET || 'edutrack-dev-secret-key-2026-change-me'
const COOKIE_NAME = 'edutrack_session'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days

export interface SessionUser {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'TEACHER' | 'PARENT'
}

// ---------- Password hashing (scrypt) ----------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(':')
    if (!salt || !hash) return false
    const candidate = scryptSync(password, salt, 64)
    const expected = Buffer.from(hash, 'hex')
    return candidate.length === expected.length && timingSafeEqual(candidate, expected)
  } catch {
    return false
  }
}

// ---------- Signed session token ----------

function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('base64url')
}

export function createToken(user: SessionUser): string {
  const body = Buffer.from(
    JSON.stringify({ ...user, exp: Date.now() + SESSION_TTL_MS })
  ).toString('base64url')
  return `${body}.${sign(body)}`
}

export function readToken(token: string | undefined): SessionUser | null {
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = sign(body)
  if (sig.length !== expected.length) return null
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString())
    if (!data.exp || data.exp < Date.now()) return null
    return { id: data.id, email: data.email, name: data.name, role: data.role }
  } catch {
    return null
  }
}

// ---------- Cookie helpers (server side) ----------

export async function setSessionCookie(user: SessionUser) {
  const store = await cookies()
  store.set(COOKIE_NAME, createToken(user), {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: SESSION_TTL_MS / 1000,
    path: '/',
  })
}

export async function clearSessionCookie() {
  const store = await cookies()
  store.set(COOKIE_NAME, '', { httpOnly: true, maxAge: 0, path: '/' })
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies()
  return readToken(store.get(COOKIE_NAME)?.value)
}

/**
 * Resolve the session from a request, trying in order:
 *  1. `Authorization: Bearer <token>` header — required when the app runs
 *     inside a cross-site iframe where browsers block cookies entirely.
 *  2. the signed session cookie — normal first-party browsing.
 */
export async function getSessionUserFromRequest(req: Request): Promise<SessionUser | null> {
  const header = req.headers.get('authorization')
  let candidate: SessionUser | null = null
  if (header && header.toLowerCase().startsWith('bearer ')) {
    candidate = readToken(header.slice(7).trim())
  }
  if (!candidate) candidate = await getSessionUser()
  if (!candidate) return null

  // A valid signature only proves WE issued the token. If the user has since
  // disappeared from the database (reset / re-seed with new IDs), the session
  // must be treated as invalid — otherwise every FK write (audit trail, etc.)
  // would crash with a foreign-key violation behind an "authenticated" UI.
  try {
    const exists = await db.user.findUnique({
      where: { id: candidate.id },
      select: { id: true },
    })
    if (!exists) return null
  } catch {
    return null
  }
  return candidate
}
