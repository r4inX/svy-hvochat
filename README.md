# HVO Chat

Servoy-Titanium-Component-Package `@hvo/chat` (Bundle `hvochat`). Es enthält Chat-Komponenten, die aus [assistant-ui](https://github.com/assistant-ui/assistant-ui) nach Angular portiert wurden.

- **Zielversion:** Servoy 2026.6.0, Angular 21.2.16, @servoy/public 2026.3.0
- **Erzeugt mit:** dem Claude-Skill `convert-to-servoy-comp`
- **Lizenzhinweise:** siehe [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)

| Form-Element-Typ | Klasse | Zweck |
|---|---|---|
| `hvochat-thread` | `HvoChatThread` | Komplette Chat-Ansicht, siehe unten |
| `hvochat-composer` | `HvoChatComposer` | Eigenständiges Eingabefeld, z. B. für eigene Layouts |

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
| `onBranchChange` | `messageId`, `branchNumber`, `event` |
| `onSourceClick` | `messageId`, `sourceIndex`, `event` (ohne Handler wird `source.url` geöffnet) |

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
