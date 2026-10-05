import { ChangeDetectionStrategy, ChangeDetectorRef, Component, SimpleChange, ViewChild } from '@angular/core';
import { JSEvent, ServoyApiTesting } from '@servoy/public';
import { HvoChatFeedback, HvoChatFeedbackValue, HvoChatMessage, HvoChatSuggestion, HvoChatThread } from '../../chat/src/public-api';

// Verzoegerung, mit der der "Host" message.feedback setzt (simuliert den Server-Roundtrip)
const cnFeedbackRoundtripMs = 400;

/** ServoyApi-Attrappe mit umschaltbarem Layout-Modus */
class DemoServoyApi extends ServoyApiTesting {
    constructor(private readonly markupId: string, private readonly absolute: boolean) {
        super();
    }
    getMarkupId(): string { return this.markupId; }
    isInAbsoluteLayout(): boolean { return this.absolute; }
}

const caDemoAnswer = `Laut **Teilungserklärung** (§ 4 Abs. 2) trägt die Kosten für die Instandhaltung der Fenster die Gemeinschaft.

Wichtige Punkte:
1. Fensterrahmen und Verglasung sind *Gemeinschaftseigentum*
2. Innenanstrich ist Sache des Eigentümers
3. Beschlüsse nach § 16 WEG können abweichen

| Bauteil | Zuständig |
|---|---|
| Rahmen | Gemeinschaft |
| Innenanstrich | Eigentümer |

\`Hinweis:\` Prüfen Sie zusätzlich das Protokoll der letzten Versammlung.`;

// Streaming-Takt der Demo (ms)
const cnChunkMs = 30;

/**
 * Lokale Testumgebung fuer @hvo/chat ohne Servoy.
 * Simuliert Servoy-Verhalten: Server aendert messages in-place und ruft ngOnChanges mit gleicher Referenz + detectChanges.
 */
