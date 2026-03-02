import { buildDefaultSourceGraph, compileTexture } from '~~/server/domain/generator/compile'

describe('texture compiler', () => {
  it('creates a valid artifact bundle from default graph', () => {
    const graph = buildDefaultSourceGraph()
    const compiled = compileTexture(graph)

    expect(compiled.artifactBundle.cssSnippet).toContain('.texture-bg')
    expect(compiled.artifactBundle.htmlSnippet).toContain('data-texturelab="true"')
    expect(compiled.previewCssText).toContain('background-image')
    expect(compiled.sourceGraph.nodes).toHaveLength(1)
  })

  it('rejects invalid primitive signatures', () => {
    const graph = buildDefaultSourceGraph()
    graph.nodes[0].signature = 'invalid'

    expect(() => compileTexture(graph)).toThrowError(/Invalid primitive signature/i)
  })

  it('compiles perlin noise primitive into an svg data uri layer', () => {
    const graph = buildDefaultSourceGraph()
    graph.nodes[0].primitiveId = 'perlin-noise'
    graph.nodes[0].signature = 'p_021'
    graph.nodes[0].params = {
      baseFrequency: 0.8,
      octaves: 5,
      seed: 19,
      scale: 104,
      noiseType: 'fractalNoise'
    }

    const compiled = compileTexture(graph)
    expect(compiled.previewCssText).toContain('data:image/svg+xml')
  })
})
