import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, input, output, signal, viewChild } from '@angular/core';

/** Bewertung einer Antwort */
export type HvoChatFeedbackValue = 'positive' | 'negative';

/** Beschriftungen des Feedback-Bausteins (bereits aufgeloest: Solution-Override oder Standard) */
export interface HvoChatFeedbackTexts {
    positive: string;
    negative: string;
    commentLabel: string;
    commentPlaceholder: string;
    commentSubmit: string;
    commentCancel: string;
    commentHint: string;
    commentThanks: string;
}

/** Klick auf einen Daumen */
export interface HvoChatFeedbackClick {
    feedback: HvoChatFeedbackValue;
    event: Event;
}

/** Abgeschickter Kommentar */
export interface HvoChatFeedbackComment {
    comment: string;
    event: Event;
}

/** Standardtexte (Deutsch) - auch von hvochat-thread und hvochat-feedback als Fallback genutzt */
export const HVOCHAT_FEEDBACK_DEFAULT_TEXTS: HvoChatFeedbackTexts = {
    positive: 'Hilfreich',
    negative: 'Nicht hilfreich',
    commentLabel: 'Kommentar zum Feedback',
    commentPlaceholder: 'Was war nicht hilfreich? (optional)',
    commentSubmit: 'Senden',
    commentCancel: 'Abbrechen',
    commentHint: 'Kommentare werden nur gespeichert, wenn die Protokollierung für Ihren Mandanten aktiv ist.',
    commentThanks: 'Danke für Ihr Feedback'
};

const cnDefaultMaxLength = 1000;
// Fortlaufende Nummer fuer eindeutige Element-IDs (aria-describedby) je Instanz
let gnFeedbackUid = 0;
// IME-Komposition (Tottasten, asiatische Eingabe)
const cnImeKeyCode = 229;

/**
 * Interner Feedback-Baustein (keine Servoy-Komponente, keine .spec): Daumen hoch/runter und optionale
 * Kommentarbox fuer Daumen runter. Wird von hvochat-thread (pro Antwort) und hvochat-feedback (eigenstaendig)
 * verwendet - die Servoy-Anbindung (Handler, IDs) macht der jeweilige Wrapper.
 *
 * Der Host ist "display: contents": Daumen, Danke-Text und Kommentarbox werden direkte Flex-Kinder des
 * umgebenden Containers; die Kommentarbox bricht per flex-basis 100 % in eine eigene Zeile um.
 *
 * Datenschutz: Kommentartexte koennen personenbezogene Daten enthalten und werden nie geloggt.
 */
