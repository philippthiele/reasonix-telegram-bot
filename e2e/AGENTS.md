# Browser-driven e2e checks — agent runbook

How an AI agent runs the end-to-end checks against the real bot through Telegram
Web with Playwright MCP. This is the runbook; a tool-specific subagent (the
`manual-tester` agent) loads it. The one-time human setup is in
[`README.md`](./README.md) — read that if the stand does not exist yet.

You drive the real test bot and judge behaviour only. A feature scenario is
passed to you as behaviour: no diff, no implementation detail. You write your
own cases. The production bot and the production `.env` are never involved —
`e2e/.env` points at a separate test bot.

## Prerequisites

- **The test stand is running.** If not, start it from the repo root with
  `./e2e/run-test-bot.sh` (Linux/macOS) or `.\e2e\run-test-bot.ps1` (Windows),
  without `--skip-build` / `-SkipBuild` unless the caller says `dist/` is
  current. Wait until the launcher prints that the bot started; it refuses to
  start on a build error.
- **`reasonix` is on `PATH`** (or named by `REASONIX_SERVE_BINARY` in
  `e2e/.env`). The stand starts its own `reasonix serve`; without the binary it
  cannot. The launcher warns up front.
- **Only one process may hold the browser profile** `.tmp/e2e/browser-profile`.
  If a browser is already open on it, a second one fails with a profile-lock
  error.
- **Runtime state lives in `.tmp/e2e/home/`** (`logs/`, `settings.json`, and
  `run/reasonix-instances.json`). The real `.env`, `logs/` and settings are
  untouched.

### Starting the stand detached

The shell tool some agents run in reaps background children when the call times
out. Start the stand fully detached so it survives:

```bash
setsid bash -c './e2e/run-test-bot.sh --skip-build' > /tmp/opencode/e2e-stand.log 2>&1 < /dev/null & disown
```

Then confirm it is up before driving the browser. `--skip-build` is only safe
when `dist/` is already current.

## Browser workflow

1. Open `https://web.telegram.org/k/`. If Telegram shows the QR login, **stop
   and ask the human to scan it from their phone** — you cannot log in. The
   session survives restarts. Keep the web UI in English, because the probes
   match bot strings literally (`BOT_LOCALE=en`).
2. Open the chat with the test bot. Find it by `data-peer-id` or by the bot
   name from `e2e/.env`; do not hardcode a peer id unless it is confirmed.
3. Read [`probes.js`](./probes.js) before using it. The probes are **not**
   executed by Node — each is a self-contained arrow function to paste into the
   Playwright `browser_evaluate` tool. Replace every `/* ARG */` placeholder with
   a literal value first, because `browser_evaluate` takes no arguments.
4. **Never call `browser_snapshot` on a chat.** The accessibility tree of a
   message list is hundreds of nodes and floods the context. Poll `probeState`
   in the wait loop; read detail once it reports `finished` with `readChat`,
   `readPinned`, `readReplyKeyboard`, or `listInlineButtons`.
5. Act with the Playwright tools, never synthetic clicks — Telegram Web ignores
   `element.click()` for navigation. Send input with
   `browser_type({ target: ".input-message-input:not(.input-field-input-fake)", text: "...", submit: true })`.
   Expand the reply keyboard (`browser_click({ target: ".toggle-reply-markup.show" })`)
   before clicking any of its buttons; a collapsed button is rejected as "not
   visible".
6. Screenshots land in `e2e/output/`.

### Probe reference

| Probe | Use |
| --- | --- |
| `probeState` | The **only** thing to call in a wait loop. Cheap run state + last text + buttons |
| `readChat` | Detailed tail (text + HTML + buttons). Once per case, after `finished` |
| `readPinned` | The pinned state dashboard (project, model, tracking, context, cost) |
| `readReplyKeyboard` | The fixed bottom grid, read by position from the end |
| `listInlineButtons` | Inline buttons of the most recent message |
| `markTail` | Record the tail before a case for before/after isolation |
| `sendPrompt` | Fallback sender; prefer `browser_type` |
| `discoverSelectors` | Run after a Telegram Web update when probes stop matching |

`probeState.status` values: `finished`, `working`, `retrying`,
`waiting_permission`, `waiting_question`, `busy_guard`, `blocked_guard`, `idle`.

## Running a case

1. Run **every file in [`scenarios/`](./scenarios/) first** (currently
   `smoke.md`), before any feature case. The build already contains the change
   under test, so a failure there is a regression in the basic loop — stop and
   report rather than judging the feature.
2. Record the tail with `markTail` and the current log offset before sending a
   prompt. Logs are `.tmp/e2e/home/logs/bot-*.log` (the newest file is the
   current launch); capture the byte offset and later read `tail -c +<offset+1>`.
3. Send the input, then poll `probeState` until it leaves
   `working`/`retrying`/`idle`. Honour `waiting_permission` and
   `waiting_question` by answering through the inline buttons the probe reports.
4. On `finished`, read results with `readChat` / `readPinned` and scan the log
   delta for `[ERROR]` lines.
5. **Assert structure, not wording.** The model may wrap a literal answer in
   punctuation or a greeting. Assert on probe fields, log lines, and rendered
   HTML rather than exact prose.

## Reporting

- State pass/fail per criterion with evidence: probe output, the relevant log
  lines, and a screenshot path when useful.
- End every session by running `./e2e/stop-test-bot.sh` (Linux/macOS) or
  `.\e2e\stop-test-bot.ps1` (Windows), even when a case failed. It only stops
  what the stand started (instances from `run/reasonix-instances.json`, bot pids
  named in `logs/`, and the fault/forward proxy from their pid files).

## Adding scenarios

Regression scenarios live in [`scenarios/`](./scenarios/) as Markdown, one file
per flow, next to `smoke.md`. Add long-lived regression flows there; pass
task-specific feature scenarios to the agent as behaviour instead.