@Component({
    selector: 'hvochat-demo',
    templateUrl: './demo.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class DemoComponent {
    @ViewChild('thread') thread!: HvoChatThread;
    @ViewChild('feedbackB') feedbackB!: HvoChatFeedback;

    readonly threadApi = new DemoServoyApi('thread1', true);
    readonly composerApi = new DemoServoyApi('composer1', false);
    readonly feedbackApiA = new DemoServoyApi('feedbackA', false);
    readonly feedbackApiB = new DemoServoyApi('feedbackB', false);

    messages: HvoChatMessage[] = [];
    busy = false;
    /** Thread: Kommentarfeld bei Daumen runter (zum Testen der Rueckwaertskompatibilitaet umschaltbar) */
    allowFeedbackComment = true;
    /** "Dataprovider" von Feedback-Element B */
    feedbackValueB: HvoChatFeedbackValue | null = null;
    log: string[] = [];
    readonly suggestions: HvoChatSuggestion[] = [
        { title: 'Wer zahlt die Fenster?', description: 'laut Teilungserklärung', prompt: 'Wer trägt die Kosten für die Fenster?' },
        { title: 'Fasse das letzte Protokoll zusammen' },
        { title: 'Welche Fristen gelten für die Abrechnung?' }
    ];

    private streamTimer: ReturnType<typeof setInterval> | undefined;
    private nextId = 1;

    constructor(private cdRef: ChangeDetectorRef) {
    }

    // Handler (wie in Servoy: Funktionen, die ein Promise liefern)
    readonly onSubmit = (pcText: string, poEvent: JSEvent): Promise<boolean> => {
        this.addLog(`onSubmit("${pcText}", ${poEvent.eventType})`);
        this.mutate(() => this.messages.push({ id: this.id(), role: 'user', text: pcText, status: 'complete' }));
        this.startAnswer();
        return Promise.resolve(true);
    };
    readonly onCancel = (): Promise<unknown> => {
        this.addLog('onCancel()');
        this.stopStream('Abgebrochen.');
        return Promise.resolve();
    };
    readonly onReload = (pcId: string): Promise<unknown> => {
        this.addLog(`onReload(${pcId})`);
        const loMsg = this.messages.find((loM) => loM.id === pcId);
        if (loMsg) this.mutate(() => { loMsg.branchCount = (loMsg.branchCount ?? 1) + 1; loMsg.branchNumber = loMsg.branchCount; });
        return Promise.resolve();
    };
    readonly onEdit = (pcId: string, pcText: string): Promise<unknown> => {
        this.addLog(`onEdit(${pcId}, "${pcText}")`);
        const loMsg = this.messages.find((loM) => loM.id === pcId);
        if (loMsg) this.mutate(() => { loMsg.text = pcText; });
        return Promise.resolve();
    };
    readonly onFeedback = (pcId: string, pcFeedback: string): Promise<unknown> => {
        this.addLog(`onFeedback(${pcId}, ${pcFeedback})`);
        const loMsg = this.messages.find((loM) => loM.id === pcId);
        // Wie der echte Host: feedback erst nach dem Server-Roundtrip setzen (testet die Doppelklick-Sperre)
        if (loMsg) setTimeout(() => this.mutate(() => { loMsg.feedback = pcFeedback as 'positive' | 'negative'; }), cnFeedbackRoundtripMs);
        return Promise.resolve();
    };
    readonly onFeedbackComment = (pcId: string, pcComment: string): Promise<unknown> => {
        this.addLog(`onFeedbackComment(${pcId}, "${pcComment.replace(/\n/g, '\\n')}")`);
        return Promise.resolve();
    };
    readonly onStandaloneFeedback = (pcContextId: string, pcFeedback: string): Promise<unknown> => {
        this.addLog(`[feedback] onFeedback(${pcContextId || "''"}, ${pcFeedback})`);
        return Promise.resolve();
    };
    readonly onStandaloneFeedbackComment = (pcContextId: string, pcComment: string): Promise<unknown> => {
        this.addLog(`[feedback] onFeedbackComment(${pcContextId}, "${pcComment.replace(/\n/g, '\\n')}")`);
        return Promise.resolve();
    };

    /** Fuegt eine "alte" Antwort ohne Bewertungsmoeglichkeit hinzu (message.feedbackDisabled) */
    addOldMessage(): void {
        this.mutate(() => this.messages.push({
            id: this.id(), role: 'assistant', status: 'complete', feedbackDisabled: true,
            text: 'Ältere Antwort **ohne request_id** – hier dürfen keine Daumen erscheinen.'
        }));
    }

    /** Ruft die API reset() von Feedback-Element B auf */
    resetFeedbackB(): void {
        this.feedbackB.reset();
    }
    readonly onBranchChange = (pcId: string, pnBranch: number): Promise<unknown> => {
        this.addLog(`onBranchChange(${pcId}, ${pnBranch})`);
        const loMsg = this.messages.find((loM) => loM.id === pcId);
        if (loMsg) this.mutate(() => { loMsg.branchNumber = pnBranch; });
        return Promise.resolve();
    };
    readonly onSourceClick = (pcId: string, pnIndex: number): Promise<unknown> => {
        this.addLog(`onSourceClick(${pcId}, ${pnIndex})`);
        return Promise.resolve();
    };
    readonly onComposerSubmit = (pcText: string): Promise<boolean> => {
        this.addLog(`[composer] onSubmit("${pcText.replace(/\n/g, '\\n')}")`);
        return Promise.resolve(true);
    };

    /** Startet eine gestreamte Antwort */
    private startAnswer(): void {
        const loAnswer: HvoChatMessage = { id: this.id(), role: 'assistant', text: '', status: 'running', reasoning: 'Suche in 3 Dokumenten …\n\n- Teilungserklärung.pdf\n- Protokoll 2026.pdf' };
        this.busy = true;
        this.mutate(() => this.messages.push(loAnswer));
        let lnPos = 0;
        this.streamTimer = setInterval(() => {
            lnPos += 6;
            this.mutate(() => { loAnswer.text = caDemoAnswer.slice(0, lnPos); });
            if (lnPos >= caDemoAnswer.length) {
                this.mutate(() => {
                    loAnswer.status = 'complete';
                    loAnswer.sources = [
                        { title: 'Teilungserklärung.pdf', label: 'S. 12', snippet: '§ 4 Abs. 2: Fenster einschließlich Rahmen stehen im Gemeinschaftseigentum …' },
                        { title: 'Protokoll Eigentümerversammlung 2026.pdf', label: 'S. 3', snippet: 'TOP 5: Beschluss zur Kostenverteilung …' },
                        { title: 'WEG § 16', url: 'https://www.gesetze-im-internet.de/woeigg/__16.html' }
                    ];
                });
                this.stopStream();
            }
        }, cnChunkMs);
    }

    private stopStream(pcError?: string): void {
        clearInterval(this.streamTimer);
        const loLast = this.messages[this.messages.length - 1];
        this.busy = false;
        if (loLast?.status === 'running') this.mutate(() => { loLast.status = pcError ? 'error' : 'complete'; loLast.error = pcError; });
        this.cdRef.markForCheck();
    }

    /** Wie Servoy: Aenderung in-place, dann ngOnChanges mit gleicher Referenz und detectChanges */
    private mutate(pfnChange: () => void): void {
        pfnChange();
        if (!this.thread) return;
        this.thread.ngOnChanges({ messages: new SimpleChange(this.messages, this.messages, false) });
        this.thread.detectChanges();
        this.cdRef.markForCheck();
    }

    private id(): string {
        return `m${this.nextId++}`;
    }

    private addLog(pcLine: string): void {
        this.log = [pcLine, ...this.log].slice(0, 12);
        this.cdRef.markForCheck();
    }
}
