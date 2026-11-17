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
 * CSS-Klassen eines Symbols im leeren Zustand, z. B. 'fas fa-comments'. Mit welcomeIcon oder welcomeSubText wird der
 * leere Zustand als zentrierter Hinweis (Symbol, Titel, Zusatzzeile) dargestellt.
 */
var welcomeIcon;

/**
 * Zweite, kleinere Zeile unter welcomeText im leeren Zustand.
 */
var welcomeSubText;

/**
 * Absende-Modus: 'enter', 'ctrlEnter' oder 'none'.
 */
var submitMode;

/**
 * true: neueste Eintraege stehen oben. Der Verlauf startet am oberen Rand, scrollt beim Senden nach oben und der
 * Button "Nach unten scrollen" entfaellt. Standard false.
 */
var newestFirst;

/**
 * Verlaufseintraege (message.kind): Autor mit Kuerzel-Kreis und Name anzeigen. Standard false.
 */
var showAuthor;

/**
 * Verlaufseintraege (message.kind): Zeitpunkt anzeigen (message.displayTime, sonst createdAt). Standard false.
 */
var showTimestamp;

/**
 * Eintraege mit message.canDelete koennen geloescht werden (onDelete). Standard false.
 */
var allowDelete;

/**
 * Bueroklammer im Eingabefeld (onAttachClick). Standard false.
 */
var allowAttach;

/**
 * E-Mail-Symbol im Eingabefeld neben der Bueroklammer (onMailClick). Standard false.
 */
var allowMail;

/**
 * Vorgemerkte Anhaenge ueber dem Eingabefeld (Typ attachment[]), mit x entfernbar (onPendingRemove).
 */
var pendingAttachments;

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
 * Einzelne Nachrichten lassen sich mit message.feedbackDisabled = true davon ausnehmen.
 */
var allowFeedback;

/**
 * Bei Daumen runter zusaetzlich ein optionales Kommentarfeld anbieten (benoetigt onFeedbackComment).
 * onFeedback(messageId, 'negative') wird trotzdem sofort gemeldet; der Kommentar kommt ggf. danach.
 * Standard: false (bisheriges Verhalten).
 */
var allowFeedbackComment;

/**
 * Maximale Laenge des Feedback-Kommentars (Standard 1000).
 */
var feedbackCommentMaxLength;

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
     * Bewertung einer Antwort, sofort bei jedem Daumenklick. Zur Anzeige message.feedback setzen.
     * Mit allowFeedbackComment loest ein erneuter Klick auf ein bereits gewaehltes 'negative' nichts aus.
     *
     * @param {String} messageId ID der Antwort
     * @param {String} feedback 'positive' oder 'negative'
     * @param {JSEvent} event Das ausloesende Event
     */
    onFeedback: function() {},

    /**
     * Kommentar zu Daumen runter abgeschickt (nur bei allowFeedbackComment).
     * onFeedback(messageId, 'negative') wurde vorher bereits gemeldet. Fuer das Backend die Bewertung
     * 'down' zusammen mit dem Kommentar erneut senden (ersetzt die vorige Bewertung).
     * Der Kommentar kann personenbezogene Daten enthalten - nicht loggen.
     *
     * @param {String} messageId ID der Antwort
     * @param {String} comment Der Kommentar (getrimmt, hoechstens feedbackCommentMaxLength Zeichen)
     * @param {JSEvent} event Das ausloesende Event
     */
    onFeedbackComment: function() {},

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
    onSourceClick: function() {},

    /**
     * Loeschen eines Eintrags (nur bei allowDelete und message.canDelete). Die Komponente entfernt den Eintrag nicht selbst:
     * der Server nimmt ihn aus messages.
     *
     * @param {String} messageId ID des Eintrags
     * @param {JSEvent} event Das ausloesende Event
     */
    onDelete: function() {},

    /**
     * Klick auf einen Anhang eines Eintrags.
     *
     * @param {String} messageId ID des Eintrags
     * @param {Number} attachmentIndex Index in message.attachments (0-basiert)
     * @param {JSEvent} event Das ausloesende Event
     */
    onAttachmentClick: function() {},

    /**
     * Klick auf die Bueroklammer im Eingabefeld (nur bei allowAttach). Der Server oeffnet die Dateiauswahl
     * und setzt pendingAttachments.
     *
     * @param {JSEvent} event Das ausloesende Event
     */
    onAttachClick: function() {},

    /**
     * Bearbeiten eines Eintrags abgebrochen (Abbrechen oder Escape). Der Server kann vorgemerkte Aenderungen
     * (z. B. Anhaenge) verwerfen.
     *
     * @param {String} messageId ID des Eintrags
     * @param {JSEvent} event Das ausloesende Event
     */
    onEditCancel: function() {},

    /**
     * Klick auf das E-Mail-Symbol im Eingabefeld (nur bei allowMail).
     *
     * @param {JSEvent} event Das ausloesende Event
     */
    onMailClick: function() {},

    /**
     * Entfernen eines Anhangs beim Bearbeiten eines Eintrags (x am Anhang, nur mit canEdit). Der Server entfernt den
     * Anhang und aktualisiert messages.
     *
     * @param {String} messageId ID des Eintrags
     * @param {Number} attachmentIndex Index in message.attachments (0-basiert)
     * @param {JSEvent} event Das ausloesende Event
     */
    onAttachmentRemove: function() {},

    /**
     * Klick auf "Datei hinzufuegen" beim Bearbeiten eines Eintrags (nur mit allowAttach). Der Server nimmt die Datei
     * auf und aktualisiert messages.
     *
     * @param {String} messageId ID des Eintrags
     * @param {JSEvent} event Das ausloesende Event
     */
    onEditAttach: function() {},

    /**
     * Entfernen eines vorgemerkten Anhangs (x am Chip).
     *
     * @param {Number} attachmentIndex Index in pendingAttachments (0-basiert)
     * @param {JSEvent} event Das ausloesende Event
     */
    onPendingRemove: function() {}
};

