import { getSessionUserFromRequest } from '@/lib/auth'

export async function GET(req: Request) {
  const user = await getSessionUserFromRequest(req)
  return Response.json({ user })
}
