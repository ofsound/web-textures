import { MemoryTextureRepository } from '~~/server/repositories/memory'
import { buildDefaultSourceGraph, compileTexture } from '~~/server/domain/generator/compile'

describe('memory repository integration', () => {
  it('creates, versions, publishes, and lists textures', async () => {
    const repository = new MemoryTextureRepository()

    const created = await repository.createTexture({
      name: 'Integration Texture',
      description: 'test texture',
      tags: ['integration', 'spec'],
      actor: 'admin@example.com'
    })

    const compiled = compileTexture(buildDefaultSourceGraph())

    const version = await repository.createVersion({
      textureId: created.texture.id,
      sourceGraph: compiled.sourceGraph,
      artifactBundle: compiled.artifactBundle,
      previewCssText: compiled.previewCssText,
      actor: 'admin@example.com'
    })

    await repository.publishVersion(created.texture.id, version.id, 'admin@example.com')

    const list = await repository.listTextures({
      q: 'Integration',
      tags: ['integration'],
      status: 'published',
      limit: 20
    })

    expect(list.items.some((item) => item.id === created.texture.id)).toBe(true)
  })
})
