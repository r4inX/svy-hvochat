# HVO Chat (`@hvo/chat`)

Servoy-Titanium-Web-Package mit Chat-Komponenten, portiert aus [assistant-ui](https://github.com/assistant-ui/assistant-ui) nach Angular.

| | |
| --- | --- |
| **Bundle** | `hvochat` (Package-Typ Web-Component) |
| **Version** | siehe [Versionshistorie](#versionshistorie) bzw. `META-INF/MANIFEST.MF` |
| **Zielversion** | Servoy 2026.3 – 2026.6, Angular 21, `@servoy/public` 2026.3.0 |
| **Erzeugt mit** | Claude-Skill [`convert-to-servoy-comp`](../svy-assistant-ui) |
| **Lizenzen** | [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) (assistant-ui MIT, Lucide ISC, marked MIT, DOMPurify MPL-2.0/Apache-2.0) |

## Inhalt

- [Elemente](#elemente)
- [In Servoy einbinden](#in-servoy-einbinden)
- [Verwendung: hvochat-thread](#verwendung-hvochat-thread)
- [Verwendung: hvochat-composer](#verwendung-hvochat-composer)
- [Feedback (Thread und hvochat-feedback)](#feedback-thread-und-hvochat-feedback)
- [Theming](#theming)
- [Entwicklung](#entwicklung)
- [Neue Version erstellen](#neue-version-erstellen)
- [Package erweitern](#package-erweitern)
- [Versionshistorie](#versionshistorie)
- [Abdeckung der assistant-ui-Primitives](#abdeckung-der-assistant-ui-primitives)

## Elemente

| Form-Element-Typ | Zweck |
| --- | --- |
| `hvochat-thread` | Komplette Chat-Ansicht: Verlauf mit Markdown, Bildern, Quellen und Denkprozess. Dazu Aktionsleiste (Kopieren, Feedback mit optionalem Kommentar, Vorlesen, Neu generieren, Export als Markdown), Versionswechsler, Vorschläge und integriertes Eingabefeld. |
| `hvochat-composer` | Eigenständiges Eingabefeld für eigene Layouts |
| `hvochat-feedback` | Eigenständige Bewertung (👍/👎, optional mit Kommentar) für Stellen ohne Chat-Thread |

Beide Eingabefelder senden mit **Enter**, **Shift+Enter** fügt einen Zeilenumbruch ein. Der Zeilenumbruch erscheint beim Senden nicht kurz, anders als bei der Floatlabel-Textbox.

## In Servoy einbinden

Es gibt zwei Wege. Bitte nicht beide gleichzeitig verwenden.

**Zip-Modus** (normaler Weg, z. B. für HVO2go und den Build-Server):

1. `hvochat.zip` erzeugen (siehe [Neue Version erstellen](#neue-version-erstellen)) oder aus einem Release übernehmen.
2. In den Ordner `ng_web_packages` der Solution kopieren, z. B. `C:\wrksp_2go_ti\HVO2go\ng_web_packages\hvochat.zip`.
3. Servoy Developer neu starten. Die Elemente erscheinen in der Palette unter der Kategorie **HVO**.

**Quellmodus** (zum Entwickeln direkt in Servoy):

1. Im Servoy Developer *File > Import > Existing Projects into Workspace* aufrufen und diesen Ordner wählen. Dabei **nicht** „Copy projects into workspace“ anhaken.
2. Das Projekt `hvochat` in der Solution als Web-Package referenzieren (Projekt-Referenz in der `.project` der Solution).
3. Servoy baut das Package beim nächsten Titanium-Build aus den Quellen (`.sourcepath`). Danach liegt es unter `.metadata/.plugins/com.servoy.eclipse.ngclient.ui/target/<Solution>/packages/@hvo/chat/`.
4. Für Live-Änderungen im Target-Ordner `npm run build_debug` starten. Den Pfad zeigt die Titanium-Build-Konsole.

**Hinweis:** `.frm`- und `.js`-Dateien nie bearbeiten, während Servoy Developer läuft. Er überschreibt die Änderungen sonst.

## Verwendung: hvochat-thread

Die Daten hält der Server. Nachrichten gehen als `messages` an die Komponente, Benutzeraktionen kommen als Handler zurück. Für das Befüllen gibt es serverseitige Funktionen am Element: `addMessage`, `appendText`, `updateMessage`, `getMessage`, `removeMessage` und `clearMessages`.

```javascript
/**
 * onSubmit-Handler des Elements "chat" (hvochat-thread)
 * @param {String} text
 * @param {JSEvent} event
 * @return {Boolean} false: Text kommt zurueck ins Eingabefeld
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

> **Streaming:** Servoy schickt Model-Änderungen normalerweise erst am Ende des Server-Requests an den Browser. Nach jedem `appendText()` daher `application.updateUI()` aufrufen. Das ist noch nicht in Servoy getestet, nur in der lokalen Demo.

**Felder einer Nachricht** (Typ `message`):

| Feld | Bedeutung |
| --- | --- |
| `id` | eindeutige ID |
| `role` | `user` / `assistant` |
| `text` | Text, bei Antworten Markdown |
| `status` | `complete` / `running` / `error` |
| `error` | Fehlermeldung bei `status: 'error'` |
| `reasoning` | Denkprozess, aufklappbar |
| `sources` | Quellen (`id`, `title`, `url`, `snippet`, `label`) |
| `images` | Bild-URLs bzw. Media |
| `branchNumber`, `branchCount` | Versionswechsler, ab 2 Versionen sichtbar |
| `feedback` | gewählter Daumen: `positive` / `negative` / `null` |
| `feedbackDisabled` | `true` blendet Daumen und Kommentar für diese Nachricht aus |
| `createdAt` | Zeitstempel |

**Handler** (alle optional; ohne Handler wird der zugehörige Button ausgeblendet):

| Handler | Parameter |
| --- | --- |
| `onSubmit` | `text`, `event`. Rückgabe `false` stellt den Text wieder ins Eingabefeld. |
| `onCancel` | `event` (Stopp-Button / Escape während `busy`) |
| `onReload` | `messageId`, `event` |
| `onEdit` | `messageId`, `text`, `event` |
| `onFeedback` | `messageId`, `'positive'`/`'negative'`, `event` |
| `onFeedbackComment` | `messageId`, `comment`, `event` (nur mit `allowFeedbackComment`) |
| `onBranchChange` | `messageId`, `branchNumber`, `event` |
| `onSourceClick` | `messageId`, `sourceIndex`, `event` (ohne Handler wird `source.url` geöffnet) |

**Wichtige Properties:**
- `busy`
- `welcomeText`, `placeholderText`, `suggestions`
- `showComposer`, `markdown`
- `allowCopy`, `allowEdit`, `allowReload`, `allowFeedback`, `allowFeedbackComment`, `allowSpeak`, `allowExportMarkdown`
- `showBranchPicker`, `showSources`, `showReasoning`
- `maxContentWidth`
- `texts` (alle Beschriftungen, Standard Deutsch)

Die vollständige Doku steht in [`thread/thread_doc.js`](thread/thread_doc.js) und ist in Servoy per Codevervollständigung sichtbar.

## Verwendung: hvochat-composer

| | |
| --- | --- |
| Properties | `dataProviderID` (optional, Entwurf), `placeholderText`, `submitMode` (`enter` / `ctrlEnter` / `none`), `clearOnSubmit`, `busy`, `maxHeight`, `maxLength`, `autoFocus`, `showSendButton`, `sendButtonText`, `cancelButtonText` |
| Handler | `onSubmit(text, event)` (Rückgabe `false` stellt den Text wieder her), `onCancel(event)` |
| API | `requestFocus()`, `clear()`, `setText(text)`, `getText()` |

Der Composer schreibt den Text **vor** dem Aufruf von `onSubmit` in den Dataprovider. Bestehende Handler, die die Variable lesen, funktionieren also, ebenso Handler, die den Parameter `text` verwenden.

## Feedback (Thread und hvochat-feedback)

Thread und `hvochat-feedback` nutzen denselben internen Baustein, Aussehen und Verhalten sind also identisch.

**Ablauf bei 👎 mit Kommentar** (`allowFeedbackComment` im Thread bzw. `allowComment` im Element):

1. `onFeedback(id, 'negative', event)` wird **sofort** gemeldet. Die Bewertung also gleich ans Backend senden.
2. Unter der Antwort öffnet sich eine Kommentarbox mit Zähler und Hinweis auf die Protokollierung. **Strg+Enter** sendet, **Escape** schließt.
3. Nach dem Senden kommt `onFeedbackComment(id, kommentar, event)` mit getrimmtem Text, höchstens `feedbackCommentMaxLength` bzw. `commentMaxLength` Zeichen. Danach erscheint „Danke für Ihr Feedback“. Fürs Backend die Bewertung `down` **zusammen mit dem Kommentar** erneut senden, weil eine neue Bewertung die alte ersetzt.
4. Ein erneuter Klick auf ein bereits gewähltes 👎 löst nichts aus. 👍 schließt und leert eine offene Kommentarbox.

Ohne `allowFeedbackComment` bzw. `allowComment` verhält sich alles wie in Version 1.0.2: Jeder Klick meldet `onFeedback`. Kommentare werden nie geloggt, weil sie personenbezogene Daten enthalten können.

Im **Thread** blendet `message.feedbackDisabled = true` Daumen und Kommentar für einzelne Nachrichten aus, z. B. für ältere Nachrichten ohne `request_id`. Den gewählten Daumen zeigt der Host über `message.feedback` an.

**`hvochat-feedback`:**

| | |
| --- | --- |
| Properties | `dataProviderID` (optional, `'positive'`/`'negative'`/`null`, wird sofort lokal angezeigt), `contextId` (z. B. `request_id`, kommt in jedem Handler mit), `label`, `allowComment`, `commentMaxLength`, `texts`, `enabled`, `styleClass`, `tabSeq` |
| Handler | `onFeedback(contextId, feedback, event)`, `onFeedbackComment(contextId, comment, event)` |
| API | `reset()` (Bewertung inkl. Dataprovider, Kommentarbox und Danke-Text zurücksetzen), `requestFocus()` |

In `plugins.dialogs`-Messageboxen lassen sich keine Elemente einbauen. Für „Antwort plus Feedback“ eine kleine eigene Form mit Text-Label und `hvochat-feedback` verwenden und als Popup oder Fenster öffnen. Im Absolute-Layout muss das Element bei `allowComment` hoch genug sein (ca. 200 px).

## Theming

Die Komponenten lesen nur CSS-Variablen, jeweils mit neutralem Standardwert. Gesetzt werden sie in der Solution-CSS am Container oder per `styleClass`:

```css
.hvo-chat { --hvochat-primary: #1f4e79; --hvochat-muted: #eef3f8; --hvochat-radius: 0.75rem; }
```

| Bereich | Variablen |
| --- | --- |
| Allgemein | `--hvochat-background`, `-foreground`, `-muted`, `-muted-foreground`, `-accent`, `-border`, `-border-focus`, `-primary`, `-primary-foreground`, `-destructive`, `-radius`, `-font-size`, `-link` |
| Eingabefeld | `--hvochat-composer-bg`, `-composer-padding`, `-placeholder` |
| Antwort-Bubble | `--hvochat-assistant-bg`, `-fg`, `-border`, `-padding`, `-radius`, `-shadow`, `-width` (z. B. `fit-content`), `-max-width` |
| Benutzer-Bubble | `--hvochat-user-bg`, `-fg`, `-border`, `-padding`, `-radius`, `-shadow` |
| Inhalte in der Bubble | `--hvochat-inset-bg` (Code, Tabellenköpfe), `--hvochat-source-bg` (Quellenkarten) |
| Feedback-Kommentarbox | `--hvochat-feedback-comment-max-width`, `--hvochat-feedback-comment-radius` |

Ohne die Bubble-Variablen erscheinen Antworten wie bei assistant-ui als Fließtext. HVO2go setzt die Variablen in `HVO2go_Elements.less` bzw. `HVO2go_Dark_Elements.less` unter `.hvo-chat-thread-host`.

## Entwicklung

**Voraussetzungen:** Node.js 20.19+ oder 22.12+, npm, Git. Optional Servoy Developer 2026.3 – 2026.6 für den Test im Client.

```bash
git clone <repo-url> svy-hvochat
cd svy-hvochat
npm install                    # nur im Package-Root, nie in projects/chat
```

| Befehl | Zweck |
| --- | --- |
| `npm run build` | Library nach `dist/hvo/chat` bauen |
| `npm run validate` | Konsistenzprüfung Spec ↔ TypeScript ↔ MANIFEST ↔ Modul (muss 0 Fehler melden) |
| `npm run demo` | lokale Demo ohne Servoy auf <http://localhost:4300>. Simuliert Streaming, Feedback-Roundtrip und alle Handler; das Handler-Log steht rechts auf der Seite. |
| `npm run set-version -- x.y.z` | Version an allen Stellen setzen |
| `npm run make_release` | Production-Build und `hvochat.zip` erzeugen |
| `npm run build_debug` | Library im Watch-Modus bauen |

**Projektstruktur:**

```
META-INF/MANIFEST.MF          Package-Beschreibung für Servoy (Bundle-Version, NG2-Module, Specs)
composer/  thread/  feedback/ pro Element: .spec (Schnittstelle), _doc.js (Doku), Icon, NG1-Stub;
                              thread/thread_server.js: serverseitige API (addMessage, appendText …)
projects/chat/src/            Angular-Library
  composer/ thread/ feedback/ Servoy-Komponenten (Wrapper)
  shared/                     interne Bausteine: composer-core, feedback-core, markdown, icon
  chat.module.ts              NgModule (deklariert alles, exportiert die drei Elemente)
projects/demo/                lokale Demo-App (nicht Teil des Zips)
scripts/                      build.js (Zip), validate-package.mjs, set-version.mjs
servoy-package.config.json    Zustand für den Skill-Scaffold (--add)
```

**Regeln:**
- Jede Property der Spec braucht ein gleichnamiges `input()`. Sonst kommt der Wert nie an, ohne dass ein Build-Fehler auftritt. `npm run validate` prüft das.
- Kein `console.log` im Library-Code.
- Code-Kommentare auf Deutsch.

## Neue Version erstellen

1. Änderungen umsetzen und in der Demo prüfen (`npm run demo`). Nach Änderungen an CSS oder Templates die Seite neu laden, denn Hot-Reload setzt den Komponentenzustand zurück.
2. `npm run build` und `npm run validate` ausführen. Der Validator muss 0 Fehler melden.
3. Version erhöhen:
   ```bash
   npm run set-version -- 1.0.4
   ```
   Das setzt `META-INF/MANIFEST.MF`, `package.json`, `package-lock.json`, `projects/chat/package.json` und `servoy-package.config.json`. **Ohne neue Version liest Servoy ein ersetztes Zip nicht neu ein.**
4. Die [Versionshistorie](#versionshistorie) unten ergänzen.
5. Release bauen:
   ```bash
   npm run make_release        # erzeugt hvochat.zip
   ```
6. Das Zip nach `<Solution>/ng_web_packages/` kopieren, Servoy Developer neu starten und im Client testen.
7. Committen (`feat: …`, `fix: …`). Das Zip ist per `.gitignore` ausgeschlossen und wird jederzeit neu erzeugt.

## Package erweitern

Neue Elemente am einfachsten mit dem Skill anlegen, z. B. „Füge dem Package svy-hvochat ein Element threadlist hinzu“. Das läuft über `scaffold.mjs --add`, das MANIFEST, Modul, `public-api.ts` und `build.js` ergänzt.

Services (`plugins.xyz`) brauchen ein **eigenes** Package, weil ein Package genau einen Typ hat.

## Versionshistorie

| Version | Änderungen |
| --- | --- |
| 1.0.3 | Thread: optionales Kommentarfeld bei 👎 (`allowFeedbackComment`, `feedbackCommentMaxLength`, `onFeedbackComment`) und `message.feedbackDisabled`. Neues Element `hvochat-feedback`. Gemeinsamer Feedback-Baustein. Neues Werkzeug `npm run set-version`. |
| 1.0.2 | Antwort-Bubble über CSS-Variablen (`--hvochat-assistant-*`, `--hvochat-inset-bg`, `--hvochat-source-bg`) |
| 1.0.1 | Composer schreibt den Dataprovider vor `onSubmit`. Elemente füllen im Responsive-Layout den Flex-Container. Benutzer-Bubble über Variablen themebar. |
| 1.0.0 | Erste Version: `hvochat-thread` und `hvochat-composer` |

## Abdeckung der assistant-ui-Primitives

| Primitive | Status | Wo |
| --- | --- | --- |
| Thread (Root, Viewport, Messages, Empty, ScrollToBottom, ViewportFooter, Suggestions) | ✅ | `hvochat-thread` |
| Message, MessagePart (Text/Markdown, Image, InProgress), Error | ✅ | `hvochat-thread` |
| ChainOfThought / Reasoning | ✅ (als `message.reasoning`) | `hvochat-thread` |
| ActionBar (Copy, Edit, Reload, FeedbackPositive/-Negative, Speak/StopSpeaking, ExportMarkdown), ActionBarMore | ✅ | `hvochat-thread`, Feedback auch als `hvochat-feedback` |
| BranchPicker | ✅ | `hvochat-thread` |
| Suggestion | ✅ | `hvochat-thread` |
| Composer (Root, Input, Send, Cancel) | ✅ | `hvochat-composer`, integriert in `hvochat-thread` |
| Composer: Attachments, AddAttachment, AttachmentDropzone, Attachment-Primitives | ⏳ geplant | |
| Composer: Dictate, StopDictation, DictationTranscript | ⏳ geplant | |
| Composer: Quote, SelectionToolbar | ⏳ geplant | |
| Composer: Queue, QueueItem | ⏳ geplant | |
| ThreadList, ThreadListItem, ThreadListItemMore | ⏳ geplant | `hvochat-threadlist` |
| AssistantModal | ⏳ geplant | `hvochat-assistantmodal` |

Nicht portiert wird die Laufzeit von assistant-ui (Runtime, Stores, KI-Adapter). In Servoy hält der Server den Zustand.
