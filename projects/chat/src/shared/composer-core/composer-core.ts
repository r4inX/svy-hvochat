// Portiert von assistant-ui (MIT, (c) 2026 AgentbaseAI Inc.):
//   packages/react/src/primitives/composer/ComposerInput.tsx  (Tastatur-/IME-Verhalten)
//   packages/ui/src/components/react/assistant-ui/elements/thread.aui.tsx  (Composer, ComposerAction: Optik)
//   Stand: b6444661cf03cae6c5e10baba1e12c9e010b8ea0
import { ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect, computed, input, model, output, viewChild } from '@angular/core';

/** Absende-Modus: Enter | Strg/Cmd+Enter | nur Button */
export type HvoChatSubmitMode = 'enter' | 'ctrlEnter' | 'none';

/** Ergebnis eines Absende-Vorgangs */
export interface HvoChatSubmitEvent {
    text: string;
    event: Event;
}

// IME-Komposition (z. B. Tottasten, asiatische Eingabe) meldet keyCode 229
const cnImeKeyCode = 229;

/**
 * Interner Composer-Kern (keine Servoy-Komponente, keine .spec).
 * Textarea mit Auto-Grow, Enter-zum-Senden (ohne sichtbaren Zeilenumbruch), Senden-/Stopp-Button.
 * Wird von hvochat-composer und hvochat-thread verwendet; Servoy-Anbindung macht der jeweilige Wrapper.
 */
@Component({
    selector: 'hvochat-internal-composer',
    templateUrl: './composer-core.html',
    styleUrls: ['./composer-core.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class HvoChatComposerCore {

    readonly text = model<string>('');
    readonly placeholder = input<string>('');
    readonly submitMode = input<HvoChatSubmitMode>('enter');
    readonly busy = input<boolean>(false);
    readonly enabled = input<boolean>(true);
    readonly readOnly = input<boolean>(false);
    readonly maxHeight = input<number>(192);
    readonly maxLength = input<number>(0);
    readonly showSendButton = input<boolean>(true);
    readonly sendLabel = input<string>('Nachricht senden');
    readonly cancelLabel = input<string>('Antwort abbrechen');
    /** true: fuellt die vorgegebene Hoehe (Absolute-Layout), sonst Auto-Grow bis maxHeight */
    readonly fillHeight = input<boolean>(false);
    readonly markupId = input<string>(undefined);
    readonly tabSeq = input<number>(undefined);

    readonly submitted = output<HvoChatSubmitEvent>();
    readonly cancelled = output<Event>();
    readonly focused = output<FocusEvent>();
    readonly blurred = output<FocusEvent>();

    readonly textArea = viewChild<ElementRef<HTMLTextAreaElement>>('textArea');

    readonly editable = computed(() => this.enabled() && !this.readOnly());
    readonly canSend = computed(() => this.editable() && !this.busy() && (this.text() ?? '').trim().length > 0);

    constructor() {
        // Nach jedem Rendern mit geaendertem Text/Groessenvorgaben die Hoehe anpassen
        afterRenderEffect(() => {
            this.text();
            this.maxHeight();
            this.fillHeight();
            this.autoResize();
        });
    }

    /**
     * Setzt den Fokus in das Eingabefeld, Cursor ans Ende.
     */
    focus(): void {
        const lelArea = this.textArea()?.nativeElement;
        if (!lelArea) return;
        lelArea.focus({ preventScroll: true });
        const lnLength = lelArea.value.length;
        lelArea.setSelectionRange(lnLength, lnLength);
    }

    /**
     * Uebernimmt die Eingabe in das Model.
     */
    onInput(): void {
        this.text.set(this.textArea()?.nativeElement.value ?? '');
    }

    /**
     * Tastatursteuerung: Enter/Strg+Enter sendet, Shift+Enter = neue Zeile, Escape bricht waehrend busy ab.
     * Wichtig: preventDefault im keydown, damit der Zeilenumbruch gar nicht erst gerendert wird.
     * @param {KeyboardEvent} poEvent
     */
    onKeyDown(poEvent: KeyboardEvent): void {
        if (poEvent.isComposing || poEvent.keyCode === cnImeKeyCode) return;
        if (poEvent.key === 'Escape') {
            if (!this.busy()) return;
            poEvent.preventDefault();
            this.cancel(poEvent);
            return;
        }
        if (poEvent.key !== 'Enter' || poEvent.shiftKey) return;
        const lcMode = this.submitMode();
        if (lcMode === 'none') return;
        if (lcMode === 'ctrlEnter' && !(poEvent.ctrlKey || poEvent.metaKey)) return;
        // Auch bei busy/leer kein Zeilenumbruch - sonst "springt" das Feld sichtbar
        poEvent.preventDefault();
        this.submit(poEvent);
    }

    /**
     * Sendet den aktuellen Text (getrimmt), sofern erlaubt.
     * @param {Event} poEvent - ausloesendes Event
     */
    submit(poEvent: Event): void {
        if (!this.canSend()) return;
        this.submitted.emit({ text: this.text().trim(), event: poEvent });
    }

    /**
     * Meldet einen Abbruch (Stopp-Button / Escape).
     * @param {Event} poEvent
     */
    cancel(poEvent: Event): void {
        if (!this.enabled()) return;
        this.cancelled.emit(poEvent);
    }

    /**
     * Klick auf freie Flaeche der Composer-Box fokussiert das Eingabefeld (wie im Original "cursor-text").
     * @param {MouseEvent} poEvent
     */
    onShellMouseDown(poEvent: MouseEvent): void {
        const lelTarget = poEvent.target as HTMLElement;
        if (lelTarget.closest('button, textarea, a')) return;
        poEvent.preventDefault();
        this.focus();
    }

    /**
     * Passt die Hoehe des Eingabefelds an.
     * Absolute-Layout: CSS (flex) fuellt die Box, kein JS noetig. Sonst Auto-Grow bis maxHeight, danach Scrollen.
     */
    private autoResize(): void {
        const lelArea = this.textArea()?.nativeElement;
        if (!lelArea) return;
        if (this.fillHeight()) {
            lelArea.style.height = '';
            lelArea.style.overflowY = 'auto';
            return;
        }
        lelArea.style.height = 'auto';
        const lnNeeded = lelArea.scrollHeight;
        const lnMax = this.maxHeight() > 0 ? this.maxHeight() : lnNeeded;
        lelArea.style.height = `${Math.min(lnNeeded, lnMax)}px`;
        lelArea.style.overflowY = lnNeeded > lnMax ? 'auto' : 'hidden';
    }
}
