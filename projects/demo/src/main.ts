import 'zone.js';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { ServoyPublicTestingModule } from '@servoy/public';
import { HvoChatModule } from '../../chat/src/public-api';
import { DemoComponent } from './demo.component';

/**
 * Demo-Modul: rendert die Komponenten mit den Servoy-Test-Attrappen (kein Servoy noetig).
 */
@NgModule({
    declarations: [DemoComponent],
    imports: [BrowserModule, ServoyPublicTestingModule, HvoChatModule],
    bootstrap: [DemoComponent]
})
class DemoModule { }

platformBrowserDynamic().bootstrapModule(DemoModule).catch((leError) => console.error(leError));
