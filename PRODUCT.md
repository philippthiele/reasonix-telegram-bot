# Reasonix Telegram Bot

Telegram bot client for Reasonix that lets you run and monitor coding tasks on your local machine from Telegram.

> Project concept and boundaries are documented in [`CONCEPT.md`](./CONCEPT.md).
> Proposed changes that alter the core interaction model should be discussed before implementation.

## Concept

The app works as a bridge between Telegram and locally running `reasonix serve` instances:

- You send prompts from Telegram
- The bot forwards them to Reasonix
- The app listens to Reasonix SSE events
- Results are aggregated and sent back in Telegram-friendly format

No public inbound ports are required for normal usage.

## Target Usage Scenario

1. The user works on a project locally with Reasonix (Desktop/TUI).
2. They finish the local session and leave the computer.
3. Later, while away, they run this bridge service and connect via Telegram.
4. They choose an existing session or create a new one.
5. They send coding tasks and receive periodic progress updates.
6. They receive completed assistant responses in chat and continue the workflow asynchronously.

## Functional Requirements

### Reasonix instance management

- The bot starts one `reasonix serve` per configured project root itself; there is no external server address, no API version selection, and no server password
- Roots come from `REASONIX_ROOTS`; when unset the bot serves its own working directory
- Each root gets a stable port in `47610`-`47809` and its own generated token; both are persisted, so a bot restart reconnects to the same instances instead of leaking processes
- Check Reasonix instance status (running / not running) per root
- Start the Reasonix instance for the active root from the app (`/reasonix_start`)
- Stop the Reasonix instance for the active root from the app (`/reasonix_stop`); it works during an active request and kills the local process even when health is hung
- No monitor or auto-restart loop: instances are started on demand and live until stopped

### Project management

- Fetch available projects from the Reasonix API (name + path)
- Select and switch projects
- Persist selected project between restarts (`settings.json`)

### Session management

- Fetch last N sessions (name + date)
- Select an existing session, show the last user input as a quote and the last assistant reply in full, then follow its live updates
- Browse up to `SESSIONS_LIST_LIMIT` recent root sessions across projects and git worktrees with running, idle, question and permission status (a question or permission request a subagent is waiting on counts for its root session); select one to switch project and follow it, including after detach
- Switching to an existing session adopts the agent, model, and variant it last ran with
- Create a new session
- Use the Reasonix-generated session title (based on conversation); a session Reasonix has not named yet is shown as "new session" wherever the bot names a session, and `/status` and `/detach` name the current session with the title Reasonix has for it at that moment

### Task handling

