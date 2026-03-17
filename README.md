# GovHold

## Overview

GovHold is a civic accountability platform where Nigerian citizens can report infrastructure problems in their community. Citizens submit reports with descriptions, categories, location (GPS), and photo evidence. All reports are publicly visible on a home feed and an interactive map.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Replit Auth (OpenID Connect / PKCE) via `openid-client`
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite, Tailwind CSS, Leaflet.js (maps), Recharts (analytics)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (port from $PORT env, default 8080)
│   └── govwatch/           # React + Vite frontend (GovHold app)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks + TypeScript types
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle schema + client
│   └── replit-auth-web/    # useAuth() React hook (calls /api/auth/user)
```

## Authentication

- **Strategy**: Replit Auth via OIDC (no phone OTP, no custom forms)
- Login redirects to `/api/login`, callback at `/api/callback`
- Sessions stored in PostgreSQL (`sessionsTable`)
- After first login → user must complete profile (`/profile/setup`)
- `useAuth()` hook from `@workspace/replit-auth-web` provides `{ user, isAuthenticated, login, logout }`
- `req.isAuthenticated()` / `req.user` available in Express routes via `authMiddleware`

## Features

| Feature | Status |
|---|---|
| Public report feed with search, category filter, sort | ✅ |
| Leaflet map view with report markers | ✅ |
| Submit report (auth required, image upload) | ✅ |
| User registration via Replit Auth | ✅ |
| Profile setup (phone, state, LGA) | ✅ |
| Profile page with stats | ✅ |
| Report confirmations (thumbs-up, toggle) | ✅ |
| Highlighted/Featured reports (gold border) | ✅ |
| Admin panel (status change, highlight, delete) | ✅ |
| Analytics dashboard (Recharts bar charts) | ✅ |

## API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /api/health | No | Health check |
| GET | /api/auth/user | No | Current session user |
| GET | /api/login | No | Redirect to OIDC login |
| GET | /api/callback | No | OIDC callback |
| GET | /api/logout | No | Clear session + redirect |
| GET | /api/reports | No | List reports (category/status/sort filters) |
| POST | /api/reports | Yes | Submit new report |
| GET | /api/reports/:id | No | Get single report |
| POST | /api/reports/upload-image | No | Upload image (multer) |
| POST | /api/reports/:id/confirm | Yes | Confirm a report |
| DELETE | /api/reports/:id/confirm | Yes | Remove confirmation |
| GET | /api/profile | Yes | Get current user profile |
| POST | /api/profile | Yes | Update profile |
| GET | /api/users/:id/stats | No | User report/confirmation stats |
| GET | /api/admin/reports | Yes | Admin: all reports |
| PATCH | /api/admin/reports/:id | Yes | Admin: update status/highlight |
| DELETE | /api/admin/reports/:id | Yes | Admin: delete report |
| GET | /api/analytics | No | Platform-wide stats |

## Database Schema

- `usersTable` — id (varchar, Replit sub), email, firstName, lastName, profileImageUrl, phone, state, lga, profileComplete
- `reportsTable` — id, title, description, category, status, lat, lng, imageUrl, videoUrl, userId (FK), confirmationsCount, isHighlighted, createdAt
- `reportConfirmationsTable` — userId, reportId, createdAt (unique userId+reportId)
- `sessionsTable` — id, data (JSON), expiresAt

## Image Uploads

- Multer stores uploads in `artifacts/api-server/uploads/`
- Served statically at `/api/uploads/*`
- Max file size: 20MB, allowed: JPEG/PNG/GIF/WebP

## Nigerian States (Profile)

Full list of 37 Nigerian states/FCT used in profile setup and state analytics.

## Codegen

After modifying `lib/api-spec/openapi.yaml`, run:
```
pnpm --filter @workspace/api-client-react run generate
pnpm --filter @workspace/api-zod run generate
```
