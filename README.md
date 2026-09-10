# DHL IT Courier Escape Room

Nuxt 4 extraction of the DHL IT Courier 3D prototype. The root page is a shared-password gate; successful access opens the protected dispatch floor at `/game`.

## Configuration

Set the shared code through the private runtime variable before starting the app:

```bash
NUXT_GAME_ACCESS_CODE=your-shared-code npm run dev
```

When unset, local development uses `courier-demo`. Set the variable in the environment used to build and run the Nuxt server for a production deployment.

The floorplan editor is available at `/editor`. Its password defaults to `editor`; configure it with `NUXT_EDITOR_PASSWORD`. For local development, set `NUXT_DISABLE_EDITOR_PASSWORD=true` to skip the editor password form. The repository's ignored `.env` file enables this bypass locally.

The server exposes these game routes:

- `POST /api/access/verify` validates the shared code and sets an HttpOnly access cookie.
- `GET /api/access/status` reports whether the access cookie is valid.
- `POST /api/game/session` starts a game session.
- `POST /api/game/session/:id` accepts a final score and completion state.
- `GET /api/game/floorplan` loads the authenticated dispatch floorplan.
- `PUT /api/game/floorplan` saves an authenticated editor deployment.

The runtime database is SQLite at `data/courier.sqlite` by default. Override the location with `NUXT_GAME_DB_PATH`. The first startup creates the database, seeds the `floorplans` table from `public/game/defaultLayout.json`, and creates the `game_sessions` table used for final scores. The protected floorplan editor is available at `/editor` after access is granted and can explicitly reset the stored layout to those public defaults.

The SQLite integration uses Node's built-in `node:sqlite`, so the app requires Node 22.5 or newer. Access tokens remain process-local and expire after 12 hours; the database stores sessions and scores, but a server restart invalidates existing access cookies.

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
