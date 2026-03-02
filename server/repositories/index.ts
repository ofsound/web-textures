import { hasDatabaseConnection } from '~~/server/db/client'
import type { TextureRepository } from '~~/server/repositories/contracts'
import { DrizzleTextureRepository } from '~~/server/repositories/drizzle'
import { MemoryTextureRepository } from '~~/server/repositories/memory'

let repository: TextureRepository | null = null

export function getTextureRepository(): TextureRepository {
  if (!repository) {
    repository = hasDatabaseConnection() ? new DrizzleTextureRepository() : new MemoryTextureRepository()
  }

  return repository
}
