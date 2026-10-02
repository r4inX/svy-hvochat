import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

let gbHooksInstalled = false;

/**
 * Registriert einmalig einen DOMPurify-Hook: Links oeffnen in neuem Tab ohne Opener-Zugriff.
 */
function installHooks(): void {
    if (gbHooksInstalled) return;
    gbHooksInstalled = true;
    DOMPurify.addHook('afterSanitizeAttributes', (poNode: Element) => {
        if (poNode.tagName === 'A' && poNode.getAttribute('href')) {
            poNode.setAttribute('target', '_blank');
            poNode.setAttribute('rel', 'noopener noreferrer');
        }
    });
}

/**
 * Wandelt Text in sicheres HTML um.
 * Markdown (GFM, Zeilenumbrueche) wird per marked gerendert und immer mit DOMPurify bereinigt,
 * da Nachrichtentexte aus KI-Antworten bzw. Benutzereingaben stammen.
 *
 * @param {string} pcText - Quelltext
 * @param {boolean} pbMarkdown - false: nur Text (HTML escaped, Zeilenumbrueche erhalten)
 * @returns {string} bereinigtes HTML
 */
export function renderChatText(pcText: string, pbMarkdown: boolean): string {
    installHooks();
    const lcSource = pcText ?? '';
    if (!pbMarkdown) {
        const lcEscaped = lcSource.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<p>${lcEscaped.replace(/\n/g, '<br>')}</p>`;
    }
    const lcHtml = marked.parse(lcSource, { async: false, gfm: true, breaks: true }) as string;
    return DOMPurify.sanitize(lcHtml, { USE_PROFILES: { html: true } });
}

/**
 * Pipe fuer Chat-Texte: {{ text | hvochatMarkdown:true }} als [innerHTML].
 * Pure Pipe: wird nur neu berechnet, wenn sich der Text-String aendert (Streaming = neuer String).
 */
@Pipe({ name: 'hvochatMarkdown', standalone: false })
export class HvoChatMarkdownPipe implements PipeTransform {

    constructor(private sanitizer: DomSanitizer) {
    }

    /**
     * @param {string} pcText - Quelltext
     * @param {boolean} [pbMarkdown=true] - Markdown rendern
     * @returns {SafeHtml}
     */
    transform(pcText: string, pbMarkdown = true): SafeHtml {
        // Bereits durch DOMPurify bereinigt -> Angular-Sanitizer umgehen (sonst Warnungen/Verluste bei Tabellen)
        return this.sanitizer.bypassSecurityTrustHtml(renderChatText(pcText, pbMarkdown !== false));
    }
}
