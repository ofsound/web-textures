import { compileTexture } from '~~/server/domain/generator/compile'
import { createVersionSchema } from '~~/server/domain/validation/texture'
import { getTextureRepository } from '~~/server/repositories'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const textureId = getRouterParam(event, 'id')

  if (!textureId) {
    throw createError({ statusCode: 400, statusMessage: 'Texture id is required' })
  }

  const body = createVersionSchema.parse(await readBody(event))
  const compiled = compileTexture(body.sourceGraph)

  const repository = getTextureRepository()
  return repository.createVersion({
    textureId,
    sourceGraph: compiled.sourceGraph,
    artifactBundle: compiled.artifactBundle,
    previewCssText: compiled.previewCssText,
    actor
  })
})
