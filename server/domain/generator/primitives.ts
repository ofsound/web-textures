import type { TextureNode } from '~~/shared/types/texture'
import { PRIMITIVES } from '~~/shared/constants/primitives'

export interface PrimitiveRenderResult {
  cssLayer: string
  htmlLayer?: string
  svgDef?: string
  jsSnippet?: string
  blendMode?: string
}

function asNumber(value: unknown, fallback: number): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function withOpacity(hex: string, opacity = 1): string {
  const safeOpacity = clamp(opacity, 0, 1)
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((char) => `${char}${char}`).join('') : clean
  const int = Number.parseInt(full, 16)
  const r = (int >> 16) & 255
  const g = (int >> 8) & 255
  const b = int & 255
  return `rgba(${r}, ${g}, ${b}, ${safeOpacity.toFixed(3)})`
}

function encodeSvgDataUri(svg: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

function layerLinear(node: TextureNode): PrimitiveRenderResult {
  const colorA = asString(node.params.colorA, '#21425e')
  const colorB = asString(node.params.colorB, '#f4f8fb')
  const width = clamp(asNumber(node.params.width, 12), 1, 200)
  const angle = asNumber(node.params.angle, 0)

  return {
    cssLayer: `repeating-linear-gradient(${angle}deg, ${withOpacity(colorA, node.opacity ?? 0.9)} 0 ${width}px, ${withOpacity(colorB, node.opacity ?? 0.9)} ${width}px ${width * 2}px)`,
    blendMode: node.blendMode
  }
}

function layerDiagonal(node: TextureNode): PrimitiveRenderResult {
  const next = {
    ...node,
    params: {
      ...node.params,
      angle: asNumber(node.params.angle, 45)
    }
  }

  return layerLinear(next)
}

function layerDots(node: TextureNode): PrimitiveRenderResult {
  const colorA = asString(node.params.colorA, '#2a5f7a')
  const size = clamp(asNumber(node.params.size, 8), 1, 80)

  return {
    cssLayer: `radial-gradient(circle at 30% 30%, ${withOpacity(colorA, node.opacity ?? 0.8)} 0 ${size * 0.45}px, transparent ${size * 0.5}px)`,
    blendMode: node.blendMode
  }
}

function layerCheckerboard(node: TextureNode): PrimitiveRenderResult {
  const colorA = asString(node.params.colorA, '#223748')
  const colorB = asString(node.params.colorB, '#e8edf1')

  return {
    cssLayer: `conic-gradient(from 45deg, ${withOpacity(colorA, node.opacity ?? 0.85)} 0 25%, ${withOpacity(colorB, node.opacity ?? 0.85)} 25% 50%, ${withOpacity(colorA, node.opacity ?? 0.85)} 50% 75%, ${withOpacity(colorB, node.opacity ?? 0.85)} 75% 100%)`,
    blendMode: node.blendMode
  }
}

function layerGrid(node: TextureNode): PrimitiveRenderResult {
  const colorA = asString(node.params.colorA, '#39586c')
  const width = clamp(asNumber(node.params.width, 1), 1, 10)

  return {
    cssLayer: `linear-gradient(${withOpacity(colorA, node.opacity ?? 0.5)} ${width}px, transparent ${width}px), linear-gradient(90deg, ${withOpacity(colorA, node.opacity ?? 0.5)} ${width}px, transparent ${width}px)`,
    blendMode: node.blendMode
  }
}

function layerZigzag(node: TextureNode): PrimitiveRenderResult {
  const colorA = asString(node.params.colorA, '#163042')
  const colorB = asString(node.params.colorB, '#e9f6ff')

  return {
    cssLayer: `repeating-linear-gradient(135deg, ${withOpacity(colorA, node.opacity ?? 0.8)} 0 12%, ${withOpacity(colorB, node.opacity ?? 0.8)} 12% 24%, ${withOpacity(colorA, node.opacity ?? 0.8)} 24% 36%)`,
    blendMode: node.blendMode
  }
}

function layerWaves(node: TextureNode): PrimitiveRenderResult {
  const colorA = asString(node.params.colorA, '#145374')
  const waveSize = clamp(asNumber(node.params.size, 30), 8, 140)

  return {
    cssLayer: `repeating-radial-gradient(circle at 50% 120%, ${withOpacity(colorA, node.opacity ?? 0.5)} 0 ${waveSize * 0.2}px, transparent ${waveSize * 0.2 + 1}px ${waveSize * 0.5}px)`,
    blendMode: node.blendMode
  }
}

function layerRadialBurst(node: TextureNode): PrimitiveRenderResult {
  const colorA = asString(node.params.colorA, '#2f4858')
  const colorB = asString(node.params.colorB, '#f7f4ea')

  return {
    cssLayer: `repeating-conic-gradient(from 0deg, ${withOpacity(colorA, node.opacity ?? 0.7)} 0 8deg, ${withOpacity(colorB, node.opacity ?? 0.7)} 8deg 16deg)`,
    blendMode: node.blendMode
  }
}

function layerNoise(node: TextureNode): PrimitiveRenderResult {
  const colorA = asString(node.params.colorA, '#223446')

  return {
    cssLayer: `radial-gradient(circle at 10% 20%, ${withOpacity(colorA, (node.opacity ?? 0.35) * 0.6)} 0 1px, transparent 1.1px), radial-gradient(circle at 70% 40%, ${withOpacity(colorA, (node.opacity ?? 0.35) * 0.75)} 0 1.2px, transparent 1.3px), radial-gradient(circle at 30% 75%, ${withOpacity(colorA, (node.opacity ?? 0.35) * 0.95)} 0 1.4px, transparent 1.5px), radial-gradient(circle at 82% 82%, ${withOpacity(colorA, (node.opacity ?? 0.35) * 0.5)} 0 0.9px, transparent 1px)`,
    blendMode: node.blendMode
  }
}

function layerCrosshatch(node: TextureNode): PrimitiveRenderResult {
  const colorA = asString(node.params.colorA, '#364f63')

  return {
    cssLayer: `repeating-linear-gradient(45deg, ${withOpacity(colorA, node.opacity ?? 0.35)} 0 2px, transparent 2px 8px), repeating-linear-gradient(-45deg, ${withOpacity(colorA, node.opacity ?? 0.35)} 0 2px, transparent 2px 8px)`,
    blendMode: node.blendMode
  }
}

function layerHoneycomb(node: TextureNode): PrimitiveRenderResult {
  const colorA = asString(node.params.colorA, '#2f4758')

  return {
    cssLayer: `linear-gradient(30deg, ${withOpacity(colorA, node.opacity ?? 0.45)} 12%, transparent 12.5%, transparent 87%, ${withOpacity(colorA, node.opacity ?? 0.45)} 87.5%), linear-gradient(150deg, ${withOpacity(colorA, node.opacity ?? 0.45)} 12%, transparent 12.5%, transparent 87%, ${withOpacity(colorA, node.opacity ?? 0.45)} 87.5%), linear-gradient(90deg, ${withOpacity(colorA, node.opacity ?? 0.3)} 2%, transparent 2.5%, transparent 97%, ${withOpacity(colorA, node.opacity ?? 0.3)} 97.5%)`,
    blendMode: node.blendMode
  }
}

function layerTriangles(node: TextureNode): PrimitiveRenderResult {
  const colorA = asString(node.params.colorA, '#274257')
  const colorB = asString(node.params.colorB, '#f4f8fb')

  return {
    cssLayer: `conic-gradient(from 0deg at 50% 100%, ${withOpacity(colorA, node.opacity ?? 0.75)} 0 60deg, ${withOpacity(colorB, node.opacity ?? 0.75)} 60deg 120deg, ${withOpacity(colorA, node.opacity ?? 0.75)} 120deg 180deg, ${withOpacity(colorB, node.opacity ?? 0.75)} 180deg 240deg, ${withOpacity(colorA, node.opacity ?? 0.75)} 240deg 300deg, ${withOpacity(colorB, node.opacity ?? 0.75)} 300deg 360deg)`,
    blendMode: node.blendMode
  }
}

function layerConcentricRings(node: TextureNode): PrimitiveRenderResult {
  const colorA = asString(node.params.colorA, '#335b72')
  const colorB = asString(node.params.colorB, '#eaf5fd')

  return {
    cssLayer: `repeating-radial-gradient(circle at center, ${withOpacity(colorA, node.opacity ?? 0.6)} 0 7px, ${withOpacity(colorB, node.opacity ?? 0.6)} 7px 14px)`,
    blendMode: node.blendMode
  }
}

function layerPlaid(node: TextureNode): PrimitiveRenderResult {
  const colorA = asString(node.params.colorA, '#233544')
  const colorB = asString(node.params.colorB, '#f0f6fa')
  const width = clamp(asNumber(node.params.width, 3), 1, 20)

  return {
    cssLayer: `repeating-linear-gradient(0deg, ${withOpacity(colorA, node.opacity ?? 0.45)} 0 ${width}px, transparent ${width}px ${width * 4}px), repeating-linear-gradient(90deg, ${withOpacity(colorB, node.opacity ?? 0.45)} 0 ${width}px, transparent ${width}px ${width * 3}px), repeating-linear-gradient(90deg, ${withOpacity(colorA, node.opacity ?? 0.45)} 0 1px, transparent 1px ${width * 2}px)`,
    blendMode: node.blendMode
  }
}

function layerHalftone(node: TextureNode): PrimitiveRenderResult {
  const colorA = asString(node.params.colorA, '#3a5467')

  return {
    cssLayer: `radial-gradient(circle at 25% 25%, ${withOpacity(colorA, node.opacity ?? 0.75)} 0 20%, transparent 20.5%), radial-gradient(circle at 75% 75%, ${withOpacity(colorA, (node.opacity ?? 0.75) * 0.8)} 0 15%, transparent 15.5%)`,
    blendMode: node.blendMode
  }
}

function layerMeshGradient(node: TextureNode): PrimitiveRenderResult {
  const colorA = asString(node.params.colorA, '#2d5670')
  const colorB = asString(node.params.colorB, '#f7efe3')
  const intensity = clamp(asNumber(node.params.intensity, 0.6), 0.2, 0.95)

  return {
    cssLayer: `radial-gradient(circle at 20% 20%, ${withOpacity(colorA, intensity)} 0 24%, transparent 50%), radial-gradient(circle at 80% 10%, ${withOpacity(colorB, intensity * 0.9)} 0 18%, transparent 52%), radial-gradient(circle at 45% 75%, ${withOpacity(colorA, intensity * 0.8)} 0 20%, transparent 50%), radial-gradient(circle at 80% 85%, ${withOpacity(colorB, intensity * 0.7)} 0 24%, transparent 54%)`,
    blendMode: node.blendMode
  }
}

function layerCarbonFiber(node: TextureNode): PrimitiveRenderResult {
  const colorA = asString(node.params.colorA, '#1c2229')
  const colorB = asString(node.params.colorB, '#424a53')

  return {
    cssLayer: `repeating-linear-gradient(45deg, ${withOpacity(colorA, node.opacity ?? 0.85)} 0 8%, transparent 8% 16%), repeating-linear-gradient(-45deg, ${withOpacity(colorB, node.opacity ?? 0.8)} 0 8%, transparent 8% 16%)`,
    blendMode: node.blendMode
  }
}

function layerPaperGrain(node: TextureNode): PrimitiveRenderResult {
  const colorA = asString(node.params.colorA, '#d9ccb2')

  return {
    cssLayer: `radial-gradient(circle at 15% 22%, ${withOpacity(colorA, (node.opacity ?? 0.3) * 0.8)} 0 1px, transparent 1.1px), radial-gradient(circle at 42% 76%, ${withOpacity(colorA, (node.opacity ?? 0.3) * 0.7)} 0 1.2px, transparent 1.3px), radial-gradient(circle at 81% 33%, ${withOpacity(colorA, (node.opacity ?? 0.3) * 0.75)} 0 1px, transparent 1.1px), linear-gradient(135deg, ${withOpacity(colorA, (node.opacity ?? 0.3) * 0.2)} 0%, transparent 45%, ${withOpacity(colorA, (node.opacity ?? 0.3) * 0.15)} 100%)`,
    blendMode: node.blendMode
  }
}

function layerBlueprint(node: TextureNode): PrimitiveRenderResult {
  const colorA = asString(node.params.colorA, '#0d4970')
  const colorB = asString(node.params.colorB, '#cae9ff')

  return {
    cssLayer: `linear-gradient(${withOpacity(colorB, node.opacity ?? 0.22)} 1px, transparent 1px), linear-gradient(90deg, ${withOpacity(colorB, node.opacity ?? 0.22)} 1px, transparent 1px), linear-gradient(${withOpacity(colorA, node.opacity ?? 0.35)} 2px, transparent 2px), linear-gradient(90deg, ${withOpacity(colorA, node.opacity ?? 0.35)} 2px, transparent 2px)`,
    blendMode: node.blendMode
  }
}

function layerStarfield(node: TextureNode): PrimitiveRenderResult {
  const colorA = asString(node.params.colorB, '#f6f9ff')

  return {
    cssLayer: `radial-gradient(circle at 14% 20%, ${withOpacity(colorA, node.opacity ?? 0.85)} 0 1px, transparent 1.2px), radial-gradient(circle at 70% 40%, ${withOpacity(colorA, (node.opacity ?? 0.85) * 0.7)} 0 1.2px, transparent 1.3px), radial-gradient(circle at 50% 80%, ${withOpacity(colorA, (node.opacity ?? 0.85) * 0.8)} 0 1px, transparent 1.2px), radial-gradient(circle at 84% 12%, ${withOpacity(colorA, (node.opacity ?? 0.85) * 0.65)} 0 0.9px, transparent 1px), radial-gradient(circle at 26% 62%, ${withOpacity(colorA, (node.opacity ?? 0.85) * 0.55)} 0 0.8px, transparent 0.9px)`,
    blendMode: node.blendMode
  }
}

function layerPulseGrid(node: TextureNode): PrimitiveRenderResult {
  const colorA = asString(node.params.colorA, '#076a8c')

  return {
    cssLayer: `repeating-linear-gradient(0deg, ${withOpacity(colorA, 0.16)} 0 1px, transparent 1px var(--texture-pulse, 20px)), repeating-linear-gradient(90deg, ${withOpacity(colorA, 0.16)} 0 1px, transparent 1px var(--texture-pulse, 20px))`,
    blendMode: node.blendMode,
    jsSnippet:
      "(() => { if (window.__texturePulseInterval) return; let i = 0; window.__texturePulseInterval = setInterval(() => { i = (i + 1) % 6; document.documentElement.style.setProperty('--texture-pulse', `${20 + i}px`); }, 1400); })();"
  }
}

function layerPerlinNoise(node: TextureNode): PrimitiveRenderResult {
  const baseFrequency = clamp(asNumber(node.params.baseFrequency, 0.9), 0.01, 4)
  const octaves = Math.round(clamp(asNumber(node.params.octaves, 4), 1, 8))
  const seed = Math.round(clamp(asNumber(node.params.seed, 7), 0, 999))
  const scale = Math.round(clamp(asNumber(node.params.scale, 96), 24, 512))
  const noiseType = asString(node.params.noiseType, 'fractalNoise') === 'turbulence' ? 'turbulence' : 'fractalNoise'

  const svg = [
    `<svg xmlns='http://www.w3.org/2000/svg' width='${scale}' height='${scale}' viewBox='0 0 ${scale} ${scale}'>`,
    "<filter id='n'>",
    `<feTurbulence type='${noiseType}' baseFrequency='${baseFrequency}' numOctaves='${octaves}' seed='${seed}' stitchTiles='stitch' />`,
    '</filter>',
    "<rect width='100%' height='100%' filter='url(%23n)'/>",
    '</svg>'
  ].join('')

  return {
    cssLayer: encodeSvgDataUri(svg),
    blendMode: node.blendMode
  }
}

const renderers: Record<string, (node: TextureNode) => PrimitiveRenderResult> = {
  'linear-stripes': layerLinear,
  'diagonal-lines': layerDiagonal,
  dots: layerDots,
  checkerboard: layerCheckerboard,
  grid: layerGrid,
  zigzag: layerZigzag,
  waves: layerWaves,
  'radial-burst': layerRadialBurst,
  'noise-speckles': layerNoise,
  crosshatch: layerCrosshatch,
  honeycomb: layerHoneycomb,
  triangles: layerTriangles,
  'concentric-rings': layerConcentricRings,
  plaid: layerPlaid,
  halftone: layerHalftone,
  'mesh-gradient': layerMeshGradient,
  'carbon-fiber': layerCarbonFiber,
  'paper-grain': layerPaperGrain,
  'blueprint-grid': layerBlueprint,
  starfield: layerStarfield,
  'pulse-grid': layerPulseGrid,
  'perlin-noise': layerPerlinNoise
}

export const primitiveMap = new Map(PRIMITIVES.map((primitive) => [primitive.id, primitive]))

export function getPrimitiveById(id: string) {
  return primitiveMap.get(id)
}

export function renderPrimitive(node: TextureNode): PrimitiveRenderResult {
  const renderer = renderers[node.primitiveId] ?? layerLinear
  return renderer(node)
}
