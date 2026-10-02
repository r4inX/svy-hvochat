{
	"name": "hvochat-composer",
	"displayName": "Chat Composer",
	"categoryName": "HVO",
	"version": 1,
	"icon": "hvochat/composer/composer.svg",
	"definition": "hvochat/composer/composer.js",
	"doc": "hvochat/composer/composer_doc.js",
	"libraries": [],
	"keywords": ["chat", "composer", "message", "nachricht", "eingabe", "textarea", "ai", "rag"],
	"model":
	{
		"dataProviderID": { "type": "dataprovider", "pushToServer": "allow", "tags": { "scope": "design", "wizard": true, "doc": "Optional: haelt den aktuellen Entwurf (wird bei Fokusverlust und nach dem Absenden geschrieben)" } },
		"placeholderText": { "type": "tagstring", "default": "Nachricht eingeben …", "tags": { "basic": true } },
		"submitMode": { "type": "string", "default": "enter", "values": ["enter", "ctrlEnter", "none"], "tags": { "scope": "design", "doc": "enter: Enter sendet, Shift+Enter = Zeilenumbruch | ctrlEnter: Strg/Cmd+Enter sendet | none: nur ueber den Senden-Button" } },
		"clearOnSubmit": { "type": "boolean", "default": true, "tags": { "scope": "design" } },
		"busy": { "type": "boolean", "default": false, "tags": { "doc": "true, solange eine Antwort erzeugt wird: Senden gesperrt, Stopp-Button statt Senden-Button" } },
		"maxHeight": { "type": "int", "default": 192, "tags": { "scope": "design", "doc": "Maximale Hoehe des Eingabefelds in px im Responsive-Layout (im Absolute-Layout begrenzt die Box-Hoehe)" } },
		"maxLength": { "type": "int", "default": 0, "tags": { "doc": "Maximale Zeichenanzahl, 0 = unbegrenzt" } },
		"autoFocus": { "type": "boolean", "default": false, "tags": { "scope": "design" } },
		"showSendButton": { "type": "boolean", "default": true, "tags": { "scope": "design" } },
		"sendButtonText": { "type": "tagstring", "default": "Nachricht senden", "tags": { "doc": "Tooltip / Screenreader-Text des Senden-Buttons" } },
		"cancelButtonText": { "type": "tagstring", "default": "Antwort abbrechen", "tags": { "doc": "Tooltip / Screenreader-Text des Stopp-Buttons" } },
		"enabled": { "type": "enabled", "blockingOn": false, "default": true, "for": ["dataProviderID", "onSubmit", "onCancel"] },
		"readOnly": { "type": "protected", "blockingOn": true, "default": false, "for": ["dataProviderID", "onSubmit"], "tags": { "scope": "runtime" } },
		"styleClass": { "type": "styleclass", "tags": { "scope": "design", "doc": "Zusaetzliche CSS-Klassen" } },
		"tabSeq": { "type": "tabseq", "tags": { "scope": "design" } },
		"visible": "visible"
	},
	"handlers":
	{
		"onSubmit": {
			"returns": { "type": "boolean", "default": true },
			"parameters": [
				{ "name": "text", "type": "string", "doc": "Der eingegebene Text (getrimmt)" },
				{ "name": "event", "type": "JSEvent" }
			],
			"doc": "Wird beim Absenden aufgerufen (Enter bzw. Senden-Button). Rueckgabe false: Text wird wieder ins Eingabefeld gesetzt.",
			"code": "return true;"
		},
		"onCancel": {
			"parameters": [ { "name": "event", "type": "JSEvent" } ],
			"doc": "Wird ausgeloest, wenn waehrend busy der Stopp-Button oder Escape gedrueckt wird."
		}
	},
	"api":
	{
		"requestFocus": {
			"delayUntilFormLoads": true,
			"discardPreviouslyQueuedSimilarCalls": true
		},
		"clear": {
			"delayUntilFormLoads": true
		},
		"setText": {
			"parameters": [ { "name": "text", "type": "string" } ],
			"delayUntilFormLoads": true
		},
		"getText": {
			"returns": "string"
		}
	}
}
