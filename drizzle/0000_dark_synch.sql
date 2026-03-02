CREATE TYPE "public"."fit_mode" AS ENUM('cover', 'contain', 'tile');--> statement-breakpoint
CREATE TYPE "public"."texture_version_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "primitives" (
	"id" text PRIMARY KEY NOT NULL,
	"signature" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"defaults" jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name"),
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "test_preset_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"preset_id" uuid NOT NULL,
	"slot_index" integer NOT NULL,
	"texture_version_id" uuid,
	"fit_mode" "fit_mode" DEFAULT 'tile' NOT NULL,
	"scale" integer DEFAULT 56 NOT NULL,
	"position" text DEFAULT 'center' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_presets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "texture_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"texture_id" uuid NOT NULL,
	"asset_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "texture_tags" (
	"texture_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "texture_tags_texture_id_tag_id_pk" PRIMARY KEY("texture_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "texture_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"texture_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"status" texture_version_status DEFAULT 'draft' NOT NULL,
	"source_graph" jsonb NOT NULL,
	"artifact_bundle" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "textures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "textures_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "test_preset_slots" ADD CONSTRAINT "test_preset_slots_preset_id_test_presets_id_fk" FOREIGN KEY ("preset_id") REFERENCES "public"."test_presets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_preset_slots" ADD CONSTRAINT "test_preset_slots_texture_version_id_texture_versions_id_fk" FOREIGN KEY ("texture_version_id") REFERENCES "public"."texture_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "texture_assets" ADD CONSTRAINT "texture_assets_texture_id_textures_id_fk" FOREIGN KEY ("texture_id") REFERENCES "public"."textures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "texture_tags" ADD CONSTRAINT "texture_tags_texture_id_textures_id_fk" FOREIGN KEY ("texture_id") REFERENCES "public"."textures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "texture_tags" ADD CONSTRAINT "texture_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "texture_versions" ADD CONSTRAINT "texture_versions_texture_id_textures_id_fk" FOREIGN KEY ("texture_id") REFERENCES "public"."textures"("id") ON DELETE cascade ON UPDATE no action;