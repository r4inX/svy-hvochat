{
	"name": "hvochat-feedback",
	"displayName": "Feedback (Daumen)",
	"categoryName": "HVO",
	"version": 1,
	"icon": "hvochat/feedback/feedback.svg",
	"definition": "hvochat/feedback/feedback.js",
	"doc": "hvochat/feedback/feedback_doc.js",
	"libraries": [],
	"keywords": ["feedback", "bewertung", "daumen", "thumbs", "hilfreich", "rating", "ai", "ki"],
	"model":
	{
		"dataProviderID": { "type": "dataprovider", "pushToServer": "allow", "tags": { "scope": "design", "doc": "Optional: speichert die Bewertung ('positive' / 'negative' / null). Ohne Bindung haelt das Element den Zustand selbst." } },
		"contextId": { "type": "string", "tags": { "doc": "Frei waehlbare ID (z. B. request_id der KI-Antwort) - wird in onFeedback/onFeedbackComment mitgeliefert" } },
		"label": { "type": "tagstring", "tags": { "basic": true, "doc": "Optionaler Text links der Daumen, z. B. 'War diese Antwort hilfreich?'" } },
		"allowComment": { "type": "boolean", "default": false, "tags": { "doc": "Bei Daumen runter zusaetzlich ein optionales Kommentarfeld anbieten (onFeedbackComment)" } },
		"commentMaxLength": { "type": "int", "default": 1000, "tags": { "doc": "Maximale Laenge des Kommentars" } },
		"texts": { "type": "feedbackTexts", "tags": { "doc": "Beschriftungen/Tooltips ueberschreiben (Standard: Deutsch)" } },
		"enabled": { "type": "enabled", "blockingOn": false, "default": true, "for": ["dataProviderID", "onFeedback", "onFeedbackComment"] },
		"styleClass": { "type": "styleclass", "tags": { "scope": "design" } },
		"tabSeq": { "type": "tabseq", "tags": { "scope": "design" } },
		"size": { "type": "dimension", "default": { "width": 260, "height": 32 } },
		"visible": "visible"
	},
	"handlers":
	{
		"onFeedback": {
			"parameters": [
				{ "name": "contextId", "type": "string" },
				{ "name": "feedback", "type": "string", "doc": "positive | negative" },
				{ "name": "event", "type": "JSEvent" }
			],
			"doc": "Sofort bei jedem Klick auf einen Daumen (bei allowComment: erneuter Klick auf ein bereits gewaehltes 'negative' loest nichts aus)."
		},
		"onFeedbackComment": {
			"parameters": [
				{ "name": "contextId", "type": "string" },
				{ "name": "comment", "type": "string", "doc": "getrimmt, hoechstens commentMaxLength Zeichen" },
				{ "name": "event", "type": "JSEvent" }
			],
			"doc": "Kommentar zu Daumen runter abgeschickt (nur bei allowComment). onFeedback(contextId, 'negative') wurde vorher bereits gemeldet."
		}
	},
	"api":
	{
		"reset": {
			"delayUntilFormLoads": true
		},
		"requestFocus": {
			"delayUntilFormLoads": true,
			"discardPreviouslyQueuedSimilarCalls": true
		}
	},
	"types":
	{
		"feedbackTexts": {
			"positive": "tagstring",
			"negative": "tagstring",
			"commentPlaceholder": "tagstring",
			"commentSubmit": "tagstring",
			"commentCancel": "tagstring",
			"commentHint": "tagstring",
			"commentThanks": "tagstring"
		}
	}
}
