---
name: setup-simplekanban
description: Interactively configure SimpleKanban agent setup for a project or user environment. Use when the user wants guided setup for installing SimpleKanban skills to Codex or Claude Code, choosing project-local versus global scope, installing or verifying the `kan` CLI shim, logging in with API credentials, and setting default workspace or team context.
---

# Setup SimpleKanban

Guide the user through one-time SimpleKanban setup. Ask only for choices that
cannot be discovered safely, then run the corresponding commands.

## Workflow

1. Inspect the current environment:
   ```sh
   pwd
   command -v kan || true
   kan auth status --json
   ```
   If `kan` is missing, check whether the current repository has
   `scripts/install-kan-shim.sh`.

2. Ask for missing setup choices:
   - Scope: current project or user global.
   - Agent targets: Codex, Claude Code, or both.
   - CLI: install or refresh `kan` shim now, or skip.
   - Auth: use existing auth, run login now, or skip.

3. Install skills with `skills.sh` when requested:
   ```sh
   npx skills@latest add RikuKomiya/simplekanban --skill setup-simplekanban simplekanban-cli --agent codex --yes
   npx skills@latest add RikuKomiya/simplekanban --skill setup-simplekanban simplekanban-cli --agent claude-code --yes
   ```
   Add `--global` only for user-global installs.

4. Install or refresh the CLI shim when requested and a SimpleKanban checkout is
   available:
   ```sh
   bun run install:kan
   ```
   If no checkout is available, tell the user to clone first:
   ```sh
   git clone https://github.com/RikuKomiya/simplekanban.git
   cd simplekanban
   bun install --frozen-lockfile
   bun run install:kan
   ```

5. Authenticate only when needed. Do not ask the user to reveal the API key in
   chat if they can run the command locally:
   ```sh
   kan auth login --url <URL> --key <API_KEY>
   kan auth status --json
   ```
   Credentials persist in `~/.config/kan/config.json`; `KAN_API_URL` and
   `KAN_API_KEY` override that file.

6. Verify final setup:
   ```sh
   kan auth status --json
   npx skills@latest list --json
   ```
   For project-local installs, also check:
   ```sh
   test -f .agents/skills/simplekanban-cli/SKILL.md || true
   test -f .claude/skills/simplekanban-cli/SKILL.md || true
   test -f skills-lock.json || true
   ```

## Agent Target Mapping

- Codex project-local: `./.agents/skills/simplekanban-cli`.
- Claude Code project-local: `./.claude/skills/simplekanban-cli`.
- User-global installs are managed by `skills.sh` for the selected agent.

## Completion Message

Finish with:

- Which scope was configured.
- Which agents were configured.
- Whether `kan` is installed and authenticated.
- The exact next command to test, usually:
  ```sh
  kan issue list --team <TEAM> --json
  ```
