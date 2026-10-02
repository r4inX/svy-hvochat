import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Verfuegbare Icon-Namen (Pfaddaten aus Lucide, ISC-Lizenz, https://lucide.dev) */
export type HvoChatIconName =
    'arrow-up' | 'arrow-down' | 'square' | 'copy' | 'check' | 'pencil' | 'refresh' | 'thumbs-up' | 'thumbs-down' |
    'more' | 'download' | 'chevron-left' | 'chevron-right' | 'chevron-down' | 'volume' | 'lightbulb' | 'file-text';

/**
 * Interne Icon-Komponente (keine Servoy-Komponente, keine .spec).
 * Zeichnet Lucide-Icons inline als SVG; Groesse und Farbe kommen aus CSS (width/height, currentColor).
 */
@Component({
    selector: 'hvochat-internal-icon',
    template: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
  @switch (name()) {
    @case ('arrow-up') { <svg:path d="m5 12 7-7 7 7"/><svg:path d="M12 19V5"/> }
    @case ('arrow-down') { <svg:path d="M12 5v14"/><svg:path d="m19 12-7 7-7-7"/> }
    @case ('square') { <svg:rect width="18" height="18" x="3" y="3" rx="2" fill="currentColor"/> }
    @case ('copy') { <svg:rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><svg:path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/> }
    @case ('check') { <svg:path d="M20 6 9 17l-5-5"/> }
    @case ('pencil') { <svg:path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><svg:path d="m15 5 4 4"/> }
    @case ('refresh') { <svg:path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><svg:path d="M21 3v5h-5"/><svg:path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><svg:path d="M8 16H3v5"/> }
    @case ('thumbs-up') { <svg:path d="M7 10v12"/><svg:path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/> }
    @case ('thumbs-down') { <svg:path d="M17 14V2"/><svg:path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/> }
    @case ('more') { <svg:circle cx="12" cy="12" r="1"/><svg:circle cx="19" cy="12" r="1"/><svg:circle cx="5" cy="12" r="1"/> }
    @case ('download') { <svg:path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><svg:path d="m7 10 5 5 5-5"/><svg:path d="M12 15V3"/> }
    @case ('chevron-left') { <svg:path d="m15 18-6-6 6-6"/> }
    @case ('chevron-right') { <svg:path d="m9 18 6-6-6-6"/> }
    @case ('chevron-down') { <svg:path d="m6 9 6 6 6-6"/> }
    @case ('volume') { <svg:path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><svg:path d="M16 9a5 5 0 0 1 0 6"/><svg:path d="M19.364 18.364a9 9 0 0 0 0-12.728"/> }
    @case ('lightbulb') { <svg:path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><svg:path d="M9 18h6"/><svg:path d="M10 22h4"/> }
    @case ('file-text') { <svg:path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><svg:path d="M14 2v4a2 2 0 0 0 2 2h4"/><svg:path d="M16 13H8"/><svg:path d="M16 17H8"/><svg:path d="M10 9H8"/> }
  }
</svg>`,
    styles: [':host { display: inline-flex; width: 1rem; height: 1rem; flex: 0 0 auto; } svg { width: 100%; height: 100%; }'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class HvoChatIcon {
    readonly name = input.required<HvoChatIconName>();
}
