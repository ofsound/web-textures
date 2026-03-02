CREATE TYPE texture_version_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE fit_mode AS ENUM ('cover', 'contain', 'tile');

CREATE TABLE IF NOT EXISTS textures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS texture_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  texture_id uuid NOT NULL REFERENCES textures(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  status texture_version_status NOT NULL DEFAULT 'draft',
  source_graph jsonb NOT NULL,
  artifact_bundle jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS texture_tags (
  texture_id uuid NOT NULL REFERENCES textures(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (texture_id, tag_id)
);

CREATE TABLE IF NOT EXISTS primitives (
  id text PRIMARY KEY,
  signature text NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  defaults jsonb NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS test_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS test_preset_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id uuid NOT NULL REFERENCES test_presets(id) ON DELETE CASCADE,
  slot_index integer NOT NULL,
  texture_version_id uuid REFERENCES texture_versions(id) ON DELETE SET NULL,
  fit_mode fit_mode NOT NULL DEFAULT 'tile',
  scale integer NOT NULL DEFAULT 56,
  position text NOT NULL DEFAULT 'center'
);

CREATE TABLE IF NOT EXISTS texture_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  texture_id uuid NOT NULL REFERENCES textures(id) ON DELETE CASCADE,
  asset_type text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
