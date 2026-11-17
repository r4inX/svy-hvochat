import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom, provideZonelessChangeDetection } from '@angular/core';
import { ServoyPublicTestingModule } from '@servoy/public';
import { DemoComponent } from './demo.component';

/**
 * Demo-App: rendert die Komponenten mit den Servoy-Test-Attrappen (kein Servoy nötig).
 * Zoneless wie der Titanium-Client ab Servoy 2026.9.
 */
bootstrapApplication(DemoComponent, {
    providers: [provideZonelessChangeDetection(), importProvidersFrom(ServoyPublicTestingModule)]
}).catch((leError) => console.error(leError));
