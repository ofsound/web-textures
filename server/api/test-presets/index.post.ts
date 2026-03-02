import { savePresetSchema } from '~~/server/domain/validation/texture'
import { getTextureRepository } from '~~/server/repositories'
import { requireAdmin } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const payload = savePresetSchema.parse(await readBody(event))

  const repository = getTextureRepository()

  const saved = await repository.savePreset({
    id: payload.id,
    name: payload.name,
    slots: payload.slots,
    actor
  })

  return saved
})
