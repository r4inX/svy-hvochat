// Portiert von assistant-ui (MIT, (c) 2026 AgentbaseAI Inc.) - Primitives Thread, Message, MessagePart,
// ActionBar, ActionBarMore, BranchPicker, Suggestion, Error, ChainOfThought/Reasoning, Sources.
// Optik: packages/ui/src/components/react/assistant-ui/elements/thread.aui.tsx, markdown-text.tsx,
// reasoning.tsx, sources.tsx @ b6444661cf03cae6c5e10baba1e12c9e010b8ea0 - siehe THIRD_PARTY_NOTICES.md
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnDestroy, Renderer2, SimpleChanges, computed, input, signal, viewChild } from '@angular/core';
import { JSEvent, ServoyBaseComponent, ServoyPublicService } from '@servoy/public';
import { HvoChatComposerCore, HvoChatSubmitEvent, HvoChatSubmitMode } from '../shared/composer-core/composer-core';
import { HVOCHAT_FEEDBACK_DEFAULT_TEXTS, HvoChatFeedbackTexts } from '../shared/feedback/feedback-core';
import { renderChatText } from '../shared/markdown/markdown.pipe';

/** Quelle einer Antwort (RAG) - .spec-Typ "source" */
export interface HvoChatSource {
    id?: string;
    title?: string;
    url?: string;
    snippet?: string;
    label?: string;
}

/** Nachricht - .spec-Typ "message" */
export interface HvoChatMessage {
    id: string;
    role: 'user' | 'assistant';
    text?: string;
    status?: 'complete' | 'running' | 'error';
    error?: string;
    reasoning?: string;
    sources?: HvoChatSource[];
    images?: string[];
    branchNumber?: number;
    branchCount?: number;
    feedback?: 'positive' | 'negative' | null;
    /** true: keine Daumen/Kommentarbox fuer diese Nachricht (z. B. aeltere Nachrichten ohne Backend-request_id) */
    feedbackDisabled?: boolean;
    createdAt?: Date;
}

/** Vorschlag im leeren Zustand - .spec-Typ "suggestion" */
export interface HvoChatSuggestion {
    title?: string;
    description?: string;
    prompt?: string;
}

const coDefaultTexts = {
    copy: 'Kopieren',
    copied: 'Kopiert',
    edit: 'Bearbeiten',
    reload: 'Neu generieren',
    feedbackPositive: HVOCHAT_FEEDBACK_DEFAULT_TEXTS.positive,
    feedbackNegative: HVOCHAT_FEEDBACK_DEFAULT_TEXTS.negative,
    feedbackCommentPlaceholder: HVOCHAT_FEEDBACK_DEFAULT_TEXTS.commentPlaceholder,
    feedbackCommentSubmit: HVOCHAT_FEEDBACK_DEFAULT_TEXTS.commentSubmit,
    feedbackCommentCancel: HVOCHAT_FEEDBACK_DEFAULT_TEXTS.commentCancel,
    feedbackCommentHint: HVOCHAT_FEEDBACK_DEFAULT_TEXTS.commentHint,
    feedbackCommentThanks: HVOCHAT_FEEDBACK_DEFAULT_TEXTS.commentThanks,
    speak: 'Vorlesen',
    stopSpeaking: 'Vorlesen beenden',
    more: 'Mehr',
    exportMarkdown: 'Als Markdown exportieren',
    previous: 'Vorherige Version',
    next: 'Nächste Version',
    scrollToBottom: 'Nach unten scrollen',
    editCancel: 'Abbrechen',
    editSave: 'Aktualisieren',
    sources: 'Quellen',
    reasoning: 'Denkprozess',
    send: 'Nachricht senden',
    cancel: 'Antwort abbrechen'
};

/** Schluessel der ueberschreibbaren Texte - .spec-Typ "threadTexts" */
export type HvoChatTextKey = keyof typeof coDefaultTexts;
export type HvoChatThreadTexts = Partial<Record<HvoChatTextKey, string>>;

