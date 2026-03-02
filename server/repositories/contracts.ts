import type {
  TestPreset,
  TextureArtifactBundle,
  TextureDetailResponse,
  TextureListResponse,
  TextureSourceGraph,
  TextureVersionRecord
} from '~~/shared/types/texture'

export interface ListTexturesInput {
  q?: string
  tags: string[]
  status: 'draft' | 'published' | 'all'
  cursor?: string
  limit: number
}

export interface CreateTextureInput {
  name: string
  description?: string
  tags: string[]
  actor: string
}

export interface UpdateTextureInput {
  name?: string
  description?: string
  tags?: string[]
  actor: string
}

export interface CreateTextureVersionInput {
  textureId: string
  sourceGraph: TextureSourceGraph
  artifactBundle: TextureArtifactBundle
  previewCssText: string
  actor: string
}

export interface SavePresetInput {
  id?: string
  name: string
  slots: TestPreset['slots']
  actor: string
}

export interface TextureRepository {
  listTextures(input: ListTexturesInput): Promise<TextureListResponse>
  getTextureDetail(textureId: string): Promise<TextureDetailResponse | null>
  createTexture(input: CreateTextureInput): Promise<TextureDetailResponse>
  updateTexture(textureId: string, input: UpdateTextureInput): Promise<TextureDetailResponse | null>
  softDeleteTexture(textureId: string, actor: string): Promise<boolean>
  createVersion(input: CreateTextureVersionInput): Promise<TextureVersionRecord>
  publishVersion(textureId: string, versionId: string, actor: string): Promise<TextureVersionRecord | null>
  listPublishedVersions(): Promise<TextureVersionRecord[]>
  listPresets(): Promise<TestPreset[]>
  savePreset(input: SavePresetInput): Promise<TestPreset>
}
