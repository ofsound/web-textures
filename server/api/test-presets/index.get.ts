import { getTextureRepository } from '~~/server/repositories'

export default defineEventHandler(async () => {
  const repository = getTextureRepository()
  return { items: await repository.listPresets() }
})
