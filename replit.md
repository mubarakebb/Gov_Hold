# GovHold

A civic accountability platform for Nigerian citizens to report and track infrastructure issues (roads, water, electricity) in their communities.

## Architecture

This is a TypeScript monorepo managed with pnpm workspaces.

### Applications (`artifacts/`)

- **`govhold/`** (`@workspace/govwatch`) — React + Vite frontend on port 20393
- **`api-server/`** (`@workspace/api-server`) — Express 5 backend API on port 8080
- **`mockup-sandbox/`** — UI prototyping environment

### Shared Libraries (`lib/`)

- **`db/`** (`@workspace/db`) — PostgreSQL + Drizzle ORM database layer
- **`api-spec/`** (`@workspace/api-spec`) — OpenAPI 3.1 spec + Orval codegen config
- **`api-client-react/`** (`@workspace/api-client-react`) — Generated React Query hooks
- **`api-zod/`** (`@workspace/api-zod`) — Generated Zod validation schemas
- **`auth-web/`** (`@workspace/replit-auth-web`) — `useAuth()` hook for Replit Auth

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS 4, Wouter, TanStack Query v5, Leaflet.js, Recharts, Radix UI
- **Backend**: Express 5, Node.js 24, tsx, Zod, Multer (file uploads)
- **Database**: PostgreSQL via Drizzle ORM
- **Auth**: Replit Auth (OIDC/PKCE)

## Service Routing

The shared reverse proxy routes:
- `/` → govwatch frontend (port 20393)
- `/api` → api-server (port 8080)
- `/api/uploads` → static file serving for uploaded images

## Running the Application

Workflow command:
```
PORT=8080 pnpm --filter @workspace/api-server run dev & PORT=20393 BASE_PATH=/ pnpm --filter @workspace/govwatch run dev
```

## Database

PostgreSQL is provisioned via Replit. Schema is managed with Drizzle ORM.

To push schema changes:
```
pnpm --filter @workspace/db run push
```

To regenerate API client from OpenAPI spec:
```
pnpm --filter @workspace/api-spec run codegen
```

## Key Features

- **Public Feed** — Filterable/sortable list of community infrastructure reports
- **Interactive Map** — Leaflet.js geographic visualization of reports
- **Report Submission** — Authenticated users submit reports with GPS coords and photos
- **Confirmation System** — Users can upvote/confirm reported issues
- **Admin Panel** — Status management (Open/In Progress/Resolved), featured reports, deletion, user management
- **Analytics** — Charts for total reports, resolution rates, category and state distributions

## Admin System

- `isAdmin` boolean column on `usersTable`
- The Replit project owner (`REPL_OWNER_ID`) is automatically granted admin on each login
- Admins can grant/revoke admin status to other users via the Admin Panel → Users tab
- Admin API routes return 403 for non-admin authenticated users
- Admin nav link and profile dashboard card are only visible to admins
- To grant admin manually: `UPDATE users SET is_admin = true WHERE id = '<user_id>';`