- Send text prompts to Reasonix
- Accept voice/audio messages, transcribe via Whisper-compatible STT API, and forward recognized text as prompts
- Interrupt current task (ESC equivalent)
- Optionally accept text, transcribed voice, photos, rich formatted messages with photos, supported documents, and media groups sent while a task is running, at most `MAX_QUEUED_PROMPTS` (5) waiting at a time: they wait in the session inbox and are steered into the running turn (Steer, the default) or start their own run after it (Queue); at most 20 MiB of raw Telegram media bytes are checked from reliable `file_size` before downloads; `/detach` leaves waiting messages to the detached session, where they are sent as if the bot had stayed attached, with the agent and model selected at `/detach`
- The waiting-message buttons follow the session inbox across an event-stream reconnect: a message picked up or withdrawn while the stream was down loses its button once it is back, without a quote; one still waiting keeps its button and its later pickup is quoted as usual
- Handle Reasonix questions with inline options and custom text answers; the custom answer button is offered only when the question accepts a custom answer
- Questions asked by a subagent of the followed session appear in the chat like the main agent's and are answered to that subagent
- A question answered or cancelled outside Telegram (Reasonix TUI, web, another client) closes the poll on screen: its buttons go and a line says it was answered or cancelled outside Telegram
- The poll's Cancel button dismisses the whole question request in Reasonix (`question.reject`), for the main agent and for a subagent alike: once Reasonix takes it the poll turns into `❌ Poll cancelled`, answers already chosen are not sent, and the agent's turn ends without a reply or footer; a Cancel that does not reach Reasonix leaves the poll answerable with a line saying so
- In a multi-select question the custom text becomes one more tickable row next to the options, and Done sends it together with the ticked options
- Send selected/custom answers back to Reasonix (`question.reply`); a tapped choice is sent as the value Reasonix expects, while the buttons and the summary show its label
- The poll's last question stays on screen until Reasonix takes the answers, then gives way to the summary; answers that do not reach Reasonix, or that Reasonix rejects, leave the poll answerable with a warning line (a choice is tapped again, a custom answer typed again after a new Custom answer tap); answers to a question Reasonix already settled close the poll as answered or cancelled outside Telegram
- A poll whose question ended before the poll reached the chat (answered or cancelled outside Telegram, `/abort`, the run ending) is not shown; one already on its way when that happened loses its buttons as it lands and gets the line of how the question ended
- A poll on screen dropped by `/abort`, `/detach`, `/reasonix_stop`, `/new`, a session or project switch keeps its question text, loses its buttons and ends with `⏹ Not answered`
- Handle permission requests interactively (`allow once` / `always` / `reject`), from the main agent and from subagents of the followed session
- A permission prompt stays in the chat when it ends: its buttons go and a last line names the outcome — the decision tapped here, the decision made outside Telegram (or just that it was answered there, when Reasonix does not say how), or "not answered" when it was dropped by `/abort`, `/detach`, `/reasonix_stop`, a restart of the Reasonix instance or the end of the run
- An answer that does not reach Reasonix leaves the prompt answerable with a warning line; tapping again sends it again
- After the event stream reconnects to the same instance, prompts and polls on screen that Reasonix no longer has pending are closed as answered (or cancelled) outside Telegram; when the bot cannot tell whether the instance restarted, the same line is used
- A poll on screen when the instance goes away — `/reasonix_stop`, a restart outside the bot, a crash — keeps its question text, loses its buttons and ends with `⏹ Not answered`
- Starting the bot, attaching, `/sessions` and an event-stream reconnect show one prompt per distinct pending permission request (identical ones grouped) and one poll per pending question, however many of them run at once

### Result delivery

- Send each completed assistant response after completion signal from SSE
- When the assistant footer is on, every answered turn of the followed session ends with its own footer — including a turn Reasonix starts by itself after a background command or subagent ends, and a prompt typed in an attached Reasonix TUI or Desktop — with that turn's agent and model and the time from its own start; a turn that is aborted, errors, or is stopped from an attached client gets none
- Reasonix resumes a run interrupted by an instance restart (`/reasonix_stop` then `/reasonix_start`, a restart outside the bot, a crash); the chat ends the interrupted turn as after `/abort` — its tool lines, cards and compact progress end, no footer — and shows the resumed run as a turn Reasonix started by itself, with its own prompts, reply and footer, timed from when the bot saw it again
- In draft streaming mode, assistant text written before a question or permission prompt is sent as a message above that prompt when it appears, and is not sent again when the reply completes
- If that send fails, the reply is not sent again; when Telegram accepts sends again, the chat gets a notice that the last assistant reply was not delivered
- In edit streaming mode the chat reads in the order things happened: a reply the agent wrote before its next tool call, thinking, subagent, document, question or permission prompt sits above it, and the next tool opens a new message (in compact mode, a new progress message) below the reply
- After a mid-session Telegram outage, the next new message is answered without restarting the app
- Compact output mode shows thinking and writing on one progress message per stretch of work between replies and prompts, from the start of that stretch; the message is removed or marked finished when the reply or prompt lands, or when the run ends if nothing followed. A message whose stretch started a background operation stays working on that operation with its timer past the reply, prompt or end of the run, and is removed or marked finished with its own counts when its last background operation ends
- In full mode, show every foreground tool operation when it starts, without a timer until 20 seconds; edit its line in place as it runs and finishes, keeping parallel operations in start order. A finished call lasting at least 20 seconds shows its total duration. Subagent (`task`) operations use their cards instead of tool lines; a tool delivered as a document loses its running text line when the document arrives. A file-changing tool (`edit`, `write`, `apply_patch`) names each file it changed on its own line with `(+N -M)`, never the patch text; with diff-file attachments on, each file arrives as its own document captioned with its line, and a file whose diff is over the size limit keeps its text line. A background command or subagent keeps its running line or card, with its timer, after the turn ends and gets its finished line or `✅ Completed` with the total duration when the operation itself ends; after `/abort`, a session switch or a lost event stream it stays as it was. A foreground line whose call ended while the event stream was down also stays as it was; the bot never shows a tool it did not see start
- Show elapsed time for tool calls running longer than 20 seconds, updated on a timer so it keeps counting while a tool blocks without producing output; covers subagent cards and compact mode, and the total duration stays on the finished tool line. In compact mode, while several tools of one step are in flight, the progress line shows the still-running one (the most recently started if several), with that tool's timer — not a finished sibling. A finished subagent card keeps the time its whole run took. Durations use the same `· 🕒 1h 2m 3s` format as the assistant run footer
- A subagent card shows Task, Agent, and Model; when Reasonix sends a variant, the Model line is `provider/id (variant)`
- Render assistant replies with native Telegram formatting: real tables with the column alignment declared in markdown, bullet lists with their nesting, block quotes that keep their nested content, headings, and syntax-highlighted code. Numbered lists and checklists keep literal markers (`1.`, ✅/🔲), because Telegram clients number a native ordered list from zero and do not draw the native checkbox at all
- Deliver reasoning as a collapsed quote that expands on tap
- Hide full model reasoning by default; optionally stream it in the thinking message when explicitly enabled
- Stream intermediate assistant/tool/thinking edits and pinned file-change updates once per second for the first minute, then slow down to 2s / 5s / 10s so long runs stay under Telegram rate limits; the interval resets when the run stops
- Split long responses into multiple Telegram messages, which is now rare: native messages hold 32768 characters instead of 4096
- Send code updates as files (size-limited)

