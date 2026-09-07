# DHL IT Courier Escape Room

Nuxt 4 extraction of the DHL IT Courier 3D prototype. The root page is a shared-password gate; successful access opens the protected dispatch floor at `/game`.

## Configuration

Set the shared code through the private runtime variable before starting the app:

```bash
NUXT_GAME_ACCESS_CODE=your-shared-code npm run dev
```

When unset, local development uses `courier-demo`.

The server exposes these game routes:

- `POST /api/access/verify` validates the shared code and sets an HttpOnly access cookie.
- `GET /api/access/status` reports whether the access cookie is valid.
- `POST /api/game/session` starts a game session.
- `POST /api/game/session/:id` accepts a final score and completion state.

Game sessions are process-local in this first extraction. They reset when the server restarts; production deployments that need durable scores should replace `server/utils/game-session.ts` with a database-backed store.

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
