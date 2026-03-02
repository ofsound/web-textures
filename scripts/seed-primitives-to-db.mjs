import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadEnvFile } from 'node:process'
import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'

for (const fileName of ['.env.local', '.env']) {
  const filePath = resolve(process.cwd(), fileName)
  if (existsSync(filePath)) {
    loadEnvFile(filePath)
  }
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL missing. Set it in .env or .env.local before seeding.')
}

const primitivesModule = await import('../.output/server/chunks/_/primitives.mjs')
const primitives = primitivesModule.P

if (!Array.isArray(primitives) || primitives.length === 0) {
  throw new Error('Unable to load primitive list from .output/server/chunks/_/primitives.mjs')
}

const palette = ['#f6f3ea', '#edf5f8', '#eef2ea', '#f8efe9', '#eef0f7', '#f2f7ef']
const blendModes = ['normal', 'multiply', 'screen', 'overlay', 'soft-light']

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function seededUnit(seed) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

function pickSecondPrimitive(index, allPrimitives) {
  const rand = seededUnit(index + 100)
  const candidateIndex = Math.floor(rand * allPrimitives.length)
  const primitive = allPrimitives[candidateIndex]
  return primitive ?? allPrimitives[(index + 1) % allPrimitives.length]
}

function toTagSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function buildSourceGraph(primary, index, allPrimitives) {
  const tunedParamsByPrimitive = {
    'linear-stripes': { width: 10, angle: 18 },
    'diagonal-lines': { width: 10, angle: 45 },
    dots: { size: 7, gap: 22 },
    checkerboard: { size: 24 },
    grid: { width: 1, gap: 26 },
    zigzag: { size: 18 },
    waves: { size: 32 },
    'radial-burst': { size: 24 },
    'noise-speckles': { density: 22 },
    crosshatch: { gap: 14 },
    honeycomb: { size: 24 },
    triangles: { size: 26 },
    'concentric-rings': { size: 28 },
    plaid: { width: 3, gap: 20 },
    halftone: { size: 9, gap: 18 },
    'mesh-gradient': { intensity: 0.7 },
    'carbon-fiber': { size: 12 },
    'paper-grain': { density: 24 },
    'blueprint-grid': { gap: 30 },
    starfield: { density: 10 },
    'perlin-noise': { baseFrequency: 0.82, octaves: 5, seed: 17, scale: 104, noiseType: 'fractalNoise' }
  }

  const node1 = {
    id: `node-${index + 1}-1`,
    primitiveId: primary.id,
    signature: primary.signature,
    params: { ...primary.defaults, ...(tunedParamsByPrimitive[primary.id] ?? {}) },
    opacity: 0.62,
    blendMode: blendModes[index % blendModes.length]
  }

  // Ensure perlin defaults are complete.
  if (primary.id === 'perlin-noise') {
    node1.params = {
      baseFrequency: 0.82,
      octaves: 5,
      seed: 17,
      scale: 104,
      noiseType: 'fractalNoise'
    }
    node1.opacity = 0.58
    node1.blendMode = 'soft-light'
  }

  const nodes = [node1]

  // Every other primitive gets a randomized second node.
  if (index % 2 === 1) {
    const secondary = pickSecondPrimitive(index, allPrimitives)
    if (secondary.id !== primary.id) {
      nodes.push({
        id: `node-${index + 1}-2`,
        primitiveId: secondary.id,
        signature: secondary.signature,
        params: { ...secondary.defaults },
        opacity: clamp(0.32 + seededUnit(index + 200) * 0.35, 0.2, 0.75),
        blendMode: blendModes[(index + 2) % blendModes.length]
      })
    }
  }

  return {
    version: 1,
    baseColor: primary.id === 'perlin-noise' ? '#e7eee6' : palette[index % palette.length],
    tileSize: primary.id === 'perlin-noise' ? 104 : 56 + (index % 6) * 8,
    zoom: 1,
    repeatMode: 'repeat',
    nodes,
    advancedOverride: {
      cssExtra: '',
      htmlExtra: '',
      svgExtra: ''
    }
  }
}