// Abstand zum unteren Rand, ab dem "unten" gilt (px)
const cnBottomThreshold = 24;
// Dauer der "Kopiert"-Anzeige (ms)
const cnCopiedResetMs = 2000;
const cnDefaultMaxWidth = 704;
const cnDefaultCommentMaxLength = 1000;

/**
 * Chat Thread - komplette Chat-Ansicht (Servoy-Titanium-Komponente).
 *
 * Datenhaltung liegt beim Server (model "messages"); die Komponente rendert und meldet Benutzeraktionen
 * ueber Handler. Granulare Server-Updates (z. B. appendText beim Streaming) kommen mit gleicher Referenz an
 * (svyOnChanges + detectChanges) - daher lesen Template und Methoden messages() direkt, ohne computed().
 */
@Component({
    selector: 'hvochat-thread',
    templateUrl: './thread.html',
    styleUrls: ['./thread.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class HvoChatThread extends ServoyBaseComponent<HTMLDivElement> implements OnDestroy {

    // --- Model (1:1 zur .spec) ---
    readonly messages = input<HvoChatMessage[]>(undefined);
    readonly suggestions = input<HvoChatSuggestion[]>(undefined);
    readonly busy = input<boolean, boolean | undefined>(false, { transform: (pbValue) => !!pbValue });
    readonly welcomeText = input<string, string | undefined>('Wie kann ich helfen?', { transform: (pcValue) => pcValue ?? 'Wie kann ich helfen?' });
    readonly placeholderText = input<string, string | undefined>('Nachricht eingeben …', { transform: (pcValue) => pcValue ?? 'Nachricht eingeben …' });
    readonly submitMode = input<HvoChatSubmitMode, HvoChatSubmitMode | undefined>('enter', { transform: (pcValue) => pcValue ?? 'enter' });
    readonly maxLength = input<number, number | undefined>(0, { transform: (pnValue) => pnValue ?? 0 });
    readonly showComposer = input<boolean, boolean | undefined>(true, { transform: (pbValue) => pbValue ?? true });
    readonly markdown = input<boolean, boolean | undefined>(true, { transform: (pbValue) => pbValue ?? true });
    readonly allowCopy = input<boolean, boolean | undefined>(true, { transform: (pbValue) => pbValue ?? true });
    readonly allowEdit = input<boolean, boolean | undefined>(true, { transform: (pbValue) => pbValue ?? true });
    readonly allowReload = input<boolean, boolean | undefined>(true, { transform: (pbValue) => pbValue ?? true });
    readonly allowFeedback = input<boolean, boolean | undefined>(false, { transform: (pbValue) => !!pbValue });
    readonly allowFeedbackComment = input<boolean, boolean | undefined>(false, { transform: (pbValue) => !!pbValue });
    readonly feedbackCommentMaxLength = input<number, number | undefined>(cnDefaultCommentMaxLength, {
        transform: (pnValue) => (pnValue && pnValue > 0 ? pnValue : cnDefaultCommentMaxLength)
    });
    readonly allowSpeak = input<boolean, boolean | undefined>(false, { transform: (pbValue) => !!pbValue });
    readonly allowExportMarkdown = input<boolean, boolean | undefined>(true, { transform: (pbValue) => pbValue ?? true });
    readonly showBranchPicker = input<boolean, boolean | undefined>(true, { transform: (pbValue) => pbValue ?? true });
    readonly showSources = input<boolean, boolean | undefined>(true, { transform: (pbValue) => pbValue ?? true });
    readonly showReasoning = input<boolean, boolean | undefined>(true, { transform: (pbValue) => pbValue ?? true });
    readonly suggestionAutoSend = input<boolean, boolean | undefined>(true, { transform: (pbValue) => pbValue ?? true });
    readonly autoScroll = input<boolean, boolean | undefined>(true, { transform: (pbValue) => pbValue ?? true });
    readonly maxContentWidth = input<number, number | undefined>(cnDefaultMaxWidth, { transform: (pnValue) => pnValue ?? cnDefaultMaxWidth });
    readonly texts = input<HvoChatThreadTexts>(undefined);
    readonly enabled = input<boolean, boolean | undefined>(true, { transform: (pbValue) => pbValue ?? true });
    readonly styleClass = input<string>(undefined);
    readonly tabSeq = input<number>(undefined);
    readonly visible = input<boolean>(undefined);

    // --- Handler ---
    readonly onSubmit = input<(text: string, event: JSEvent) => Promise<boolean>>(undefined);
    readonly onCancel = input<(event: JSEvent) => Promise<unknown>>(undefined);
    readonly onReload = input<(messageId: string, event: JSEvent) => Promise<unknown>>(undefined);
    readonly onEdit = input<(messageId: string, text: string, event: JSEvent) => Promise<unknown>>(undefined);
    readonly onFeedback = input<(messageId: string, feedback: string, event: JSEvent) => Promise<unknown>>(undefined);
    readonly onFeedbackComment = input<(messageId: string, comment: string, event: JSEvent) => Promise<unknown>>(undefined);
    readonly onBranchChange = input<(messageId: string, branchNumber: number, event: JSEvent) => Promise<unknown>>(undefined);
    readonly onSourceClick = input<(messageId: string, sourceIndex: number, event: JSEvent) => Promise<unknown>>(undefined);

    readonly viewport = viewChild<ElementRef<HTMLDivElement>>('viewport');
    readonly composer = viewChild(HvoChatComposerCore);
    readonly editArea = viewChild<ElementRef<HTMLTextAreaElement>>('editArea');

    /** Beschriftungen fuer den gemeinsamen Feedback-Baustein (aus texts bzw. deutschen Standardtexten) */
    readonly feedbackTexts = computed<HvoChatFeedbackTexts>(() => {
        this.texts();
        return {
            ...HVOCHAT_FEEDBACK_DEFAULT_TEXTS,
            positive: this.t('feedbackPositive'),
            negative: this.t('feedbackNegative'),
            commentPlaceholder: this.t('feedbackCommentPlaceholder'),
            commentSubmit: this.t('feedbackCommentSubmit'),
            commentCancel: this.t('feedbackCommentCancel'),
            commentHint: this.t('feedbackCommentHint'),
            commentThanks: this.t('feedbackCommentThanks')
        };
    });

    // --- lokaler UI-Zustand ---
    readonly composerText = signal('');
    readonly atBottom = signal(true);
    readonly copiedId = signal<string | null>(null);
    readonly speakingId = signal<string | null>(null);
    readonly editingId = signal<string | null>(null);
    readonly editText = signal('');
    readonly openMenuId = signal<string | null>(null);
    readonly expandedReasoning = signal<ReadonlySet<string>>(new Set());
    readonly expandedSources = signal<ReadonlySet<string>>(new Set());

    private scrollFrame = 0;
    private copiedTimer: ReturnType<typeof setTimeout> | undefined;
    private unlistenMenu: (() => void) | undefined;

    constructor(renderer: Renderer2, cdRef: ChangeDetectorRef, private servoyService: ServoyPublicService) {
        super(renderer, cdRef);
    }

    svyOnInit(): void {
        super.svyOnInit();
        this.scheduleScrollToBottom(false);
    }

    svyOnChanges(changes: SimpleChanges): void {
        super.svyOnChanges(changes);
        // Auch Aenderungen mit gleicher Referenz (Streaming) kommen hier an
        if (changes['messages'] && this.autoScroll() && this.atBottom()) this.scheduleScrollToBottom(false);
    }

    ngOnDestroy(): void {
        super.ngOnDestroy();
        cancelAnimationFrame(this.scrollFrame);
        clearTimeout(this.copiedTimer);
        this.unlistenMenu?.();
        if (this.speakingId() && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    }

    // --- Template-Helfer ---

    /**
     * Beschriftung (Solution-Override oder deutscher Standard).
     * @param {HvoChatTextKey} pcKey
     * @returns {string}
     */
    t(pcKey: HvoChatTextKey): string {
        return this.texts()?.[pcKey] || coDefaultTexts[pcKey];
    }

    /** @returns {boolean} true, wenn noch keine Nachricht existiert */
    isEmpty(): boolean {
        return !this.messages()?.length;
    }

    /** @returns {string|null} max-width des Inhalts */
    contentWidth(): string | null {
        return this.maxContentWidth() > 0 ? `${this.maxContentWidth()}px` : null;
    }

    /**
     * Laeuft diese Nachricht gerade (Streaming)?
     * @param {HvoChatMessage} poMsg
     * @param {boolean} pbLast - letzte Nachricht im Verlauf
     * @returns {boolean}
     */
    isRunning(poMsg: HvoChatMessage, pbLast: boolean): boolean {
        return poMsg.status === 'running' || (pbLast && this.busy() && poMsg.role === 'assistant');
    }

    /**
     * Ist der Denkprozess aufgeklappt? Waehrend er gestreamt wird (noch kein Antworttext) automatisch offen.
     * @param {HvoChatMessage} poMsg
     * @param {boolean} pbLast
     * @returns {boolean}
     */
    isReasoningOpen(poMsg: HvoChatMessage, pbLast: boolean): boolean {
        return this.expandedReasoning().has(poMsg.id) || (this.isRunning(poMsg, pbLast) && !poMsg.text);
    }

    /**
     * Anzeigetext einer Quelle (Label, sonst Domain der URL).
     * @param {HvoChatSource} poSource
     * @returns {string}
     */
    sourceMeta(poSource: HvoChatSource): string {
        if (poSource.label) return poSource.label;
        if (!poSource.url) return '';
        try {
            return new URL(poSource.url).hostname;
        } catch {
            return poSource.url;
        }
    }

    // --- Composer / Vorschlaege ---

    /**
     * Absenden aus dem integrierten Composer.
     * @param {HvoChatSubmitEvent} poSubmit
     */
    onComposerSubmit(poSubmit: HvoChatSubmitEvent): void {
        this.sendText(poSubmit.text, poSubmit.event);
    }

    /**
     * Klick auf einen Vorschlag.
     * @param {HvoChatSuggestion} poSuggestion
     * @param {Event} poEvent
     */
    onSuggestion(poSuggestion: HvoChatSuggestion, poEvent: Event): void {
        const lcPrompt = (poSuggestion.prompt || poSuggestion.title || '').trim();
        if (!lcPrompt || !this.enabled()) return;
        if (this.suggestionAutoSend() && this.onSubmit() && !this.busy()) {
            this.sendText(lcPrompt, poEvent);
            return;
        }
        this.composerText.set(lcPrompt);
        this.composer()?.focus();
    }

    /**
     * Sendet einen Text an onSubmit; Eingabe wird sofort geleert und bei Ablehnung/Fehler wiederhergestellt.
     * @param {string} pcText
     * @param {Event} poEvent
     */
    private sendText(pcText: string, poEvent: Event): void {
        const lfnHandler = this.onSubmit();
        if (!lfnHandler) return;
        this.composerText.set('');
        this.scheduleScrollToBottom(true);
        const lfnRestore = (): void => {
            if (this.composerText() !== '') return;
            this.composerText.set(pcText);
            this.detectChanges();
        };
        lfnHandler(pcText, this.createEvent(poEvent, 'onSubmit'))
            .then((pbAccepted) => { if (pbAccepted === false) lfnRestore(); })
            .catch(() => lfnRestore());
    }

    /**
     * Stopp-Button / Escape.
     * @param {Event} poEvent
     */
    onComposerCancel(poEvent: Event): void {
        this.onCancel()?.(this.createEvent(poEvent, 'onCancel'));
    }

    // --- Aktionsleiste ---

    /**
     * Kopiert den Nachrichtentext (Markdown-Quelltext) in die Zwischenablage.
     * Fallback fuer http-Kontexte ohne navigator.clipboard.
     * @param {HvoChatMessage} poMsg
     */
    copy(poMsg: HvoChatMessage): void {
        const lcText = poMsg.text ?? '';
        const lfnDone = (): void => {
            this.copiedId.set(poMsg.id);
            clearTimeout(this.copiedTimer);
            this.copiedTimer = setTimeout(() => this.copiedId.set(null), cnCopiedResetMs);
        };
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(lcText).then(lfnDone, () => this.copyFallback(lcText) && lfnDone());
            return;
        }
        if (this.copyFallback(lcText)) lfnDone();
    }

    /**
     * Kopieren ueber verstecktes Textfeld (aeltere Browser / kein HTTPS).
     * @param {string} pcText
     * @returns {boolean} Erfolg
     */
    private copyFallback(pcText: string): boolean {
        const lelArea = document.createElement('textarea');
        lelArea.value = pcText;
        lelArea.setAttribute('readonly', '');
        lelArea.style.position = 'fixed';
        lelArea.style.opacity = '0';
        document.body.appendChild(lelArea);
        lelArea.select();
        let lbOk = false;
        try {
            lbOk = document.execCommand('copy');
        } catch {
            lbOk = false;
        }
        document.body.removeChild(lelArea);
        return lbOk;
    }

    /**
     * Vorlesen starten/stoppen (Web Speech API des Browsers).
     * @param {HvoChatMessage} poMsg
     */
    toggleSpeak(poMsg: HvoChatMessage): void {
        if (!('speechSynthesis' in window)) return;
        const loSynth = window.speechSynthesis;
        loSynth.cancel();
        if (this.speakingId() === poMsg.id) {
            this.speakingId.set(null);
            return;
        }
        const lelTmp = document.createElement('div');
        lelTmp.innerHTML = renderChatText(poMsg.text ?? '', true);
        const loUtterance = new SpeechSynthesisUtterance(lelTmp.textContent ?? '');
        const lcLocale = this.servoyService.getLocale?.();
        if (lcLocale) loUtterance.lang = String(lcLocale).replace('_', '-');
        loUtterance.onend = () => {
            if (this.speakingId() === poMsg.id) this.speakingId.set(null);
        };
        this.speakingId.set(poMsg.id);
        loSynth.speak(loUtterance);
    }

    /**
     * Antwort als Markdown-Datei herunterladen.
     * @param {HvoChatMessage} poMsg
     */
    exportMarkdown(poMsg: HvoChatMessage): void {
        this.closeMenu();
        const loBlob = new Blob([poMsg.text ?? ''], { type: 'text/markdown;charset=utf-8' });
        const lcUrl = URL.createObjectURL(loBlob);
        const lelLink = document.createElement('a');
        lelLink.href = lcUrl;
        lelLink.download = `nachricht-${poMsg.id || Date.now()}.md`;
        document.body.appendChild(lelLink);
        lelLink.click();
        document.body.removeChild(lelLink);
        setTimeout(() => URL.revokeObjectURL(lcUrl));
    }

    /**
     * Feedback melden (sofort bei jedem Daumenklick, unveraenderte Signatur). Doppelklick-Sperre und
     * Kommentarbox steuert der gemeinsame Baustein hvochat-internal-feedback.
     * @param {HvoChatMessage} poMsg
     * @param {'positive'|'negative'} pcFeedback
     * @param {Event} poEvent
     */
    feedback(poMsg: HvoChatMessage, pcFeedback: 'positive' | 'negative', poEvent: Event): void {
        if (poMsg.feedbackDisabled) return;
        this.onFeedback()?.(poMsg.id, pcFeedback, this.createEvent(poEvent, 'onFeedback'));
    }

    /**
     * Kommentar zu "nicht hilfreich" melden. Der Kommentar wird nicht geloggt (kann personenbezogene Daten enthalten).
     * @param {HvoChatMessage} poMsg
     * @param {string} pcComment - getrimmt und auf feedbackCommentMaxLength gekuerzt
     * @param {Event} poEvent
     */
    feedbackComment(poMsg: HvoChatMessage, pcComment: string, poEvent: Event): void {
        if (poMsg.feedbackDisabled || !pcComment) return;
        this.onFeedbackComment()?.(poMsg.id, pcComment, this.createEvent(poEvent, 'onFeedbackComment'));
    }

    /**
     * Antwort neu erzeugen lassen.
     * @param {HvoChatMessage} poMsg
     * @param {Event} poEvent
     */
    reload(poMsg: HvoChatMessage, poEvent: Event): void {
        if (this.busy()) return;
        this.onReload()?.(poMsg.id, this.createEvent(poEvent, 'onReload'));
    }

    /**
     * Mehr-Menue oeffnen/schliessen; schliesst bei Klick ausserhalb.
     * @param {HvoChatMessage} poMsg
     * @param {Event} poEvent
     */
    toggleMenu(poMsg: HvoChatMessage, poEvent: Event): void {
        poEvent.stopPropagation();
        if (this.openMenuId() === poMsg.id) {
            this.closeMenu();
            return;
        }
        this.openMenuId.set(poMsg.id);
        this.unlistenMenu?.();
        this.unlistenMenu = this.renderer.listen('document', 'click', () => {
            this.closeMenu();
            this.detectChanges();
        });
    }

    /** Schliesst das Mehr-Menue. */
    closeMenu(): void {
        this.openMenuId.set(null);
        this.unlistenMenu?.();
        this.unlistenMenu = undefined;
    }

    // --- Bearbeiten (Benutzer-Nachricht) ---

    /**
     * Startet die Inline-Bearbeitung.
     * @param {HvoChatMessage} poMsg
     */
    startEdit(poMsg: HvoChatMessage): void {
        this.editingId.set(poMsg.id);
        this.editText.set(poMsg.text ?? '');
        setTimeout(() => {
            const lelArea = this.editArea()?.nativeElement;
            if (!lelArea) return;
            lelArea.focus();
            lelArea.setSelectionRange(lelArea.value.length, lelArea.value.length);
        });
    }

    /** Bricht die Bearbeitung ab. */
    cancelEdit(): void {
        this.editingId.set(null);
    }

    /**
     * Speichert die Bearbeitung ueber onEdit.
     * @param {HvoChatMessage} poMsg
     * @param {Event} poEvent
     */
    saveEdit(poMsg: HvoChatMessage, poEvent: Event): void {
        const lcText = this.editText().trim();
        this.editingId.set(null);
        if (!lcText || lcText === (poMsg.text ?? '').trim()) return;
        this.onEdit()?.(poMsg.id, lcText, this.createEvent(poEvent, 'onEdit'));
    }

    /**
     * Tastatur im Bearbeitungsfeld: Enter speichert, Shift+Enter neue Zeile, Escape bricht ab.
     * @param {KeyboardEvent} poEvent
     * @param {HvoChatMessage} poMsg
     */
    onEditKeyDown(poEvent: KeyboardEvent, poMsg: HvoChatMessage): void {
        if (poEvent.isComposing) return;
        if (poEvent.key === 'Escape') {
            poEvent.preventDefault();
            this.cancelEdit();
            return;
        }
        if (poEvent.key === 'Enter' && !poEvent.shiftKey) {
            poEvent.preventDefault();
            this.saveEdit(poMsg, poEvent);
        }
    }

    /**
     * Uebernimmt die Eingabe im Bearbeitungsfeld.
     * @param {Event} poEvent
     */
    onEditInput(poEvent: Event): void {
        this.editText.set((poEvent.target as HTMLTextAreaElement).value);
    }

    // --- Versionen / Quellen / Denkprozess ---

    /**
     * Wechselt die Version einer Nachricht.
     * @param {HvoChatMessage} poMsg
     * @param {number} pnDelta - -1 vorherige, +1 naechste
     * @param {Event} poEvent
     */
    branch(poMsg: HvoChatMessage, pnDelta: number, poEvent: Event): void {
        const lnTarget = (poMsg.branchNumber || 1) + pnDelta;
        if (lnTarget < 1 || lnTarget > (poMsg.branchCount || 1)) return;
        this.onBranchChange()?.(poMsg.id, lnTarget, this.createEvent(poEvent, 'onBranchChange'));
    }

    /**
     * Klick auf eine Quelle: Handler oder URL in neuem Tab.
     * @param {HvoChatMessage} poMsg
     * @param {number} pnIndex
     * @param {Event} poEvent
     */
    sourceClick(poMsg: HvoChatMessage, pnIndex: number, poEvent: Event): void {
        const lfnHandler = this.onSourceClick();
        if (lfnHandler) {
            poEvent.preventDefault();
            lfnHandler(poMsg.id, pnIndex, this.createEvent(poEvent, 'onSourceClick'));
            return;
        }
        const lcUrl = poMsg.sources?.[pnIndex]?.url;
        if (lcUrl) window.open(lcUrl, '_blank', 'noopener');
    }

    /**
     * Klappt Denkprozess bzw. Quellen einer Nachricht auf/zu.
     * @param {'reasoning'|'sources'} pcPart
     * @param {string} pcId
     */
    toggle(pcPart: 'reasoning' | 'sources', pcId: string): void {
        const loTarget = pcPart === 'reasoning' ? this.expandedReasoning : this.expandedSources;
        const lsNext = new Set(loTarget());
        if (lsNext.has(pcId)) lsNext.delete(pcId); else lsNext.add(pcId);
        loTarget.set(lsNext);
        // Inhaltshoehe aendert sich ohne Scroll-Event -> "unten"-Status nach dem Rendern neu bestimmen
        requestAnimationFrame(() => this.onViewportScroll());
    }

    // --- Scrollen ---

    /** Merkt sich, ob der Benutzer am unteren Rand ist (fuer Auto-Scroll und den Scroll-Button). */
    onViewportScroll(): void {
        const lelView = this.viewport()?.nativeElement;
        if (!lelView) return;
        const lbBottom = lelView.scrollHeight - lelView.scrollTop - lelView.clientHeight <= cnBottomThreshold;
        if (lbBottom !== this.atBottom()) this.atBottom.set(lbBottom);
    }

    /**
     * Scrollt nach dem naechsten Rendern ans Ende.
     * @param {boolean} pbSmooth
     */
    private scheduleScrollToBottom(pbSmooth: boolean): void {
        cancelAnimationFrame(this.scrollFrame);
        this.scrollFrame = requestAnimationFrame(() => {
            const lelView = this.viewport()?.nativeElement;
            if (!lelView) return;
            lelView.scrollTo({ top: lelView.scrollHeight, behavior: pbSmooth ? 'smooth' : 'auto' });
            this.atBottom.set(true);
        });
    }

    // --- API ---

    /** Scrollt ans Ende des Verlaufs. */
    scrollToBottom(): void {
        this.scheduleScrollToBottom(true);
    }

    /** Setzt den Fokus in das Eingabefeld. */
    requestFocus(): void {
        this.composer()?.focus();
    }

    /**
     * Setzt den Text im Eingabefeld.
     * @param {string} text
     */
    setComposerText(text: string): void {
        this.composerText.set(text ?? '');
        this.detectChanges();
    }

    /**
     * Liefert den Text im Eingabefeld.
     * @returns {string}
     */
    getComposerText(): string {
        return this.composerText();
    }

    /**
     * Erzeugt ein Servoy-JSEvent.
     * @param {Event} poEvent
     * @param {string} pcType
     * @returns {JSEvent}
     */
    private createEvent(poEvent: Event, pcType: string): JSEvent {
        return this.servoyService.createJSEvent(poEvent ?? { target: this.getNativeElement() }, pcType);
    }
}
