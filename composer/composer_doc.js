/*
 * Chat Composer: Eingabefeld fuer Chat-Nachrichten (portiert aus assistant-ui).
 * Enter sendet, Shift+Enter fuegt eine neue Zeile ein. Der Zeilenumbruch wird beim Senden nicht kurz angezeigt.
 * Der Text wird als Parameter an onSubmit uebergeben. Ein Dataprovider ist optional und haelt den Entwurf.
 */

/**
 * Optional: Dataprovider fuer den aktuellen Entwurf.
 * Wird bei Fokusverlust und nach dem Absenden geschrieben.
 */
var dataProviderID;

/**
 * Platzhaltertext im leeren Eingabefeld.
 */
var placeholderText;

/**
 * Absende-Modus: 'enter' (Enter sendet), 'ctrlEnter' (Strg/Cmd+Enter sendet) oder 'none' (nur Button).
 */
var submitMode;

/**
 * Eingabefeld nach dem Absenden leeren (Standard: true).
 */
var clearOnSubmit;

/**
 * true, solange eine Antwort erzeugt wird.
 * Absenden ist dann gesperrt, statt des Senden-Buttons erscheint ein Stopp-Button (loest onCancel aus).
 */
var busy;

/**
 * Maximale Hoehe des Eingabefelds in px im Responsive-Layout. Darueber wird gescrollt.
 */
var maxHeight;

/**
 * Maximale Zeichenanzahl, 0 = unbegrenzt.
 */
var maxLength;

/**
 * Fokus beim Anzeigen des Formulars setzen.
 */
var autoFocus;

/**
 * Senden-Button anzeigen.
 */
var showSendButton;

/**
 * Tooltip / Screenreader-Text des Senden-Buttons.
 */
var sendButtonText;

/**
 * Tooltip / Screenreader-Text des Stopp-Buttons.
 */
var cancelButtonText;

/**
 * Gibt an, ob die Komponente bedienbar ist.
 */
var enabled;

/**
 * Nur lesen (wird von controller.readOnly gesetzt).
 */
var readOnly;

/**
 * Zusaetzliche CSS-Klassen. Farben sind ueber CSS-Variablen anpassbar, z. B.:
 * .mein-chat { --hvochat-primary: #0d6efd; --hvochat-radius: 0.5rem; }
 */
var styleClass;

/**
 * Tab-Reihenfolge.
 */
var tabSeq;

/**
 * Sichtbarkeit.
 */
var visible;

var handlers = {
    /**
     * Wird beim Absenden aufgerufen (Enter bzw. Senden-Button).
     *
     * @param {String} text Der eingegebene Text (getrimmt)
     * @param {JSEvent} event Das ausloesende Event
     *
     * @return {Boolean} false: der Text wird wieder ins Eingabefeld gesetzt
     */
    onSubmit: function() {},

    /**
     * Wird ausgeloest, wenn waehrend busy der Stopp-Button oder Escape gedrueckt wird.
     *
     * @param {JSEvent} event Das ausloesende Event
     */
    onCancel: function() {}
};

/**
 * Setzt den Fokus in das Eingabefeld.
 *
 * @example %%prefix%%%%elementName%%.requestFocus();
 */
function requestFocus() {
}

/**
 * Leert das Eingabefeld und den Dataprovider.
 *
 * @example %%prefix%%%%elementName%%.clear();
 */
function clear() {
}

/**
 * Setzt den Text des Eingabefelds und des Dataproviders.
 *
 * @example %%prefix%%%%elementName%%.setText('Fasse das Dokument zusammen');
 *
 * @param {String} text Neuer Text
 */
function setText(text) {
}

/**
 * Liefert den aktuellen Text des Eingabefelds.
 *
 * @example var lcText = %%prefix%%%%elementName%%.getText();
 *
 * @return {String}
 */
function getText() {
}
