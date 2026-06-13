# SimpleKanban — Architecture Contract

Linear-level UI/UX のカンバンタスク管理。このドキュメントは全実装エージェントが従う**契約**である。
ここに書かれた型名・テーブル名・エンドポイントは正であり、変更する場合は必ずこのファイルも更新する。

## Stack

| Layer | Tech |
|---|---|
| Monorepo | Turborepo + Bun workspaces (パッケージマネージャ/ランタイムは Bun 1.3) |
| Frontend | Vite + React 19 + TanStack Router + TanStack Query + Tailwind CSS v4 |
| Server | Hono ^4 on Cloudflare Workers |
| Realtime | Cloudflare Durable Objects (WebSocket broadcast per workspace) |
| DB | Turso (libSQL) + Drizzle ORM (`@libsql/client`) |
| Auth | better-auth ^1 (email/password) + API Key (Bearer) for agents/CLI |
| CLI | Bun/Node 互換 (commander), bin name: `kan` |
| Validation | zod ^3.25 (plain zod 3 API) |

すべて TypeScript strict / ESM。パッケージ namespace は `@simplekanban/*`。

## Repo layout

```
apps/
  web/        @simplekanban/web    — React SPA
  server/     @simplekanban/server — Hono Worker (API + 静的アセット配信 + DO)
packages/
  db/         @simplekanban/db     — Drizzle schema + migrations + client factory
  shared/     @simplekanban/shared — zod schemas, API types, typed API client
  cli/        @simplekanban/cli    — `kan` CLI (REST API wrapper)
```

- 本番: server Worker が `/api/*` を処理し、それ以外は web のビルド成果物 (assets binding, SPA fallback) を配信。同一オリジンなので cookie auth が単純。
- 開発: server は **Bun エントリ** (`src/dev.ts`, `Bun.serve` port 8787) で起動し、`file:../../local.db` を使う(workerd は file: の libSQL に接続不可のため)。web は `vite dev` (port 5173) で `/api` を 8787 に proxy(WebSocket 含む)。
- 本番エントリは `src/index.ts`(Workers, DO export)。Hono app 本体はランタイム非依存に書き、realtime は `RealtimePublisher` インターフェース(dev: in-memory rooms / prod: Durable Object stub)で抽象化する。
- 本番 DB: `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`。

## Data model (packages/db, Drizzle/SQLite)

ID は全テーブル `text` の nanoid(21)。タイムスタンプは `integer` (unixepoch ms, `{ mode: 'timestamp_ms' }`)。

better-auth 標準テーブル: `user`, `session`, `account`, `verification`(better-auth の Drizzle スキーマ規約に従う)。

アプリテーブル:

- `workspace` — id, name, slug (unique), createdAt
- `workspaceMember` — id, workspaceId, userId, role ('admin'|'member'), createdAt。(workspaceId,userId) unique
- `team` — id, workspaceId, name, key (例 "ENG", workspace 内 unique), color, icon, createdAt
- `workflowState` — id, teamId, name, type ('backlog'|'unstarted'|'started'|'completed'|'canceled'), color, position (real)。チーム作成時にデフォルト6種 seed: Backlog/Todo/In Progress/In Review/Done/Canceled
- `issue` — id, teamId, number (int, チーム内連番), title, description (markdown, nullable), stateId, priority (int 0=none,1=urgent,2=high,3=medium,4=low), assigneeId?, creatorId, parentId? (sub-issue), projectId?, cycleId?, estimate? (int), sortOrder (real, fractional ordering), dueDate?, createdAt, updatedAt, completedAt?, canceledAt?。(teamId,number) unique
- `label` — id, workspaceId, name, color。`issueLabel` — issueId, labelId (複合PK)
- `project` — id, workspaceId, name, description?, icon?, color?, status ('backlog'|'planned'|'started'|'paused'|'completed'|'canceled'), leadId?, startDate?, targetDate?, sortOrder, createdAt
- `cycle` — id, teamId, number (チーム内連番), name?, startsAt, endsAt, createdAt
- `comment` — id, issueId, authorId, body (markdown), createdAt, updatedAt
- `issueActivity` — id, issueId, actorId, type (例 'created'|'state_changed'|'assignee_changed'|'priority_changed'|'label_added'|'label_removed'|'comment_added'|...), data (JSON text: {from,to} 等), createdAt
- `notification` — id, userId, workspaceId, issueId, actorId, type ('assigned'|'comment'|'state_changed'|'mention'), readAt?, createdAt
- `favorite` — id, userId, workspaceId, entityType ('issue'|'project'|'cycle'|'view'), entityId, createdAt
- `apiKey` — id, userId, workspaceId, name, hashedKey (sha-256 hex), prefix (表示用先頭8文字), lastUsedAt?, createdAt

