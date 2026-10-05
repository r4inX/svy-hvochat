# HVO Chat

Servoy-Titanium-Component-Package `@hvo/chat` (Bundle `hvochat`). Es enthält Chat-Komponenten, die aus [assistant-ui](https://github.com/assistant-ui/assistant-ui) nach Angular portiert wurden.

- **Zielversion:** Servoy 2026.6.0, Angular 21.2.16, @servoy/public 2026.3.0
- **Erzeugt mit:** dem Claude-Skill `convert-to-servoy-comp`
- **Lizenzhinweise:** siehe [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)

| Form-Element-Typ | Klasse | Zweck |
|---|---|---|
| `hvochat-thread` | `HvoChatThread` | Komplette Chat-Ansicht, siehe unten |
| `hvochat-composer` | `HvoChatComposer` | Eigenständiges Eingabefeld, z. B. für eigene Layouts |
| `hvochat-feedback` | `HvoChatFeedback` | Eigenständige Bewertung (👍/👎, optional mit Kommentar) für Stellen ohne Chat-Thread, siehe [Feedback](#feedback) |

`hvochat-thread` enthält:
- Verlauf mit Markdown, Bildern, Quellen und Denkprozess
- Aktionsleiste: Kopieren, Feedback, Vorlesen, Neu generieren, Export als Markdown
- Versionswechsler
- Vorschläge und integriertes Eingabefeld

Beide Eingabefelder senden mit **Enter**; **Shift+Enter** fügt einen Zeilenumbruch ein. Der Zeilenumbruch erscheint beim Senden nicht kurz, wie es bei der Floatlabel-Textbox der Fall war.

## Abdeckung der assistant-ui-Primitives

| Primitive | Status | Wo |
|---|---|---|
| Thread (Root, Viewport, Messages, Empty, ScrollToBottom, ViewportFooter, Suggestions) | ✅ Phase 1 | `hvochat-thread` |
| Message, MessagePart (Text/Markdown, Image, InProgress), Error | ✅ Phase 1 | `hvochat-thread` |
| ChainOfThought / Reasoning | ✅ Phase 1 (als `message.reasoning`) | `hvochat-thread` |
| ActionBar (Copy, Edit, Reload, FeedbackPositive/-Negative, Speak/StopSpeaking, ExportMarkdown), ActionBarMore | ✅ Phase 1 | `hvochat-thread` |
| BranchPicker | ✅ Phase 1 | `hvochat-thread` |
| Suggestion | ✅ Phase 1 | `hvochat-thread` |
| Composer (Root, Input, Send, Cancel) | ✅ Phase 1 | `hvochat-composer`, integriert in `hvochat-thread` |
| Composer: Attachments, AddAttachment, AttachmentDropzone, Attachment-Primitives | ⏳ Phase 2 | |
| Composer: Dictate, StopDictation, DictationTranscript | ⏳ Phase 2 | |
| Composer: Quote, SelectionToolbar | ⏳ Phase 2 | |
| Composer: Queue, QueueItem | ⏳ Phase 2 | |
| ThreadList, ThreadListItem, ThreadListItemMore | ⏳ Phase 2 | `hvochat-threadlist` |
| AssistantModal | ⏳ Phase 2 | `hvochat-assistantmodal` |

Nicht portiert wird die Laufzeit von assistant-ui (Runtime, Stores, KI-Adapter). In Servoy hält der Server den Zustand: Nachrichten gehen als `messages` an die Komponente, Benutzeraktionen kommen als Handler zurück.

## Verwendung in Servoy

```javascript
/**
 * onSubmit-Handler des Elements "chat" (hvochat-thread)
 * @param {String} text
 * @param {JSEvent} event
 * @return {Boolean}
 */
function onChatSubmit(text, event) {
    elements.chat.addMessage('user', text);
    var lcAnswerId = elements.chat.addMessage('assistant', '', 'running');
    elements.chat.busy = true;
    application.updateUI(); // Nutzer-Nachricht + Stopp-Button sofort anzeigen
    try {
        // RAG-Backend aufrufen (Beispiel); bei Streaming fuer jeden Chunk appendText aufrufen
        var loResult = scopes.rag.ask(text);
        elements.chat.appendText(lcAnswerId, loResult.answer);
        elements.chat.updateMessage(lcAnswerId, {
            status: 'complete',
            sources: loResult.sources.map(function(s) {
                return { title: s.fileName, label: 'S. ' + s.page, snippet: s.text };
            })
        });
    } catch (e) {
        elements.chat.updateMessage(lcAnswerId, { status: 'error', error: 'Antwort konnte nicht erzeugt werden.' });
    } finally {
        elements.chat.busy = false;
    }
    return true;
}
```

> **Streaming:** Servoy schickt Model-Änderungen normalerweise erst am Ende des Server-Requests an den Browser. Rufe bei gestreamten Antworten nach jedem `appendText()` die Funktion `application.updateUI()` auf, damit der Text schrittweise erscheint. Das gilt auch für `busy = true` am Anfang: Dann erscheint der Stopp-Button sofort.
> ⚠️ Das wurde noch nicht in Servoy getestet, sondern nur in der lokalen Demo. Bitte beim ersten Integrationstest prüfen.

Weitere Handler (alle optional; ohne Handler wird der zugehörige Button ausgeblendet):

| Handler | Parameter |
|---|---|
| `onCancel` | `event` |
| `onReload` | `messageId`, `event` |
| `onEdit` | `messageId`, `text`, `event` |
| `onFeedback` | `messageId`, `'positive'`/`'negative'`, `event` |
| `onFeedbackComment` | `messageId`, `comment`, `event` (nur mit `allowFeedbackComment`) |
| `onBranchChange` | `messageId`, `branchNumber`, `event` |
| `onSourceClick` | `messageId`, `sourceIndex`, `event` (ohne Handler wird `source.url` geöffnet) |

## Feedback

Thread und `hvochat-feedback` nutzen denselben internen Baustein, Aussehen und Verhalten sind also identisch.

**Ablauf bei 👎 mit Kommentar** (`allowFeedbackComment` im Thread bzw. `allowComment` im Element):
1. `onFeedback(id, 'negative', event)` wird **sofort** gemeldet, die Bewertung also gleich ans Backend senden.
2. Unter der Antwort öffnet sich eine Kommentarbox mit Zähler und Hinweis auf die Protokollierung. **Strg+Enter** sendet, **Escape** schließt.
3. Nach dem Senden kommt `onFeedbackComment(id, kommentar, event)` mit getrimmtem Text, höchstens `feedbackCommentMaxLength` bzw. `commentMaxLength` Zeichen. Danach erscheint „Danke für Ihr Feedback“. Fürs Backend die Bewertung `down` **zusammen mit dem Kommentar** erneut senden, weil eine neue Bewertung die alte ersetzt.
4. Ein erneuter Klick auf ein bereits gewähltes 👎 löst nichts aus. 👍 schließt und leert eine offene Kommentarbox.

Ohne `allowFeedbackComment` bzw. `allowComment` verhält sich alles wie in Version 1.0.2: Jeder Klick meldet `onFeedback`. Kommentare werden nie geloggt, weil sie personenbezogene Daten enthalten können.

**Thread:** `message.feedbackDisabled = true` blendet Daumen und Kommentar für einzelne Nachrichten aus, z. B. für ältere Nachrichten ohne `request_id`. Die Anzeige des gewählten Daumens steuert weiterhin der Host über `message.feedback`.

**`hvochat-feedback`:**

| | |
|---|---|
| Model | `dataProviderID` (optional, `'positive'`/`'negative'`/`null`, wird sofort lokal angezeigt), `contextId` (z. B. `request_id`, kommt in jedem Handler mit), `label`, `allowComment`, `commentMaxLength`, `texts`, `enabled`, `styleClass`, `tabSeq` |
| Handler | `onFeedback(contextId, feedback, event)`, `onFeedbackComment(contextId, comment, event)` |
| API | `reset()` (Bewertung inkl. Dataprovider, Kommentarbox und Danke-Text zurücksetzen), `requestFocus()` |

In `plugins.dialogs`-Messageboxen lassen sich keine Elemente einbauen. Für „Antwort plus Feedback“ eine kleine eigene Form mit Text-Label und `hvochat-feedback` verwenden und als Popup oder Fenster öffnen. Im Absolute-Layout muss das Element bei `allowComment` hoch genug sein (ca. 200 px).

**Theming:** Über `styleClass` und CSS-Variablen in der Solution-CSS, z. B.:
```css
.hvo-chat { --hvochat-primary: #1f4e79; --hvochat-muted: #eef3f8; --hvochat-radius: 0.75rem; }
```
Verfügbare Variablen sind `--hvochat-background`, `-foreground`, `-muted`, `-muted-foreground`, `-accent`, `-border`, `-border-focus`, `-primary`, `-primary-foreground`, `-destructive`, `-radius`, `-composer-bg`, `-composer-padding`, `-font-size` und `-link`.

Antworten erscheinen standardmäßig wie bei assistant-ui als Fließtext. Für eine Bubble-Darstellung gibt es diese Variablen:

| Bereich | Variablen |
|---|---|
| Antwort-Bubble | `--hvochat-assistant-bg`, `-fg`, `-border`, `-padding`, `-radius`, `-shadow`, `-width` (z. B. `fit-content`), `-max-width` |
| Benutzer-Bubble | `--hvochat-user-bg`, `-fg`, `-border`, `-padding`, `-radius`, `-shadow` |
| Inhalte in der Bubble | `--hvochat-inset-bg` (Code, Tabellenköpfe), `--hvochat-source-bg` (Quellenkarten) |

HVO2go setzt diese Variablen in `HVO2go_Elements.less` bzw. `HVO2go_Dark_Elements.less` unter `.hvo-chat-thread-host`.

## Entwicklung

```bash
npm install          # nur im Package-Root, nie in projects/chat
npm run build        # Library bauen
npm run validate     # Konsistenzpruefung Spec <-> TypeScript <-> MANIFEST
npm run demo         # lokale Demo ohne Servoy: http://localhost:4300 (simuliert Streaming)
npm run make_release # hvochat.zip fuer ng_web_packages erzeugen
```

## In Servoy einbinden (Quellmodus)

1. Im Servoy Developer *File > Import > Existing Projects into Workspace* aufrufen und diesen Ordner wählen. Dabei **nicht** „Copy projects into workspace“ anhaken.
2. Das Package `hvochat` in der Solution als Web-Package referenzieren (Projekt-Referenz in der `.project` der Solution).
3. Servoy baut das Package beim nächsten Titanium-Build aus den Quellen (`.sourcepath`). Danach liegt es unter `.metadata/.plugins/com.servoy.eclipse.ngclient.ui/target/<Solution>/packages/@hvo/chat/`.
4. Für Live-Änderungen im Target-Ordner `npm run build_debug` starten. Den Pfad zeigt die Titanium-Build-Konsole.
