import { buildDefaultSourceGraph, compileTexture } from '~~/server/domain/generator/compile'
import { textureMetadataSchema } from '~~/server/domain/validation/texture'
import { getTextureRepository } from '~~/server/repositories'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const body = textureMetadataSchema.parse(await readBody(event))

  const repository = getTextureRepository()
  const created = await repository.createTexture({
    name: body.name,
    description: body.description,
    tags: body.tags,
    actor
  })

  const compiled = compileTexture(buildDefaultSourceGraph())

  await repository.createVersion({
    textureId: created.texture.id,
    sourceGraph: compiled.sourceGraph,
    artifactBundle: compiled.artifactBundle,
    previewCssText: compiled.previewCssText,
    actor
  })

  const detail = await repository.getTextureDetail(created.texture.id)

  if (!detail) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to load created texture' })
  }

  return detail
})