/**
 * Scrollt an den Anfang des Verlaufs.
 *
 * @example %%prefix%%%%elementName%%.scrollToTop();
 */
function scrollToTop() {
}

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
        /** true: keine Daumen/Kommentarbox fuer diese Nachricht (z. B. aeltere Nachrichten ohne request_id) */
        feedbackDisabled: null,
        /** Zeitstempel */
        createdAt: null,
        /** Eintragsart (Ticket-Verlauf): 'comment', 'mail_in', 'mail_out', 'document', 'time', 'system', 'appointment', 'task' oder 'address'. Ohne kind wird nach role gerendert. 'time' und 'system' erscheinen als zentrierte Zeile. */
        kind: null,
        /** Name des Autors (Kuerzel-Kreis und Name bei showAuthor) */
        authorName: null,
        /** Kuerzel im Kreis (Standard: Anfangsbuchstaben von authorName) */
        authorInitials: null,
        /** Fertig formatierter Zeitpunkt (hat Vorrang vor createdAt) */
        displayTime: null,
        /** Kleines Etikett, z. B. 'Intern' */
        badge: null,
        /** 'neutral', 'info', 'warning', 'success' oder 'danger' */
        badgeStyle: null,
        /** Zusatzzeile, z. B. Mail-Betreff */
        meta: null,
        /** Anhaenge des Eintrags, Typ attachment[] */
        attachments: null,
        /** true: Eintrag kann bearbeitet werden (onEdit), unabhaengig von allowEdit und role */
        canEdit: null,
        /** true: Eintrag kann geloescht werden (nur mit allowDelete, onDelete) */
        canDelete: null
    },
    /**
     * Anhang eines Eintrags bzw. vorgemerkter Anhang.
     */
    attachment: {
        /** Eigene ID, kommt unveraendert in onAttachmentClick-Auswertung des Servers zurueck */
        id: null,
        /** Dateiname */
        name: null,
        /** Fertig formatierte Groesse, z. B. '120 KB' */
        size: null,
        /** MIME-Typ */
        mimeType: null,
        /** Reserviert fuer ein Datei-Symbol */
        icon: null
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
        scrollToBottom: null, editCancel: null, editSave: null, sources: null, reasoning: null, send: null, cancel: null,
        delete: null, attach: null, removeAttachment: null, mail: null,
        /** Feedback-Kommentar: Platzhalter, Senden, Abbrechen, Hinweis (Protokollierung), Bestaetigung */
        feedbackCommentPlaceholder: null, feedbackCommentSubmit: null, feedbackCommentCancel: null,
        feedbackCommentHint: null, feedbackCommentThanks: null
    }
};
