import { getTextureRepository } from '~~/server/repositories'

export default defineEventHandler(async (event) => {
  const textureId = getRouterParam(event, 'id')

  if (!textureId) {
    throw createError({ statusCode: 400, statusMessage: 'Texture id is required' })
  }

  const repository = getTextureRepository()
  const detail = await repository.getTextureDetail(textureId)

  if (!detail) {
    throw createError({ statusCode: 404, statusMessage: 'Texture not found' })
  }

  return detail
})
