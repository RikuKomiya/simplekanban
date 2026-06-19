# SimpleKanban

シンプルながら Linear レベルの UI/UX を目指すカンバンタスク管理。

- **Frontend**: Vite + React 19 + TanStack Router/Query + Tailwind CSS v4
- **Server**: Hono on Cloudflare Workers + Durable Objects (realtime)
- **DB**: Turso (libSQL) + Drizzle ORM
- **Auth**: better-auth (session) + API Key (coding agent / CLI 用)
- **CLI**: `kan` — API の薄いラッパー(`--json` で agent フレンドリー)
- **Monorepo**: Turborepo + Bun workspaces

設計の詳細は [ARCHITECTURE.md](./ARCHITECTURE.md)、開発の指針は [CLAUDE.md](./CLAUDE.md) を参照。

## Development

```sh
bun install
bun run dev    # server + web を同時起動(turbo)
```

- **server**: `apps/server` の Bun エントリ(`Bun.serve`)が `http://localhost:8787` で起動。`wrangler dev` ではない(workerd は file: の libSQL に接続できないため、開発は Bun ランタイムを使う)。
- **web**: vite が `http://localhost:5173` で起動し、`/api` を 8787 へ proxy(WebSocket 含む)。
- **DB**: リポジトリルートの `local.db`(libSQL file)。dev サーバーは起動時に `packages/db/migrations` を**自動適用**する。

個別に動かす場合:

```sh
cd apps/server && bun run dev   # :8787
cd apps/web    && bun run dev   # :5173
```

## Build / Test

```sh
bun run build       # 全パッケージ(web の dist は server の assets になる)
bun run typecheck
bun run test
```

## CLI (`kan`)

```sh
# checkout 内で使う
bun run kan -- --help

# どの project からも `kan ...` で使える shim を入れる
bun run install:kan
kan --help

# 本番に対して使う例
kan auth login \
  --url https://<your-worker>.workers.dev --key sk_xxx   # API キーは Web の Settings → API Keys で発行
kan issue list --team ENG --json
```

`--json` を付けると生 JSON を返すので coding agent から扱いやすい。`kan api <method> <path>` は任意エンドポイントへのエスケープハッチ。

### Codex skill と CLI を別環境に入れる

Codex から SimpleKanban を操作したい環境では、まず skill を入れる:

```sh
python3 "${CODEX_HOME:-$HOME/.codex}/skills/.system/skill-installer/scripts/install-skill-from-github.py" \
  --repo RikuKomiya/simplekanban \
  --path skills/simplekanban-cli
```

install 後は Codex を再起動して `$simplekanban-cli` を使う。

別 project や別ターミナルから `kan ...` を使いたい環境では、CLI shim も入れる:

```sh
git clone https://github.com/RikuKomiya/simplekanban.git
cd simplekanban
bun install --frozen-lockfile
bun run install:kan
```

これで `~/.local/bin/kan` がこの checkout の CLI を指す。`~/.local/bin` が `PATH` に入っていれば、どの directory からでも `kan auth status --json` や `kan issue list ...` を実行できる。

認証は一度だけ:

```sh
kan auth login --url https://<your-worker>.workers.dev --key sk_xxx
kan auth status --json
```

認証情報は `~/.config/kan/config.json` に保存される。同じ OS user なら別 Codex session / terminal / project でも再利用される。`KAN_API_URL` / `KAN_API_KEY` を環境変数で渡した場合だけ、その shell の値が優先される。

Coding agent / issue tracker 連携向けには、`GET /api/v1/openapi.json` で機械可読仕様を取得できる。Alophony などの外部 orchestrator は以下の API を使える:

- `GET /api/v1/teams/:teamId/issues?state=&limit=&cursor=` — ページ付き issue polling
- `POST /api/v1/issues/batch` — 複数 issue の状態再取得
- `GET/POST/DELETE /api/v1/issues/:id/blockers` — blocker relation
- `GET /api/v1/issues/:id/comments` / `GET /api/v1/issues/:id/activity` — agent inspection
- `POST /api/v1/issues/:id/usage` — 累積 token usage

API key は作成時に `scopes` を指定できる。省略時は既存互換の `*` (full access)。Alophony 用の最小構成は `issues:read`, `issues:write`, `comments:write`, `states:read`, `members:read`, `relations:read`, `usage:write`。

## Deploy (Cloudflare + Turso)

> 本番(Workers)は dev と違い**マイグレーションを自動適用しない**。手順 2 が必須。
> `BETTER_AUTH_URL` は Worker の公開 URL で、初回デプロイで確定するため「デプロイ → URL を設定 → 再デプロイ」の順になる。

### 前提
- Cloudflare アカウント + `wrangler login`(`bunx wrangler whoami` でログイン確認)
- Turso CLI: `brew install tursodatabase/tap/turso` → `turso auth login`

### 1. Turso DB を作成して接続情報を取得

```sh
turso db locations                                   # 有効なロケーション一覧
turso db create simplekanban --location aws-ap-northeast-1   # 東京
turso db show simplekanban --url                     # → libsql://simplekanban-xxxx.turso.io
turso db tokens create simplekanban                  # → 認証トークン
```

### 2. 本番 DB にスキーマを適用(必須)

`packages/db/.env`(gitignore 済み)に接続情報を書く:

```
TURSO_DATABASE_URL=libsql://simplekanban-xxxx.turso.io
TURSO_AUTH_TOKEN=<token>
```

```sh
cd packages/db && bun run db:migrate                 # migrations/ を Turso に適用
turso db shell simplekanban ".tables"                # user/workspace/team/issue 等が並べば成功
```

スキーマを変更したときも `bun run db:generate`(SQL 生成)→ `bun run db:migrate` で本番に反映する。

### 3. secrets を登録(`apps/server` で実行)

```sh
cd apps/server
openssl rand -base64 32 | bunx wrangler secret put BETTER_AUTH_SECRET
bunx wrangler secret put TURSO_DATABASE_URL          # プロンプトに libsql://... を入力
bunx wrangler secret put TURSO_AUTH_TOKEN            # プロンプトにトークンを入力
```

### 4. ビルド

```sh
bun run build                                        # web の dist/ を含む(リポジトリルートで)
```

### 5. デプロイ → URL を設定 → 再デプロイ

```sh
cd apps/server
bunx wrangler deploy                                 # 初回。出力末尾の https://<name>.<subdomain>.workers.dev を確認
```

`apps/server/wrangler.jsonc` の `vars.BETTER_AUTH_URL` を、確定したその URL に書き換える(これは secret ではなく var):

```jsonc
"vars": {
  "BETTER_AUTH_URL": "https://simplekanban.<your-subdomain>.workers.dev"
}
```

```sh
bunx wrangler deploy                                 # 再デプロイで BETTER_AUTH_URL を反映
```

web のビルド成果物は同一 Worker の assets binding(`run_worker_first: ["/api/*"]`)で配信されるため、API と SPA は同一オリジンになる。

### 動作確認(書き込みなし)

```sh
B=https://simplekanban.<your-subdomain>.workers.dev
curl -s -o /dev/null -w "%{http_code}\n" "$B/"                    # 200 (SPA)
curl -s "$B/api/v1/me"                                            # 401 + {"error":...} なら配線OK
```

### 更新デプロイ(2 回目以降)

```sh
bun run build && cd apps/server && bunx wrangler deploy
```

スキーマ変更を伴う場合のみ、デプロイ前に手順 2 の `db:generate` → `db:migrate` を実行する。
