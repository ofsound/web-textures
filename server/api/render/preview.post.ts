import { compileTexture } from '~~/server/domain/generator/compile'
import { previewRenderSchema } from '~~/server/domain/validation/texture'

export default defineEventHandler(async (event) => {
  const payload = previewRenderSchema.parse(await readBody(event))
  const compiled = compileTexture(payload.sourceGraph)

  return {
    sourceGraph: compiled.sourceGraph,
    artifactBundle: compiled.artifactBundle,
    previewCssText: compiled.previewCssText
  }
})