@Component({
    selector: 'hvochat-internal-feedback',
    templateUrl: './feedback-core.html',
    styleUrls: ['./feedback-core.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class HvoChatFeedbackCore {

    /** Aktuell gewaehlte Bewertung (Thread: message.feedback vom Server, Standalone: lokaler Wert) */
    readonly feedback = input<HvoChatFeedbackValue | null | undefined>(null);
    /** Kommentarbox bei Daumen runter anbieten (nur sinnvoll, wenn ein Kommentar-Handler zugewiesen ist) */
    readonly commentEnabled = input<boolean>(false);
    readonly maxLength = input<number>(cnDefaultMaxLength);
    readonly enabled = input<boolean>(true);
    readonly texts = input<HvoChatFeedbackTexts>(HVOCHAT_FEEDBACK_DEFAULT_TEXTS);
    /** Daumen bei fehlendem Hover ausblenden (wie die Aktionsleiste aelterer Nachrichten im Thread) */
    readonly autohide = input<boolean>(false);
    /** Daumen per Tab erreichbar (Standalone); im Thread sind die Aktionsbuttons aus der Tab-Reihenfolge genommen */
    readonly focusable = input<boolean>(false);
    readonly tabSeq = input<number>(undefined);

    readonly feedbackClick = output<HvoChatFeedbackClick>();
    readonly commentSubmit = output<HvoChatFeedbackComment>();

    readonly positiveButton = viewChild<ElementRef<HTMLButtonElement>>('positiveButton');
    readonly negativeButton = viewChild<ElementRef<HTMLButtonElement>>('negativeButton');
    readonly commentArea = viewChild<ElementRef<HTMLTextAreaElement>>('commentArea');

    /** Eindeutiges ID-Praefix dieser Instanz (Hinweis/Zaehler fuer aria-describedby) */
    readonly uid = `hvochat-fb-${++gnFeedbackUid}`;

    readonly commentOpen = signal(false);
    readonly commentText = signal('');
    readonly thanked = signal(false);
    /** Daumen runter geklickt, Server hat feedback evtl. noch nicht zurueckgemeldet (Doppelklick-Sperre) */
    private readonly negativePending = signal(false);

    readonly effectiveMaxLength = computed(() => (this.maxLength() > 0 ? this.maxLength() : cnDefaultMaxLength));
    readonly trimmedComment = computed(() => this.commentText().trim());
    readonly canSubmit = computed(() => this.enabled() && this.trimmedComment().length > 0);

    constructor() {
        // Wechselt die Bewertung von aussen auf "hilfreich" (oder wird zurueckgesetzt), gilt die Kommentarbox nicht mehr
        effect(() => {
            const lcFeedback = this.feedback();
            if (lcFeedback === 'negative') return;
            this.negativePending.set(false);
            if (lcFeedback === 'positive') this.clearComment(true);
        });
    }

    /**
     * Klick auf einen Daumen.
     * - Kommentarmodus aus: jeder Klick meldet die Bewertung (unveraendertes Verhalten).
     * - Kommentarmodus an: ein bereits gewaehltes "nicht hilfreich" loest nichts erneut aus.
     * @param {HvoChatFeedbackValue} pcFeedback
     * @param {Event} poEvent
     */
    onThumb(pcFeedback: HvoChatFeedbackValue, poEvent: Event): void {
        if (!this.enabled()) return;
        const lbCommentMode = this.commentEnabled();

        if (pcFeedback === 'negative' && lbCommentMode && (this.feedback() === 'negative' || this.negativePending())) return;

        // Bewertung immer sofort melden - der Kommentar ist optional und kommt ggf. spaeter
        this.feedbackClick.emit({ feedback: pcFeedback, event: poEvent });

        if (pcFeedback === 'positive') {
            this.negativePending.set(false);
            this.clearComment(true);
            return;
        }
        if (!lbCommentMode) return;
        this.negativePending.set(true);
        this.thanked.set(false);
        this.commentText.set('');
        this.commentOpen.set(true);
        setTimeout(() => this.commentArea()?.nativeElement.focus());
    }

    /**
     * Uebernimmt die Eingabe im Kommentarfeld.
     * @param {Event} poEvent
     */
    onCommentInput(poEvent: Event): void {
        this.commentText.set((poEvent.target as HTMLTextAreaElement).value);
    }

    /**
     * Tastatur im Kommentarfeld: Strg/Cmd+Enter sendet, Escape schliesst, Enter = neue Zeile.
     * @param {KeyboardEvent} poEvent
     */
    onCommentKeyDown(poEvent: KeyboardEvent): void {
        if (poEvent.isComposing || poEvent.keyCode === cnImeKeyCode) return;
        if (poEvent.key === 'Escape') {
            poEvent.preventDefault();
            poEvent.stopPropagation();
            this.cancelComment();
            return;
        }
        if (poEvent.key === 'Enter' && (poEvent.ctrlKey || poEvent.metaKey)) {
            poEvent.preventDefault();
            this.submitComment(poEvent);
        }
    }

    /**
     * Schickt den (getrimmten, auf die Maximallaenge gekuerzten) Kommentar ab.
     * @param {Event} poEvent
     */
    submitComment(poEvent: Event): void {
        if (!this.canSubmit()) return;
        const lcComment = this.trimmedComment().slice(0, this.effectiveMaxLength());
        this.commentSubmit.emit({ comment: lcComment, event: poEvent });
        this.commentOpen.set(false);
        this.commentText.set('');
        this.thanked.set(true);
    }

    /**
     * Schliesst die Kommentarbox ohne Senden; Fokus zurueck auf "nicht hilfreich".
     */
    cancelComment(): void {
        this.clearComment(false);
        setTimeout(() => this.negativeButton()?.nativeElement.focus());
    }

    /**
     * Setzt Kommentarbox, Danke-Text und Doppelklick-Sperre zurueck (z. B. API reset() des Standalone-Elements).
     */
    reset(): void {
        this.negativePending.set(false);
        this.clearComment(true);
    }

    /**
     * Fokus auf den ersten Daumen.
     */
    focus(): void {
        this.positiveButton()?.nativeElement.focus();
    }

    /**
     * Schliesst und leert die Kommentarbox.
     * @param {boolean} pbClearThanks - auch den Danke-Text entfernen
     */
    private clearComment(pbClearThanks: boolean): void {
        this.commentOpen.set(false);
        this.commentText.set('');
        if (pbClearThanks) this.thanked.set(false);
    }
}
