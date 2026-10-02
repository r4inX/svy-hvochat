/*
 * Chat Thread: komplette Chat-Ansicht (portiert aus assistant-ui). Enthaelt:
 * - Nachrichtenverlauf mit Markdown, Bildern, Quellen und Denkprozess
 * - Aktionsleiste (Kopieren, Feedback, Vorlesen, Neu generieren, Export) und Versionswechsler
 * - Vorschlaege, Scroll-nach-unten-Button und integriertes Eingabefeld
 * Die Daten verwaltet der Server (messages), Benutzeraktionen kommen ueber Handler an.
 */

/**
 * Nachrichtenverlauf. Fuer Streaming einzelne Eintraege aendern, z. B. mit appendText().
 * Servoy sendet dann nur die Aenderung an den Browser.
 */
var messages;

/**
 * Vorschlaege, die im leeren Zustand unter dem Eingabefeld angezeigt werden.
 */
var suggestions;

/**
 * true, solange eine Antwort erzeugt wird.
 * Senden ist dann gesperrt und ein Stopp-Button erscheint. Die laufende Antwort zeigt einen Indikator.
 */
var busy;

/**
 * Begruessung im leeren Zustand.
 */
var welcomeText;

/**
 * Platzhaltertext im Eingabefeld.
 */
var placeholderText;

/**
 * Absende-Modus: 'enter', 'ctrlEnter' oder 'none'.
 */
var submitMode;

/**
 * Maximale Zeichenanzahl im Eingabefeld, 0 = unbegrenzt.
 */
var maxLength;

/**
 * Integriertes Eingabefeld anzeigen. false, wenn ein separater hvochat-composer verwendet wird.
 */
var showComposer;

/**
 * Antworten als Markdown darstellen. Der Text wird dabei immer bereinigt (DOMPurify).
 */
var markdown;

/**
 * Kopieren-Button anzeigen.
 */
var allowCopy;

/**
 * Bearbeiten von Benutzer-Nachrichten erlauben (benoetigt onEdit).
 */
var allowEdit;

/**
 * Neu-generieren-Button anzeigen (benoetigt onReload).
 */
var allowReload;

/**
 * Daumen hoch/runter anzeigen (benoetigt onFeedback).
 */
var allowFeedback;

/**
 * Vorlesen ueber die Sprachausgabe des Browsers.
 */
var allowSpeak;

/**
 * Export einer Antwort als Markdown-Datei.
 */
var allowExportMarkdown;

/**
 * Versionswechsler anzeigen, wenn message.branchCount > 1.
 */
var showBranchPicker;

/**
 * Quellen (message.sources) anzeigen.
 */
var showSources;

/**
 * Denkprozess (message.reasoning) anzeigen.
 */
var showReasoning;

/**
 * true: ein Klick auf einen Vorschlag sendet ihn sofort.
 * false: der Vorschlag wird nur ins Eingabefeld uebernommen.
 */
var suggestionAutoSend;

/**
 * Bei neuen Inhalten automatisch nach unten scrollen, solange der Benutzer unten ist.
 */
var autoScroll;

/**
 * Maximale Breite des Inhalts in px, 0 = volle Breite.
 */
var maxContentWidth;

/**
 * Beschriftungen und Tooltips ueberschreiben (Standard: Deutsch).
 */
var texts;

/**
 * Gibt an, ob die Komponente bedienbar ist.
 */
var enabled;

/**
 * Zusaetzliche CSS-Klassen. Farben sind ueber CSS-Variablen anpassbar, z. B.:
 * .mein-chat { --hvochat-primary: #0d6efd; --hvochat-muted: #eef2f7; }
 */
var styleClass;

/**
 * Tab-Reihenfolge des Eingabefelds.
 */
var tabSeq;

/**
 * Sichtbarkeit.
 */
var visible;

var handlers = {
    /**
     * Neue Nachricht abgeschickt (Eingabefeld oder Vorschlag).
     *
     * @param {String} text Der Text
     * @param {JSEvent} event Das ausloesende Event
     *
     * @return {Boolean} false: der Text kommt zurueck ins Eingabefeld
     */
    onSubmit: function() {},

    /**
     * Stopp-Button oder Escape waehrend busy.
     *
     * @param {JSEvent} event Das ausloesende Event
     */
    onCancel: function() {},

    /**
     * Antwort neu erzeugen.
     *
     * @param {String} messageId ID der Antwort
     * @param {JSEvent} event Das ausloesende Event
     */
    onReload: function() {},

    /**
     * Benutzer-Nachricht wurde bearbeitet.
     *
     * @param {String} messageId ID der Nachricht
     * @param {String} text Neuer Text
     * @param {JSEvent} event Das ausloesende Event
     */
    onEdit: function() {},

    /**
     * Bewertung einer Antwort. Zur Anzeige message.feedback setzen.
     *
     * @param {String} messageId ID der Antwort
     * @param {String} feedback 'positive' oder 'negative'
     * @param {JSEvent} event Das ausloesende Event
     */
    onFeedback: function() {},

    /**
     * Wechsel zu einer anderen Version einer Nachricht.
     *
     * @param {String} messageId ID der Nachricht
     * @param {Number} branchNumber Gewuenschte Version (1-basiert)
     * @param {JSEvent} event Das ausloesende Event
     */
    onBranchChange: function() {},

    /**
     * Klick auf eine Quelle. Ohne Handler wird source.url in einem neuen Tab geoeffnet.
     *
     * @param {String} messageId ID der Antwort
     * @param {Number} sourceIndex Index in message.sources (0-basiert)
     * @param {JSEvent} event Das ausloesende Event
     */
    onSourceClick: function() {}
};

