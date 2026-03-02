import { getTextureRepository } from '~~/server/repositories'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const textureId = getRouterParam(event, 'id')

  if (!textureId) {
    throw createError({ statusCode: 400, statusMessage: 'Texture id is required' })
  }

  const repository = getTextureRepository()
  const deleted = await repository.softDeleteTexture(textureId, actor)

  if (!deleted) {
    throw createError({ statusCode: 404, statusMessage: 'Texture not found' })
  }

  return { ok: true }
})
