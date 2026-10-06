export const en = {
  "cmd.description.recent": "Recent sessions across projects",
  "recent.heading": "Recent sessions across projects (run /recent to refresh):",
  "recent.empty": "📭 No sessions found across projects.",
  "recent.running": "running",
  "recent.idle": "idle",
  "recent.question": "awaiting an answer",
  "recent.permission": "awaiting permission",
  "cmd.description.status": "Server and session status",
  "cmd.description.new": "Create a new session",
  "cmd.description.stop": "Stop current action",
  "cmd.description.detach": "Detach from current session",
  "cmd.description.sessions": "List sessions",
  "cmd.description.messages": "Browse session messages",
  "cmd.description.settings": "Change bot settings",
  "cmd.description.projects": "List projects",
  "cmd.description.worktree": "Switch git worktrees",
  "cmd.description.task": "Create a scheduled task",
  "cmd.description.tasklist": "List scheduled tasks",
  "cmd.description.commands": "Custom commands",
  "cmd.description.skills": "Skills catalog",
  "cmd.description.reasonix_start": "Start the Reasonix server",
  "cmd.description.reasonix_stop": "Stop the Reasonix servers",
  "cmd.description.reload": "Reload Reasonix configuration",
  "cmd.description.ls": "List directory contents",
  "cmd.description.help": "Help",

  "callback.unknown_command": "Unknown command",
  "callback.processing_error": "Processing error",

  "error.load_models": "❌ Failed to load models list",
  "error.load_variants": "❌ Failed to load variants list",
  "error.context_button": "❌ Failed to process context button",
  "error.generic": "🔴 Something went wrong.",

  "interaction.blocked.expired": "⚠️ This interaction has expired. Please start it again.",
  "interaction.blocked.expected_callback":
    "⚠️ Please use the inline buttons for this step or tap Cancel.",
  "interaction.blocked.expected_text": "⚠️ Please send a text message for this step.",
  "interaction.blocked.expected_command": "⚠️ Please send a command for this step.",
  "interaction.blocked.command_not_allowed":
    "⚠️ This command is not available in the current step.",
  "interaction.blocked.finish_current":
    "⚠️ Finish the current interaction first (answer or cancel), then open another menu.",

  "inline.blocked.expected_choice": "⚠️ Choose an option using the inline buttons or tap Cancel.",
  "inline.blocked.command_not_allowed":
    "⚠️ This command is not available while inline menu is active.",

  "question.blocked.expected_answer":
    "⚠️ Answer the current question using buttons, Custom answer, or Cancel.",
  "question.blocked.command_not_allowed":
    "⚠️ This command is not available until current question flow is completed.",

  "inline.button.cancel": "❌ Cancel",
  "inline.button.close": "❌ Close",
  "inline.inactive_callback": "This menu is inactive",

  "common.cancelled": "Cancelled",
  "common.unknown": "unknown",
  "common.unknown_error": "unknown error",

  "start.welcome":
    "👋 Welcome to Reasonix Telegram Bot!\n\nUse commands:\n/projects — select project\n/sessions — session list\n/new — new session\n/commands — custom commands\n/skills — skills catalog\n/task — scheduled task\n/tasklist — scheduled tasks\n/status — status\n/help — help\n\nUse the bottom buttons to select the agent, model, and variant.",
  "help.keyboard_hint":
    "💡 Use the bottom keyboard buttons for the agent, model, variant, and context actions.",

  "bot.thinking": "💭 Thinking...",
  "progress.compact.activity": "{header}\n{activity}",
  "progress.compact.working_header": "⏳ Working",
  "progress.compact.finished_header": "✅ Finished Work",
  "progress.compact.thinking": "💭 Thinking...",
  "progress.compact.responding": "✍️ Writing answer...",
  "progress.compact.waiting_permission": "🔐 Waiting for permission...",
  "progress.compact.retrying": "🔁 Retrying...",
  "progress.compact.task": "🤖 Running Task",
  "progress.compact.done": "{header}\ntool calls: {tools} · changed files: {files}",
  "bot.project_not_selected":
    "🏗 Project is not selected.\n\nFirst select a project with /projects.",
  "bot.creating_session": "🔄 Creating a new session...",
  "bot.create_session_error":
    "🔴 Failed to create session. Try /new or check server status with /status.",
  "bot.session_created": "✅ Session created: {title}",
  "bot.session_busy":
    "⏳ Agent is already running a task. Wait for completion or use /abort to interrupt current run.",
  "bot.session_reset_project_mismatch":
    "⚠️ Active session does not match the selected project, so it was reset. Use /sessions to pick one or /new to create a new session.",
  "bot.prompt_send_error": "Failed to send request to Reasonix.",
  "bot.project_folder_missing":
    "🚫 The project folder no longer exists: {path}. Choose another project in /projects.",
  "bot.project_folder_missing_worktree":
    "🚫 The project folder no longer exists: {path}. Choose another worktree in /worktree.",
  "bot.session_error": "🔴 Reasonix returned an error: {message}",
  "bot.assistant_reply_undelivered":
    "⚠️ The last assistant reply could not be delivered. Send your message again if you still need it.",
  "bot.stale_messages_skipped":
    "⚠️ Some messages were skipped while Telegram was unreachable. Please send them again.",
  "bot.session_retry":
    "🔁 {message}\n\nProvider keeps returning the same error on repeated retries. Use /abort to abort.",
  "bot.external_user_input": "External user input",
  "background.session_fallback": "session {id}",
  "background.assistant_response": "🔔 Assistant replied in background session: {session}",
  "background.question_asked": "❓ Background session needs an answer: {session}",
  "background.permission_asked": "🔐 Background session requested permissions: {session}",
  "background.open_session_button": "Open session",
  "bot.unknown_command": "⚠️ Unknown command: {command}. Use /help to see available commands.",
  "bot.photo_downloading": "⏳ Downloading photo...",
  "bot.photo_model_no_image": "⚠️ Current model doesn't support image input. Sending text only.",
  "bot.photo_download_error": "🔴 Failed to download photo",
  "bot.file_downloading": "⏳ Downloading file...",
  "bot.files_downloading": "⏳ Downloading files...",
  "bot.file_download_error": "🔴 Failed to download file",
  "bot.file_type_unsupported":
    "⚠️ This file type is not supported. Send an image, document (PDF, DOCX, PPTX), or text/code file.",
  "bot.rich_message_media_skipped": "⚠️ Skipped {count} unsupported media part(s).",
  "bot.message_type_unsupported": "⚠️ This message type is not supported.",
  "bot.media_group_not_processed":
    "⚠️ One or more files in this album cannot be processed. Nothing was sent to Reasonix.",
  "bot.media_group_download_error":
    "🔴 Failed to download one of the files. Nothing was sent to Reasonix.",
  "bot.model_no_pdf": "⚠️ Current model doesn't support PDF input. Sending text only.",
  "bot.document_extraction_error": "🔴 Failed to extract document text.",
  "bot.text_file_too_large": "⚠️ Text file is too large (max {maxSizeKb}KB)",

  "status.header_running": "🟢 Reasonix Server is running",
  "status.line.version": "Reasonix version: {version}",
  "status.line.bot_version": "Bot version: {version}",
  "status.line.mode": "Agent: {mode}",
  "status.line.model": "Model: {model}",
  "status.tts.off": "Off",
  "status.tts.all": "All",
  "status.tts.auto": "Auto",
  "status.agent_not_set": "not set",
  "status.project_selected": "Project: {project}",
  "status.worktree_selected": "Worktree: {worktree}",
  "status.project_not_selected": "Project: not selected",
  "status.project_hint": "Use /projects to select a project",
  "status.session_selected": "Current session: {title}",
  "status.session_not_selected": "Current session: not selected",
  "status.session_hint": "Use /sessions to select one or /new to create one",
  "status.header_unavailable": "🔴 Reasonix Server is unavailable",
  "status.unavailable_hint": "Use /reasonix_start to start the server.",

  "tts.off": "🔇 Audio replies disabled.",
  "tts.all": "🔊 Audio replies enabled for all messages.",
  "tts.auto": "🎤 Audio replies enabled for voice/audio messages only.",
  "tts.not_configured":
    "⚠️ Audio replies are unavailable. Set `TTS_API_URL` and `TTS_API_KEY` first.",
  "tts.failed": "⚠️ Failed to generate audio reply.",

  "settings.menu.title": "⚙️ Bot settings\nTap a setting to toggle its value:",
  "settings.compact_output.label": "Compact output mode",
  "settings.delete_progress_on_finish.label": "Delete progress on finish",
  "settings.thinking_content.label": "Thinking content",
  "settings.response_streaming.label": "Response streaming",
  "settings.response_streaming.edit": "edit",
  "settings.response_streaming.draft": "draft (experimental)",
  "settings.diff_files.label": "Diff files",
  "settings.assistant_footer.label": "Assistant footer",
  "settings.pin_session_dashboard.label": "Pin session dashboard",
  "settings.tts.label": "Audio replies",
  "settings.prompt_queue.label": "Message queue",
  "settings.value.on": "On",
  "settings.value.off": "Off",
  "settings.prompt_queue.queue": "Queue",
  "settings.saved": "✅ Setting saved.",

  "projects.empty":
    "📭 No projects found.\n\nOpen a directory in Reasonix and create at least one session, then it will appear here.",
  "projects.select": "Select a project:",
  "projects.select_with_current": "Select a project:\n\nCurrent: 🏗 {project}",
  "projects.page_indicator": "Page {current}/{total}",
  "projects.prev_page": "⬅️ Previous",
  "projects.next_page": "Next ➡️",
  "projects.fetch_error":
    "🔴 Reasonix Server is unavailable or an error occurred while loading projects.",
  "projects.page_load_error": "Cannot load this page. Please try again.",
  "projects.selected":
    "✅ Project selected: {project}\n\n📋 Session was reset. Use /sessions or /new for this project.",
  "projects.select_error": "🔴 Failed to select project.",

  "sessions.project_not_selected":
    "🏗 Project is not selected.\n\nFirst select a project with /projects.",
  "sessions.empty": "📭 No sessions found.\n\nCreate a new session with /new.",
  "sessions.select": "Select a session:",
  "sessions.select_page": "Select a session (page {page}):",
  "sessions.fetch_error":
    "🔴 Reasonix Server is unavailable or an error occurred while loading sessions.",
  "sessions.select_project_first": "🔴 Project is not selected. Use /projects.",
  "sessions.page_empty_callback": "No sessions on this page",
  "sessions.page_load_error_callback": "Cannot load this page. Please try again.",
  "sessions.button.prev_page": "⬅️ Prev",
  "sessions.button.next_page": "Next ➡️",
  "sessions.loading_context": "⏳ Loading context and latest messages...",
  "sessions.selected": "✅ Session selected: {title}",
  "sessions.select_error": "🔴 Failed to select session.",
  "sessions.preview.empty": "No recent messages.",
  "sessions.last_input.title": "Last user input:",
  "sessions.last_input.attachment": "attachment",

  "messages.project_not_selected":
    "🏗 Project is not selected.\n\nFirst select a project with /projects.",
  "messages.session_not_selected":
    "💬 Session is not selected.\n\nFirst choose a session with /sessions or create one with /new.",
  "messages.session_project_mismatch":
    "⚠️ The selected session does not match the current project. Choose the session again via /sessions.",
  "messages.empty": "📭 No user messages in the current session.",
  "messages.select": "Choose a message:",
  "messages.select_page": "Choose a message (page {page}):",
  "messages.fetch_error":
    "🔴 Reasonix Server is unavailable or an error occurred while loading messages.",
  "messages.inactive_callback": "This messages menu is inactive",
  "messages.page_empty_callback": "No messages on this page",
  "messages.button.prev_page": "⬅️ Prev",
  "messages.button.next_page": "Next ➡️",
  "messages.button.revert": "↩️ Revert",
  "messages.button.fork": "🔀 Fork",
  "messages.button.back": "⬅️ Back",
  "messages.button.cancel": "❌ Cancel",
  "messages.revert_success": "✅ Reverted to message:\n\n{text}",
  "messages.revert_error": "❌ Failed to revert message. Please try again.",
  "messages.fork_success": "🔀 Fork created from message:\n\n{text}",
  "messages.fork_error": "❌ Failed to create fork. Please try again.",

  "detach.project_not_selected":
    "🏗 Project is not selected.\n\nFirst select a project with /projects.",
  "detach.no_active_session": "ℹ️ Bot is already detached from any session.",
  "detach.success":
    "✅ Detached from session: {title}\n\nThe Reasonix session was not stopped. If it is still running, it will continue separately. To check it later, select it again via /sessions.",
  "detach.error": "🔴 Failed to detach from the current session.",

  "new.project_not_selected":
    "🏗 Project is not selected.\n\nFirst select a project with /projects.",
  "new.created": "✅ New session created: {title}",
  "new.create_error":
    "🔴 Reasonix Server is unavailable or an error occurred while creating session.",

  "stop.no_active_session":
    "🛑 Agent was not started\n\nCreate a session with /new or select one via /sessions.",
  "stop.in_progress":
    "🛑 Event stream stopped, sending abort signal...\n\nWaiting for agent to stop.",
  "stop.warn_unconfirmed":
    "⚠️ Event stream stopped, but server did not confirm abort.\n\nCheck /status and retry /abort in a few seconds.",
  "stop.warn_maybe_finished": "⚠️ Event stream stopped, but the agent may have already finished.",
  "stop.success": "✅ Agent action interrupted. No more messages from this run will be sent.",
  "stop.warn_still_busy":
    "⚠️ Signal sent, but agent is still busy.\n\nEvent stream is already disabled, so no intermediate messages will be sent.",
  "stop.warn_timeout":
    "⚠️ Abort request timeout.\n\nEvent stream is already disabled, retry /abort in a few seconds.",
  "stop.warn_local_only": "⚠️ Event stream stopped locally, but server-side abort failed.",
  "stop.error": "🔴 Failed to stop action.\n\nEvent stream is stopped, try /abort again.",

  "reasonix_start.already_running": "\u2705 Reasonix server is already running for this project",
  "reasonix_start.starting": "\U0001f504 Starting the Reasonix server for this project...",
  "reasonix_start.start_error":
    "\U0001f534 Failed to start the Reasonix server\n\nError: {error}\n\nCheck that the Reasonix CLI is installed and on PATH:\nreasonix --version",
  "reasonix_start.success":
    "\u2705 Reasonix server started\n\nProject: {root}\nPort: {port}\nVersion: {version}",
  "reasonix_start.error":
    "\U0001f534 An error occurred while starting the server.\n\nCheck application logs for details.",
  "reasonix_stop.not_running": "\u26a0\ufe0f No Reasonix server started by the bot is running.",
  "reasonix_stop.stopping": "\U0001f6d1 Stopping {count} Reasonix server(s)...",
  "reasonix_stop.success":
    "\u2705 Stopped {count} Reasonix server(s). They start again on next use.",
  "reasonix_stop.error":
    "\U0001f534 An error occurred while stopping the server.\n\nCheck application logs for details.",
  "reload.reloading": "🔄 Reloading Reasonix configuration...",
  "reload.success": "✅ Reasonix configuration reloaded",
  "reload.failed": "🔴 Failed to reload Reasonix configuration",
  "reload.failed_with_error": "🔴 Failed to reload Reasonix configuration\n\nError: {error}",

  "model.changed_message": "✅ Model changed to: {name}",
  "model.change_error_callback": "Failed to change model",
  "model.menu.select": "Select model:",
  "model.menu.favorites_title": "⭐ Favorites (Add models to favorites in Reasonix CLI)",
  "model.menu.favorites_empty": "— Empty.",
  "model.menu.recent_title": "🕘 Recent",
  "model.menu.recent_empty": "— Empty.",
  "model.menu.error": "🔴 Failed to get models list",
  "model.search.button": "🔍 Search",
  "model.search.prompt": "🔍 Enter model name to search:",
  "model.search.results_title": 'Search results for "{query}":',
  "model.search.no_results": 'No models found for "{query}"',
  "model.search.search_again": "↩ Search again",
  "model.search.error": "Search failed",
  "model.button.back": "⬅️ Back",
  "model.providers.button": "🗂 Providers",
  "model.providers.title": "Select provider from the list:",
  "model.providers.empty": "⚠️ No connected providers",
  "model.providers.error": "Failed to get providers list",
  "model.providers.page_indicator": "Page {current}/{total}",
  "model.providers.prev_page": "⬅️ Previous",
  "model.providers.next_page": "Next ➡️",
  "model.provider_models.title": "{provider} — select model:",
  "model.provider_models.empty": "⚠️ No models available for {provider}",
  "model.provider_models.page_indicator": "Page {current}/{total}",

  "variant.model_not_selected_callback": "Error: model is not selected",
  "variant.changed_message": "✅ Variant changed to: {name}",
  "variant.change_error_callback": "Failed to change variant",
  "variant.select_model_first": "⚠️ Select a model first",
  "variant.menu.empty": "⚠️ No available variants",
  "variant.menu.current": "Current variant: {name}\n\nSelect variant:",
  "variant.menu.error": "🔴 Failed to get variants list",

  "context.button.confirm": "✅ Yes, compact context",
  "context.button.details_compact": "📦 Compact context",
  "context.button.close": "❌ Close",
  "context.details.title": "📊 Context details",
  "context.details.window": "Window: {used} / {limit} ({percent}%)",
  "context.details.token_breakdown": "Token breakdown of the latest assistant message:",
  "context.details.input": "Input: {count}",
  "context.details.output": "Output: {count}",
  "context.details.reasoning": "Reasoning: {count}",
  "context.details.cache_read": "Cache read: {count}",
  "context.details.cache_write": "Cache write: {count}",
  "context.details.cost": "Cost: {cost}",
  "context.no_active_session": "⚠️ No active session. Create a session with /new",
  "context.confirm_text":
    '📊 Context compaction for session "{title}"\n\nThis will reduce context usage by removing old messages from history.\n\nContinue?',
  "context.callback_compacting": "Compacting context...",
  "context.progress": "⏳ Compacting context...",
  "context.error": "❌ Context compaction failed",
  "context.success": "✅ Context compacted successfully",

  "permission.inactive_callback": "Permission request is inactive",
  "permission.processing_error_callback": "Processing error",
  "permission.no_active_request_callback": "Error: no active request",
  "permission.reply.once": "Allowed once",
  "permission.reply.always": "Always allowed",
  "permission.reply.reject": "Rejected",
  "permission.blocked.expected_reply":
    "⚠️ Please answer the permission request first using the buttons above.",
  "permission.blocked.command_not_allowed":
    "⚠️ This command is not available until you answer the permission request.",
  "permission.header": "{emoji} Permission request: {name}\n\n",
  "permission.grouped_count":
    "\n⚠️ {count} identical requests pending — your answer applies to all of them.\n",
  "permission.button.allow": "✅ Allow once",
  "permission.button.always": "🔓 Allow always",
  "permission.button.reject": "❌ Reject",
  "permission.outcome.once": "✅ Allowed once",
  "permission.outcome.always": "🔓 Allowed always",
  "permission.outcome.reject": "❌ Rejected",
  "permission.outcome.outside_suffix": " · answered outside Telegram",
  "permission.outcome.settled_outside": "☑️ Answered outside Telegram",
  "permission.outcome.not_answered": "⏹ Not answered",
  "permission.delivery_failed": "⚠️ The answer did not reach Reasonix — tap again",
  "permission.name.bash": "Bash",
  "permission.name.edit": "Edit",
  "permission.name.write": "Write",
  "permission.name.read": "Read",
  "permission.name.webfetch": "Web Fetch",
  "permission.name.websearch": "Web Search",
  "permission.name.glob": "File Search",
  "permission.name.grep": "Content Search",
  "permission.name.list": "List Directory",
  "permission.name.task": "Task",
  "permission.name.lsp": "LSP",
  "permission.name.external_directory": "External Directory",

  "question.inactive_callback": "Poll is inactive",
  "question.processing_error_callback": "Processing error",
  "question.select_one_required_callback": "Select at least one option",
  "question.enter_custom_callback": "Send your custom answer as a message",
  "question.cancelled": "❌ Poll cancelled",
  "question.settled_outside.answered": "☑️ Answered outside Telegram",
  "question.settled_outside.cancelled": "❌ Cancelled outside Telegram",
  "question.not_answered": "⏹ Not answered",
  "question.answer_already_received": "Answer already received, please wait...",
  "question.completed_no_answers": "✅ Poll completed (no answers)",
  "question.multi_hint": "\n(You can select multiple options)",
  "question.button.submit": "✅ Done",
  "question.button.custom": "🔤 Custom answer",
  "question.button.cancel": "❌ Cancel",
  "question.use_custom_button_first":
    '⚠️ To send text, tap "Custom answer" for the current question first.',
  "question.summary.title": "✅ Poll completed!\n\n",
  "question.summary.question": "Question {index}:\n{question}\n\n",
  "question.summary.answer": "Answer:\n{answer}\n\n",

  "keyboard.context": "📊 {used} / {limit} ({percent}%)",
  "keyboard.context_empty": "📊 0",
  "keyboard.variant_default": "💡 Default",
  "keyboard.queued_prompt": "❌ {index}. {text}",
  "queue.added":
    "📥 Added to queue ({count}/{max}). It will be sent when the current task finishes.",
  "queue.full":
    "⚠️ Queue is full ({max}). Remove a message or wait for the current task to finish.",
  "queue.removed": "🗑 Message removed from the queue.",
  "queue.not_found": "This message is no longer in the queue.",
  "queue.disabled_hint": "The message queue can be enabled in /settings.",
  "keyboard.updated": "⌨️ Keyboard updated",

  "pinned.default_session_title": "new session",
  "pinned.unknown": "Unknown",
  "pinned.line.project": "Project: {project}",
  "pinned.line.worktree": "Worktree: {worktree}",
  "pinned.line.model": "Model: {model}",
  "pinned.line.context": "Context: {used} / {limit} ({percent}%)",
  "pinned.line.cost": "Cost: {cost} spent",
  "subagent.line.task": "Task: {task}",
  "subagent.line.agent": "Agent: {agent}",
  "subagent.working": "Working...",
  "subagent.completed": "Completed",
  "subagent.failed": "Task failed",
  "pinned.files.title": "Files ({count}):",
  "pinned.files.item": "  {path}{diff}",
  "pinned.files.more": "  ... and {count} more",

  "tool.todo.overflow": "*({count} more tasks)*",
  "tool.file_header.write":
    "Write File/Path: {path}\n============================================================\n\n",
  "tool.file_header.edit":
    "Edit File/Path: {path}\n============================================================\n\n",

  "runtime.wizard.ask_token": "Enter Telegram bot token (get it from @BotFather).\n> ",
  "runtime.wizard.ask_language":
    "Select interface language.\nEnter the language number from the list or locale code.\nPress Enter to keep default language: {defaultLocale}\n{options}\n> ",
  "runtime.wizard.language_invalid":
    "Enter a language number from the list or a supported locale code.\n",
  "runtime.wizard.language_selected": "Selected language: {language}\n",
  "runtime.wizard.token_required": "Token is required. Please try again.\n",
  "runtime.wizard.token_invalid":
    "Token looks invalid (expected format <id>:<secret>). Please try again.\n",
  "runtime.wizard.ask_user_id":
    "Enter your Telegram User ID (you can get it from @userinfobot).\n> ",
  "runtime.wizard.user_id_invalid": "Enter a positive integer (> 0).\n",
  "runtime.wizard.start": "Reasonix Telegram Bot setup.\n",
  "runtime.wizard.saved": "Configuration saved:\n- {envPath}\n",
  "runtime.wizard.not_configured_starting":
    "Application is not configured yet. Starting wizard...\n",
  "runtime.wizard.tty_required":
    "Interactive wizard requires a TTY terminal. Run `reasonix-telegram config` in an interactive shell.",
  "runtime.container.command_unavailable": "⚠️ This command is not available in the Docker image.",

  "rename.cancelled": "❌ Rename cancelled.",

  "task.prompt.schedule":
    "⏰ Send the task schedule in natural language.\n\nExamples:\n- every 5 minutes\n- every day at 17:00\n- tomorrow at 12:00",
  "task.schedule_empty": "⚠️ Schedule cannot be empty.",
  "task.parse.in_progress": "⏳ Parsing schedule...",
  "task.parse_error":
    "🔴 Failed to parse schedule.\n\n{message}\n\nSend the schedule again in a clearer form.",
  "task.schedule_preview":
    "✅ Schedule parsed\n\nHow I understood it: {summary}\n{cronLine}Timezone: {timezone}\nType: {kind}\nNext run: {nextRunAt}",
  "task.schedule_preview.cron": "Cron: {cron}",
  "task.prompt.body": "📝 Now send what the bot should do on schedule.",
  "task.prompt_empty": "⚠️ Task text cannot be empty.",
  "task.created":
    "✅ Scheduled task created\n\nTask: {description}\nProject: {project}\nAgent: {agent}\nModel: {model}\nSchedule: {schedule}\n{cronLine}Next run: {nextRunAt}",
  "task.created.cron": "Cron: {cron}",
  "task.button.retry_schedule": "🔁 Re-enter schedule",
  "task.button.cancel": "❌ Cancel",
  "task.retry_schedule_callback": "Re-entering schedule...",
  "task.inactive_callback": "This scheduled task flow is inactive",
  "task.inactive": "⚠️ Scheduled task creation is not active. Run /task again.",
  "task.blocked.expected_input":
    "⚠️ Finish the current scheduled task setup first by sending text or using the button in the schedule message.",
  "task.blocked.command_not_allowed":
    "⚠️ This command is not available while scheduled task creation is active.",
  "task.limit_reached": "⚠️ Task limit reached ({limit}). Delete an existing scheduled task first.",
  "task.schedule_too_frequent":
    "Recurring schedule is too frequent. The minimum allowed interval is once every 5 minutes.",
  "task.kind.cron": "recurring",
  "task.kind.once": "one-time",
  "task.run.success": "⏰ Scheduled task completed: {description}",
  "task.run.error": "🔴 Scheduled task failed: {description}\n\nError: {error}",
  "task.run.error.folder_missing": "The project folder no longer exists: {path}",
  "task.run.error.interactive_question":
    "Scheduled task requested an interactive question and cannot continue unattended.",
  "task.run.error.interactive_permission":
    "Scheduled task requested interactive permission and cannot continue unattended.",

  "tasklist.empty": "📭 No scheduled tasks yet.",
  "tasklist.select": "Select a scheduled task:",
  "tasklist.details":
    "⏰ Scheduled task\n\nTask: {prompt}\nProject: {project}\nSchedule: {schedule}\n{cronLine}Timezone: {timezone}\nNext run: {nextRunAt}\nLast run: {lastRunAt}\nRun count: {runCount}",
  "tasklist.details.cron": "Cron: {cron}",
  "tasklist.button.delete": "🗑 Delete",
  "tasklist.button.cancel": "❌ Cancel",
  "tasklist.deleted_callback": "Deleted",
  "tasklist.inactive_callback": "This scheduled task menu is inactive",
  "tasklist.load_error": "🔴 Failed to load scheduled tasks.",

  "commands.select": "Choose a Reasonix command:",
  "commands.empty": "📭 No Reasonix commands are available for this project.",
  "commands.fetch_error": "🔴 Failed to load Reasonix commands.",
  "commands.no_description": "No description",
  "commands.button.execute": "✅ Execute",
  "commands.button.cancel": "❌ Cancel",
  "commands.confirm":
    "Confirm execution of command {command}. To run it with arguments, send the arguments as a message.",
  "commands.inactive_callback": "This command menu is inactive",
  "commands.execute_callback": "Executing command...",
  "commands.executing_prefix": "⚡ Executing command:",
  "commands.arguments_empty": "⚠️ Arguments cannot be empty. Send text or tap Execute.",
  "commands.execute_error": "🔴 Failed to execute Reasonix command.",
  "commands.select_page": "Choose a Reasonix command (page {page}):",
  "commands.button.prev_page": "⬅️ Prev",
  "commands.button.next_page": "Next ➡️",
  "commands.page_empty_callback": "No commands on this page",
  "commands.download.downloading": "Downloading file...",
  "commands.download.not_found": "File not found",
  "commands.download.not_file": "Path is not a file",
  "commands.download.file_too_large": "File is too large",
  "commands.download.size": "Size",
  "commands.download.modified": "Modified",
  "commands.download.error": "Failed to download file.",

  "skills.select": "Choose a Reasonix skill:",
  "skills.empty": "📭 No Reasonix skills are available for this project.",
  "skills.fetch_error": "🔴 Failed to load Reasonix skills.",
  "skills.no_description": "No description",
  "skills.button.execute": "✅ Execute",
  "skills.button.cancel": "❌ Cancel",
  "skills.confirm":
    "Confirm execution of skill {skill}. To run it with arguments, send the arguments as a message.",
  "skills.inactive_callback": "This skill menu is inactive",
  "skills.execute_callback": "Using skill...",
  "skills.executing_prefix": "⚡ Using skill:",
  "skills.arguments_empty": "⚠️ Arguments cannot be empty. Send text or tap Execute.",
  "skills.select_page": "Choose a Reasonix skill (page {page}):",
  "skills.button.prev_page": "⬅️ Prev",
  "skills.button.next_page": "Next ➡️",
  "skills.page_empty_callback": "No skills on this page",

  "stt.recognizing": "🎤 Recognizing audio...",
  "stt.recognized": "🎤 Recognized:",
  "stt.not_configured":
    "🎤 Voice recognition is not configured.\n\nSet STT_API_URL and STT_API_KEY in .env to enable it.",
  "stt.error": "🔴 Failed to recognize audio: {error}",
  "stt.empty_result": "🎤 No speech detected in the audio message.",

  "cmd.description.open": "Add a project by browsing directories",
  "worktree.select_with_current": "Select a worktree:",
  "worktree.project_not_selected":
    "🏗 Project is not selected.\n\nFirst select a project with /projects.",
  "worktree.not_git_repo":
    "🌿 Git worktrees are unavailable for the current project. Select a git repository first.",
  "worktree.not_git_repo_callback": "Current project is not a git repository",
  "worktree.empty": "📭 No git worktrees found for the current repository.",
  "worktree.fetch_error": "🔴 Failed to load git worktrees.",
  "worktree.page_empty_callback": "No worktrees on this page",
  "worktree.selection_missing_callback": "Selected worktree is no longer available",
  "worktree.already_selected_callback": "This worktree is already selected",
  "worktree.selected":
    "✅ Worktree selected: {worktree}\n\n📋 Session was reset. Use /sessions or /new to continue.",
  "worktree.select_error": "🔴 Failed to select worktree.",
  "open.back": "⬆️ Up",
  "open.roots": "📋 Back to roots",
  "open.prev_page": "⬅️ Previous",
  "open.next_page": "Next ➡️",
  "open.select_current": "✅ Select this folder",
  "open.select_root": "📂 Select a root directory to browse:",
  "open.access_denied": "⛔ Access denied: path is outside allowed roots",
  "open.scan_error": "🔴 Cannot browse directory: {error}",
  "open.open_error": "🔴 Failed to open directory browser.",
  "open.selected": "✅ Project added: {project}\n\n📋 Use /sessions or /new to start working.",
  "open.select_error": "🔴 Failed to add project.",
  "open.no_subfolders": "📭 No subfolders",
  "open.subfolder_count": "{count} subfolder",
  "open.subfolders_count": "{count} subfolders",
  "ls.access_denied": "⛔ Access denied: path is outside the current project",
  "ls.scan_error": "🔴 Cannot list directory",
  "ls.header": "Directory Listing",
  "ls.total": "Total: {count} items",
  "ls.file.header": "File Details",
  "ls.file.download": "📥 Download",
  "ls.file.back": "⬅️ Back",
  "ls.file.attach": "📎 Attach to next prompt",
  "attachment.added": "📎 Attached: {path}\n\nSend your message and the file will go with it.",
  "attachment.cancel": "❌ Cancel attachment",
  "attachment.cancelled": "❌ Attachment cancelled",
  "attachment.invalid":
    "⚠️ The attached file is no longer available. Sending the message without it.",
  "local_command.empty_output": "The command produced no output.",
  "local_command.failed": "Command failed with exit code {exitCode}: {stderr}",
  "local_command.timeout": "The command timed out.",
} as const;

export type I18nKey = keyof typeof en;
export type I18nDictionary = Record<I18nKey, string>;
