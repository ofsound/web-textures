import { listTexturesQuerySchema } from '~~/server/domain/validation/texture'
import { getTextureRepository } from '~~/server/repositories'

export default defineEventHandler(async (event) => {
  const raw = getQuery(event)
  const parsed = listTexturesQuerySchema.parse(raw)

  const tags = parsed.tags
    ? parsed.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    : []

  const repository = getTextureRepository()

  return repository.listTextures({
    q: parsed.q,
    tags,
    status: parsed.status,
    cursor: parsed.cursor,
    limit: parsed.limit
  })
})
