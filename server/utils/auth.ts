import { getServerSession } from '#auth'
import { createError } from 'h3'
import { resolveAdminEmailsList } from '~~/server/utils/admin-env'

export async function requireAdmin(event: Parameters<typeof getServerSession>[0]) {
  const session = await getServerSession(event)

  if (!session?.user?.email) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const allowlist = resolveAdminEmailsList()

  if (!allowlist.includes(session.user.email.toLowerCase())) {
    throw createError({ statusCode: 403, statusMessage: 'Not authorized' })
  }

  return session.user.email
}
