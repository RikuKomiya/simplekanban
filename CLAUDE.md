# SimpleKanban — Agent Guide

Linear ライクなカンバンタスク管理。設計契約は [ARCHITECTURE.md](./ARCHITECTURE.md) — **テーブル・型・エンドポイントを変える時は必ず両方更新する**。

## コマンド

```sh
bun install            # ルートで(Bun workspaces)
bun run build          # turbo: 全パッケージビルド(web の dist は server の assets になる)
bun run typecheck      # turbo: 全パッケージ tsc --noEmit
bun run test           # turbo: bun test(shared, cli)
```

開発起動(2プロセス):
```sh
cd apps/server && bun run dev    # Bun.serve :8787、local.db に自動マイグレーション
cd apps/web && bun run dev       # vite :5173、/api を 8787 に proxy(WS 込み)
```

## 構成

- `packages/db` — Drizzle スキーマ + migrations。スキーマ変更後は `bun x drizzle-kit generate` で SQL 生成
- `packages/shared` — zod schemas / 入力 validation / typed `createApiClient` / 定数。**server と web と cli の契約はここ**
- `apps/server` — Hono。`src/app.ts` がランタイム非依存本体、`src/index.ts` が Workers(+ WorkspaceRoom DO)、`src/dev.ts` が Bun 開発エントリ
- `apps/web` — React 19 + TanStack Router/Query + Tailwind v4。デザイントークンは `src/styles/index.css`
- `packages/cli` — `kan` CLI(`node dist/index.js`)

## Agent 向け API アクセス

- API キー: Web の Settings → API Keys で発行(`sk_` プレフィックス、`Authorization: Bearer`)
- 機械可読仕様: `GET /api/v1/openapi.json`
- CLI: `kan auth login --url <url> --key <sk_...>` → 全コマンド `--json` 対応。`kan api <method> <path>` で任意エンドポイント
- mutation には `x-client-id` ヘッダを付けると WS echo 抑制される

## 規約

- TypeScript strict / ESM / any 禁止。zod は v3 API(`zod ^3.25`)
- API レスポンスは `{data}` / `{error:{code,message}}` 封筒。Date は ISO 文字列に serialize
- issue の並びは fractional ordering(`sortOrderBetween`)。チーム内連番は INSERT 時に原子的採番
- mutation 時は activity 記録 + notification + realtime publish を忘れない(`apps/server/src/sideeffects.ts`)
