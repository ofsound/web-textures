import { getServerSession } from '#auth'
import { createError } from 'h3'

export async function requireAdmin(event: Parameters<typeof getServerSession>[0]) {
  const runtime = useRuntimeConfig(event)
  const session = await getServerSession(event)

  if (!session?.user?.email) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const allowlist = String(runtime.adminEmails ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)

  if (!allowlist.includes(session.user.email.toLowerCase())) {
    throw createError({ statusCode: 403, statusMessage: 'Not authorized' })
  }

  return session.user.email
}
