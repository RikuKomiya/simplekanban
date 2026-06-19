# SimpleKanban CLI Reference

Use this file when SKILL.md does not contain enough command detail.

## Global Behavior

- Global binary: `kan`
- Shim installer: `bun run install:kan` creates `~/.local/bin/kan`
- Repository launcher used by the shim: `./scripts/kan.sh`
- Package script: `bun run kan -- <args>`
- Source fallback: `bun packages/cli/src/index.ts`
- Built fallback: `node packages/cli/dist/index.js`
- Agent output: pass `--json` on normal commands.
- Context flags: `--workspace <workspace>` accepts id, slug, or name; `--team <team>` accepts key or name.
- Auth precedence: `KAN_API_URL` / `KAN_API_KEY` override `~/.config/kan/config.json`.
- Raw API paths are relative to `/api/v1`; `/me`, `me`, `/api/v1/me`, and full URLs are normalized.

## Auth

```sh
kan auth login --url https://app.example.com --key sk_xxx --json
kan auth status --json
```

Use `auth login` only when the user supplied credentials or the environment
already contains them.

## Workspace, Team, Project, Cycle

```sh
kan workspace list --json
kan team list --workspace <workspace> --json
kan project list --workspace <workspace> --json
kan cycle list --workspace <workspace> --team <team> --json
```

Use these to resolve ids, slugs, team keys, project ids, cycle ids, and active
context before issue mutations.

## Issue Reads

```sh
kan issue list --team <team> --json
kan issue list --team <team> --state "In Progress" --json
kan issue list --team <team> --assignee me --json
kan issue list --team <team> --priority urgent --json
kan issue list --team <team> --label bug --json
kan issue list --team <team> --project <project-id> --json
kan issue list --team <team> --cycle <cycle-id> --json
kan issue list --team <team> --query "login" --json
kan issue list --team <team> --updated-since 2026-06-19T00:00:00Z --json
kan search "ENG-42 or title text" --workspace <workspace> --json
kan issue view ENG-42 --comments --json
```

Prefer `issue view --comments` before changing title, description, state,
assignee, labels, project, cycle, estimate, due date, or comments.

## Issue Writes

```sh
kan issue create --team <team> --title "Title" --json
kan issue create --team <team> --title "Title" --description - --json < description.md
kan issue create --team <team> --title "Title" --state Todo --priority high --assignee me --label bug --json
kan issue update ENG-42 --title "New title" --json
kan issue update ENG-42 --description - --json < description.md
kan issue update ENG-42 --state "Human Review" --priority medium --assignee none --json
kan issue update ENG-42 --project <project-id> --cycle <cycle-id> --estimate 3 --due 2026-06-30 --json
kan issue update ENG-42 --project "" --cycle "" --due "" --json
kan issue move ENG-42 --state Done --json
kan issue comment ENG-42 --body "Short note" --json
kan issue comment ENG-42 --body - --json < comment.md
```

Priority accepts `urgent`, `high`, `medium`, `low`, `none`, or numeric `0-4`.
Assignee accepts a name, email, `me`, or `none` on update.

## Raw API Escape Hatch

```sh
kan api GET /me
kan api GET /openapi.json
kan api GET /issues/<issue-id>/activity
kan api GET /issues/<issue-id>/comments
kan api POST /issues/<issue-id>/comments --data '{"body":"hi"}'
kan api PATCH /issues/<issue-id> --data - < patch.json
kan api DELETE /issues/<issue-id>/blockers/<blocked-by-id>
```

Use raw API for endpoints that do not yet have first-class CLI commands, or to
debug API behavior. Keep JSON bodies in files or stdin for multiline payloads.
