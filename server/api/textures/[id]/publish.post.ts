import { publishVersionSchema } from '~~/server/domain/validation/texture'
import { getTextureRepository } from '~~/server/repositories'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const textureId = getRouterParam(event, 'id')

  if (!textureId) {
    throw createError({ statusCode: 400, statusMessage: 'Texture id is required' })
  }

  const body = publishVersionSchema.parse(await readBody(event))

  const repository = getTextureRepository()
  const published = await repository.publishVersion(textureId, body.versionId, actor)

  if (!published) {
    throw createError({ statusCode: 404, statusMessage: 'Version not found' })
  }

  return published
})