function buildArtifactBundle(primitive, sourceGraph) {
  return {
    htmlSnippet: '<div class="texture-bg" data-texturelab="true"></div>',
    cssSnippet: `.texture-bg { background-color: ${sourceGraph.baseColor}; }`,
    svgDefs: '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute"><defs></defs></svg>',
    usageManifest: {
      cssVariables: {
        '--texture-scale': 'Base tile size in px',
        '--texture-zoom': 'Zoom multiplier',
        '--texture-position': 'Background position string'
      },
      requiredWrapperAttributes: ['data-texturelab="true"'],
      notes: [`Seeded from primitive: ${primitive.id}`]
    }
  }
}

const pool = new Pool({ connectionString: databaseUrl, max: 3 })
let createdCount = 0
let updatedCount = 0

try {
  for (let index = 0; index < primitives.length; index += 1) {
    const primitive = primitives[index]
    const sourceGraph = buildSourceGraph(primitive, index, primitives)
    const artifactBundle = buildArtifactBundle(primitive, sourceGraph)

    const textureName = `Seed · ${primitive.name}`
    const textureSlug = `seed-primitive-${primitive.id}`
    const description = `Auto-seeded texture for primitive '${primitive.id}' (${sourceGraph.nodes.length} node${sourceGraph.nodes.length > 1 ? 's' : ''}).`

    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const existing = await client.query(
        `SELECT id FROM textures WHERE slug = $1 LIMIT 1`,
        [textureSlug]
      )

      const insertedTextureId = randomUUID()
      const textureResult = await client.query(
        `INSERT INTO textures (id, name, slug, description, created_at, updated_at, deleted_at)
         VALUES ($1, $2, $3, $4, now(), now(), null)
         ON CONFLICT (slug)
         DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = now(), deleted_at = null
         RETURNING id`,
        [insertedTextureId, textureName, textureSlug, description]
      )

      const textureId = textureResult.rows[0]?.id
      if (!textureId) {
        throw new Error(`Failed to upsert texture for ${primitive.id}`)
      }

      if (existing.rowCount === 0) {
        createdCount += 1
      } else {
        updatedCount += 1
      }

      await client.query(
        `UPDATE texture_versions
         SET status = 'archived'
         WHERE texture_id = $1 AND status = 'published'`,
        [textureId]
      )

      const nextVersionResult = await client.query(
        `SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version
         FROM texture_versions
         WHERE texture_id = $1`,
        [textureId]
      )

      const nextVersion = Number(nextVersionResult.rows[0]?.next_version ?? 1)
      const versionId = randomUUID()

      await client.query(
        `INSERT INTO texture_versions (
          id, texture_id, version_number, status, source_graph, artifact_bundle, created_at, published_at
        ) VALUES (
          $1, $2, $3, 'published', $4::jsonb, $5::jsonb, now(), now()
        )`,
        [versionId, textureId, nextVersion, JSON.stringify(sourceGraph), JSON.stringify(artifactBundle)]
      )

      const tagNames = ['seeded', primitive.category, primitive.id]
      const tagIds = []

      for (const tagName of tagNames) {
        const tagSlug = toTagSlug(tagName)
        const tagId = randomUUID()
        const tagResult = await client.query(
          `INSERT INTO tags (id, name, slug, created_at)
           VALUES ($1, $2, $3, now())
           ON CONFLICT (slug)
           DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [tagId, tagName, tagSlug]
        )

        if (tagResult.rows[0]?.id) {
          tagIds.push(tagResult.rows[0].id)
        }
      }

      await client.query(`DELETE FROM texture_tags WHERE texture_id = $1`, [textureId])

      for (const tagId of tagIds) {
        await client.query(
          `INSERT INTO texture_tags (texture_id, tag_id)
           VALUES ($1, $2)
           ON CONFLICT (texture_id, tag_id) DO NOTHING`,
          [textureId, tagId]
        )
      }

      await client.query(
        `INSERT INTO audit_events (id, actor, action, entity_type, entity_id, payload, created_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, now())`,
        [
          randomUUID(),
          'seed-script',
          'seed',
          'texture',
          textureId,
          JSON.stringify({
            primitiveId: primitive.id,
            nodeCount: sourceGraph.nodes.length,
            versionNumber: nextVersion
          })
        ]
      )

      await client.query('COMMIT')
      console.log(`Seeded ${primitive.id} -> ${textureSlug} (nodes=${sourceGraph.nodes.length}, version=${nextVersion})`)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  console.log(`Done. created=${createdCount}, updated=${updatedCount}, total=${primitives.length}`)
} finally {
  await pool.end()
}
