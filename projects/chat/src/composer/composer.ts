// Portiert von assistant-ui (MIT, (c) 2026 AgentbaseAI Inc.) - siehe THIRD_PARTY_NOTICES.md
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, Renderer2, SimpleChanges, input, linkedSignal, output, viewChild } from '@angular/core';
import { JSEvent, ServoyBaseComponent, ServoyPublicService } from '@servoy/public';
import { HvoChatComposerCore, HvoChatSubmitEvent, HvoChatSubmitMode } from '../shared/composer-core/composer-core';

const ccDefaultPlaceholder = 'Nachricht eingeben …';
const ccDefaultSendText = 'Nachricht senden';
const ccDefaultCancelText = 'Antwort abbrechen';
const cnDefaultMaxHeight = 192;

/**
 * Chat Composer - Eingabefeld fuer Chat-Nachrichten (Servoy-Titanium-Komponente).
 *
 * Enter sendet (Shift+Enter = Zeilenumbruch), ohne dass der Zeilenumbruch kurz sichtbar wird.
 * Der Text geht als Parameter an onSubmit; optional wird ein Entwurf im Dataprovider gehalten.
 */
@Component({
    selector: 'hvochat-composer',
    templateUrl: './composer.html',
    styleUrls: ['./composer.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class HvoChatComposer extends ServoyBaseComponent<HTMLDivElement> implements OnDestroy {

    // --- Model (1:1 zur .spec) ---
    readonly dataProviderID = input<string>(undefined);
    readonly dataProviderIDChange = output<string>();
    readonly placeholderText = input<string, string | undefined>(ccDefaultPlaceholder, { transform: (pcValue) => pcValue ?? ccDefaultPlaceholder });
    readonly submitMode = input<HvoChatSubmitMode, HvoChatSubmitMode | undefined>('enter', { transform: (pcValue) => pcValue ?? 'enter' });
    readonly clearOnSubmit = input<boolean, boolean | undefined>(true, { transform: (pbValue) => pbValue ?? true });
    readonly busy = input<boolean, boolean | undefined>(false, { transform: (pbValue) => !!pbValue });
    readonly maxHeight = input<number, number | undefined>(cnDefaultMaxHeight, { transform: (pnValue) => pnValue ?? cnDefaultMaxHeight });
    readonly maxLength = input<number, number | undefined>(0, { transform: (pnValue) => pnValue ?? 0 });
    readonly autoFocus = input<boolean, boolean | undefined>(false, { transform: (pbValue) => !!pbValue });
    readonly showSendButton = input<boolean, boolean | undefined>(true, { transform: (pbValue) => pbValue ?? true });
    readonly sendButtonText = input<string, string | undefined>(ccDefaultSendText, { transform: (pcValue) => pcValue ?? ccDefaultSendText });
    readonly cancelButtonText = input<string, string | undefined>(ccDefaultCancelText, { transform: (pcValue) => pcValue ?? ccDefaultCancelText });
    readonly enabled = input<boolean, boolean | undefined>(true, { transform: (pbValue) => pbValue ?? true });
    readonly readOnly = input<boolean, boolean | undefined>(false, { transform: (pbValue) => !!pbValue });
    readonly styleClass = input<string>(undefined);
    readonly tabSeq = input<number>(undefined);
    readonly visible = input<boolean>(undefined);

    // --- Handler ---
    readonly onSubmit = input<(text: string, event: JSEvent) => Promise<boolean>>(undefined);
    readonly onCancel = input<(event: JSEvent) => Promise<unknown>>(undefined);

    readonly core = viewChild(HvoChatComposerCore);

    /** Lokaler Entwurf; wird zurueckgesetzt, wenn der Dataprovider vom Server geaendert wird */
    readonly draft = linkedSignal<string>(() => this.dataProviderID() ?? '');

    private focusTimer: ReturnType<typeof setTimeout> | undefined;
    /** Zuletzt an Servoy gesendeter Dataprovider-Wert (das Input aktualisiert sich bei eigenen Aenderungen nicht) */
    private pushedValue: string | undefined;

    constructor(renderer: Renderer2, cdRef: ChangeDetectorRef, private servoyService: ServoyPublicService) {
        super(renderer, cdRef);
    }

    svyOnInit(): void {
        super.svyOnInit();
        if (this.servoyApi.isInDesigner() || !this.autoFocus()) return;
        // Fokus erst nach dem Einblenden des Formulars setzen
        this.focusTimer = setTimeout(() => this.core()?.focus());
    }

    svyOnChanges(changes: SimpleChanges): void {
        super.svyOnChanges(changes);
        // Server hat den Dataprovider gesetzt (z. B. _frage = '' im Handler) -> neuer Vergleichswert
        if (changes['dataProviderID']) this.pushedValue = this.dataProviderID() ?? '';
    }

    ngOnDestroy(): void {
        super.ngOnDestroy();
        clearTimeout(this.focusTimer);
    }

    /**
     * Absolute-Layout: Komponente fuellt die Box; Responsive: Auto-Grow.
     * @returns {boolean}
     */
    isFillLayout(): boolean {
        return !!this.servoyApi?.isInAbsoluteLayout();
    }

    // --- API ---

    /**
     * Setzt den Fokus in das Eingabefeld.
     */
    requestFocus(): void {
        this.core()?.focus();
    }

    /**
     * Leert das Eingabefeld (und den Dataprovider).
     */
    clear(): void {
        this.draft.set('');
        this.pushDraft();
        this.detectChanges();
    }

    /**
     * Setzt den Text des Eingabefelds (und den Dataprovider).
     * @param {string} text - neuer Text
     */
    setText(text: string): void {
        this.draft.set(text ?? '');
        this.pushDraft();
        this.detectChanges();
    }

    /**
     * Liefert den aktuellen Text.
     * @returns {string}
     */
    getText(): string {
        return this.draft();
    }

    // --- interne Ereignisse ---

    /**
     * Startet die Bearbeitung des Dataproviders (Record-Locking etc.).
     */
    onFocus(): void {
        this.servoyApi.startEdit('dataProviderID');
    }

    /**
     * Schreibt den Entwurf in den Dataprovider, falls geaendert.
     */
    pushDraft(): void {
        this.pushValue(this.draft());
    }

    /**
     * Sendet einen Wert an den Dataprovider, falls er sich vom zuletzt bekannten Serverwert unterscheidet.
     * @param {string} pcValue
     */
    private pushValue(pcValue: string): void {
        const lcServerValue = this.pushedValue ?? (this.dataProviderID() ?? '');
        if (pcValue === lcServerValue) return;
        this.pushedValue = pcValue;
        this.dataProviderIDChange.emit(pcValue);
    }

    /**
     * Absenden. Reihenfolge ist wichtig, damit beide Servoy-Muster funktionieren:
     * 1. Text in den Dataprovider schreiben (Handler, die z. B. _frage lesen, sehen den Text)
     * 2. Feld sofort leeren (nur Anzeige, kein Flackern)
     * 3. onSubmit(text, event) aufrufen
     * 4. danach Dataprovider leeren - bzw. bei Ablehnung/Fehler den Text wiederherstellen
     * @param {HvoChatSubmitEvent} poSubmit
     */
    onSubmitted(poSubmit: HvoChatSubmitEvent): void {
        const lcText = poSubmit.text;
        const lfnHandler = this.onSubmit();
        const lbClear = this.clearOnSubmit();
        this.pushValue(lcText);
        if (lbClear) this.draft.set('');
        if (!lfnHandler) {
            if (lbClear) this.pushValue('');
            return;
        }
        const lfnRestore = (): void => {
            if (!lbClear || this.draft() !== '') return;
            this.draft.set(lcText);
            this.pushValue(lcText);
            this.detectChanges();
        };
        lfnHandler(lcText, this.servoyService.createJSEvent(poSubmit.event, 'onSubmit'))
            .then((pbAccepted) => {
                if (pbAccepted === false) {
                    lfnRestore();
                    return;
                }
                // Nur leeren, wenn der Benutzer inzwischen nichts Neues getippt hat
                if (lbClear && this.draft() === '') this.pushValue('');
            })
            .catch(() => lfnRestore());
    }

    /**
     * Abbruch (Stopp-Button / Escape waehrend busy).
     * @param {Event} poEvent
     */
    onCancelled(poEvent: Event): void {
        const lfnHandler = this.onCancel();
        if (!lfnHandler) return;
        lfnHandler(this.servoyService.createJSEvent(poEvent, 'onCancel'));
    }
}
