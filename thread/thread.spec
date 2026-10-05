{
	"name": "hvochat-thread",
	"displayName": "Chat Thread",
	"categoryName": "HVO",
	"version": 1,
	"icon": "hvochat/thread/thread.svg",
	"definition": "hvochat/thread/thread.js",
	"doc": "hvochat/thread/thread_doc.js",
	"serverscript": "hvochat/thread/thread_server.js",
	"libraries": [],
	"keywords": ["chat", "thread", "messages", "nachrichten", "ai", "ki", "rag", "assistant"],
	"model":
	{
		"messages": { "type": "message[]", "tags": { "scope": "runtime", "doc": "Nachrichtenverlauf (vom Server verwaltet). Fuer Streaming einzelne Eintraege aendern, z. B. ueber appendText()" } },
		"suggestions": { "type": "suggestion[]", "droppable": true, "tags": { "doc": "Vorschlaege im leeren Zustand" } },
		"busy": { "type": "boolean", "default": false, "tags": { "doc": "true, solange eine Antwort erzeugt wird: Senden gesperrt, Stopp-Button, Aktionsleiste der laufenden Nachricht ausgeblendet" } },
		"welcomeText": { "type": "tagstring", "default": "Wie kann ich helfen?", "tags": { "basic": true } },
		"placeholderText": { "type": "tagstring", "default": "Nachricht eingeben …", "tags": { "basic": true } },
		"submitMode": { "type": "string", "default": "enter", "values": ["enter", "ctrlEnter", "none"], "tags": { "scope": "design" } },
		"maxLength": { "type": "int", "default": 0, "tags": { "doc": "Maximale Zeichenanzahl im Eingabefeld, 0 = unbegrenzt" } },
		"showComposer": { "type": "boolean", "default": true, "tags": { "doc": "false: Eingabe ueber separaten hvochat-composer" } },
		"markdown": { "type": "boolean", "default": true, "tags": { "doc": "Antworten als Markdown darstellen (immer bereinigt)" } },
		"allowCopy": { "type": "boolean", "default": true },
		"allowEdit": { "type": "boolean", "default": true, "tags": { "doc": "Benutzer-Nachrichten bearbeiten (onEdit)" } },
		"allowReload": { "type": "boolean", "default": true, "tags": { "doc": "Antwort neu erzeugen (onReload)" } },
		"allowFeedback": { "type": "boolean", "default": false, "tags": { "doc": "Daumen hoch/runter (onFeedback)" } },
		"allowFeedbackComment": { "type": "boolean", "default": false, "tags": { "doc": "Bei Daumen runter zusaetzlich ein optionales Kommentarfeld anbieten (onFeedbackComment)" } },
		"feedbackCommentMaxLength": { "type": "int", "default": 1000, "tags": { "doc": "Maximale Laenge des Feedback-Kommentars" } },
		"allowSpeak": { "type": "boolean", "default": false, "tags": { "doc": "Antwort vorlesen (Browser-Sprachausgabe)" } },
		"allowExportMarkdown": { "type": "boolean", "default": true, "tags": { "doc": "Antwort als .md herunterladen" } },
		"showBranchPicker": { "type": "boolean", "default": true, "tags": { "doc": "Versionswechsler bei message.branchCount > 1 (onBranchChange)" } },
		"showSources": { "type": "boolean", "default": true },
		"showReasoning": { "type": "boolean", "default": true },
		"suggestionAutoSend": { "type": "boolean", "default": true, "tags": { "doc": "true: Vorschlag wird direkt gesendet (onSubmit), false: nur ins Eingabefeld uebernommen" } },
		"autoScroll": { "type": "boolean", "default": true, "tags": { "doc": "Bei neuen Inhalten nach unten scrollen, solange der Benutzer unten ist" } },
		"maxContentWidth": { "type": "int", "default": 704, "tags": { "scope": "design", "doc": "Maximale Breite des Inhalts in px, 0 = volle Breite" } },
		"texts": { "type": "threadTexts", "tags": { "doc": "Beschriftungen/Tooltips ueberschreiben (Standard: Deutsch)" } },
		"enabled": { "type": "enabled", "blockingOn": false, "default": true, "for": ["onSubmit", "onCancel", "onReload", "onEdit", "onFeedback", "onFeedbackComment", "onBranchChange", "onSourceClick"] },
		"styleClass": { "type": "styleclass", "tags": { "scope": "design" } },
		"tabSeq": { "type": "tabseq", "tags": { "scope": "design" } },
		"size": { "type": "dimension", "default": { "width": 640, "height": 520 } },
		"visible": "visible"
	},
	"handlers":
	{
		"onSubmit": {
			"returns": { "type": "boolean", "default": true },
			"parameters": [
				{ "name": "text", "type": "string" },
				{ "name": "event", "type": "JSEvent" }
			],
			"doc": "Neue Nachricht abgeschickt (Eingabefeld oder Vorschlag). Rueckgabe false: Text kommt zurueck ins Eingabefeld.",
			"code": "return true;"
		},
		"onCancel": {
			"parameters": [ { "name": "event", "type": "JSEvent" } ],
			"doc": "Stopp-Button oder Escape waehrend busy."
		},
		"onReload": {
			"parameters": [ { "name": "messageId", "type": "string" }, { "name": "event", "type": "JSEvent" } ],
			"doc": "Antwort mit dieser ID neu erzeugen."
		},
		"onEdit": {
			"parameters": [ { "name": "messageId", "type": "string" }, { "name": "text", "type": "string" }, { "name": "event", "type": "JSEvent" } ],
			"doc": "Benutzer-Nachricht wurde bearbeitet (neuer Text)."
		},
		"onFeedback": {
			"parameters": [ { "name": "messageId", "type": "string" }, { "name": "feedback", "type": "string", "doc": "positive | negative" }, { "name": "event", "type": "JSEvent" } ],
			"doc": "Bewertung einer Antwort. Zur Anzeige message.feedback setzen."
		},
		"onFeedbackComment": {
			"parameters": [ { "name": "messageId", "type": "string" }, { "name": "comment", "type": "string", "doc": "getrimmt, hoechstens feedbackCommentMaxLength Zeichen" }, { "name": "event", "type": "JSEvent" } ],
			"doc": "Kommentar zu Daumen runter abgeschickt (nur bei allowFeedbackComment). onFeedback(messageId, 'negative') wurde vorher bereits gemeldet."
		},
		"onBranchChange": {
			"parameters": [ { "name": "messageId", "type": "string" }, { "name": "branchNumber", "type": "int", "doc": "gewuenschte Version (1-basiert)" }, { "name": "event", "type": "JSEvent" } ],
			"doc": "Benutzer wechselt zu einer anderen Version der Nachricht."
		},
		"onSourceClick": {
			"parameters": [ { "name": "messageId", "type": "string" }, { "name": "sourceIndex", "type": "int", "doc": "Index in message.sources (0-basiert)" }, { "name": "event", "type": "JSEvent" } ],
			"doc": "Klick auf eine Quelle. Ohne Handler wird source.url in neuem Tab geoeffnet."
		}
	},
	"api":
	{
		"scrollToBottom": { "delayUntilFormLoads": true, "discardPreviouslyQueuedSimilarCalls": true },
		"requestFocus": { "delayUntilFormLoads": true, "discardPreviouslyQueuedSimilarCalls": true },
		"setComposerText": { "parameters": [ { "name": "text", "type": "string" } ], "delayUntilFormLoads": true },
		"getComposerText": { "returns": "string" },
		"addMessage": {
			"parameters": [ { "name": "role", "type": "string" }, { "name": "text", "type": "string", "optional": true }, { "name": "status", "type": "string", "optional": true } ],
			"returns": "string"
		},
		"appendText": { "parameters": [ { "name": "messageId", "type": "string" }, { "name": "chunk", "type": "string" } ], "returns": "boolean" },
		"updateMessage": { "parameters": [ { "name": "messageId", "type": "string" }, { "name": "values", "type": "object" } ], "returns": "boolean" },
		"getMessage": { "parameters": [ { "name": "messageId", "type": "string" } ], "returns": "message" },
		"removeMessage": { "parameters": [ { "name": "messageId", "type": "string" } ], "returns": "boolean" },
		"clearMessages": { }
	},
	"types":
	{
		"message": {
			"id": "string",
			"role": { "type": "string", "values": ["user", "assistant"] },
			"text": "string",
			"status": { "type": "string", "values": ["complete", "running", "error"] },
			"error": "string",
			"reasoning": "string",
			"sources": "source[]",
			"images": "media[]",
			"branchNumber": "int",
			"branchCount": "int",
			"feedback": { "type": "string", "values": ["positive", "negative"] },
			"feedbackDisabled": "boolean",
			"createdAt": "date"
		},
		"source": {
			"id": "string",
			"title": "string",
			"url": "string",
			"snippet": "string",
			"label": "string"
		},
		"suggestion": {
			"title": { "type": "tagstring", "tags": { "useAsCaptionInDeveloper": true, "captionPriority": 1 } },
			"description": "tagstring",
			"prompt": "string"
		},
		"threadTexts": {
			"copy": "tagstring",
			"copied": "tagstring",
			"edit": "tagstring",
			"reload": "tagstring",
			"feedbackPositive": "tagstring",
			"feedbackNegative": "tagstring",
			"feedbackCommentPlaceholder": "tagstring",
			"feedbackCommentSubmit": "tagstring",
			"feedbackCommentCancel": "tagstring",
			"feedbackCommentHint": "tagstring",
			"feedbackCommentThanks": "tagstring",
			"speak": "tagstring",
			"stopSpeaking": "tagstring",
			"more": "tagstring",
			"exportMarkdown": "tagstring",
			"previous": "tagstring",
			"next": "tagstring",
			"scrollToBottom": "tagstring",
			"editCancel": "tagstring",
			"editSave": "tagstring",
			"sources": "tagstring",
			"reasoning": "tagstring",
			"send": "tagstring",
			"cancel": "tagstring"
		}
	}
}
