# TextureLab

TextureLab is a Nuxt/Vue application for creating, publishing, and showcasing portable texture artifacts generated from structured primitives.

## Stack

- Nuxt + Vue + Tailwind
- Drizzle ORM + Neon Postgres
- Auth.js (Nuxt Auth module)
- Vercel deployment target

## Features in this foundation

- Texture list view with 10:1 live preview cards, search, tags, status filter, cursor loading, and virtualization.
- Test view with 5 configurable panels and saved presets.
- Admin authoring with draft/publish versions, structured source graph editing, constrained overrides, and artifact export snippets.
- Runtime safeguards:
  - no arbitrary user-authored JS in source graph
  - primitive signature validation
  - HTML/SVG/CSS sanitization
  - CSP + security headers
- Repository abstraction:
  - Drizzle-backed persistence when `DATABASE_URL` is configured
  - in-memory fallback for local bootstrapping

## Environment

Copy `.env.example` to `.env` and set:

- `DATABASE_URL`
- `NUXT_AUTH_SECRET`
- `NUXT_ADMIN_EMAILS`
- `NUXT_ADMIN_PASSWORD`
- `NUXT_AUTH_ORIGIN`

## Neon branch strategy

Use one Neon project with separate branches:

- `main` branch -> production
- preview branch per Vercel preview deployment
- `dev` branch for local development

Point each environment's `DATABASE_URL` to the matching branch endpoint.

## Local setup

```bash
npm i
npm run db:generate
npm run db:migrate
npm run dev
```

## API surface

- `GET /api/textures`
- `POST /api/textures`
- `GET /api/textures/:id`
- `PATCH /api/textures/:id`
- `POST /api/textures/:id/versions`
- `POST /api/textures/:id/publish`
- `DELETE /api/textures/:id`
- `GET /api/test-presets`
- `POST /api/test-presets`
- `POST /api/render/preview`

## Notes

- Drizzle migration SQL is provided in `drizzle/0000_texturelab_init.sql`.
- Primitive registry starts with 20 definitions in `shared/constants/primitives.ts`.
