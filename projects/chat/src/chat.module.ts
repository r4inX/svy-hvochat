import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServoyPublicModule } from '@servoy/public';
import { HvoChatComposer } from './composer/composer';
import { HvoChatThread } from './thread/thread';
import { HvoChatComposerCore } from './shared/composer-core/composer-core';
import { HvoChatIcon } from './shared/icon/icon';
import { HvoChatMarkdownPipe } from './shared/markdown/markdown.pipe';

/**
 * Angular-Modul des Packages @hvo/chat (MANIFEST: NG2-Module).
 * Servoy-Komponenten werden deklariert UND exportiert; interne Bausteine (shared/) nur deklariert.
 */
@NgModule({
    declarations: [HvoChatThread, HvoChatComposer, HvoChatComposerCore, HvoChatIcon, HvoChatMarkdownPipe],
    imports: [CommonModule, FormsModule, ServoyPublicModule],
    providers: [],
    exports: [HvoChatThread, HvoChatComposer]
})
export class HvoChatModule { }
