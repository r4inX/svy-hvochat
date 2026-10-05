import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, Renderer2, SimpleChanges, computed, input, linkedSignal, output, viewChild } from '@angular/core';
import { JSEvent, ServoyBaseComponent, ServoyPublicService } from '@servoy/public';
import { HVOCHAT_FEEDBACK_DEFAULT_TEXTS, HvoChatFeedbackCore, HvoChatFeedbackTexts, HvoChatFeedbackValue } from '../shared/feedback/feedback-core';

/** Ueberschreibbare Texte - .spec-Typ "feedbackTexts" */
export type HvoChatFeedbackTextOverrides = Partial<Omit<HvoChatFeedbackTexts, 'commentLabel'>>;

const cnDefaultCommentMaxLength = 1000;

/**
 * Feedback (Daumen) - eigenstaendiges Servoy-Element mit Daumen hoch/runter und optionalem Kommentar,
 * gleiche Optik und gleiches Verhalten wie im hvochat-thread (gemeinsamer Baustein hvochat-internal-feedback).
 * Fuer Stellen ohne Chat-Thread, z. B. eine Antwort-Popup-Form mit Text-Label + Feedback.
 *
 * Die Auswahl wird sofort lokal angezeigt (optional in den Dataprovider geschrieben); contextId wird in den
 * Handlern mitgeliefert, damit ein Handler mehrere Elemente bedienen kann.
 * Datenschutz: Kommentartexte werden nie geloggt.
 */
@Component({
    selector: 'hvochat-feedback',
    templateUrl: './feedback.html',
    styleUrls: ['./feedback.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class HvoChatFeedback extends ServoyBaseComponent<HTMLDivElement> implements OnDestroy {

    // --- Model (1:1 zur .spec) ---
    readonly dataProviderID = input<HvoChatFeedbackValue | null>(undefined);
    readonly dataProviderIDChange = output<HvoChatFeedbackValue | null>();
    readonly contextId = input<string>(undefined);
    readonly label = input<string>(undefined);
    readonly allowComment = input<boolean, boolean | undefined>(false, { transform: (pbValue) => !!pbValue });
    readonly commentMaxLength = input<number, number | undefined>(cnDefaultCommentMaxLength, {
        transform: (pnValue) => (pnValue && pnValue > 0 ? pnValue : cnDefaultCommentMaxLength)
    });
    readonly texts = input<HvoChatFeedbackTextOverrides>(undefined);
    readonly enabled = input<boolean, boolean | undefined>(true, { transform: (pbValue) => pbValue ?? true });
    readonly styleClass = input<string>(undefined);
    readonly tabSeq = input<number>(undefined);
    readonly visible = input<boolean>(undefined);

    // --- Handler ---
    readonly onFeedback = input<(contextId: string, feedback: string, event: JSEvent) => Promise<unknown>>(undefined);
    readonly onFeedbackComment = input<(contextId: string, comment: string, event: JSEvent) => Promise<unknown>>(undefined);

    readonly core = viewChild(HvoChatFeedbackCore);

    /** Aktuelle Bewertung: folgt dem Dataprovider, wird bei Klick sofort lokal gesetzt */
    readonly value = linkedSignal<HvoChatFeedbackValue | null>(() => this.normalize(this.dataProviderID()));

    /** Beschriftungen (Solution-Override oder deutscher Standard) */
    readonly resolvedTexts = computed<HvoChatFeedbackTexts>(() => {
        const loOverrides = this.texts() ?? {};
        const loResult: HvoChatFeedbackTexts = { ...HVOCHAT_FEEDBACK_DEFAULT_TEXTS };
        for (const lcKey of Object.keys(loOverrides) as (keyof HvoChatFeedbackTextOverrides)[]) {
            if (loOverrides[lcKey]) loResult[lcKey] = loOverrides[lcKey];
        }
        return loResult;
    });

    constructor(renderer: Renderer2, cdRef: ChangeDetectorRef, private servoyService: ServoyPublicService) {
        super(renderer, cdRef);
    }

    svyOnInit(): void {
        super.svyOnInit();
    }

    svyOnChanges(changes: SimpleChanges): void {
        super.svyOnChanges(changes);
    }

    ngOnDestroy(): void {
        super.ngOnDestroy();
    }

    // --- API ---

    /**
     * Setzt Bewertung (inkl. Dataprovider), Kommentarbox und Danke-Text zurueck.
     */
    reset(): void {
        this.core()?.reset();
        if (this.value() !== null) {
            this.value.set(null);
            this.dataProviderIDChange.emit(null);
        }
        this.detectChanges();
    }

    /**
     * Setzt den Fokus auf "hilfreich".
     */
    requestFocus(): void {
        this.core()?.focus();
    }

    // --- interne Ereignisse ---

    /**
     * Klick auf einen Daumen: sofort lokal anzeigen, Dataprovider schreiben, dann onFeedback melden.
     * @param {HvoChatFeedbackValue} pcFeedback
     * @param {Event} poEvent
     */
    onThumb(pcFeedback: HvoChatFeedbackValue, poEvent: Event): void {
        if (this.value() !== pcFeedback) {
            this.value.set(pcFeedback);
            this.dataProviderIDChange.emit(pcFeedback);
        }
        this.onFeedback()?.(this.contextId() ?? '', pcFeedback, this.servoyService.createJSEvent(poEvent, 'onFeedback'));
    }

    /**
     * Kommentar abgeschickt (nicht loggen - kann personenbezogene Daten enthalten).
     * @param {string} pcComment
     * @param {Event} poEvent
     */
    onComment(pcComment: string, poEvent: Event): void {
        if (!pcComment) return;
        this.onFeedbackComment()?.(this.contextId() ?? '', pcComment, this.servoyService.createJSEvent(poEvent, 'onFeedbackComment'));
    }

    /**
     * Nur 'positive' / 'negative' gelten als Bewertung, alles andere als "keine".
     * @param {unknown} poValue
     * @returns {HvoChatFeedbackValue|null}
     */
    private normalize(poValue: unknown): HvoChatFeedbackValue | null {
        return poValue === 'positive' || poValue === 'negative' ? poValue : null;
    }
}