/**
 * Scrollt ans Ende des Verlaufs.
 *
 * @example %%prefix%%%%elementName%%.scrollToBottom();
 */
function scrollToBottom() {
}

/**
 * Setzt den Fokus in das Eingabefeld.
 *
 * @example %%prefix%%%%elementName%%.requestFocus();
 */
function requestFocus() {
}

/**
 * Setzt den Text im Eingabefeld.
 *
 * @example %%prefix%%%%elementName%%.setComposerText('Was steht in Abschnitt 3?');
 *
 * @param {String} text Neuer Text
 */
function setComposerText(text) {
}

/**
 * Liefert den Text im Eingabefeld.
 *
 * @example var lcText = %%prefix%%%%elementName%%.getComposerText();
 *
 * @return {String}
 */
function getComposerText() {
}

/**
 * Fuegt eine Nachricht am Ende des Verlaufs hinzu (serverseitig).
 *
 * @example
 * var lcAnswerId = %%prefix%%%%elementName%%.addMessage('assistant', '', 'running');
 *
 * @param {String} role 'user' oder 'assistant'
 * @param {String} [text] Text (Markdown bei Antworten)
 * @param {String} [status] 'complete' (Standard), 'running' oder 'error'
 *
 * @return {String} ID der neuen Nachricht
 */
function addMessage(role, text, status) {
}

/**
 * Haengt Text an eine Nachricht an (Streaming).
 *
 * @example %%prefix%%%%elementName%%.appendText(lcAnswerId, lcChunk);
 *
 * @param {String} messageId ID der Nachricht
 * @param {String} chunk Anzuhaengender Text
 *
 * @return {Boolean} false, wenn die Nachricht nicht existiert
 */
function appendText(messageId, chunk) {
}

/**
 * Setzt einzelne Felder einer Nachricht.
 *
 * @example
 * %%prefix%%%%elementName%%.updateMessage(lcAnswerId, {
 *     status: 'complete',
 *     sources: [{ title: 'Teilungserklaerung.pdf', label: 'S. 12', snippet: '...' }]
 * });
 *
 * @param {String} messageId ID der Nachricht
 * @param {Object} values Felder und Werte (status, error, reasoning, sources, images, branchNumber, branchCount, feedback, text)
 *
 * @return {Boolean} false, wenn die Nachricht nicht existiert
 */
function updateMessage(messageId, values) {
}

/**
 * Liefert eine Nachricht.
 *
 * @example var loMsg = %%prefix%%%%elementName%%.getMessage(lcAnswerId);
 *
 * @param {String} messageId ID der Nachricht
 *
 * @return {CustomType<hvochat-thread.message>} die Nachricht oder null
 */
function getMessage(messageId) {
}

/**
 * Entfernt eine Nachricht.
 *
 * @example %%prefix%%%%elementName%%.removeMessage(lcMessageId);
 *
 * @param {String} messageId ID der Nachricht
 *
 * @return {Boolean} false, wenn die Nachricht nicht existiert
 */
function removeMessage(messageId) {
}

/**
 * Leert den Verlauf.
 *
 * @example %%prefix%%%%elementName%%.clearMessages();
 */
function clearMessages() {
}

var svy_types = {
    /**
     * Eine Chat-Nachricht.
     */
    message: {
        /** Eindeutige ID */
        id: null,
        /** 'user' oder 'assistant' */
        role: null,
        /** Text (Markdown bei Antworten) */
        text: null,
        /** 'complete', 'running' oder 'error' */
        status: null,
        /** Fehlermeldung (angezeigt bei status 'error') */
        error: null,
        /** Denkprozess / Zwischenschritte (aufklappbar) */
        reasoning: null,
        /** Quellen (RAG), Typ source[] */
        sources: null,
        /** Bild-URLs bzw. Media */
        images: null,
        /** Aktuelle Version (1-basiert) */
        branchNumber: null,
        /** Anzahl Versionen; ab 2 wird der Versionswechsler angezeigt */
        branchCount: null,
        /** 'positive', 'negative' oder null */
        feedback: null,
        /** Zeitstempel */
        createdAt: null
    },
    /**
     * Quelle einer Antwort.
     */
    source: {
        /** Eigene ID (optional) */
        id: null,
        /** Titel, z. B. Dateiname */
        title: null,
        /** Link (ohne onSourceClick-Handler in neuem Tab geoeffnet) */
        url: null,
        /** Textausschnitt */
        snippet: null,
        /** Kurzinfo, z. B. 'S. 12'; Standard: Domain der URL */
        label: null
    },
    /**
     * Vorschlag im leeren Zustand.
     */
    suggestion: {
        /** Titel */
        title: null,
        /** Zusatztext (grau) */
        description: null,
        /** Zu sendender Text (Standard: title) */
        prompt: null
    },
    /**
     * Ueberschreibbare Beschriftungen.
     */
    threadTexts: {
        copy: null, copied: null, edit: null, reload: null, feedbackPositive: null, feedbackNegative: null,
        speak: null, stopSpeaking: null, more: null, exportMarkdown: null, previous: null, next: null,
        scrollToBottom: null, editCancel: null, editSave: null, sources: null, reasoning: null, send: null, cancel: null
    }
};
