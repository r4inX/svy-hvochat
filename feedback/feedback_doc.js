/*
 * Feedback (Daumen): eigenstaendige Bewertung mit Daumen hoch/runter und optionalem Kommentar bei Daumen runter.
 * Gleiche Optik und gleiches Verhalten wie im hvochat-thread. Gedacht fuer Stellen ohne Chat-Thread,
 * z. B. eine eigene Popup-Form mit Antworttext und diesem Element (in plugins.dialogs-Messageboxen
 * lassen sich keine Elemente einbauen).
 */

/**
 * Optional: Dataprovider fuer die Bewertung ('positive' / 'negative' / null).
 * Die Auswahl wird sofort angezeigt und hierhin geschrieben. Ohne Bindung haelt das Element den Zustand selbst.
 */
var dataProviderID;

/**
 * Frei waehlbare ID, z. B. die request_id der KI-Antwort.
 * Wird in onFeedback und onFeedbackComment als erster Parameter mitgeliefert.
 */
var contextId;

/**
 * Optionaler Text links der Daumen, z. B. 'War diese Antwort hilfreich?'.
 */
var label;

/**
 * Bei Daumen runter ein optionales Kommentarfeld anbieten. Benoetigt einen onFeedbackComment-Handler.
 * Im Absolute-Layout muss das Element hoch genug sein (ca. 200 px), damit die Kommentarbox Platz hat.
 */
var allowComment;

/**
 * Maximale Laenge des Kommentars (Standard 1000).
 */
var commentMaxLength;

/**
 * Beschriftungen und Tooltips ueberschreiben (Standard: Deutsch).
 */
var texts;

/**
 * Gibt an, ob das Element bedienbar ist.
 */
var enabled;

/**
 * Zusaetzliche CSS-Klassen. Farben ueber CSS-Variablen (--hvochat-*), siehe README des Packages.
 */
var styleClass;

/**
 * Tab-Reihenfolge der Daumen.
 */
var tabSeq;

/**
 * Sichtbarkeit.
 */
var visible;

var handlers = {
    /**
     * Wird sofort bei jedem Klick auf einen Daumen ausgeloest.
     * Mit allowComment loest ein erneuter Klick auf ein bereits gewaehltes 'negative' nichts aus.
     *
     * @param {String} contextId Die contextId des Elements
     * @param {String} feedback 'positive' oder 'negative'
     * @param {JSEvent} event Das ausloesende Event
     */
    onFeedback: function() {},

    /**
     * Kommentar zu Daumen runter abgeschickt (nur bei allowComment).
     * onFeedback(contextId, 'negative') wurde vorher bereits gemeldet. Fuer das Backend die Bewertung
     * 'down' zusammen mit dem Kommentar erneut senden (ersetzt die vorige Bewertung).
     * Der Kommentar kann personenbezogene Daten enthalten - nicht loggen.
     *
     * @param {String} contextId Die contextId des Elements
     * @param {String} comment Der Kommentar (getrimmt, hoechstens commentMaxLength Zeichen)
     * @param {JSEvent} event Das ausloesende Event
     */
    onFeedbackComment: function() {}
};

/**
 * Setzt Bewertung (inkl. Dataprovider), Kommentarbox und Danke-Text zurueck, z. B. fuer die naechste Antwort.
 *
 * @example %%prefix%%%%elementName%%.reset();
 */
function reset() {
}

/**
 * Setzt den Fokus auf den Daumen hoch.
 *
 * @example %%prefix%%%%elementName%%.requestFocus();
 */
function requestFocus() {
}

var svy_types = {
    /**
     * Ueberschreibbare Beschriftungen.
     */
    feedbackTexts: {
        /** Tooltip Daumen hoch (Standard: 'Hilfreich') */
        positive: null,
        /** Tooltip Daumen runter (Standard: 'Nicht hilfreich') */
        negative: null,
        /** Platzhalter im Kommentarfeld */
        commentPlaceholder: null,
        /** Senden-Button */
        commentSubmit: null,
        /** Abbrechen-Button */
        commentCancel: null,
        /** Hinweis unter dem Kommentarfeld */
        commentHint: null,
        /** Bestaetigung nach dem Senden */
        commentThanks: null
    }
};
