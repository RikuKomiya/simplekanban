# SimpleKanban

シンプルながら Linear レベルの UI/UX を目指すカンバンタスク管理。

- **Frontend**: Vite + React 19 + TanStack Router/Query + Tailwind CSS v4
- **Server**: Hono on Cloudflare Workers + Durable Objects (realtime)
- **DB**: Turso (libSQL) + Drizzle ORM
- **Auth**: better-auth (session) + API Key (coding agent / CLI 用)
- **CLI**: `kan` — API の薄いラッパー(`--json` で agent フレンドリー)
- **Monorepo**: Turborepo + Bun workspaces

設計の詳細は [ARCHITECTURE.md](./ARCHITECTURE.md) を参照。

## Development

```sh
bun install
bun run dev        # server (wrangler dev :8787) + web (vite :5173)
```

開発時の DB はリポジトリルートの `local.db`(libSQL file)。

## Build / Test

```sh
bun run build
bun run typecheck
bun run test
```

## Deploy (Cloudflare)

1. Turso DB を作成し `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` を取得
2. `apps/server` で wrangler secrets を設定:
   `wrangler secret put TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` / `BETTER_AUTH_SECRET`
3. `bun run build` 後、`cd apps/server && wrangler deploy`
   (web のビルド成果物は server Worker の assets binding で配信)
