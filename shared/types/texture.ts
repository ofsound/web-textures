export type TextureVersionStatus = 'draft' | 'published' | 'archived'

export type RepeatMode = 'repeat' | 'repeat-x' | 'repeat-y' | 'no-repeat'

export interface TextureNode {
  id: string
  primitiveId: string
  signature: string
  params: Record<string, string | number | boolean>
  opacity?: number
  blendMode?: string
}

export interface TextureAdvancedOverride {
  cssExtra?: string
  htmlExtra?: string
  svgExtra?: string
}

export interface TextureSourceGraph {
  version: 1
  baseColor: string
  tileSize: number
  zoom: number
  repeatMode: RepeatMode
  nodes: TextureNode[]
  advancedOverride?: TextureAdvancedOverride
}

export interface TextureUsageManifest {
  cssVariables: Record<string, string>
  requiredWrapperAttributes: string[]
  notes: string[]
}

export interface TextureArtifactBundle {
  htmlSnippet: string
  cssSnippet: string
  svgDefs: string
  jsSnippet?: string
  usageManifest: TextureUsageManifest
}

export interface TextureRecord {
  id: string
  name: string
  slug: string
  description: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface TextureVersionRecord {
  id: string
  textureId: string
  versionNumber: number
  status: TextureVersionStatus
  sourceGraph: TextureSourceGraph
  artifactBundle: TextureArtifactBundle
  createdAt: string
  publishedAt: string | null
}

export interface TextureListItem {
  id: string
  name: string
  slug: string
  tags: string[]
  publishedAt: string | null
  versionId: string
  preview: {
    cssText: string
    html: string
    svgDefs: string
    jsSnippet?: string
  }
}

export interface TextureListResponse {
  items: TextureListItem[]
  nextCursor: string | null
}

export interface TextureDetailResponse {
  texture: TextureRecord
  versions: TextureVersionRecord[]
  tags: string[]
}

export type FitMode = 'cover' | 'contain' | 'tile'

export interface TestPresetSlot {
  slotIndex: number
  textureVersionId: string | null
  fitMode: FitMode
  scale: number
  position: string
}

export interface TestPreset {
  id: string
  name: string
  slots: TestPresetSlot[]
  createdAt: string
  updatedAt: string
}

export interface PrimitiveDefinition {
  id: string
  signature: string
  name: string
  category: string
  description: string
  defaults: Record<string, string | number | boolean>
}
