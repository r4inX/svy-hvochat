# Third-Party Notices

## assistant-ui

- Quelle: https://github.com/assistant-ui/assistant-ui
- Stand: Commit `b6444661cf03cae6c5e10baba1e12c9e010b8ea0` (2026-10-02)
- Lizenz: MIT, Copyright (c) 2026 AgentbaseAI Inc.

Verhalten und Optik der folgenden Dateien wurden nach Angular portiert. Es wurde kein Quellcode 1:1 übernommen, Logik und Styles sind nachgebaut.

| Original | Portiert nach |
|---|---|
| `packages/react/src/primitives/composer/ComposerInput.tsx` | `projects/chat/src/shared/composer-core/` |
| `packages/ui/src/components/react/assistant-ui/elements/thread.aui.tsx` | `projects/chat/src/thread/`, `projects/chat/src/shared/composer-core/` |
| `packages/ui/src/components/react/assistant-ui/elements/markdown-text.tsx` | `projects/chat/src/thread/thread.css` (Markdown-Styles) |
| `packages/ui/src/components/react/assistant-ui/elements/reasoning.tsx` | `projects/chat/src/thread/` (Denkprozess) |
| `packages/ui/src/components/react/assistant-ui/elements/sources.tsx` | `projects/chat/src/thread/` (Quellen) |

```
MIT License

Copyright (c) 2026 AgentbaseAI Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Lucide Icons

- Quelle: https://lucide.dev
- Lizenz: ISC
- Verwendung: SVG-Pfaddaten in `projects/chat/src/shared/icon/icon.ts`

## npm-Abhängigkeiten (Laufzeit)

| Paket | Lizenz | Zweck |
|---|---|---|
| `marked` | MIT | Markdown → HTML |
| `dompurify` | MPL-2.0 OR Apache-2.0 | HTML-Bereinigung (XSS-Schutz) |
