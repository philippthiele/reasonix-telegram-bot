import type { I18nDictionary } from "./en.js";

export const fr: I18nDictionary = {
  "cmd.description.recent": "Sessions récentes de tous les projets",
  "recent.heading": "Sessions récentes de tous les projets (actualiser avec /recent) :",
  "recent.empty": "📭 Aucune session dans les projets.",
  "recent.running": "en cours",
  "recent.idle": "inactive",
  "recent.question": "attend une réponse",
  "recent.permission": "attend une autorisation",
  "cmd.description.status": "Statut du serveur et de la session",
  "cmd.description.new": "Créer une nouvelle session",
  "cmd.description.stop": "Arrêter l'action en cours",
  "cmd.description.detach": "Se détacher de la session actuelle",
  "cmd.description.sessions": "Lister les sessions",
  "cmd.description.messages": "Parcourir les messages de session",
  "cmd.description.settings": "Modifier les paramètres du bot",
  "cmd.description.projects": "Lister les projets",
  "cmd.description.worktree": "Changer de worktree git",
  "cmd.description.task": "Créer une tâche planifiée",
  "cmd.description.tasklist": "Afficher les tâches planifiées",
  "cmd.description.commands": "Commandes personnalisées",
  "cmd.description.skills": "Catalogue de skills",
  "cmd.description.reasonix_start": "Démarrer le serveur Reasonix",
  "cmd.description.reasonix_stop": "Arrêter le serveur Reasonix",
  "cmd.description.reload": "Reload Reasonix configuration",
  "cmd.description.ls": "Lister le contenu du répertoire",
  "cmd.description.help": "Aide",

  "callback.unknown_command": "Commande inconnue",
  "callback.processing_error": "Erreur de traitement",

  "error.load_models": "❌ Impossible de charger la liste des modèles",
  "error.load_variants": "❌ Impossible de charger la liste des variantes",
  "error.context_button": "❌ Impossible de traiter le bouton de contexte",
  "error.generic": "🔴 Une erreur s'est produite.",

  "interaction.blocked.expired": "⚠️ Cette interaction a expiré. Veuillez la relancer.",
  "interaction.blocked.expected_callback":
    "⚠️ Veuillez utiliser les boutons inline pour cette étape ou appuyer sur Annuler.",
  "interaction.blocked.expected_text": "⚠️ Veuillez envoyer un message texte pour cette étape.",
  "interaction.blocked.expected_command": "⚠️ Veuillez envoyer une commande pour cette étape.",
  "interaction.blocked.command_not_allowed":
    "⚠️ Cette commande n'est pas disponible à l'étape actuelle.",
  "interaction.blocked.finish_current":
    "⚠️ Terminez d'abord l'interaction en cours (réponse ou annulation), puis ouvrez un autre menu.",

  "inline.blocked.expected_choice":
    "⚠️ Choisissez une option avec les boutons inline ou appuyez sur Annuler.",
  "inline.blocked.command_not_allowed":
    "⚠️ Cette commande n'est pas disponible tant que le menu inline est actif.",

  "question.blocked.expected_answer":
    "⚠️ Répondez à la question en cours avec les boutons, Réponse personnalisée ou Annuler.",
  "question.blocked.command_not_allowed":
    "⚠️ Cette commande n'est pas disponible tant que le flux de question actuel n'est pas terminé.",

  "inline.button.cancel": "❌ Annuler",
  "inline.button.close": "❌ Fermer",
  "inline.inactive_callback": "Ce menu est inactif",

  "common.cancelled": "Annulé",
  "common.unknown": "inconnu",
  "common.unknown_error": "erreur inconnue",

  "start.welcome":
    "👋 Bienvenue dans Reasonix Telegram Bot !\n\nUtilisez les commandes :\n/projects — sélectionner un projet\n/sessions — liste des sessions\n/new — nouvelle session\n/commands — commandes personnalisées\n/skills — catalogue de skills\n/task — tâche planifiée\n/tasklist — tâches planifiées\n/status — statut\n/help — aide\n\nUtilisez les boutons du bas pour choisir l'agent, le modèle et la variante.",
  "help.keyboard_hint":
    "💡 Utilisez les boutons du bas pour l'agent, le modèle, la variante et les actions de contexte.",

  "bot.thinking": "💭 Réflexion en cours...",
  "progress.compact.activity": "{header}\n{activity}",
  "progress.compact.working_header": "⏳ Travail en cours",
  "progress.compact.finished_header": "✅ Travail terminé",
  "progress.compact.thinking": "💭 Réflexion en cours...",
  "progress.compact.responding": "✍️ Rédaction de la réponse...",
  "progress.compact.waiting_permission": "🔐 En attente d'autorisation...",
  "progress.compact.retrying": "🔁 Nouvelle tentative...",
  "progress.compact.task": "🤖 Tâche en cours",
  "progress.compact.done": "{header}\nappels d’outils : {tools} · fichiers modifiés : {files}",
  "bot.project_not_selected":
    "🏗 Aucun projet n'est sélectionné.\n\nSélectionnez d'abord un projet avec /projects.",
  "bot.creating_session": "🔄 Création d'une nouvelle session...",
  "bot.create_session_error":
    "🔴 Impossible de créer la session. Essayez /new ou vérifiez l'état du serveur avec /status.",
  "bot.session_created": "✅ Session créée : {title}",
  "bot.session_busy":
    "⏳ L'agent exécute déjà une tâche. Attendez la fin ou utilisez /abort pour interrompre l'exécution en cours.",
  "bot.session_reset_project_mismatch":
    "⚠️ La session active ne correspond pas au projet sélectionné, elle a donc été réinitialisée. Utilisez /sessions pour en choisir une ou /new pour créer une nouvelle session.",
  "bot.prompt_send_error": "Impossible d'envoyer la requête à Reasonix.",
  "bot.project_folder_missing":
    "🚫 The project folder no longer exists: {path}. Choose another project in /projects.",
  "bot.project_folder_missing_worktree":
    "🚫 The project folder no longer exists: {path}. Choose another worktree in /worktree.",
  "bot.session_error": "🔴 Reasonix a renvoyé une erreur : {message}",
  "bot.assistant_reply_undelivered":
    "⚠️ The last assistant reply could not be delivered. Send your message again if you still need it.",
  "bot.stale_messages_skipped":
    "⚠️ Some messages were skipped while Telegram was unreachable. Please send them again.",
  "bot.session_retry":
    "🔁 {message}\n\nLe fournisseur renvoie la même erreur à chaque nouvelle tentative. Utilisez /abort pour arrêter.",
  "bot.external_user_input": "Entrée utilisateur externe",
  "background.session_fallback": "session {id}",
  "background.assistant_response":
    "🔔 L'assistant a répondu dans une session en arrière-plan : {session}",
  "background.question_asked": "❓ Une session en arrière-plan attend une réponse : {session}",
  "background.permission_asked":
    "🔐 Une session en arrière-plan a demandé des autorisations : {session}",
  "background.open_session_button": "Ouvrir la session",
  "bot.unknown_command":
    "⚠️ Commande inconnue : {command}. Utilisez /help pour voir les commandes disponibles.",
  "bot.photo_downloading": "⏳ Téléchargement de la photo...",
  "bot.photo_model_no_image":
    "⚠️ Le modèle actuel ne prend pas en charge les images. Envoi du texte uniquement.",
  "bot.photo_download_error": "🔴 Impossible de télécharger la photo",
  "bot.file_downloading": "⏳ Téléchargement du fichier...",
  "bot.files_downloading": "⏳ Téléchargement des fichiers...",
  "bot.file_download_error": "🔴 Impossible de télécharger le fichier",
  "bot.file_type_unsupported":
    "⚠️ Ce type de fichier n'est pas pris en charge. Envoyez une image, un document (PDF, DOCX, PPTX) ou un fichier texte/code.",
  "bot.rich_message_media_skipped":
    "⚠️ {count} éléments multimédias non pris en charge ont été ignorés.",
  "bot.message_type_unsupported": "⚠️ Ce type de message n'est pas pris en charge.",
  "bot.media_group_not_processed":
    "⚠️ Un ou plusieurs fichiers de cet album ne peuvent pas être traités. Rien n'a été envoyé à Reasonix.",
  "bot.media_group_download_error":
    "🔴 Impossible de télécharger l'un des fichiers. Rien n'a été envoyé à Reasonix.",
  "bot.model_no_pdf":
    "⚠️ Le modèle actuel ne prend pas en charge les PDF. Envoi du texte uniquement.",
  "bot.document_extraction_error": "🔴 Échec de l'extraction du texte du document.",
  "bot.text_file_too_large": "⚠️ Le fichier texte est trop volumineux (max {maxSizeKb}KB)",

  "status.header_running": "🟢 Le serveur Reasonix est en cours d'exécution",
  "status.line.version": "Version Reasonix : {version}",
  "status.line.bot_version": "Bot version: {version}",
  "status.line.mode": "Agent : {mode}",
  "status.line.model": "Modèle : {model}",
  "status.tts.off": "Désactivées",
  "status.tts.all": "Tout",
  "status.tts.auto": "Auto",
  "status.agent_not_set": "non défini",
  "status.project_selected": "Projet : {project}",
  "status.worktree_selected": "Worktree : {worktree}",
  "status.project_not_selected": "Projet : non sélectionné",
  "status.project_hint": "Utilisez /projects pour sélectionner un projet",
  "status.session_selected": "Session actuelle : {title}",
  "status.session_not_selected": "Session actuelle : non sélectionnée",
  "status.session_hint": "Utilisez /sessions pour en sélectionner une ou /new pour en créer une",
  "status.header_unavailable": "🔴 Le serveur Reasonix est indisponible",
  "status.unavailable_hint": "Utilisez /reasonix_start pour démarrer le serveur.",

  "tts.off": "🔇 Réponses audio désactivées.",
  "tts.all": "🔊 Réponses audio activées pour tous les messages.",
  "tts.auto": "🎤 Réponses audio activées pour les messages vocaux uniquement.",
  "tts.not_configured":
    "⚠️ Les réponses audio ne sont pas disponibles. Définissez d'abord `TTS_API_URL` et `TTS_API_KEY`.",
  "tts.failed": "⚠️ Impossible de générer la réponse audio.",

  "settings.menu.title": "⚙️ Paramètres du bot\nTouchez un paramètre pour basculer sa valeur :",
  "settings.compact_output.label": "Sortie compacte",
  "settings.delete_progress_on_finish.label": "Supprimer la progression à la fin",
  "settings.thinking_content.label": "Contenu thinking",
  "settings.response_streaming.label": "Streaming de réponse",
  "settings.response_streaming.edit": "edit",
  "settings.response_streaming.draft": "draft (experimental)",
  "settings.diff_files.label": "Fichiers diff",
  "settings.assistant_footer.label": "Pied de réponse",
  "settings.pin_session_dashboard.label": "Pin session dashboard",
  "settings.tts.label": "Réponses audio",
  "settings.prompt_queue.label": "File d'attente des messages",
  "settings.value.on": "Activé",
  "settings.value.off": "Désactivé",
  "settings.prompt_queue.queue": "File d'attente",
  "settings.saved": "✅ Paramètre enregistré.",

  "projects.empty":
    "📭 Aucun projet trouvé.\n\nOuvrez un répertoire dans Reasonix et créez au moins une session, il apparaîtra ensuite ici.",
  "projects.select": "Sélectionnez un projet :",
  "projects.select_with_current": "Sélectionnez un projet :\n\nActuel : 🏗 {project}",
  "projects.page_indicator": "Page {current}/{total}",
  "projects.prev_page": "⬅️ Précédent",
  "projects.next_page": "Suivant ➡️",
  "projects.fetch_error":
    "🔴 Le serveur Reasonix est indisponible ou une erreur s'est produite lors du chargement des projets.",
  "projects.page_load_error": "Impossible de charger cette page. Veuillez réessayer.",
  "projects.selected":
    "✅ Projet sélectionné : {project}\n\n📋 La session a été réinitialisée. Utilisez /sessions ou /new pour ce projet.",
  "projects.select_error": "🔴 Impossible de sélectionner le projet.",

  "sessions.project_not_selected":
    "🏗 Aucun projet n'est sélectionné.\n\nSélectionnez d'abord un projet avec /projects.",
  "sessions.empty": "📭 Aucune session trouvée.\n\nCréez une nouvelle session avec /new.",
  "sessions.select": "Sélectionnez une session :",
  "sessions.select_page": "Sélectionnez une session (page {page}) :",
  "sessions.fetch_error":
    "🔴 Le serveur Reasonix est indisponible ou une erreur s'est produite lors du chargement des sessions.",
  "sessions.select_project_first": "🔴 Aucun projet n'est sélectionné. Utilisez /projects.",
  "sessions.page_empty_callback": "Aucune session sur cette page",
  "sessions.page_load_error_callback": "Impossible de charger cette page. Veuillez réessayer.",
  "sessions.button.prev_page": "⬅️ Préc.",
  "sessions.button.next_page": "Suiv. ➡️",
  "sessions.loading_context": "⏳ Chargement du contexte et des derniers messages...",
  "sessions.selected": "✅ Session sélectionnée : {title}",
  "sessions.select_error": "🔴 Impossible de sélectionner la session.",
  "sessions.preview.empty": "Aucun message récent.",
  "sessions.last_input.title": "Dernière entrée utilisateur :",
  "sessions.last_input.attachment": "pièce jointe",

  "messages.project_not_selected":
    "🏗 Aucun projet sélectionné.\n\nSélectionnez d'abord un projet avec /projects.",
  "messages.session_not_selected":
    "💬 Aucune session sélectionnée.\n\nChoisissez d'abord une session avec /sessions ou créez-en une avec /new.",
  "messages.session_project_mismatch":
    "⚠️ La session sélectionnée ne correspond pas au projet actuel. Choisissez à nouveau la session via /sessions.",
  "messages.empty": "📭 Aucun message utilisateur dans la session actuelle.",
  "messages.select": "Choisissez un message :",
  "messages.select_page": "Choisissez un message (page {page}) :",
  "messages.fetch_error":
    "🔴 Reasonix Server est indisponible ou une erreur est survenue pendant le chargement des messages.",
  "messages.inactive_callback": "Ce menu de messages est inactif",
  "messages.page_empty_callback": "Aucun message sur cette page",
  "messages.button.prev_page": "⬅️ Précédent",
  "messages.button.next_page": "Suivant ➡️",
  "messages.button.revert": "↩️ Revert",
  "messages.button.fork": "🔀 Fork",
  "messages.button.back": "⬅️ Retour",
  "messages.button.cancel": "❌ Annuler",
  "messages.revert_success": "✅ Retour au message :\n\n{text}",
  "messages.revert_error": "❌ Impossible de revenir au message. Veuillez réessayer.",
  "messages.fork_success": "🔀 Fork créé à partir du message :\n\n{text}",
  "messages.fork_error": "❌ Échec de la création du fork. Veuillez réessayer.",

  "detach.project_not_selected":
    "🏗 Aucun projet n'est sélectionné.\n\nSélectionnez d'abord un projet avec /projects.",
  "detach.no_active_session": "ℹ️ Le bot n'est déjà attaché à aucune session.",
  "detach.success":
    "✅ Détaché de la session : {title}\n\nLa session Reasonix n'a pas été arrêtée. Si elle est toujours en cours, elle continuera séparément. Pour la consulter plus tard, sélectionnez-la à nouveau via /sessions.",
  "detach.error": "🔴 Impossible de se détacher de la session actuelle.",

  "new.project_not_selected":
    "🏗 Aucun projet n'est sélectionné.\n\nSélectionnez d'abord un projet avec /projects.",
  "new.created": "✅ Nouvelle session créée : {title}",
  "new.create_error":
    "🔴 Le serveur Reasonix est indisponible ou une erreur s'est produite lors de la création de la session.",

  "stop.no_active_session":
    "🛑 L'agent n'a pas été démarré\n\nCréez une session avec /new ou sélectionnez-en une via /sessions.",
  "stop.in_progress":
    "🛑 Flux d'événements arrêté, envoi du signal d'abandon...\n\nEn attente de l'arrêt de l'agent.",
  "stop.warn_unconfirmed":
    "⚠️ Le flux d'événements a été arrêté, mais le serveur n'a pas confirmé l'abandon.\n\nVérifiez /status et réessayez /abort dans quelques secondes.",
  "stop.warn_maybe_finished":
    "⚠️ Le flux d'événements a été arrêté, mais l'agent a peut-être déjà terminé.",
  "stop.success":
    "✅ Action de l'agent interrompue. Aucun autre message de cette exécution ne sera envoyé.",
  "stop.warn_still_busy":
    "⚠️ Le signal a été envoyé, mais l'agent est toujours occupé.\n\nLe flux d'événements est déjà désactivé, donc aucun message intermédiaire ne sera envoyé.",
  "stop.warn_timeout":
    "⚠️ Délai dépassé pour la requête d'abandon.\n\nLe flux d'événements est déjà arrêté, réessayez /abort dans quelques secondes.",
  "stop.warn_local_only":
    "⚠️ Le flux d'événements a été arrêté localement, mais l'abandon côté serveur a échoué.",
  "stop.error":
    "🔴 Impossible d'arrêter l'action.\n\nLe flux d'événements est arrêté, essayez /abort à nouveau.",

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
  "reload.reloading": "🔄 Reloading Reasonix configuration...",
  "reload.success": "✅ Reasonix configuration reloaded",
  "reload.failed": "🔴 Failed to reload Reasonix configuration",
  "reload.failed_with_error": "🔴 Failed to reload Reasonix configuration\n\nError: {error}",

  "model.changed_message": "✅ Modèle défini sur : {name}",
  "model.change_error_callback": "Impossible de modifier le modèle",
  "model.menu.select": "Sélectionnez un modèle :",
  "model.menu.favorites_title":
    "⭐ Favoris (ajoutez des modèles aux favoris dans l'interface Reasonix)",
  "model.menu.favorites_empty": "— Vide.",
  "model.menu.recent_title": "🕘 Récents",
  "model.menu.recent_empty": "— Vide.",
  "model.menu.error": "🔴 Impossible de récupérer la liste des modèles",
  "model.search.button": "🔍 Rechercher",
  "model.search.prompt": "🔍 Entrez le nom du modèle à rechercher :",
  "model.search.results_title": 'Résultats de recherche pour "{query}" :',
  "model.search.no_results": 'Aucun modèle trouvé pour "{query}"',
  "model.search.search_again": "↩ Rechercher à nouveau",
  "model.search.error": "Échec de la recherche",
  "model.button.back": "⬅️ Retour",
  "model.providers.button": "🗂 Fournisseurs",
  "model.providers.title": "Choisissez un fournisseur dans la liste :",
  "model.providers.empty": "⚠️ Aucun fournisseur connecté",
  "model.providers.error": "Impossible de récupérer la liste des fournisseurs",
  "model.providers.page_indicator": "Page {current}/{total}",
  "model.providers.prev_page": "⬅️ Précédent",
  "model.providers.next_page": "Suivant ➡️",
  "model.provider_models.title": "{provider} — choisissez un modèle :",
  "model.provider_models.empty": "⚠️ Aucun modèle disponible pour {provider}",
  "model.provider_models.page_indicator": "Page {current}/{total}",

  "variant.model_not_selected_callback": "Erreur : aucun modèle sélectionné",
  "variant.changed_message": "✅ Variante définie sur : {name}",
  "variant.change_error_callback": "Impossible de modifier la variante",
  "variant.select_model_first": "⚠️ Sélectionnez d'abord un modèle",
  "variant.menu.empty": "⚠️ Aucune variante disponible",
  "variant.menu.current": "Variante actuelle : {name}\n\nSélectionnez une variante :",
  "variant.menu.error": "🔴 Impossible de récupérer la liste des variantes",

  "context.button.confirm": "✅ Oui, compacter le contexte",
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
  "context.no_active_session": "⚠️ Aucune session active. Créez une session avec /new",
  "context.confirm_text":
    "📊 Réduction du contexte pour la session \"{title}\"\n\nCela réduira l'utilisation du contexte en supprimant les anciens messages de l'historique.\n\nContinuer ?",
  "context.callback_compacting": "Réduction du contexte en cours...",
  "context.progress": "⏳ Réduction du contexte en cours...",
  "context.error": "❌ La réduction du contexte a échoué",
  "context.success": "✅ Contexte compacté avec succès",

  "permission.inactive_callback": "La demande d'autorisation est inactive",
  "permission.processing_error_callback": "Erreur de traitement",
  "permission.no_active_request_callback": "Erreur : aucune demande active",
  "permission.reply.once": "Autorisé une fois",
  "permission.reply.always": "Toujours autorisé",
  "permission.reply.reject": "Refusé",
  "permission.blocked.expected_reply":
    "⚠️ Veuillez d'abord répondre à la demande d'autorisation avec les boutons ci-dessus.",
  "permission.blocked.command_not_allowed":
    "⚠️ Cette commande n'est pas disponible tant que vous n'avez pas répondu à la demande d'autorisation.",
  "permission.header": "{emoji} Demande d'autorisation : {name}\n\n",
  "permission.grouped_count":
    "\n⚠️ {count} demandes identiques en attente — votre réponse s'applique à toutes.\n",
  "permission.button.allow": "✅ Autoriser une fois",
  "permission.button.always": "🔓 Toujours autoriser",
  "permission.button.reject": "❌ Refuser",
  "permission.outcome.once": "✅ Allowed once",
  "permission.outcome.always": "🔓 Allowed always",
  "permission.outcome.reject": "❌ Rejected",
  "permission.outcome.outside_suffix": " · answered outside Telegram",
  "permission.outcome.settled_outside": "☑️ Answered outside Telegram",
  "permission.outcome.not_answered": "⏹ Not answered",
  "permission.delivery_failed": "⚠️ The answer did not reach Reasonix — tap again",
  "permission.name.bash": "Bash",
  "permission.name.edit": "Modifier",
  "permission.name.write": "Écrire",
  "permission.name.read": "Lire",
  "permission.name.webfetch": "Récupération web",
  "permission.name.websearch": "Recherche web",
  "permission.name.glob": "Recherche de fichiers",
  "permission.name.grep": "Recherche de contenu",
  "permission.name.list": "Lister le répertoire",
  "permission.name.task": "Tâche",
  "permission.name.lsp": "LSP",
  "permission.name.external_directory": "Répertoire externe",

  "question.inactive_callback": "Le sondage est inactif",
  "question.processing_error_callback": "Erreur de traitement",
  "question.select_one_required_callback": "Sélectionnez au moins une option",
  "question.enter_custom_callback": "Envoyez votre réponse personnalisée sous forme de message",
  "question.cancelled": "❌ Sondage annulé",
  "question.settled_outside.answered": "☑️ Answered outside Telegram",
  "question.settled_outside.cancelled": "❌ Cancelled outside Telegram",
  "question.not_answered": "⏹ Not answered",
  "question.answer_already_received": "Réponse déjà reçue, veuillez patienter...",
  "question.completed_no_answers": "✅ Sondage terminé (aucune réponse)",
  "question.multi_hint": "\n(Vous pouvez sélectionner plusieurs options)",
  "question.button.submit": "✅ Terminer",
  "question.button.custom": "🔤 Réponse personnalisée",
  "question.button.cancel": "❌ Annuler",
  "question.use_custom_button_first":
    "⚠️ Pour envoyer du texte, appuyez d'abord sur « Réponse personnalisée » pour la question actuelle.",
  "question.summary.title": "✅ Sondage terminé !\n\n",
  "question.summary.question": "Question {index} :\n{question}\n\n",
  "question.summary.answer": "Réponse :\n{answer}\n\n",

  "keyboard.context": "📊 {used} / {limit} ({percent}%)",
  "keyboard.context_empty": "📊 0",
  "keyboard.variant_default": "💡 Par défaut",
  "keyboard.queued_prompt": "❌ {index}. {text}",
  "queue.added":
    "📥 Ajouté à la file d'attente ({count}/{max}). Le message sera envoyé à la fin de la tâche en cours.",
  "queue.full":
    "⚠️ La file d'attente est pleine ({max}). Supprimez un message ou attendez la fin de la tâche en cours.",
  "queue.removed": "🗑 Message retiré de la file d'attente.",
  "queue.not_found": "Ce message n'est plus dans la file d'attente.",
  "queue.disabled_hint": "La file d'attente des messages s'active dans /settings.",
  "keyboard.updated": "⌨️ Clavier mis à jour",

  "pinned.default_session_title": "nouvelle session",
  "pinned.unknown": "Inconnu",
  "pinned.line.project": "Projet : {project}",
  "pinned.line.worktree": "Worktree : {worktree}",
  "pinned.line.model": "Modèle : {model}",
  "pinned.line.context": "Contexte : {used} / {limit} ({percent}%)",
  "pinned.line.cost": "Coût : {cost} dépensé",
  "subagent.line.task": "Tache : {task}",
  "subagent.line.agent": "Agent : {agent}",
  "subagent.working": "En cours...",
  "subagent.completed": "Terminee",
  "subagent.failed": "Echec de la tache",
  "pinned.files.title": "Fichiers ({count}) :",
  "pinned.files.item": "  {path}{diff}",
  "pinned.files.more": "  ... et encore {count}",

  "tool.todo.overflow": "*({count} tâches supplémentaires)*",
  "tool.file_header.write":
    "Écrire Fichier/Chemin : {path}\n============================================================\n\n",
  "tool.file_header.edit":
    "Modifier Fichier/Chemin : {path}\n============================================================\n\n",

  "runtime.wizard.ask_token":
    "Entrez le token du bot Telegram (obtenez-le auprès de @BotFather).\n> ",
  "runtime.wizard.ask_language":
    "Sélectionnez la langue de l'interface.\nEntrez le numéro de la langue dans la liste ou le code locale.\nAppuyez sur Entrée pour conserver la langue par défaut : {defaultLocale}\n{options}\n> ",
  "runtime.wizard.language_invalid":
    "Entrez un numéro de langue de la liste ou un code locale pris en charge.\n",
  "runtime.wizard.language_selected": "Langue sélectionnée : {language}\n",
  "runtime.wizard.token_required": "Le token est requis. Veuillez réessayer.\n",
  "runtime.wizard.token_invalid":
    "Le token semble invalide (format attendu <id>:<secret>). Veuillez réessayer.\n",
  "runtime.wizard.ask_user_id":
    "Entrez votre identifiant utilisateur Telegram (vous pouvez l'obtenir auprès de @userinfobot).\n> ",
  "runtime.wizard.user_id_invalid": "Entrez un entier positif (> 0).\n",
  "runtime.wizard.start": "Configuration d'Reasonix Telegram Bot.\n",
  "runtime.wizard.saved": "Configuration enregistrée :\n- {envPath}\n",
  "runtime.wizard.not_configured_starting":
    "L'application n'est pas encore configurée. Lancement de l'assistant...\n",
  "runtime.wizard.tty_required":
    "L'assistant interactif nécessite un terminal TTY. Exécutez `reasonix-telegram config` dans un shell interactif.",
  "runtime.container.command_unavailable":
    "⚠️ Cette commande n'est pas disponible dans l'image Docker.",

  "rename.cancelled": "❌ Renommage annulé.",

  "task.prompt.schedule":
    "⏰ Envoyez le planning de la tâche en langage naturel.\n\nExemples :\n- toutes les 5 minutes\n- chaque jour à 17:00\n- demain à 12:00",
  "task.schedule_empty": "⚠️ Le planning ne peut pas être vide.",
  "task.parse.in_progress": "⏳ Analyse du planning...",
  "task.parse_error":
    "🔴 Impossible d'interpréter le planning.\n\n{message}\n\nEnvoyez le créneau à nouveau de façon plus claire.",
  "task.schedule_preview":
    "✅ Planning interprété\n\nCompris comme : {summary}\n{cronLine}Fuseau horaire : {timezone}\nType : {kind}\nProchaine exécution : {nextRunAt}",
  "task.schedule_preview.cron": "Cron : {cron}",
  "task.prompt.body": "📝 Envoyez maintenant ce que le bot doit faire selon ce planning.",
  "task.prompt_empty": "⚠️ Le texte de la tâche ne peut pas être vide.",
  "task.created":
    "✅ Tâche planifiée créée\n\nTâche : {description}\nProjet : {project}\nAgent : {agent}\nModèle : {model}\nPlanning : {schedule}\n{cronLine}Prochaine exécution : {nextRunAt}",
  "task.created.cron": "Cron : {cron}",
  "task.button.retry_schedule": "🔁 Ressaisir le planning",
  "task.button.cancel": "❌ Annuler",
  "task.retry_schedule_callback": "Retour à la saisie du planning...",
  "task.inactive_callback": "Ce flux de tâche planifiée n'est plus actif",
  "task.inactive": "⚠️ La création de tâche planifiée n'est pas active. Relancez /task.",
  "task.blocked.expected_input":
    "⚠️ Terminez d'abord la configuration de la tâche planifiée : envoyez du texte ou utilisez le bouton dans le message du planning.",
  "task.blocked.command_not_allowed":
    "⚠️ Cette commande n'est pas disponible pendant la création d'une tâche planifiée.",
  "task.limit_reached":
    "⚠️ Limite de tâches atteinte ({limit}). Supprimez d'abord une tâche planifiée existante.",
  "task.schedule_too_frequent":
    "Le planning récurrent est trop fréquent. L'intervalle minimum autorisé est d'une fois toutes les 5 minutes.",
  "task.kind.cron": "récurrente",
  "task.kind.once": "ponctuelle",
  "task.run.success": "⏰ Tâche planifiée terminée : {description}",
  "task.run.error": "🔴 Échec de la tâche planifiée : {description}\n\nErreur : {error}",
  "task.run.error.folder_missing": "The project folder no longer exists: {path}",
  "task.run.error.interactive_question":
    "La tâche planifiée a demandé une question interactive et ne peut pas continuer sans intervention.",
  "task.run.error.interactive_permission":
    "La tâche planifiée a demandé une autorisation interactive et ne peut pas continuer sans intervention.",

  "tasklist.empty": "📭 Aucune tâche planifiée pour le moment.",
  "tasklist.select": "Sélectionnez une tâche planifiée :",
  "tasklist.details":
    "⏰ Tâche planifiée\n\nTâche : {prompt}\nProjet : {project}\nPlanning : {schedule}\n{cronLine}Fuseau horaire : {timezone}\nProchaine exécution : {nextRunAt}\nDernière exécution : {lastRunAt}\nNombre d'exécutions : {runCount}",
  "tasklist.details.cron": "Cron : {cron}",
  "tasklist.button.delete": "🗑 Supprimer",
  "tasklist.button.cancel": "❌ Annuler",
  "tasklist.deleted_callback": "Supprimée",
  "tasklist.inactive_callback": "Ce menu des tâches planifiées est inactif",
  "tasklist.load_error": "🔴 Impossible de charger les tâches planifiées.",

  "commands.select": "Choisissez une commande Reasonix :",
  "commands.empty": "📭 Aucune commande Reasonix n'est disponible pour ce projet.",
  "commands.fetch_error": "🔴 Impossible de charger les commandes Reasonix.",
  "commands.no_description": "Aucune description",
  "commands.button.execute": "✅ Exécuter",
  "commands.button.cancel": "❌ Annuler",
  "commands.confirm":
    "Confirmez l'exécution de la commande {command}. Pour l'exécuter avec des arguments, envoyez-les dans un message.",
  "commands.inactive_callback": "Ce menu de commandes est inactif",
  "commands.execute_callback": "Exécution de la commande...",
  "commands.executing_prefix": "⚡ Exécution de la commande :",
  "commands.arguments_empty":
    "⚠️ Les arguments ne peuvent pas être vides. Envoyez du texte ou appuyez sur Exécuter.",
  "commands.execute_error": "🔴 Impossible d'exécuter la commande Reasonix.",
  "commands.select_page": "Choisissez une commande Reasonix (page {page}) :",
  "commands.button.prev_page": "⬅️ Précédent",
  "commands.button.next_page": "Suivant ➡️",
  "commands.page_empty_callback": "Aucune commande sur cette page",
  "commands.download.downloading": "Téléchargement du fichier...",
  "commands.download.not_found": "Fichier introuvable",
  "commands.download.not_file": "Le chemin n'est pas un fichier",
  "commands.download.file_too_large": "Le fichier est trop volumineux",
  "commands.download.size": "Taille",
  "commands.download.modified": "Modifié",
  "commands.download.error": "Impossible de télécharger le fichier.",

  "skills.select": "Choisissez un skill Reasonix :",
  "skills.empty": "📭 Aucun skill Reasonix n'est disponible pour ce projet.",
  "skills.fetch_error": "🔴 Impossible de charger les skills Reasonix.",
  "skills.no_description": "Aucune description",
  "skills.button.execute": "✅ Exécuter",
  "skills.button.cancel": "❌ Annuler",
  "skills.confirm":
    "Confirmez l'exécution du skill {skill}. Pour l'exécuter avec des arguments, envoyez-les dans un message.",
  "skills.inactive_callback": "Ce menu de skills est inactif",
  "skills.execute_callback": "Utilisation du skill...",
  "skills.executing_prefix": "⚡ Utilisation du skill :",
  "skills.arguments_empty":
    "⚠️ Les arguments ne peuvent pas être vides. Envoyez du texte ou appuyez sur Exécuter.",
  "skills.select_page": "Choisissez un skill Reasonix (page {page}) :",
  "skills.button.prev_page": "⬅️ Précédent",
  "skills.button.next_page": "Suivant ➡️",
  "skills.page_empty_callback": "Aucun skill sur cette page",

  "stt.recognizing": "🎤 Reconnaissance audio en cours...",
  "stt.recognized": "🎤 Reconnu :",
  "stt.not_configured":
    "🎤 La reconnaissance vocale n'est pas configurée.\n\nDéfinissez STT_API_URL et STT_API_KEY dans .env pour l'activer.",
  "stt.error": "🔴 Impossible de reconnaître l'audio : {error}",
  "stt.empty_result": "🎤 Aucune parole détectée dans le message audio.",

  "cmd.description.open": "Ajouter un projet en parcourant les dossiers",
  "worktree.select_with_current": "Sélectionnez un worktree :",
  "worktree.project_not_selected":
    "🏗 Aucun projet sélectionné.\n\nSélectionnez d'abord un projet avec /projects.",
  "worktree.not_git_repo":
    "🌿 Les git worktrees ne sont pas disponibles pour le projet actuel. Sélectionnez d'abord un dépôt git.",
  "worktree.not_git_repo_callback": "Le projet actuel n'est pas un dépôt git",
  "worktree.empty": "📭 Aucun git worktree trouvé pour le dépôt actuel.",
  "worktree.fetch_error": "🔴 Impossible de charger les git worktrees.",
  "worktree.page_empty_callback": "Aucun worktree sur cette page",
  "worktree.selection_missing_callback": "Le worktree sélectionné n'est plus disponible",
  "worktree.already_selected_callback": "Ce worktree est déjà sélectionné",
  "worktree.selected":
    "✅ Worktree sélectionné : {worktree}\n\n📋 La session a été réinitialisée. Utilisez /sessions ou /new pour continuer.",
  "worktree.select_error": "🔴 Impossible de sélectionner le worktree.",
  "open.back": "⬆️ Remonter",
  "open.roots": "📋 Retour aux racines",
  "open.prev_page": "⬅️ Précédent",
  "open.next_page": "Suivant ➡️",
  "open.select_current": "✅ Sélectionner ce dossier",
  "open.select_root": "📂 Sélectionnez un répertoire racine à parcourir :",
  "open.access_denied": "⛔ Accès refusé : le chemin est en dehors des répertoires autorisés",
  "open.scan_error": "🔴 Impossible de parcourir le répertoire : {error}",
  "open.open_error": "🔴 Impossible d'ouvrir l'explorateur de répertoires.",
  "open.selected": "✅ Projet ajouté : {project}\n\n📋 Utilisez /sessions ou /new pour commencer.",
  "open.select_error": "🔴 Impossible d'ajouter le projet.",
  "open.no_subfolders": "📭 Aucun sous-dossier",
  "open.subfolder_count": "{count} sous-dossier",
  "open.subfolders_count": "{count} sous-dossiers",
  "ls.access_denied": "⛔ Accès refusé : le chemin est en dehors du projet actuel",
  "ls.scan_error": "🔴 Impossible de lister le répertoire",
  "ls.header": "Liste du répertoire",
  "ls.total": "Total : {count} éléments",
  "ls.file.header": "Détails du fichier",
  "ls.file.download": "📥 Télécharger",
  "ls.file.back": "⬅️ Retour",
  "ls.file.attach": "📎 Joindre au prochain prompt",
  "attachment.added": "📎 Joint : {path}\n\nEnvoyez votre message et le fichier partira avec.",
  "attachment.cancel": "❌ Annuler la pièce jointe",
  "attachment.cancelled": "❌ Pièce jointe annulée",
  "attachment.invalid":
    "⚠️ Le fichier joint n'est plus disponible. Envoi du message sans celui-ci.",
  "local_command.empty_output": "The command produced no output.",
  "local_command.failed": "Command failed with exit code {exitCode}: {stderr}",
  "local_command.timeout": "The command timed out.",
};