`packages/db` は `createDb({ url, authToken? })` を export。drizzle-kit でマイグレーション生成、`migrations/` をコミット。

## API (apps/server, REST, base `/api/v1`)

認証: web は better-auth session cookie (`/api/auth/*` は better-auth handler)。CLI/agent は `Authorization: Bearer sk_<key>`。両対応 middleware が `c.var.user` をセット。

レスポンス形: 成功 `{ data: T }`、リスト `{ data: T[] }`、エラー `{ error: { code: string, message: string } }`。HTTP status 準拠 (400/401/403/404/409/500)。

エンドポイント(全て workspace スコープの認可チェック必須):

```
GET    /api/v1/me                          現在ユーザー + workspaces
POST   /api/v1/workspaces                  作成 {name, slug}
GET    /api/v1/workspaces/:ws              詳細(teams, members, labels 込み)
POST   /api/v1/workspaces/:ws/members      招待(email 指定, 既存 user のみ)
GET    /api/v1/workspaces/:ws/teams        / POST 同
GET    /api/v1/teams/:teamId               / PATCH / DELETE
GET    /api/v1/teams/:teamId/states        / POST、PATCH/DELETE /api/v1/states/:id
GET    /api/v1/teams/:teamId/issues        ?state=&assignee=&priority=&label=&cycle=&project=&q=&updatedSince=
POST   /api/v1/teams/:teamId/issues        {title, description?, stateId?, priority?, assigneeId?, labelIds?, ...}
GET    /api/v1/issues/:id                  詳細(labels, comments, activities, subIssues 込み)
GET    /api/v1/issues/by-key/:identifier   "ENG-42" 形式で取得
PATCH  /api/v1/issues/:id                  部分更新(sortOrder, stateId 含む — board の DnD はこれ)
DELETE /api/v1/issues/:id
POST   /api/v1/issues/:id/comments         / PATCH/DELETE /api/v1/comments/:id
GET    /api/v1/workspaces/:ws/labels       / POST、PATCH/DELETE /api/v1/labels/:id
POST   /api/v1/issues/:id/labels           {labelId} / DELETE .../labels/:labelId
GET    /api/v1/workspaces/:ws/projects     / POST、GET/PATCH/DELETE /api/v1/projects/:id
GET    /api/v1/teams/:teamId/cycles        / POST、GET/PATCH/DELETE /api/v1/cycles/:id
GET    /api/v1/workspaces/:ws/search       ?q= → issues (identifier 完全一致 + title/description LIKE)
GET    /api/v1/notifications               ?unread=1 / POST /api/v1/notifications/:id/read / POST /api/v1/notifications/read-all
GET    /api/v1/workspaces/:ws/api-keys     / POST {name} → 平文キーは作成時のみ返す / DELETE /api/v1/api-keys/:id
GET    /api/v1/openapi.json                機械可読 API 仕様(coding agent 用)
```

副作用: issue の作成/更新/コメントは `issueActivity` を記録し、関係者へ `notification` を作成し、realtime イベントを workspace の DO へ publish する。

## Realtime

- DO class `WorkspaceRoom`(workspace ごとに 1 instance, `idFromName(workspaceId)`)。
- `GET /api/v1/ws?workspace=<id>`(認証必須)→ WebSocket upgrade → DO へ転送。
- サーバーの mutation 成功後に DO へ `{type, payload}` を publish、DO が全接続へ broadcast。
- イベント type: `issue.created` | `issue.updated` | `issue.deleted` | `comment.created` | `comment.updated` | `comment.deleted` | `project.*` | `cycle.*` | `label.*` | `state.*` | `notification.created`。payload は対象エンティティの serialize 済み JSON。
- クライアントは受信時に TanStack Query cache を直接 update / invalidate。自分の mutation echo は `origin` (client が接続時に発番する clientId を mutation header `x-client-id` で送る) で抑制。
- 接続は自動再接続(exponential backoff)。

