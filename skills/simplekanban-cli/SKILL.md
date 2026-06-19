---
name: simplekanban-cli
description: Operate SimpleKanban through the existing `kan` command-line interface. Use when Codex needs to authenticate, inspect, search, create, update, move, comment on, or otherwise manage SimpleKanban workspaces, teams, issues, projects, cycles, or raw `/api/v1` endpoints from a shell using the SimpleKanban CLI.
---

# SimpleKanban CLI

Use the existing `kan` CLI as the control surface. Do not invent a separate
API client when the CLI already covers the operation.

## Command Selection

Prefer an installed `kan` binary from any repository:

```sh
kan --help
```

If `kan` is missing and you are inside the SimpleKanban repository, install the
local shim once:

```sh
bun run install:kan
```

The shim writes `~/.local/bin/kan` and points it at this checkout's
`scripts/kan.sh`, so other project directories can run `kan ...` too.

Inside the SimpleKanban repository, the repo-local launcher is also available:

```sh
./scripts/kan.sh --help
```

The package script is equivalent:

```sh
bun run kan -- --help
```

Use `--json` for machine-readable output on every read or write command except
`kan api`, whose response body is always raw JSON.

## Start Here

1. Verify the CLI and authentication:
   ```sh
   kan auth status --json
   ```
2. If `kan` is missing and you are in the SimpleKanban repo, run
   `bun run install:kan`, then retry the status command.
3. If auth is missing, ask for or use explicit `KAN_API_URL` and `KAN_API_KEY`.
   Do not fabricate credentials. `kan auth login --url <url> --key <key>` writes
   `~/.config/kan/config.json` with mode `600`; environment variables override
   that file.
4. If workspace or team resolution is ambiguous, pass `--workspace <slug|id|name>`
   and `--team <key|name>` on the command rather than editing config.

## Read Before Write

Inspect the target before mutating it unless the user supplied an exact issue
identifier and an exact requested change.

Useful reads:

```sh
kan workspace list --json
kan team list --workspace <workspace> --json
kan issue list --workspace <workspace> --team <team> --state Todo --json
kan search "query text" --workspace <workspace> --json
kan issue view ENG-42 --comments --json
```

For detailed command options, read `references/cli-reference.md`.

## Safe Writes

Use first-class issue commands for common writes:

```sh
kan issue create --team ENG --title "Fix login" --priority high --json
kan issue update ENG-42 --assignee me --priority urgent --json
kan issue move ENG-42 --state "In Progress" --json
kan issue comment ENG-42 --body "Starting investigation." --json
```

For long descriptions or comments, prefer stdin to avoid shell quoting bugs:

```sh
kan issue comment ENG-42 --body - --json < comment.md
```

When no first-class command exists, use `kan api` as an escape hatch:

```sh
kan api GET /openapi.json
kan api GET /issues/<issue-id>/comments
kan api POST /issues/<issue-id>/comments --data '{"body":"Status update"}'
kan api PATCH /issues/<issue-id> --data - < patch.json
```

## Operating Rules

- Use exact issue identifiers such as `ENG-42` in user-visible updates.
- Quote state names and labels that contain spaces, such as `"In Progress"` or
  `"Human Review"`.
- Prefer first-class CLI commands over `kan api`; use raw API only for missing
  commands, debugging, or endpoints such as blockers, usage, activity, workpads,
  and agent events.
- Treat `kan issue move` as a state transition with no dry run. Confirm the
  target issue with a read first when the request is ambiguous.
- Surface CLI error codes and candidate lists directly when resolution fails
  (`workspace_required`, `team_required`, `*_not_found`, `not_authenticated`).
- Never print API keys or persisted config contents in the final response.

## Common Workflows

Take an issue:

```sh
kan issue view ENG-42 --comments --json
kan issue move ENG-42 --state "In Progress" --json
kan issue comment ENG-42 --body "Taking this in Codex." --json
```

Find work assigned to the current user:

```sh
kan issue list --team ENG --assignee me --json
```

Create a task from a local spec:

```sh
kan issue create --team ENG --title "Implement webhook retry" --description - --json < spec.md
```

Close with evidence:

```sh
kan issue comment ENG-42 --body - --json < completion-note.md
kan issue move ENG-42 --state Done --json
```
