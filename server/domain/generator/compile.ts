import { textureSourceGraphSchema } from '~~/server/domain/validation/texture'
import type { TextureArtifactBundle, TextureSourceGraph } from '~~/shared/types/texture'
import { getPrimitiveById, renderPrimitive } from '~~/server/domain/generator/primitives'
import { sanitizeCssOverride, sanitizeHtmlFragment, sanitizeSvgFragment } from '~~/server/domain/generator/sanitize'
import { createError } from 'h3'

export interface CompiledTexture {
  sourceGraph: TextureSourceGraph
  artifactBundle: TextureArtifactBundle
  previewCssText: string
}

export function buildDefaultSourceGraph(): TextureSourceGraph {
  return {
    version: 1,
    baseColor: '#f7f6f3',
    tileSize: 56,
    zoom: 1,
    repeatMode: 'repeat',
    nodes: [
      {
        id: 'node-1',
        primitiveId: 'linear-stripes',
        signature: 'p_001',
        params: {
          colorA: '#2a5f7a',
          colorB: '#e8f1f6',
          width: 10,
          angle: 45
        },
        opacity: 0.5,
        blendMode: 'normal'
      }
    ]
  }
}

export function compileTexture(source: unknown): CompiledTexture {
  const sourceGraph = textureSourceGraphSchema.parse(source)

  const cssLayers: string[] = []
  const blendModes: string[] = []
  const htmlLayers: string[] = []
  const svgDefs: string[] = []
  const jsSnippets: string[] = []

  for (const node of sourceGraph.nodes) {
    const primitive = getPrimitiveById(node.primitiveId)

    if (!primitive) {
      throw createError({ statusCode: 400, statusMessage: `Unknown primitive: ${node.primitiveId}` })
    }

    if (primitive.signature !== node.signature) {
      throw createError({ statusCode: 400, statusMessage: `Invalid primitive signature for ${node.primitiveId}` })
    }

    const result = renderPrimitive(node)
    cssLayers.push(result.cssLayer)
    blendModes.push(result.blendMode ?? 'normal')

    if (result.htmlLayer) {
      htmlLayers.push(result.htmlLayer)
    }

    if (result.svgDef) {
      svgDefs.push(result.svgDef)
    }

    if (result.jsSnippet) {
      jsSnippets.push(result.jsSnippet)
    }
  }

  const cssExtra = sourceGraph.advancedOverride?.cssExtra ? sanitizeCssOverride(sourceGraph.advancedOverride.cssExtra) : ''
  const htmlExtra = sourceGraph.advancedOverride?.htmlExtra ? sanitizeHtmlFragment(sourceGraph.advancedOverride.htmlExtra) : ''
  const svgExtra = sourceGraph.advancedOverride?.svgExtra ? sanitizeSvgFragment(sourceGraph.advancedOverride.svgExtra) : ''

  const previewCssText = [
    `background-color: ${sourceGraph.baseColor}`,
    `background-image: ${cssLayers.join(', ')}`,
    `background-size: ${sourceGraph.tileSize * sourceGraph.zoom}px ${sourceGraph.tileSize * sourceGraph.zoom}px`,
    `background-repeat: ${sourceGraph.repeatMode}`,
    `background-blend-mode: ${blendModes.join(', ')}`,
    'background-position: center'
  ].join('; ')

  const cssSnippet = [
    '.texture-bg {',
    `  background-color: ${sourceGraph.baseColor};`,
    `  background-image: ${cssLayers.join(', ')};`,
    `  background-size: calc(var(--texture-scale, ${sourceGraph.tileSize}px) * var(--texture-zoom, ${sourceGraph.zoom})) calc(var(--texture-scale, ${sourceGraph.tileSize}px) * var(--texture-zoom, ${sourceGraph.zoom}));`,
    `  background-repeat: ${sourceGraph.repeatMode};`,
    '  background-position: var(--texture-position, center);',
    `  background-blend-mode: ${blendModes.join(', ')};`,
    '}',
    cssExtra
  ]
    .filter(Boolean)
    .join('\n')

  const artifactBundle: TextureArtifactBundle = {
    htmlSnippet: ['<div class="texture-bg" data-texturelab="true"></div>', ...htmlLayers, htmlExtra].filter(Boolean).join('\n'),
    cssSnippet,
    svgDefs: ['<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute">', '<defs>', ...svgDefs, svgExtra, '</defs>', '</svg>'].filter(Boolean).join('\n'),
    jsSnippet: jsSnippets.length > 0 ? jsSnippets.join('\n') : undefined,
    usageManifest: {
      cssVariables: {
        '--texture-scale': 'Base tile size in px',
        '--texture-zoom': 'Zoom multiplier',
        '--texture-position': 'Background position string'
      },
      requiredWrapperAttributes: ['data-texturelab="true"'],
      notes: ['Apply `.texture-bg` to any block-level element.', 'Prefer CSS variables for runtime scale and zoom adjustments.']
    }
  }

  return { sourceGraph, artifactBundle, previewCssText }
}