## packages/shared

- 全エンティティの zod schema + TS 型 (`Issue`, `Team`, `Workspace`, ...) — API のレスポンス serialize 形 (Date は ISO string)。
- create/update 入力の zod schema(server がそのまま validate に使う)。
- `Priority` enum 定数、`StateType` 等。
- `createApiClient({ baseUrl, apiKey?, fetch? })` — 全エンドポイントの typed wrapper。web と cli が共用。
- fractional ordering util: `sortOrderBetween(a?: number, b?: number): number`。

## apps/web — UX 要件 (Linear 水準)

デザイン原則: 高密度・高速・キーボードファースト。dark theme デフォルト(light も対応、CSS variables でトークン化)。フォントは system-ui stack。アニメーションは 100-150ms、過剰にしない。

必須機能:
- 認証画面 (login / signup)、初回 workspace + team 作成オンボーディング
- サイドバー: workspace 切替、Inbox(未読バッジ)、My Issues、teams(→ Board/List/Cycles)、Projects、Favorites
- **Board view**: workflowState ごとの列、ドラッグ&ドロップ(@dnd-kit)、optimistic update、列ヘッダに件数 + 列内 issue 追加ボタン
- **List view**: state ごとの grouping、行に priority icon / identifier / title / labels / assignee avatar / due date
- フィルタバー: state/assignee/priority/label、URL に永続化
- Issue 詳細: 右パネル(peek)+ フルページ。タイトル/説明インライン編集、プロパティ(state, priority, assignee, labels, estimate, due date, project, cycle)変更、sub-issues、コメント、activity timeline
- **Command palette (Cmd+K)**: ナビゲーション + issue 検索 + コンテキストアクション(state 変更, assign, priority...)
- キーボードショートカット: `c` 新規 issue、`cmd+k` palette、`g then b/l/i` 移動、issue 選択中 `s` state / `a` assignee / `p` priority / `l` label のポップアップ
- 新規 issue モーダル(チーム選択、プロパティ設定、`cmd+enter` で作成)
- Inbox(通知一覧、既読化)、My Issues(自分が assignee)
- Projects 一覧 + プロジェクト詳細(進捗バー = 完了 issue 比率)
- Cycles(現在/過去/未来、issue 一覧と進捗)
- 全 mutation optimistic + WS でリアルタイム同期(別タブで開いて即反映)
- スケルトン/empty state/エラー toast (sonner 等)

## packages/cli — `kan`

設定: `~/.config/kan/config.json` (`{ apiUrl, apiKey, defaultWorkspace?, defaultTeam? }`) + env override (`KAN_API_URL`, `KAN_API_KEY`)。
出力: 人間向け table + `--json` フラグで raw JSON(coding agent 用)。exit code 0/1。

```
kan auth login            (apiUrl と apiKey を対話/フラグで保存)  / kan auth status
kan workspace list
kan team list
kan issue list [--team ENG] [--state ...] [--assignee me] [--json]
kan issue view ENG-42 [--json] [--comments]
kan issue create --team ENG --title "..." [--description -|text] [--priority high] [--label x] [--assignee me]
kan issue update ENG-42 [--state "In Progress"] [--priority urgent] [--title ...] [--assignee me]
kan issue move ENG-42 --state Done        (update の alias)
kan issue comment ENG-42 --body "..."     (body - で stdin)
kan project list / kan cycle list
kan search "query" [--json]
kan api <method> <path> [--data '{...}']  (生 API エスケープハッチ — agent 用)
```

state/priority/assignee は名前であいまい解決(大文字小文字無視、前方一致)。曖昧ならエラーで候補表示。

## Conventions

- TS strict、`tsconfig.base.json` を extends。
- 各パッケージ scripts: `build`, `typecheck`、(該当なら) `dev`, `test`。
- packages/db, shared, cli は tsc でビルド(dist/)。web は vite build。server は wrangler。
- エラーは握りつぶさない。server は zod validate 失敗 → 400 `{error}`。
- secrets は `.env` / wrangler secrets。`.env.example` を各 app に置く。
- 環境変数: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`。
