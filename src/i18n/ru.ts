import type { I18nDictionary } from "./en.js";

export const ru: I18nDictionary = {
  "cmd.description.recent": "Последние сессии всех проектов",
  "recent.heading": "Последние сессии всех проектов (обновить: /recent):",
  "recent.empty": "📭 Сессий в проектах нет.",
  "recent.running": "выполняется",
  "recent.idle": "ожидает",
  "recent.question": "ждёт ответа",
  "recent.permission": "ждёт разрешения",
  "cmd.description.status": "Статус сервера и сессии",
  "cmd.description.new": "Создать новую сессию",
  "cmd.description.stop": "Прервать текущее действие",
  "cmd.description.detach": "Отсоединиться от текущей сессии",
  "cmd.description.sessions": "Список сессий",
  "cmd.description.messages": "Сообщения текущей сессии",
  "cmd.description.settings": "Изменить настройки бота",
  "cmd.description.projects": "Список проектов",
  "cmd.description.worktree": "Переключить git worktree",
  "cmd.description.task": "Создать задачу по расписанию",
  "cmd.description.tasklist": "Список задач по расписанию",
  "cmd.description.commands": "Пользовательские команды",
  "cmd.description.skills": "Каталог скиллов",
  "cmd.description.reasonix_start": "Запустить Reasonix сервер",
  "cmd.description.reasonix_stop": "Остановить Reasonix сервер",
  "cmd.description.reload": "Перезагрузить конфигурацию Reasonix",
  "cmd.description.ls": "Список содержимого каталога",
  "cmd.description.help": "Справка",

  "callback.unknown_command": "Неизвестная команда",
  "callback.processing_error": "Ошибка обработки",

  "error.load_models": "❌ Ошибка при загрузке списка моделей",
  "error.load_variants": "❌ Ошибка при загрузке списка вариантов",
  "error.context_button": "❌ Ошибка при обработке кнопки контекста",
  "error.generic": "🔴 Произошла ошибка.",

  "interaction.blocked.expired": "⚠️ Текущая интеракция устарела. Запустите ее снова.",
  "interaction.blocked.expected_callback":
    "⚠️ Для этого шага используйте inline-кнопки или нажмите Отмена.",
  "interaction.blocked.expected_text": "⚠️ Для этого шага отправьте текстовое сообщение.",
  "interaction.blocked.expected_command": "⚠️ Для этого шага отправьте команду.",
  "interaction.blocked.command_not_allowed": "⚠️ Эта команда недоступна на текущем шаге.",
  "interaction.blocked.finish_current":
    "⚠️ Сначала завершите текущую интеракцию (ответьте или отмените), затем откройте другое меню.",

  "inline.blocked.expected_choice": "⚠️ Выберите вариант через inline-кнопки или нажмите Отмена.",
  "inline.blocked.command_not_allowed": "⚠️ Эта команда недоступна, пока активно inline-меню.",

  "question.blocked.expected_answer":
    "⚠️ Ответьте на текущий вопрос кнопками, через Свой ответ, или нажмите Отмена.",
  "question.blocked.command_not_allowed":
    "⚠️ Эта команда недоступна, пока не завершен текущий опрос.",

  "inline.button.cancel": "❌ Отмена",
  "inline.button.close": "❌ Закрыть",
  "inline.inactive_callback": "Это меню уже неактивно",

  "common.cancelled": "Отменено",
  "common.unknown": "неизвестна",
  "common.unknown_error": "неизвестная ошибка",

  "start.welcome":
    "👋 Добро пожаловать в Reasonix Telegram Bot!\n\nИспользуйте команды:\n/projects — выбрать проект\n/sessions — список сессий\n/new — новая сессия\n/commands — пользовательские команды\n/skills — каталог скиллов\n/task — задача по расписанию\n/tasklist — список задач по расписанию\n/status — статус\n/help — справка\n\nАгент, модель и вариант выбираются кнопками внизу.",
  "help.keyboard_hint":
    "💡 Агент, модель, вариант и действия с контекстом доступны через нижние кнопки клавиатуры.",

  "bot.thinking": "💭 Думаю...",
  "progress.compact.activity": "{header}\n{activity}",
  "progress.compact.working_header": "⏳ Работаю",
  "progress.compact.finished_header": "✅ Работа завершена",
  "progress.compact.thinking": "💭 Думаю...",
  "progress.compact.responding": "✍️ Пишу ответ...",
  "progress.compact.waiting_permission": "🔐 Жду разрешение...",
  "progress.compact.retrying": "🔁 Повторяю запрос...",
  "progress.compact.task": "🤖 Выполняю задачу",
  "progress.compact.done": "{header}\nвызовы инструментов: {tools} · изменённые файлы: {files}",
  "bot.project_not_selected": "🏗 Проект не выбран.\n\nСначала выберите проект командой /projects.",
  "bot.creating_session": "🔄 Создаю новую сессию...",
  "bot.create_session_error":
    "🔴 Не удалось создать сессию. Попробуйте команду /new или проверьте статус сервера /status.",
  "bot.session_created": "✅ Сессия создана: {title}",
  "bot.session_busy":
    "⏳ Агент уже выполняет задачу. Дождитесь завершения или используйте /abort, чтобы прервать текущий запуск.",
  "bot.session_reset_project_mismatch":
    "⚠️ Активная сессия не соответствует выбранному проекту, поэтому была сброшена. Используйте /sessions для выбора или /new для создания новой сессии.",
  "bot.prompt_send_error": "Не удалось отправить запрос в Reasonix.",
  "bot.project_folder_missing":
    "🚫 Папка проекта больше не существует: {path}. Выберите другой проект в /projects.",
  "bot.project_folder_missing_worktree":
    "🚫 Папка проекта больше не существует: {path}. Выберите другой worktree в /worktree.",
  "bot.session_error": "🔴 Reasonix вернул ошибку: {message}",
  "bot.assistant_reply_undelivered":
    "⚠️ Последний ответ ассистента не удалось доставить. Отправьте сообщение ещё раз, если оно ещё нужно.",
  "bot.stale_messages_skipped":
    "⚠️ Некоторые сообщения пропущены, пока не было связи с Telegram. Отправьте их ещё раз.",
  "bot.session_retry":
    "🔁 {message}\n\nПровайдер возвращает одну и ту же ошибку при повторных запросах. Используйте /abort для остановки.",
  "bot.external_user_input": "Внешний ввод пользователя",
  "background.session_fallback": "сессия {id}",
  "background.assistant_response": "🔔 В фоновой сессии пришёл ответ ассистента: {session}",
  "background.question_asked": "❓ В фоновой сессии нужен ответ: {session}",
  "background.permission_asked": "🔐 В фоновой сессии запрошены права: {session}",
  "background.open_session_button": "Открыть сессию",
  "bot.unknown_command": "⚠️ Неизвестная команда: {command}. Используйте /help для списка команд.",
  "bot.photo_downloading": "⏳ Скачиваю фото...",
  "bot.photo_model_no_image":
    "⚠️ Текущая модель не поддерживает изображения. Отправляю только текст.",
  "bot.photo_download_error": "🔴 Не удалось скачать фото",
  "bot.file_downloading": "⏳ Скачиваю файл...",
  "bot.files_downloading": "⏳ Скачиваю файлы...",
  "bot.file_download_error": "🔴 Не удалось скачать файл",
  "bot.file_type_unsupported":
    "⚠️ Этот тип файла не поддерживается. Отправьте изображение, документ (PDF, DOCX, PPTX) или текстовый/кодовый файл.",
  "bot.rich_message_media_skipped": "⚠️ Пропущено неподдерживаемых медиафрагментов: {count}.",
  "bot.message_type_unsupported": "⚠️ Этот тип сообщения не поддерживается.",
  "bot.media_group_not_processed":
    "⚠️ Один или несколько файлов в альбоме нельзя обработать. В Reasonix ничего не отправлено.",
  "bot.media_group_download_error":
    "🔴 Не удалось скачать один из файлов. В Reasonix ничего не отправлено.",
  "bot.model_no_pdf": "⚠️ Текущая модель не поддерживает PDF. Отправляю только текст.",
  "bot.document_extraction_error": "🔴 Не удалось извлечь текст из документа.",
  "bot.text_file_too_large": "⚠️ Текстовый файл слишком большой (макс. {maxSizeKb}КБ)",

  "status.header_running": "🟢 Reasonix Server запущен",
  "status.line.version": "Версия Reasonix: {version}",
  "status.line.bot_version": "Версия бота: {version}",
  "status.line.mode": "Агент: {mode}",
  "status.line.model": "Модель: {model}",
  "status.tts.off": "Выкл",
  "status.tts.all": "Все",
  "status.tts.auto": "Авто",
  "status.agent_not_set": "не установлен",
  "status.project_selected": "Проект: {project}",
  "status.worktree_selected": "Worktree: {worktree}",
  "status.project_not_selected": "Проект: не выбран",
  "status.project_hint": "Используйте /projects для выбора проекта",
  "status.session_selected": "Текущая сессия: {title}",
  "status.session_not_selected": "Текущая сессия: не выбрана",
  "status.session_hint": "Используйте /sessions для выбора или /new для создания",
  "status.header_unavailable": "🔴 Reasonix Server недоступен",
  "status.unavailable_hint": "Используйте /reasonix_start для запуска сервера.",

  "tts.off": "🔇 Аудиоответы выключены.",
  "tts.all": "🔊 Аудиоответы включены для всех сообщений.",
  "tts.auto": "🎤 Аудиоответы включены только для голосовых сообщений.",
  "tts.not_configured": "⚠️ Аудиоответы недоступны. Сначала укажите `TTS_API_URL` и `TTS_API_KEY`.",
  "tts.failed": "⚠️ Не удалось создать аудиоответ.",

  "settings.menu.title": "⚙️ Настройки бота\nНажмите на параметр, чтобы переключить его значение:",
  "settings.compact_output.label": "Компактный вывод",
  "settings.delete_progress_on_finish.label": "Удалять прогресс по завершении",
  "settings.thinking_content.label": "Содержимое thinking",
  "settings.response_streaming.label": "Стриминг ответа",
  "settings.response_streaming.edit": "edit",
  "settings.response_streaming.draft": "draft (experimental)",
  "settings.diff_files.label": "Файлы с diff",
  "settings.assistant_footer.label": "Футер ответа",
  "settings.pin_session_dashboard.label": "Закреплять дашборд сессии",
  "settings.tts.label": "Аудиоответы",
  "settings.prompt_queue.label": "Очередь сообщений",
  "settings.value.on": "Вкл",
  "settings.value.off": "Выкл",
  "settings.prompt_queue.queue": "Очередь",
  "settings.saved": "✅ Настройка сохранена.",

  "projects.empty":
    "📭 Проектов нет.\n\nОткройте директорию в Reasonix и создайте хотя бы одну сессию, после этого она появится здесь.",
  "projects.select": "Выберите проект:",
  "projects.select_with_current": "Выберите проект:\n\nТекущий: 🏗 {project}",
  "projects.page_indicator": "Страница {current}/{total}",
  "projects.prev_page": "⬅️ Назад",
  "projects.next_page": "Вперёд ➡️",
  "projects.fetch_error":
    "🔴 Reasonix Server недоступен или произошла ошибка при получении списка проектов.",
  "projects.page_load_error": "Не удалось загрузить эту страницу. Попробуйте снова.",
  "projects.selected":
    "✅ Проект выбран: {project}\n\n📋 Сессия сброшена. Используйте /sessions или /new для работы с этим проектом.",
  "projects.select_error": "🔴 Ошибка при выборе проекта.",

  "sessions.project_not_selected":
    "🏗 Проект не выбран.\n\nСначала выберите проект командой /projects.",
  "sessions.empty": "📭 Сессий нет.\n\nСоздайте новую сессию командой /new.",
  "sessions.select": "Выберите сессию:",
  "sessions.select_page": "Выберите сессию (страница {page}):",
  "sessions.fetch_error":
    "🔴 Reasonix Server недоступен или произошла ошибка при получении списка сессий.",
  "sessions.select_project_first": "🔴 Проект не выбран. Используйте /projects.",
  "sessions.page_empty_callback": "На этой странице нет сессий",
  "sessions.page_load_error_callback":
    "Не удалось загрузить эту страницу. Пожалуйста, попробуйте снова.",
  "sessions.button.prev_page": "⬅️ Назад",
  "sessions.button.next_page": "Вперёд ➡️",
  "sessions.loading_context": "⏳ Загружаю контекст и последние сообщения...",
  "sessions.selected": "✅ Сессия выбрана: {title}",
  "sessions.select_error": "🔴 Ошибка при выборе сессии.",
  "sessions.preview.empty": "Последних сообщений нет.",
  "sessions.last_input.title": "Последний ввод пользователя:",
  "sessions.last_input.attachment": "вложение",

  "messages.project_not_selected":
    "🏗 Проект не выбран.\n\nСначала выберите проект командой /projects.",
  "messages.session_not_selected":
    "💬 Сессия не выбрана.\n\nСначала выберите сессию через /sessions или создайте новую через /new.",
  "messages.session_project_mismatch":
    "⚠️ Выбранная сессия не соответствует текущему проекту. Повторно выберите сессию через /sessions.",
  "messages.empty": "📭 В текущей сессии нет сообщений пользователя.",
  "messages.select": "Выберите сообщение:",
  "messages.select_page": "Выберите сообщение (страница {page}):",
  "messages.fetch_error":
    "🔴 Reasonix Server недоступен или произошла ошибка при получении списка сообщений.",
  "messages.inactive_callback": "Это меню сообщений уже неактивно",
  "messages.page_empty_callback": "На этой странице нет сообщений",
  "messages.button.prev_page": "⬅️ Назад",
  "messages.button.next_page": "Вперёд ➡️",
  "messages.button.revert": "↩️ Revert",
  "messages.button.fork": "🔀 Fork",
  "messages.button.back": "⬅️ Назад",
  "messages.button.cancel": "❌ Отмена",
  "messages.revert_success": "✅ Откатили до сообщения:\n\n{text}",
  "messages.revert_error": "❌ Не удалось откатить сообщение. Попробуйте ещё раз.",
  "messages.fork_success": "🔀 Создан форк от сообщения:\n\n{text}",
  "messages.fork_error": "❌ Не удалось создать форк. Попробуйте ещё раз.",

  "detach.project_not_selected":
    "🏗 Проект не выбран.\n\nСначала выберите проект командой /projects.",
  "detach.no_active_session": "ℹ️ Бот уже не привязан ни к одной сессии.",
  "detach.success":
    "✅ Отсоединился от сессии: {title}\n\nReasonix-сессия не остановлена. Если она еще выполняется, выполнение продолжится отдельно. Чтобы проверить ее позже, снова выберите эту сессию через /sessions.",
  "detach.error": "🔴 Не удалось отсоединиться от текущей сессии.",

  "new.project_not_selected": "🏗 Проект не выбран.\n\nСначала выберите проект командой /projects.",
  "new.created": "✅ Создана новая сессия: {title}",
  "new.create_error": "🔴 Reasonix Server недоступен или произошла ошибка при создании сессии.",

  "stop.no_active_session":
    "🛑 Агент не был запущен\n\nСначала создайте сессию командой /new или выберите существующую через /sessions.",
  "stop.in_progress":
    "🛑 Отключил поток событий и отправляю сигнал прерывания...\n\nОжидание остановки агента.",
  "stop.warn_unconfirmed":
    "⚠️ Поток событий остановлен, но сервер не подтвердил прерывание.\n\nПроверьте /status и повторите /abort через пару секунд.",
  "stop.warn_maybe_finished":
    "⚠️ Поток событий остановлен, но агент мог уже завершиться к моменту запроса.",
  "stop.success":
    "✅ Действие агента прервано. Новые сообщения от текущего запуска больше не придут.",
  "stop.warn_still_busy":
    "⚠️ Сигнал отправлен, но агент еще busy.\n\nПоток событий уже отключен, поэтому бот не будет присылать промежуточные сообщения.",
  "stop.warn_timeout":
    "⚠️ Таймаут запроса на прерывание.\n\nПоток событий уже отключен, повторите /abort через пару секунд.",
  "stop.warn_local_only":
    "⚠️ Поток событий остановлен локально, но при прерывании на сервере произошла ошибка.",
  "stop.error":
    "🔴 Ошибка при прерывании действия.\n\nПоток событий остановлен, попробуйте /abort еще раз.",

  "reasonix_start.already_running": "✅ Reasonix server is already running for this project",
  "reasonix_start.starting": "🔄 Starting the Reasonix server for this project...",
  "reasonix_start.start_error":
    "🔴 Failed to start the Reasonix server\n\nError: {error}\n\nCheck that the Reasonix CLI is installed and on PATH:\nreasonix --version",
  "reasonix_start.success":
    "✅ Reasonix server started\n\nProject: {root}\nPort: {port}\nVersion: {version}",
  "reasonix_start.error":
    "🔴 An error occurred while starting the server.\n\nCheck application logs for details.",
  "reasonix_stop.not_running": "⚠️ No Reasonix server started by the bot is running.",
  "reasonix_stop.stopping": "🛑 Stopping {count} Reasonix server(s)...",
  "reasonix_stop.success": "✅ Stopped {count} Reasonix server(s). They start again on next use.",
  "reasonix_stop.error":
    "🔴 An error occurred while stopping the server.\n\nCheck application logs for details.",
  "reload.reloading": "🔄 Перезагружаю конфигурацию Reasonix...",
  "reload.success": "✅ Конфигурация Reasonix перезагружена",
  "reload.failed": "🔴 Не удалось перезагрузить конфигурацию Reasonix",
  "reload.failed_with_error":
    "🔴 Не удалось перезагрузить конфигурацию Reasonix\n\nОшибка: {error}",

  "model.changed_message": "✅ Модель изменена на: {name}",
  "model.change_error_callback": "Ошибка при смене модели",
  "model.menu.select": "Выберите модель:",
  "model.menu.favorites_title": "⭐ Избранное (Добавляйте модели в избранное через Reasonix CLI)",
  "model.menu.favorites_empty": "— Список пуст.",
  "model.menu.recent_title": "🕘 Недавние",
  "model.menu.recent_empty": "— Список пуст.",
  "model.menu.error": "🔴 Не удалось получить список моделей",
  "model.search.button": "🔍 Поиск",
  "model.search.prompt": "🔍 Введите название модели для поиска:",
  "model.search.results_title": 'Результаты поиска для "{query}":',
  "model.search.no_results": 'Модели не найдены для "{query}"',
  "model.search.search_again": "↩ Искать снова",
  "model.search.error": "Ошибка поиска",
  "model.button.back": "⬅️ Назад",
  "model.providers.button": "🗂 Провайдеры",
  "model.providers.title": "Выберите провайдера из списка:",
  "model.providers.empty": "⚠️ Нет подключённых провайдеров",
  "model.providers.error": "Не удалось получить список провайдеров",
  "model.providers.page_indicator": "Страница {current}/{total}",
  "model.providers.prev_page": "⬅️ Назад",
  "model.providers.next_page": "Вперёд ➡️",
  "model.provider_models.title": "{provider} — выберите модель:",
  "model.provider_models.empty": "⚠️ У провайдера {provider} нет доступных моделей",
  "model.provider_models.page_indicator": "Страница {current}/{total}",

  "variant.model_not_selected_callback": "Ошибка: модель не выбрана",
  "variant.changed_message": "✅ Вариант изменен на: {name}",
  "variant.change_error_callback": "Ошибка при смене варианта",
  "variant.select_model_first": "⚠️ Сначала выберите модель",
  "variant.menu.empty": "⚠️ Нет доступных вариантов",
  "variant.menu.current": "Текущий вариант: {name}\n\nВыберите вариант:",
  "variant.menu.error": "🔴 Не удалось получить список вариантов",

  "context.button.confirm": "✅ Да, сжать контекст",
  "context.button.details_compact": "📦 Сжать контекст",
  "context.button.close": "❌ Закрыть",
  "context.details.title": "📊 Детали контекста",
  "context.details.window": "Окно: {used} / {limit} ({percent}%)",
  "context.details.token_breakdown": "Токены последнего сообщения ассистента:",
  "context.details.input": "Вход: {count}",
  "context.details.output": "Выход: {count}",
  "context.details.reasoning": "Рассуждения: {count}",
  "context.details.cache_read": "Чтение кэша: {count}",
  "context.details.cache_write": "Запись в кэш: {count}",
  "context.details.cost": "Стоимость: {cost}",
  "context.no_active_session": "⚠️ Нет активной сессии. Создайте сессию командой /new",
  "context.confirm_text":
    '📊 Сжатие контекста для сессии "{title}"\n\nЭто уменьшит использование контекста, удалив старые сообщения из истории.\n\nПродолжить?',
  "context.callback_compacting": "Сжатие контекста...",
  "context.progress": "⏳ Сжимаю контекст...",
  "context.error": "❌ Ошибка при сжатии контекста",
  "context.success": "✅ Контекст успешно сжат",

  "permission.inactive_callback": "Запрос разрешения неактивен",
  "permission.processing_error_callback": "Ошибка при обработке",
  "permission.no_active_request_callback": "Ошибка: нет активного запроса",
  "permission.reply.once": "Разрешено однократно",
  "permission.reply.always": "Разрешено всегда",
  "permission.reply.reject": "Отклонено",
  "permission.blocked.expected_reply": "⚠️ Сначала ответьте на запрос разрешения кнопками выше.",
  "permission.blocked.command_not_allowed":
    "⚠️ Эта команда недоступна, пока вы не ответите на запрос разрешения.",
  "permission.header": "{emoji} Запрос разрешения: {name}\n\n",
  "permission.grouped_count":
    "\n⚠️ Ожидают {count} одинаковых запроса — ваш ответ применится ко всем.\n",
  "permission.button.allow": "✅ Разрешить один раз",
  "permission.button.always": "🔓 Разрешить всегда",
  "permission.button.reject": "❌ Отклонить",
  "permission.outcome.once": "✅ Разрешено однократно",
  "permission.outcome.always": "🔓 Разрешено всегда",
  "permission.outcome.reject": "❌ Отклонено",
  "permission.outcome.outside_suffix": " · ответ дан вне Telegram",
  "permission.outcome.settled_outside": "☑️ Ответ дан вне Telegram",
  "permission.outcome.not_answered": "⏹ Без ответа",
  "permission.delivery_failed": "⚠️ Ответ не дошёл до Reasonix — нажмите ещё раз",
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
  "permission.name.external_directory": "Внешняя директория",

  "question.inactive_callback": "Опрос неактивен",
  "question.processing_error_callback": "Ошибка при обработке",
  "question.select_one_required_callback": "Выберите хотя бы один вариант",
  "question.enter_custom_callback": "Введите свой ответ сообщением",
  "question.cancelled": "❌ Опрос отменен",
  "question.settled_outside.answered": "☑️ Ответ дан вне Telegram",
  "question.settled_outside.cancelled": "❌ Отменено вне Telegram",
  "question.not_answered": "⏹ Без ответа",
  "question.answer_already_received": "Ответ уже получен, подождите...",
  "question.completed_no_answers": "✅ Опрос завершен (без ответов)",
  "question.multi_hint": "\n(Можно выбрать несколько вариантов)",
  "question.button.submit": "✅ Готово",
  "question.button.custom": "🔤 Свой ответ",
  "question.button.cancel": "❌ Отмена",
  "question.use_custom_button_first":
    '⚠️ Чтобы отправить текст, сначала нажмите кнопку "Свой ответ" для текущего вопроса.',
  "question.summary.title": "✅ Опрос завершен!\n\n",
  "question.summary.question": "Вопрос {index}:\n{question}\n\n",
  "question.summary.answer": "Ответ:\n{answer}\n\n",

  "keyboard.context": "📊 {used} / {limit} ({percent}%)",
  "keyboard.context_empty": "📊 0",
  "keyboard.variant_default": "💡 Default",
  "keyboard.queued_prompt": "❌ {index}. {text}",
  "queue.added":
    "📥 Добавлено в очередь ({count}/{max}). Сообщение уйдёт после завершения текущей задачи.",
  "queue.full":
    "⚠️ Очередь заполнена ({max}). Удалите сообщение или дождитесь завершения текущей задачи.",
  "queue.removed": "🗑 Сообщение удалено из очереди.",
  "queue.not_found": "Этого сообщения больше нет в очереди.",
  "queue.disabled_hint": "Очередь сообщений включается в /settings.",
  "keyboard.updated": "⌨️ Клавиатура обновлена",

  "pinned.default_session_title": "новая сессия",
  "pinned.unknown": "Неизвестно",
  "pinned.line.project": "Проект: {project}",
  "pinned.line.worktree": "Worktree: {worktree}",
  "pinned.line.model": "Модель: {model}",
  "pinned.line.context": "Контекст: {used} / {limit} ({percent}%)",
  "pinned.line.cost": "Стоимость: {cost} потрачено",
  "subagent.line.task": "Задача: {task}",
  "subagent.line.agent": "Агент: {agent}",
  "subagent.working": "В работе...",
  "subagent.completed": "Завершена",
  "subagent.failed": "Ошибка задачи",
  "pinned.files.title": "Файлы ({count}):",
  "pinned.files.item": "  {path}{diff}",
  "pinned.files.more": "  ... и еще {count}",

  "tool.todo.overflow": "*(ещё {count} задач)*",
  "tool.file_header.write":
    "Write File/Path: {path}\n============================================================\n\n",
  "tool.file_header.edit":
    "Edit File/Path: {path}\n============================================================\n\n",

  "runtime.wizard.ask_token": "Введите токен Telegram-бота (получить у @BotFather).\n> ",
  "runtime.wizard.ask_language":
    "Выберите язык интерфейса.\nВведите номер языка из списка или код локали.\nНажмите Enter, чтобы оставить язык по умолчанию: {defaultLocale}\n{options}\n> ",
  "runtime.wizard.language_invalid":
    "Введите номер языка из списка или поддерживаемый код локали.\n",
  "runtime.wizard.language_selected": "Выбран язык: {language}\n",
  "runtime.wizard.token_required": "Токен обязателен. Попробуйте еще раз.\n",
  "runtime.wizard.token_invalid":
    "Похоже на невалидный токен (ожидается формат <id>:<secret>). Попробуйте еще раз.\n",
  "runtime.wizard.ask_user_id": "Введите ваш Telegram User ID (можно узнать у @userinfobot).\n> ",
  "runtime.wizard.user_id_invalid": "Введите положительное целое число (> 0).\n",
  "runtime.wizard.start": "Настройка Reasonix Telegram Bot.\n",
  "runtime.wizard.saved": "Конфигурация сохранена:\n- {envPath}\n",
  "runtime.wizard.not_configured_starting":
    "Приложение еще не сконфигурировано. Запускаю wizard...\n",
  "runtime.wizard.tty_required":
    "Интерактивный wizard требует TTY-терминал. Запустите `reasonix-telegram config` в интерактивной оболочке.",
  "runtime.container.command_unavailable": "⚠️ Эта команда недоступна в Docker-образе.",

  "rename.cancelled": "❌ Переименование отменено.",

  "task.prompt.schedule":
    "⏰ Отправьте расписание задачи обычным языком.\n\nПримеры:\n- каждые 5 минут\n- каждый день в 17:00\n- завтра в 12:00",
  "task.schedule_empty": "⚠️ Расписание не может быть пустым.",
  "task.parse.in_progress": "⏳ Распознаю расписание...",
  "task.parse_error":
    "🔴 Не удалось распознать расписание.\n\n{message}\n\nОтправьте период еще раз в более явном виде.",
  "task.schedule_preview":
    "✅ Расписание распознано\n\nКак я понял: {summary}\n{cronLine}Часовой пояс: {timezone}\nТип: {kind}\nСледующий запуск: {nextRunAt}",
  "task.schedule_preview.cron": "Cron: {cron}",
  "task.prompt.body": "📝 Теперь отправьте текст задачи, которую нужно выполнять по расписанию.",
  "task.prompt_empty": "⚠️ Текст задачи не может быть пустым.",
  "task.created":
    "✅ Задача по расписанию создана\n\nЗадача: {description}\nПроект: {project}\nАгент: {agent}\nМодель: {model}\nРасписание: {schedule}\n{cronLine}Следующий запуск: {nextRunAt}",
  "task.created.cron": "Cron: {cron}",
  "task.button.retry_schedule": "🔁 Ввести период заново",
  "task.button.cancel": "❌ Отмена",
  "task.retry_schedule_callback": "Возвращаю ввод периода...",
  "task.inactive_callback": "Этот сценарий создания задачи уже неактивен",
  "task.inactive": "⚠️ Сценарий создания задачи неактивен. Запустите /task снова.",
  "task.blocked.expected_input":
    "⚠️ Сначала завершите создание задачи по расписанию: отправьте текст или используйте кнопку в сообщении с расписанием.",
  "task.blocked.command_not_allowed":
    "⚠️ Эта команда недоступна, пока идет создание задачи по расписанию.",
  "task.limit_reached":
    "⚠️ Достигнут лимит задач ({limit}). Сначала удалите одну из существующих задач по расписанию.",
  "task.schedule_too_frequent":
    "Повторяющееся расписание слишком частое. Минимально допустимый интервал - один запуск в 5 минут.",
  "task.kind.cron": "повторяющаяся",
  "task.kind.once": "однократная",
  "task.run.success": "⏰ Задача по расписанию выполнена: {description}",
  "task.run.error": "🔴 Ошибка выполнения задачи по расписанию: {description}\n\nОшибка: {error}",
  "task.run.error.folder_missing": "Папка проекта больше не существует: {path}",
  "task.run.error.interactive_question":
    "Задача по расписанию задала интерактивный вопрос и не может продолжить выполнение без участия пользователя.",
  "task.run.error.interactive_permission":
    "Задача по расписанию запросила интерактивное разрешение и не может продолжить выполнение без участия пользователя.",

  "tasklist.empty": "📭 Задач по расписанию пока нет.",
  "tasklist.select": "Выберите задачу по расписанию:",
  "tasklist.details":
    "⏰ Задача по расписанию\n\nЗадача: {prompt}\nПроект: {project}\nРасписание: {schedule}\n{cronLine}Часовой пояс: {timezone}\nСледующий запуск: {nextRunAt}\nПоследний запуск: {lastRunAt}\nКоличество запусков: {runCount}",
  "tasklist.details.cron": "Cron: {cron}",
  "tasklist.button.delete": "🗑 Удалить",
  "tasklist.button.cancel": "❌ Отмена",
  "tasklist.deleted_callback": "Удалено",
  "tasklist.inactive_callback": "Это меню задач по расписанию уже неактивно",
  "tasklist.load_error": "🔴 Не удалось загрузить задачи по расписанию.",

  "commands.select": "Выберите команду Reasonix:",
  "commands.empty": "📭 Для этого проекта нет доступных команд Reasonix.",
  "commands.fetch_error": "🔴 Не удалось загрузить список команд Reasonix.",
  "commands.no_description": "Без описания",
  "commands.button.execute": "✅ Выполнить",
  "commands.button.cancel": "❌ Отмена",
  "commands.confirm":
    "Подтвердите выполнение команды {command}. Для выполнения с аргументами отправьте аргументы отдельным сообщением.",
  "commands.inactive_callback": "Это меню команд уже неактивно",
  "commands.execute_callback": "Запускаю команду...",
  "commands.executing_prefix": "⚡ Выполнение команды:",
  "commands.arguments_empty":
    "⚠️ Аргументы не могут быть пустыми. Отправьте текст или нажмите Выполнить.",
  "commands.execute_error": "🔴 Не удалось выполнить команду Reasonix.",
  "commands.select_page": "Выберите команду Reasonix (страница {page}):",
  "commands.button.prev_page": "⬅️ Назад",
  "commands.button.next_page": "Вперёд ➡️",
  "commands.page_empty_callback": "На этой странице нет команд",
  "commands.download.downloading": "Скачиваю файл...",
  "commands.download.not_found": "Файл не найден",
  "commands.download.not_file": "Путь не является файлом",
  "commands.download.file_too_large": "Файл слишком большой",
  "commands.download.size": "Размер",
  "commands.download.modified": "Изменён",
  "commands.download.error": "Не удалось скачать файл.",

  "skills.select": "Выберите скилл Reasonix:",
  "skills.empty": "📭 Для этого проекта нет доступных скиллов Reasonix.",
  "skills.fetch_error": "🔴 Не удалось загрузить список скиллов Reasonix.",
  "skills.no_description": "Без описания",
  "skills.button.execute": "✅ Выполнить",
  "skills.button.cancel": "❌ Отмена",
  "skills.confirm":
    "Подтвердите запуск скилла {skill}. Чтобы запустить его с аргументами, отправьте аргументы следующим сообщением.",
  "skills.inactive_callback": "Это меню скиллов уже неактивно",
  "skills.execute_callback": "Использую скилл...",
  "skills.executing_prefix": "⚡ Использую скилл:",
  "skills.arguments_empty":
    "⚠️ Аргументы не могут быть пустыми. Отправьте текст или нажмите Выполнить.",
  "skills.select_page": "Выберите скилл Reasonix (страница {page}):",
  "skills.button.prev_page": "⬅️ Назад",
  "skills.button.next_page": "Вперёд ➡️",
  "skills.page_empty_callback": "На этой странице нет скиллов",

  "stt.recognizing": "🎤 Распознаю аудио...",
  "stt.recognized": "🎤 Распознано:",
  "stt.not_configured":
    "🎤 Распознавание голоса не настроено.\n\nУстановите STT_API_URL и STT_API_KEY в .env для включения.",
  "stt.error": "🔴 Не удалось распознать аудио: {error}",
  "stt.empty_result": "🎤 В аудиосообщении не обнаружена речь.",

  "cmd.description.open": "Добавить проект через обзор папок",
  "worktree.select_with_current": "Выберите worktree:",
  "worktree.project_not_selected":
    "🏗 Проект не выбран.\n\nСначала выберите проект командой /projects.",
  "worktree.not_git_repo":
    "🌿 Git worktree недоступны для текущего проекта. Сначала выберите git-репозиторий.",
  "worktree.not_git_repo_callback": "Текущий проект не является git-репозиторием",
  "worktree.empty": "📭 Для текущего репозитория не найдено ни одного worktree.",
  "worktree.fetch_error": "🔴 Не удалось загрузить git worktree.",
  "worktree.page_empty_callback": "На этой странице нет worktree",
  "worktree.selection_missing_callback": "Выбранный worktree больше недоступен",
  "worktree.already_selected_callback": "Этот worktree уже выбран",
  "worktree.selected":
    "✅ Выбран worktree: {worktree}\n\n📋 Сессия была сброшена. Используйте /sessions или /new для продолжения.",
  "worktree.select_error": "🔴 Не удалось выбрать worktree.",
  "open.back": "⬆️ Наверх",
  "open.roots": "📋 К списку корней",
  "open.prev_page": "⬅️ Назад",
  "open.next_page": "Далее ➡️",
  "open.select_current": "✅ Выбрать эту папку",
  "open.select_root": "📂 Выберите корневой каталог для просмотра:",
  "open.access_denied": "⛔ Доступ запрещён: путь за пределами разрешённых каталогов",
  "open.scan_error": "🔴 Не удалось открыть каталог: {error}",
  "open.open_error": "🔴 Не удалось открыть обозреватель каталогов.",
  "open.selected":
    "✅ Проект добавлен: {project}\n\n📋 Используйте /sessions или /new для начала работы.",
  "open.select_error": "🔴 Не удалось добавить проект.",
  "open.no_subfolders": "📭 Нет подпапок",
  "open.subfolder_count": "{count} подпапка",
  "open.subfolders_count": "{count} подпапок",
  "ls.access_denied": "⛔ Доступ запрещён: путь находится за пределами текущего проекта",
  "ls.scan_error": "🔴 Не удается перечислить каталог",
  "ls.header": "Список каталога",
  "ls.total": "Всего: {count} элементов",
  "ls.file.header": "Сведения о файле",
  "ls.file.download": "📥 Скачать",
  "ls.file.back": "⬅️ Назад",
  "ls.file.attach": "📎 Прикрепить к следующему промпту",
  "attachment.added": "📎 Прикреплён: {path}\n\nОтправьте сообщение — файл уйдёт вместе с ним.",
  "attachment.cancel": "❌ Отменить вложение",
  "attachment.cancelled": "❌ Вложение отменено",
  "attachment.invalid": "⚠️ Прикреплённый файл больше недоступен. Отправляю сообщение без него.",
  "local_command.empty_output": "Команда не вернула вывод.",
  "local_command.failed": "Команда завершилась с кодом {exitCode}: {stderr}",
  "local_command.timeout": "Время выполнения команды истекло.",
};
