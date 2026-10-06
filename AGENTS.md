# AGENTS.md

Instructions for AI agents working on this project.

## About the project

**reasonix-telegram-bot** is a Telegram bot that acts as a mobile client for Reasonix.
It lets a user run and monitor coding tasks on a local machine through Telegram.

Functional requirements, features, and development status are in [PRODUCT.md](./PRODUCT.md).

## Technology stack

- **Language:** TypeScript 5.x
- **Runtime:** Node.js 22.14+
- **Package manager:** npm
- **Configuration:** environment variables (`.env`)
- **Logging:** custom logger with levels (`debug`, `info`, `warn`, `error`)

### Core dependencies

- `grammy` - Telegram Bot API framework (https://grammy.dev/)
- `@grammyjs/menu` - inline keyboards and menus
- `@opencode-ai/sdk` - Reasonix server SDK, used for payload types; all requests go through `src/reasonix/http.ts`
- `dotenv` - environment variable loading

### Test dependencies

- Vitest
- Mocks/stubs via `vi.mock()`

### Code quality

- ESLint + Prettier
- TypeScript strict mode

## Architecture

### Main components

1. **Bot Layer** - grammY setup, middleware, commands, callback handlers
2. **Reasonix Client Layer** - HTTP/SSE client, event subscription, and event translation
3. **State Managers** - session/project/settings/question/permission/model/agent/variant/keyboard/pinned
4. **Summary Pipeline** - event aggregation and Telegram-friendly formatting
5. **Instance Manager** - one `reasonix serve` per project root (stable port, own token)
6. **Runtime/CLI Layer** - runtime mode, config bootstrap, CLI commands
7. **I18n Layer** - localized bot and CLI strings to multiple languages

### Data flow

```text
Telegram User
  -> Telegram Bot (grammY)
  -> Managers + reasonixClient
  -> reasonix serve (per root)

reasonix serve
  -> SSE Events
  -> Event Listener
  -> Summary Aggregator / Tool Managers
  -> Telegram Bot
  -> Telegram User
```

### State management

- Persistent state is stored in `settings.json`.
- Active runtime state is kept in dedicated in-memory managers.
- Session/project/model/agent context is synchronized through Reasonix API calls.
- The app is currently single-user by design.

## AI agent behavior rules

### Communication

- **Response language:** Reply in the same language the user uses in their questions.
- **Clarifications:** If plan confirmation is needed, use the `question` tool. Do not make major decisions (architecture changes, mass deletion, risky changes) without explicit confirmation.

### Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

### Git

- **Commits:** Never create commits automatically. Commit only when the user explicitly asks.

### Working on Windows

If your shell runs on Windows:

- Avoid fragile one-liners that can break in PowerShell.
- Use absolute paths when working with file tools (`read`, `write`, `edit`).

## Coding rules

### Language

- Code, identifiers, comments, and in-code documentation must be in English.
- User-facing Telegram messages should be localized through i18n.

### Code style

- Use TypeScript strict mode.
- Use ESLint + Prettier.
- Prefer `const` over `let`.
- Use clear names and avoid unnecessary abbreviations.
- Keep functions small and focused.
- Prefer `async/await` over chained `.then()`.

### Error handling

- Use `try/catch` around async operations.
- Log errors with context (session ID, operation type, etc.).
- Send understandable error messages to users.
- Never expose stack traces to users.

### Cross-platform

- The bot runs on Linux, macOS, and Windows; CI runs tests on Linux.
- Code must work on all three regardless of the OS you develop on: passing checks locally does not prove it works elsewhere.
- Code that touches paths, processes, shells, or the filesystem must work on all three: no hardcoded `\` or `/` separators, no assumptions about line endings or path case.
- Windows-only logic runs behind a `process.platform` check. A test for it either passes on every OS or is skipped outside Windows.

### Bot commands

The command list is centralized in `src/bot/commands/definitions.ts`.

```typescript
const COMMAND_DEFINITIONS: BotCommandI18nDefinition[] = [
  { command: "status", descriptionKey: "cmd.description.status" },
  { command: "new", descriptionKey: "cmd.description.new" },
  { command: "abort", descriptionKey: "cmd.description.stop" },
  { command: "detach", descriptionKey: "cmd.description.detach" },
  { command: "sessions", descriptionKey: "cmd.description.sessions" },
  { command: "recent", descriptionKey: "cmd.description.recent" },
  { command: "messages", descriptionKey: "cmd.description.messages" },
  { command: "settings", descriptionKey: "cmd.description.settings" },
  { command: "projects", descriptionKey: "cmd.description.projects" },
  { command: "worktree", descriptionKey: "cmd.description.worktree" },
  { command: "task", descriptionKey: "cmd.description.task" },
  { command: "tasklist", descriptionKey: "cmd.description.tasklist" },
  { command: "commands", descriptionKey: "cmd.description.commands" },
  { command: "skills", descriptionKey: "cmd.description.skills" },
  { command: "reasonix_start", descriptionKey: "cmd.description.reasonix_start" },
  { command: "reasonix_stop", descriptionKey: "cmd.description.reasonix_stop" },
  { command: "reload", descriptionKey: "cmd.description.reload" },
  { command: "open", descriptionKey: "cmd.description.open" },
  { command: "ls", descriptionKey: "cmd.description.ls" },
  { command: "help", descriptionKey: "cmd.description.help" },
];
```

Important:

- When adding a command, update `definitions.ts` only.
- The same source is used for Telegram `setMyCommands` and help/docs.
- Do not duplicate command lists elsewhere.

### Logging

The project uses `src/utils/logger.ts` with level-based logging.

Log files:

- In source mode logs are stored `<project root>/logs` by default.
- Each source-mode bot run writes to a separate file named `bot-YYYY-MM-DD_HH-MM-SS_<pid>.log`.
- The `logs/` directory is gitignored, so search inside it directly: use `path: "logs"` with `pattern: "*.log"`.
- Installed mode writes under the installed app home `logs` directory and uses daily files named `bot-YYYY-MM-DD.log`.

Levels:

- **DEBUG** - detailed diagnostics (callbacks, keyboard build, SSE internals, polling flow)
- **INFO** - key lifecycle events (session/task start/finish, status changes)
- **WARN** - recoverable issues (timeouts, retries, unauthorized attempts)
- **ERROR** - critical failures requiring attention

Use:

```typescript
import { logger } from "../utils/logger.js";

logger.debug("[Component] Detailed operation", details);
logger.info("[Component] Important event occurred");
logger.warn("[Component] Recoverable problem", error);
logger.error("[Component] Critical failure", error);
```

Important:

- Do not use raw `console.log` / `console.error` directly in feature code; use `logger`.
- Put internal diagnostics under `debug`.
- Keep important operational events under `info`.
- Default level is `info`.

## Testing

### What to test

- Unit tests for business logic, formatters, managers, runtime helpers
- Integration-style tests around Reasonix HTTP/SSE interaction using mocks
- Focus on critical paths; avoid over-testing trivial code

### Test structure

- Tests live in `tests/` (organized by module)
- Use descriptive test names
- Follow Arrange-Act-Assert
- Use `vi.mock()` for external dependencies

### End-to-end (browser) checks

Beyond vitest, the bot is checked end-to-end by driving the real test bot
through Telegram Web with Playwright MCP. The agent runbook is
[`e2e/AGENTS.md`](./e2e/AGENTS.md); one-time human setup is in
[`e2e/README.md`](./e2e/README.md). Run `e2e/scenarios/` first, then the
feature scenario, and always stop the stand when done.

## Reasonix client quick reference

There is no SDK client instance. `src/reasonix/instance.ts` starts one `reasonix serve` per project root on a stable port in `47610`-`47809` with its own token, and `src/reasonix/http.ts` performs the authenticated requests and the SSE subscription.

```typescript
import { getInstance, configuredRoots } from "./reasonix/instance.js";
import { request, streamEvents } from "./reasonix/http.js";

// Every call resolves the instance for its project root first.
const instance = await getInstance(root);
const { data, error } = await request<SessionListData>(
  instance.baseUrl,
  instance.token,
  "/session",
);

for await (const event of streamEvents(instance.baseUrl, instance.token)) {
  // raw Reasonix SSE event
}
```

Key modules:

- `src/reasonix/instance.ts` - per-root `serve` lifecycle, stable port allocation, token state
- `src/reasonix/http.ts` - authenticated HTTP requests, `request()` result type, SSE streaming
- `src/reasonix/mappers.ts` - Reasonix payloads to internal domain types
- `src/reasonix/events.ts` - Reasonix SSE event translation
- `src/reasonix/client.ts` - the facade used by the bot layer

## Workflow

1. Read [PRODUCT.md](./PRODUCT.md) to understand scope and status.
2. Inspect existing code before adding or changing components.
3. Align major architecture changes (including new dependencies) with the user first.
4. Add or update tests for new functionality.
5. After code changes, run quality checks: `npm run build`, `npm run lint`, `npm run typecheck`, and `npm test`.
6. Update checkboxes in `PRODUCT.md` when relevant tasks are completed.
7. Keep code clean, consistent, and maintainable.