### Session status in chat

- Keep a pinned status message in the chat; it can be turned off in `/settings` (default on)
- Show session title, project, model, context usage, and changed files; when a variant is set, the model line is `provider/id (variant)`
- Auto-update status from SSE and tool events
- Preserve pinned message ID across bot restarts

### Security

- Whitelist by Telegram user ID (single-user mode)
- Ignore messages from non-authorized users
- Ignore updates queued while the bot was offline or unreachable, so they are not executed on startup
- Mid-session, messages older than 60 seconds after an outage are still not executed; the chat gets one notice that messages were skipped while Telegram was unreachable
- If Telegram is unreachable at startup (network error, 5xx, 429), keep retrying with a growing delay capped at 60 seconds until it answers, then start polling; a rejected or invalid token (401/404) or any other fatal startup error logs the cause and exits the process with code 1 so a supervisor can restart it

### Configuration

- Telegram bot token
- Allowed Telegram user ID
- Default model provider and model ID
- Project roots to serve (`REASONIX_ROOTS`, comma-separated absolute paths; the bot's working directory when unset)
- Path to the `reasonix` binary to spawn (`REASONIX_SERVE_BINARY`, default `reasonix`)
- Selected project persisted in `settings.json`
- Configurable sessions list size (default: 10)
- Configurable commands list size (default: 10)
- Configurable scheduled task limit (default: 10)
- Configurable bot locale
- Configurable visibility for thinking content and diff-file attachments
- Configurable compact output, assistant footer, pinned session dashboard, message queue, and TTS modes (`/settings`)
- Configurable opt-in display of full thinking/reasoning content
- Configurable max code file size in KB (default: 100)
- Optional STT settings for voice transcription (`STT_API_URL`, `STT_API_KEY`, `STT_MODEL`, `STT_LANGUAGE`)
- Optional TTS settings for global audio replies (`TTS_PROVIDER`, `TTS_API_URL`, `TTS_API_KEY`, `TTS_MODEL`, `TTS_VOICE`); supported providers: OpenAI-compatible, ElevenLabs, Google Cloud TTS, and Microsoft Edge TTS (no API key required)
- Optional IPv4-only mode for Telegram connectivity (`TELEGRAM_FORCE_IPV4`)

## Current Product Scope

### Bot commands

Current command set:

- `/status` - bot version, server, project, and session status
- `/new` - create a new session
- `/abort` - stop the current task
- `/detach` - detach the bot from the current session without stopping it; messages waiting for its running task stay with it and reach it as if the bot had stayed attached (no buttons, withdrawn only by `/abort` there or `/reasonix_stop`); a later command or prompt HTTP failure for that session is not posted to chat unless the bot has re-attached to it
- `/sessions` - show and switch recent sessions
- `/recent` - show recent sessions across projects and worktrees with their status and switch directly to one
- `/messages` - browse user messages in the current session
- `/projects` - show and switch projects
- `/worktree` - show and switch existing git worktrees for the current repository
- `/settings` - change bot settings
- `/task` - create a scheduled task
- `/tasklist` - browse and delete scheduled tasks
- `/commands` - browse and run custom commands (plus built-ins like `init` and `review`)
- `/skills` - browse and run Reasonix skills
- `/reasonix_start` - start the Reasonix instance for the active project root
- `/reasonix_stop` - stop the Reasonix instance for the active project root; available during an active request and kills the local process even if health is hung
- `/reload` - reload the Reasonix configuration (config, plugins, providers and models, agents, commands, skills, MCP) for every loaded project without restarting the instance; available during an active request, blocked while an interaction is on screen; the model menu reflects the reloaded providers at once
- `/help` - show command help
- `/ls` - interactive file browser for the current project directory; a text file can be attached to the next prompt from its detail view

Model, agent, variant, and context actions are available from the persistent bottom keyboard. The context button opens window usage and the latest assistant message's token breakdown and cost when a session is idle; its inline controls close the details or open a separate compaction confirmation.

Sessions, projects and worktrees whose folder Reasonix reports as no longer existing are left out of `/recent`, `/sessions`, `/projects` and `/worktree`. A current project in such a folder stays selected and named in `/status` and the pinned message; a prompt, `/new` or `/task` there answers that the folder is gone and points to `/projects` (or to `/worktree` for a worktree whose main repository still exists, where `/worktree` then lists that repository's worktrees) instead of reaching Reasonix. A scheduled task in such a folder fails each run with that reason and stays in the list.

Text messages (non-commands) are treated as prompts for Reasonix only when no blocking interaction is active. Voice/audio messages are transcribed and then sent as prompts when STT is configured. When TTS mode in `/settings` is set to `all`, completed assistant replies include a generated audio file if TTS is configured. When it is set to `auto`, audio replies are sent only after voice/audio prompts.

Interaction routing rules:

- Only one interactive flow can be active at a time (inline menu, permission, question, commands, skills, messages)
- Agent questions and permission requests are shown one after another: one arriving while another holds the slot waits, and waiting requests appear in the order they arrived; a new question from the session whose poll is on screen replaces it, one from another session (a parallel subagent) waits; `/abort`, `/detach` and `/reasonix_stop` drop everything waiting
- While an interaction is active, unrelated input is blocked with a contextual hint
- Allowed utility commands during active interactions: `/help`, `/status`, `/abort`, `/detach`, `/reasonix_stop`
- Unknown slash commands return an explicit fallback message
- Interaction flows do not expire automatically and wait for explicit completion (`answer`, `cancel`, `/abort`, `/detach`, reset/cleanup)

Model picker behavior:

- Reasonix keeps no favorites or recent-model state, so the picker has no persisted
  favorite/recent list: its favorites section holds just the currently selected model
  (the one the user picked, or the default configured model
  `REASONIX_MODEL_PROVIDER` + `REASONIX_MODEL_ID` when Reasonix offers it), and its recent
  list is always empty; the full catalog is reached through the providers list and search
- Only models Reasonix currently offers appear in favorites, provider lists and search;
  a provider with no models left is not listed. The bot hides the entry and leaves its own
  selection untouched, so a model shows up again once Reasonix offers it again
- A tap on a model Reasonix no longer offers selects nothing and silently redraws the screen from
  the current list
- A selected model Reasonix no longer offers falls back to the configured model at the next
  instance start or `/reload` (in the first minute after a start it is kept until the minute ends); switching
  to a session or picking an agent whose model is no longer offered selects the configured model
  instead. When the configured model is not offered either, the selection stays as it is
- Models can be browsed by provider: the picker offers a providers list and a paginated model
  list per provider, with a back button on each screen (page size: `MODELS_LIST_LIMIT`)
- Picking a model opens the variant picker right after the confirmation when the model offers
  more than one selectable variant; a model with only `Default` ends at the confirmation
- Picking a model also switches Reasonix itself, so the running agent uses the model shown in
  the dashboard: the bot sends Reasonix's own `/model <provider>/<model>` command to the
  current session, and sessions the server creates afterwards inherit it. A chat without a
  session yet has nothing to switch

Agent picker behavior:

- Picking an agent applies that agent's configured model and/or variant when the agent names
  them; a field the agent does not name is left as it is. This is not a model pick and does
  not open the variant menu

### Main features already implemented

- [x] Single-user access control by allowed Telegram user ID
- [x] Reasonix instance control from Telegram (`/status`, `/reasonix_start`, `/reasonix_stop`)
- [x] One `reasonix serve` per project root on a stable port with its own token; ports and tokens persist across bot restarts; pending questions and permissions come back after the event stream reconnects
- [x] Reasonix instances set up and started out of the box: the setup wizard asks for the roots and the default model, and `/reasonix_start` and `/reasonix_stop` manage the active root's instance
- [x] Project and session management from Telegram (`/projects`, `/worktree`, `/sessions`, `/new`)
- [x] Cross-project recent sessions with status and direct attachment (`/recent`)
- [x] Sessions, projects and worktrees from folders that no longer exist hidden from the lists, with a notice instead of a failed send there
- [x] Automatic tracking of the current Reasonix CLI session, including continuing it from Telegram, live updates, and external text input notifications
- [x] Remote task execution, interruption, and local detachment support (`/abort`, `/detach`)
- [x] Background notifications for detached/non-current sessions in the currently selected project/worktree
- [x] Telegram-friendly result delivery, including sending generated code/files when needed
- [x] Interactive question and permission handling directly in chat (buttons + custom answers)
- [x] Live pinned session status in chat (project, model with variant in parentheses when set, context usage, changed files), with an opt-out in `/settings` that defaults to on
- [x] In-chat controls for model, agent, variant, and context
- [x] Built-in and custom command catalog access (`/commands`)
- [x] Trusted local JSON commands from the persistent application home, executed without Reasonix or model tokens
- [x] Skills catalog access (`/skills`)
- [x] Scheduled task creation flow (`/task`), remembering the agent selected at creation and showing it (alongside the model) in the task confirmation and task details
- [x] Scheduled task runtime execution with deferred Telegram delivery
- [x] Scheduled task list and deletion flow (`/tasklist`)
- [x] Persistent settings between restarts (`settings.json`)
- [x] UI localization support via i18n files
- [x] Service message visibility controls (thinking content and diff-file attachments)
- [x] Sending code blocks as text files when needed
- [x] Image attachments support (send photos/screenshots from Telegram to Reasonix, including multiple files in one Telegram album)
- [x] PDF attachments support (send documents from Telegram to Reasonix)
- [x] Text file attachments support (send code/config/log files from Telegram to Reasonix)
- [x] Voice/audio transcription via Whisper-compatible APIs (OpenAI/Groq/Together and compatible providers)
- [x] Optional audio replies with `/settings` modes via OpenAI-compatible APIs
- [x] Dynamic subagent activity display during task execution
- [x] Git worktree switching and main-project status display for git repositories (`/worktree`)
- [x] Create new Reasonix projects directly from Telegram
- [x] Interactive project file browsing and file download from Telegram (`/ls`)
- [x] Attaching a project file from `/ls` to the next prompt as a native Reasonix file part
- [x] `/messages` command: browse session messages with revert and fork functionality
- [x] Optional message queue for text, voice, photos, rich formatted messages with photos, documents, and media groups sent while the agent is busy, managed from the bottom keyboard
- [x] Messages sent mid-run are steered into the running turn or queued in the session inbox (Off / Queue / Steer in `/settings`), withdrawable until picked up or until `/detach` leaves them to the session
- [x] Native Telegram rich message formatting for assistant replies (Bot API 10.1)
- [x] Incoming Telegram rich formatted messages (Bot API 10.1): converted to Markdown, accepted anywhere text is accepted, with photos attached and unsupported message types answered explicitly
- [x] Startup either reaches Telegram polling or the process exits: transient Telegram failures are retried in-process; a bad token or other fatal startup error exits with code 1
- [x] After a Telegram outage the bot answers again without restart; an undelivered assistant reply is not resent, and skipped stale messages are reported once

## Current Task List

Open tasks for upcoming iterations:

- [ ] Model search in model switcher
- [x] Docker runtime support and deployment guide
- [x] Add a bot settings command with in-chat UI
