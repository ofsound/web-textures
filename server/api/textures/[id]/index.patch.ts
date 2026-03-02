import { textureMetadataSchema } from '~~/server/domain/validation/texture'
import { getTextureRepository } from '~~/server/repositories'
import { requireAdmin } from '~~/server/utils/auth'

const patchSchema = textureMetadataSchema.partial().extend({
  tags: textureMetadataSchema.shape.tags.optional()
})

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const textureId = getRouterParam(event, 'id')

  if (!textureId) {
    throw createError({ statusCode: 400, statusMessage: 'Texture id is required' })
  }

  const body = patchSchema.parse(await readBody(event))

  const repository = getTextureRepository()
  const updated = await repository.updateTexture(textureId, {
    name: body.name,
    description: body.description,
    tags: body.tags,
    actor
  })

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Texture not found' })
  }

  return updated
})
