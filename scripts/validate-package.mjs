#!/usr/bin/env node
/**
 * Statische Konsistenzpruefung eines Servoy-Titanium-Web-Packages:
 * MANIFEST.MF <-> .spec <-> TypeScript-Klassen <-> NgModule <-> package.json/ng-package.json.
 *
 * Aufruf:  node validate-package.mjs <packageRoot>
 * Exit-Code 1 bei Fehlern, 0 wenn nur Warnungen/keine Befunde.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';

// Model-Properties, die Servoy im generierten Host-Template NICHT als Input bindet
const caUnboundProps = ['visible', 'size', 'location', 'anchors', 'formIndex', 'attributes'];
// Typen, fuer die Servoy keinen (xxxChange)-Output bindet
const caNoChangeOutputTypes = ['foundset', 'valuelist', 'foundsetRef', 'component'];
const caPushLevels = ['allow', 'shallow', 'deep'];
const cnManifestLineMax = 72;

/** @type {string[]} */
const gaErrors = [];
/** @type {string[]} */
const gaWarnings = [];
/** @type {string[]} */
const gaInfos = [];

const err = (pcMsg) => gaErrors.push(pcMsg);
const warn = (pcMsg) => gaWarnings.push(pcMsg);
const info = (pcMsg) => gaInfos.push(pcMsg);

/**
 * Liest JSON tolerant (entfernt //- und /* *\/-Kommentare ausserhalb von Strings).
 * @param {string} pcPath
 * @returns {any|null}
 */
function readJsonLoose(pcPath) {
    if (!existsSync(pcPath)) return null;
    const lcRaw = readFileSync(pcPath, 'utf8').replace(/^\uFEFF/, '');
    try {
        return JSON.parse(lcRaw);
    } catch {
        const lcStripped = lcRaw.replace(/("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (lcAll, lcStr) => lcStr ?? '');
        try {
            return JSON.parse(lcStripped);
        } catch (leError) {
            err(`${pcPath}: ungueltiges JSON (${leError.message})`);
            return null;
        }
    }
}

/**
 * Parst eine MANIFEST.MF in Haupt-Sektion und Name-Sektionen.
 * @param {string} pcText
 * @returns {{main: Object.<string,string>, entries: Object.<string,string>[], rawLines: string[]}}
 */
function parseManifest(pcText) {
    const laRaw = pcText.split(/\r?\n/);
    /** @type {string[]} */
    const laLogical = [];
    for (const lcLine of laRaw) {
        if (lcLine.startsWith(' ') && laLogical.length) laLogical[laLogical.length - 1] += lcLine.slice(1);
        else laLogical.push(lcLine);
    }
    /** @type {Object.<string,string>[]} */
    const laSections = [{}];
    for (const lcLine of laLogical) {
        if (lcLine.trim() === '') {
            if (Object.keys(laSections[laSections.length - 1]).length) laSections.push({});
            continue;
        }
        const lnIdx = lcLine.indexOf(':');
        if (lnIdx < 0) continue;
        laSections[laSections.length - 1][lcLine.slice(0, lnIdx).trim()] = lcLine.slice(lnIdx + 1).trim();
    }
    const laFiltered = laSections.filter(loS => Object.keys(loS).length);
    return { main: laFiltered[0] || {}, entries: laFiltered.slice(1), rawLines: laRaw };
}

/**
 * Sammelt rekursiv Dateien mit bestimmter Endung (ohne node_modules/dist).
 * @param {string} pcDir
 * @param {RegExp} prPattern
 * @param {string[]} [paOut]
 * @returns {string[]}
 */
function walk(pcDir, prPattern, paOut = []) {
    if (!existsSync(pcDir)) return paOut;
    for (const lcEntry of readdirSync(pcDir)) {
        if (['node_modules', 'dist', '.angular', 'out-tsc', '.git'].includes(lcEntry)) continue;
        const lcPath = join(pcDir, lcEntry);
        if (statSync(lcPath).isDirectory()) walk(lcPath, prPattern, paOut);
        else if (prPattern.test(lcEntry)) paOut.push(lcPath);
    }
    return paOut;
}

/**
 * Prueft, ob im Klassen-Quelltext ein Input mit dem Namen existiert (Signal- oder Decorator-Stil).
 * @param {string} pcSrc
 * @param {string} pcName
 * @returns {boolean}
 */
function hasInput(pcSrc, pcName) {
    const lcN = pcName.replace(/\$/g, '\\$');
    return new RegExp(`\\b${lcN}\\s*=\\s*(input|model)(\\.required)?\\s*[<(]`).test(pcSrc)
        || new RegExp(`@Input\\([^)]*\\)\\s*(public\\s+|readonly\\s+)*${lcN}\\b`).test(pcSrc)
        || new RegExp(`@Input\\([^)]*\\)\\s*set\\s+${lcN}\\b`).test(pcSrc);
}

/**
 * Prueft, ob ein Output <name>Change existiert.
 * @param {string} pcSrc
 * @param {string} pcName
 * @returns {boolean}
 */
function hasChangeOutput(pcSrc, pcName) {
    const lcN = `${pcName}Change`;
    return new RegExp(`\\b${lcN}\\s*=\\s*output\\s*[<(]`).test(pcSrc)
        || new RegExp(`@Output\\([^)]*\\)\\s*(public\\s+|readonly\\s+)*${lcN}\\b`).test(pcSrc)
        || new RegExp(`\\b${pcName}\\s*=\\s*model\\s*[<(]`).test(pcSrc);
}

/**
 * Prueft, ob eine (oeffentliche) Methode existiert.
 * @param {string} pcSrc
 * @param {string} pcName
 * @returns {boolean}
 */
function hasMethod(pcSrc, pcName) {
    return new RegExp(`^\\s*(public\\s+|async\\s+)*${pcName}\\s*(<[^>]*>)?\\s*\\(`, 'm').test(pcSrc)
        || new RegExp(`^\\s*(public\\s+)?(readonly\\s+)?${pcName}\\s*=\\s*(async\\s*)?\\(`, 'm').test(pcSrc);
}

/**
 * Liefert den Typnamen einer Spec-Property.
 * @param {any} poDef
 * @returns {string}
 */
function propType(poDef) {
    if (typeof poDef === 'string') return poDef;
    return (poDef && poDef.type) || 'object';
}

// ---------------------------------------------------------------- Start

const lcRoot = resolve(process.argv[2] || '.');
const lcRel = (pcPath) => relative(lcRoot, pcPath).replace(/\\/g, '/');

// --- MANIFEST
const lcManifestPath = join(lcRoot, 'META-INF', 'MANIFEST.MF');
if (!existsSync(lcManifestPath)) {
    console.error(`ERROR: ${lcManifestPath} fehlt - kein Servoy-Web-Package?`);
    process.exit(1);
}
const lcManifestText = readFileSync(lcManifestPath, 'utf8');
const loManifest = parseManifest(lcManifestText);
const loMain = loManifest.main;
if (!/\n\s*$/.test(lcManifestText)) err('MANIFEST.MF: muss mit Zeilenumbruch enden (letzte Zeile wird sonst ignoriert)');
loManifest.rawLines.forEach((lcLine, lnI) => {
    if (Buffer.byteLength(lcLine, 'utf8') > cnManifestLineMax) warn(`MANIFEST.MF Zeile ${lnI + 1}: laenger als 72 Bytes - mit Fortsetzungszeile (" ...") umbrechen`);
});
for (const lcKey of ['Manifest-Version', 'Bundle-SymbolicName', 'Bundle-Name', 'Bundle-Version', 'Package-Type']) {
    if (!loMain[lcKey]) err(`MANIFEST.MF: "${lcKey}" fehlt`);
}
const lcSymbolic = (loMain['Bundle-SymbolicName'] || '').split(';')[0];
const lcPackageType = loMain['Package-Type'];
const lbComponentPkg = lcPackageType === 'Web-Component';
const lbServicePkg = lcPackageType === 'Web-Service';
if (!lbComponentPkg && !lbServicePkg) err(`MANIFEST.MF: Package-Type "${lcPackageType}" - erwartet Web-Component oder Web-Service`);
if (loMain['NG2-Components']) warn('MANIFEST.MF: "NG2-Components" gibt es erst ab Servoy 2026.9 (Angular 22). Fuer 2026.3/2026.6 "NG2-Module" verwenden.');
if (lbComponentPkg) {
    for (const lcKey of ['NPM-PackageName', 'NG2-Module', 'Entry-Point']) {
        if (!loMain[lcKey] && !(lcKey === 'NG2-Module' && loMain['NG2-Components'])) err(`MANIFEST.MF: "${lcKey}" fehlt (Pflicht fuer Titanium-Component-Packages)`);
    }
}
if (loMain['NG2-CSS-ClientLibs'] && loMain['NG2-CSS-ClientLibs'].includes(';') && !/;priority=\d+/.test(loMain['NG2-CSS-ClientLibs'])) {
    warn('MANIFEST.MF: NG2-CSS-ClientLibs mit ";" getrennt - Servoy trennt Listen mit "," (";" nur fuer ;priority=N)');
}

// --- .sourcepath / Library-Projekt
const loSourcePath = readJsonLoose(join(lcRoot, '.sourcepath'));
let lcLibDir = null;
if (!loSourcePath) {
    err('.sourcepath fehlt - Servoy kann das Package im Workspace nicht aus den Quellen bauen');
} else {
    lcLibDir = join(lcRoot, loSourcePath.srcDir || '');
    if (!existsSync(lcLibDir)) err(`.sourcepath: srcDir "${loSourcePath.srcDir}" existiert nicht`);
    if (!existsSync(join(lcLibDir, `${loSourcePath.apiFile}.ts`))) err(`.sourcepath: apiFile "${loSourcePath.apiFile}.ts" existiert nicht in srcDir (ohne .ts angeben)`);
}
if (!existsSync(join(lcRoot, '.project'))) warn('.project fehlt - Package kann nicht als Eclipse-Projekt importiert werden');
else if (!readFileSync(join(lcRoot, '.project'), 'utf8').includes('com.servoy.eclipse.core.ServoyNGPackage')) err('.project: Nature com.servoy.eclipse.core.ServoyNGPackage fehlt');

let loLibPkg = null;
let loNgPackage = null;
if (lcLibDir && existsSync(lcLibDir)) {
    if (existsSync(join(lcLibDir, 'node_modules'))) err(`${lcRel(join(lcLibDir, 'node_modules'))} existiert - npm install nur im Package-Root ausfuehren`);
    loLibPkg = readJsonLoose(join(lcLibDir, 'package.json'));
    loNgPackage = readJsonLoose(join(lcLibDir, 'ng-package.json'));
    if (!loLibPkg) err(`${lcRel(lcLibDir)}/package.json fehlt`);
    if (!loNgPackage) err(`${lcRel(lcLibDir)}/ng-package.json fehlt`);
}
const loRootPkg = readJsonLoose(join(lcRoot, 'package.json'));
const lcAngularRange = loRootPkg?.dependencies?.['@angular/core'] || '';
const lnAngularMajor = Number((lcAngularRange.match(/\d+/) || [0])[0]);

if (loLibPkg) {
    if (lbComponentPkg && loMain['NPM-PackageName'] && loLibPkg.name !== loMain['NPM-PackageName']) {
        err(`NPM-PackageName "${loMain['NPM-PackageName']}" != Name in ${lcRel(lcLibDir)}/package.json ("${loLibPkg.name}")`);
    }
    const laLibDeps = Object.keys(loLibPkg.dependencies || {}).filter(lcD => lcD !== 'tslib');
    const laAllowed = loNgPackage?.allowedNonPeerDependencies || [];
    for (const lcDep of laLibDeps) {
        if (!laAllowed.includes(lcDep)) err(`ng-package.json: "${lcDep}" fehlt in allowedNonPeerDependencies (ng-packagr bricht sonst ab)`);
        if (loRootPkg && !(loRootPkg.dependencies?.[lcDep] || loRootPkg.devDependencies?.[lcDep])) warn(`package.json (Root): "${lcDep}" fehlt - lokaler Build findet die Bibliothek nicht`);
    }
    for (const lcDep of Object.keys(loLibPkg.dependencies || {})) {
        if (/^@angular\//.test(lcDep)) warn(`${lcRel(lcLibDir)}/package.json: "${lcDep}" gehoert in peerDependencies, nicht dependencies`);
        if (/^(react|react-dom|vue|svelte|preact)$/.test(lcDep)) warn(`${lcRel(lcLibDir)}/package.json: "${lcDep}" - Fremd-Framework im Titanium-Client. Bewusst so entschieden? (Standard: nach Angular portieren)`);
    }
}
if (loNgPackage && lbComponentPkg && loMain['Entry-Point']) {
    const lcDest = resolve(lcLibDir, loNgPackage.dest || '');
    if (lcDest !== resolve(lcRoot, loMain['Entry-Point'])) err(`ng-package.json dest (${lcRel(lcDest)}) != MANIFEST Entry-Point (${loMain['Entry-Point']})`);
}
const lcBuildJs = existsSync(join(lcRoot, 'scripts', 'build.js')) ? readFileSync(join(lcRoot, 'scripts', 'build.js'), 'utf8') : '';
if (!lcBuildJs) warn('scripts/build.js fehlt - kein Release-Zip moeglich');

// --- TypeScript-Quellen
const laTsFiles = lcLibDir ? walk(join(lcLibDir, 'src'), /\.ts$/).filter(lcF => !/\.(spec|cy)\.ts$/.test(lcF)) : [];
/** @type {Object.<string,string>} */
const loTsSrc = {};
for (const lcF of laTsFiles) loTsSrc[lcF] = readFileSync(lcF, 'utf8');
const lcAllTs = Object.values(loTsSrc).join('\n');
const lcPublicApi = loSourcePath && lcLibDir && existsSync(join(lcLibDir, `${loSourcePath.apiFile}.ts`)) ? readFileSync(join(lcLibDir, `${loSourcePath.apiFile}.ts`), 'utf8') : '';

for (const [lcF, lcSrc] of Object.entries(loTsSrc)) {
    if (/console\.log\(/.test(lcSrc)) warn(`${lcRel(lcF)}: console.log gefunden (nicht in development/main committen)`);
}

/**
 * Findet die Moduldatei, die eine Klasse exportiert.
 * @param {string} pcClass
 * @returns {string|null}
 */
function findClassFile(pcClass) {
    for (const [lcF, lcSrc] of Object.entries(loTsSrc)) {
        if (new RegExp(`export\\s+(abstract\\s+)?class\\s+${pcClass}\\b`).test(lcSrc)) return lcF;
    }
    return null;
}

/**
 * Prueft, ob eine api-Funktion im serverscript (oder dem Titanium-spezifischen ng2Config-serverscript) implementiert ist.
 * @param {any} poSpec
 * @param {string} pcApiName
 * @returns {boolean}
 */
function serverImplements(poSpec, pcApiName) {
    const laScripts = [poSpec.serverscript, poSpec.ng2Config?.dependencies?.serverscript].filter(Boolean);
    return laScripts.some(lcRef => {
        const lcPath = join(lcRoot, String(lcRef).slice(lcSymbolic.length + 1));
        return existsSync(lcPath) && new RegExp(`api\\.${pcApiName}\\s*=`).test(readFileSync(lcPath, 'utf8'));
    });
}

/**
 * Prueft, ob eine Klasse ueber die public-api (direkt oder per export *) erreichbar ist.
 * @param {string} pcFile
 * @returns {boolean}
 */
function isExportedViaApi(pcFile) {
    const lcBase = lcRel(pcFile).replace(/\.ts$/, '').split('/src/').pop();
    return lcPublicApi.includes(`'./${lcBase}'`) || lcPublicApi.includes(`"./${lcBase}"`);
}

// NgModule
const lcModuleClass = loMain['NG2-Module'];
let lcModuleSrc = '';
if (lcModuleClass) {
    const lcModFile = findClassFile(lcModuleClass);
    if (!lcModFile) err(`NG2-Module "${lcModuleClass}": keine exportierte Klasse dieses Namens gefunden`);
    else {
        lcModuleSrc = loTsSrc[lcModFile];
        if (!/@NgModule\s*\(/.test(lcModuleSrc)) err(`${lcRel(lcModFile)}: ${lcModuleClass} ist kein @NgModule`);
        if (!isExportedViaApi(lcModFile)) err(`${lcModuleClass} wird nicht aus der public-api exportiert`);
        if (!/ServoyPublicModule/.test(lcModuleSrc)) warn(`${lcModuleClass}: ServoyPublicModule nicht importiert (sabloTabseq, svyFormat, ... fehlen dann)`);
    }
}

// --- Specs
const laEntrySpecs = loManifest.entries.filter(loE => loE.Name && loE.Name.endsWith('.spec'));
const laSpecFilesOnDisk = walk(lcRoot, /\.spec$/).filter(lcF => !lcRel(lcF).startsWith('projects/'));
for (const lcF of laSpecFilesOnDisk) {
    if (!laEntrySpecs.some(loE => loE.Name === lcRel(lcF))) warn(`${lcRel(lcF)} ist nicht in MANIFEST.MF eingetragen ("specification is missing")`);
}

for (const loEntry of laEntrySpecs) {
    const lcSpecRel = loEntry.Name;
    const lcSpecPath = join(lcRoot, lcSpecRel);
    const lbIsComp = String(loEntry['Web-Component'] || '').toLowerCase() === 'true';
    const lbIsSvc = String(loEntry['Web-Service'] || '').toLowerCase() === 'true';
    if (!lbIsComp && !lbIsSvc) err(`MANIFEST.MF: Eintrag ${lcSpecRel} ohne "Web-Component: True" / "Web-Service: True"`);
    if (lbIsComp && lbServicePkg) err(`${lcSpecRel}: Web-Component in einem Web-Service-Package (Components und Services brauchen getrennte Packages)`);
    if (lbIsSvc && lbComponentPkg) err(`${lcSpecRel}: Web-Service in einem Web-Component-Package (Components und Services brauchen getrennte Packages)`);
    if (!existsSync(lcSpecPath)) { err(`${lcSpecRel}: Datei fehlt`); continue; }
    const loSpec = readJsonLoose(lcSpecPath);
    if (!loSpec) continue;
    const lcSpecName = loSpec.name || '';
    const lcFolder = lcSpecRel.split('/')[0];
    if (lcBuildJs && !lcBuildJs.includes(`./${lcFolder}/`)) warn(`scripts/build.js: Ordner "${lcFolder}" wird nicht ins Release-Zip gepackt`);

    // Pfad-Referenzen (mit Bundle-SymbolicName als Praefix)
    for (const lcKey of ['definition', 'doc', 'icon', 'serverscript']) {
        const lcRef = loSpec[lcKey];
        if (!lcRef) {
            if (lcKey === 'definition') warn(`${lcSpecRel}: "definition" fehlt (offizielle Packages liefern weiterhin einen NG1-Stub)`);
            if (lcKey === 'doc') info(`${lcSpecRel}: kein "doc" (_doc.js) - keine Codevervollstaendigungs-Doku`);
            continue;
        }
        if (/^https?:/.test(lcRef)) continue;
        if (!lcRef.startsWith(`${lcSymbolic}/`)) { err(`${lcSpecRel}: "${lcKey}" muss mit "${lcSymbolic}/" beginnen (Bundle-SymbolicName), ist "${lcRef}"`); continue; }
        if (!existsSync(join(lcRoot, lcRef.slice(lcSymbolic.length + 1)))) err(`${lcSpecRel}: "${lcKey}" verweist auf fehlende Datei ${lcRef}`);
    }

    const loModel = loSpec.model || {};
    const loHandlers = loSpec.handlers || {};
    const loApi = loSpec.api || {};
    const loTypes = loSpec.types || {};

    // Doku-Abdeckung
    if (loSpec.doc && existsSync(join(lcRoot, loSpec.doc.slice(lcSymbolic.length + 1)))) {
        const lcDoc = readFileSync(join(lcRoot, loSpec.doc.slice(lcSymbolic.length + 1)), 'utf8');
        for (const lcApiName of Object.keys(loApi)) if (!new RegExp(`function\\s+${lcApiName}\\s*\\(`).test(lcDoc)) info(`${lcSpecRel}: api "${lcApiName}" nicht in _doc.js dokumentiert`);
        for (const lcH of Object.keys(loHandlers)) if (!lcDoc.includes(lcH)) info(`${lcSpecRel}: Handler "${lcH}" nicht in _doc.js dokumentiert`);
    }

    // Typverweise im Model pruefen (eigene Typen muessen in "types" definiert sein)
    const caBuiltinTypes = ['boolean', 'int', 'long', 'double', 'float', 'byte', 'string', 'date', 'object', 'map', 'json', 'tagstring', 'titlestring', 'clientfunction', 'function',
        'dataprovider', 'format', 'valuelist', 'valuelistConfig', 'foundset', 'foundsetRef', 'foundsetInitialPageSize', 'record', 'rowRef', 'dataset', 'media', 'styleclass', 'tabseq', 'color', 'font', 'border', 'dimension', 'point', 'insets', 'scrollbars', 'form', 'formscope',
        'relation', 'labelfor', 'runtimecomponent', 'enabled', 'visible', 'protected', 'readOnly', 'modifiable', 'findmode', 'securestring', 'JSEvent', 'JSMenu', 'JSMenuItem', 'component', 'callback', 'formcomponent', 'variant', 'jsfunction', 'svg', 'uuid', 'JSDataSet', 'JSFoundSet', 'JSRecord', 'servoyfunction', 'number', 'any'];
    for (const [lcProp, loDef] of Object.entries(loModel)) {
        const lcType = propType(loDef).replace(/\[\]$/, '');
        if (!caBuiltinTypes.includes(lcType) && !(lcType in loTypes) && !lcType.includes('.')) warn(`${lcSpecRel}: model.${lcProp} hat unbekannten Typ "${lcType}" (nicht in "types" definiert)`);
    }

    if (lbIsComp) {
        // --- Component-Pruefungen
        if (!lcSpecName.startsWith(`${lcSymbolic}-`) || lcSpecName !== lcSpecName.toLowerCase()) err(`${lcSpecRel}: name "${lcSpecName}" muss klein geschrieben "${lcSymbolic}-<komponente>" sein`);
        const lcClassFile = Object.keys(loTsSrc).find(lcF => new RegExp(`selector\\s*:\\s*['"\`]${lcSpecName}['"\`]`).test(loTsSrc[lcF]));
        if (!lcClassFile) { err(`${lcSpecRel}: keine Angular-Komponente mit selector '${lcSpecName}' gefunden (selector muss exakt dem Spec-Namen entsprechen)`); continue; }
        let lcSrc = loTsSrc[lcClassFile];
        const lcFileRel = lcRel(lcClassFile);
        const laClassMatch = lcSrc.match(/export\s+class\s+(\w+)\s+extends\s+(\w+)/);
        const lcClassName = laClassMatch ? laClassMatch[1] : null;
        // Basisklassen innerhalb des Packages einbeziehen (Inputs koennen geerbt sein)
        let hasInheritedInputs = false;
        let lcParent = laClassMatch ? laClassMatch[2] : null;
        const lsSeen = new Set();
        while (lcParent && lcParent !== 'ServoyBaseComponent' && !lsSeen.has(lcParent)) {
            lsSeen.add(lcParent);
            const lcParentFile = findClassFile(lcParent);
            if (!lcParentFile) { hasInheritedInputs = true; break; }
            lcSrc += '\n' + loTsSrc[lcParentFile];
            const laParentMatch = loTsSrc[lcParentFile].match(new RegExp(`class\\s+${lcParent}\\b[^{]*?extends\\s+(\\w+)`));
            lcParent = laParentMatch ? laParentMatch[1] : null;
        }
        if (!laClassMatch) warn(`${lcFileRel}: Klasse erweitert nicht ServoyBaseComponent`);
        if (hasInheritedInputs) info(`${lcFileRel}: erbt von externer Klasse ${lcParent} - Input/API-Pruefung uebersprungen`);
        if (lnAngularMajor && lnAngularMajor < 22 && !/standalone\s*:\s*false/.test(lcSrc)) err(`${lcFileRel}: "standalone: false" fehlt (Servoy < 2026.9 deklariert Komponenten im NgModule)`);
        if (!/ChangeDetectionStrategy\.OnPush/.test(lcSrc)) warn(`${lcFileRel}: ChangeDetectionStrategy.OnPush empfohlen`);
        for (const lcHook of ['ngOnInit', 'ngOnChanges', 'ngAfterViewInit']) {
            if (!new RegExp(`^\\s*(public\\s+)?${lcHook}\\s*\\(`, 'm').test(lcSrc)) continue;
            if (!new RegExp(`super\\.${lcHook}\\(`).test(lcSrc)) err(`${lcFileRel}: ${lcHook}() ueberschrieben ohne super.${lcHook}() - Servoy-Initialisierung bricht. svyOnInit()/svyOnChanges() verwenden`);
            else warn(`${lcFileRel}: ${lcHook}() ueberschrieben - besser svyOnInit()/svyOnChanges() verwenden`);
        }
        if (/^\s*(public\s+)?ngOnDestroy\s*\(/m.test(lcSrc) && !/super\.ngOnDestroy\(\)/.test(lcSrc)) err(`${lcFileRel}: ngOnDestroy() ohne super.ngOnDestroy()`);
        if (/svyOnInit\s*\(\s*\)\s*(:\s*void\s*)?\{/.test(lcSrc) && !/super\.svyOnInit\(\)/.test(lcSrc)) err(`${lcFileRel}: svyOnInit() ohne super.svyOnInit()`);

        // Template
        const laTplMatch = lcSrc.match(/templateUrl\s*:\s*['"`]([^'"`]+)['"`]/);
        let lcTpl = '';
        if (laTplMatch) {
            const lcTplPath = join(lcClassFile, '..', laTplMatch[1]);
            if (existsSync(lcTplPath)) lcTpl = readFileSync(lcTplPath, 'utf8'); else err(`${lcFileRel}: templateUrl ${laTplMatch[1]} fehlt`);
        } else {
            const laInline = lcSrc.match(/template\s*:\s*`([\s\S]*?)`/);
            lcTpl = laInline ? laInline[1] : '';
        }
        if (lcTpl) {
            if (!/#element\b/.test(lcTpl)) err(`${lcFileRel}: Template ohne #element - svyOnInit() wird nie aufgerufen`);
            if (!/servoyApi(\(\))?\.getMarkupId\(\)/.test(lcTpl)) warn(`${lcFileRel}: [id]="servoyApi.getMarkupId()" fehlt - im Designer nicht selektierbar`);
            const lbHasTabseq = Object.values(loModel).some(loD => propType(loD) === 'tabseq');
            // [tabSeq]="tabSeq()" an eine interne Kind-Komponente durchgereicht zaehlt ebenfalls
            if (lbHasTabseq && !/sabloTabseq|\[tabSeq\]\s*=/.test(lcTpl)) warn(`${lcFileRel}: Spec hat tabseq, Template nutzt aber kein [sabloTabseq]`);
            // tabindex="-1" (bewusst aus der Tab-Reihenfolge nehmen) ist erlaubt
            if (/\[attr\.tabindex\]|\btabindex\s*=\s*["'](?!-1["'])/i.test(lcTpl)) warn(`${lcFileRel}: tabindex direkt gesetzt - [sabloTabseq] verwenden`);
            if ('styleClass' in loModel && !/styleClass/.test(lcTpl)) warn(`${lcFileRel}: styleClass wird im Template nicht gebunden`);
        }

        // Model -> Inputs / Outputs
        for (const [lcProp, loDef] of Object.entries(loModel)) {
            if (caUnboundProps.includes(lcProp)) continue;
            // Kein Build-Fehler (CUSTOM_ELEMENTS_SCHEMA im Titanium-Client), der Wert landet aber nur als DOM-Property
            if (!hasInput(lcSrc, lcProp) && !hasInheritedInputs) warn(`${lcFileRel}: Input "${lcProp}" fehlt (Spec-Model) - Wert erreicht die Komponente nie (kein Build-Fehler, stiller Bug)`);
            const lcPush = typeof loDef === 'object' ? loDef.pushToServer : undefined;
            const lcType = propType(loDef);
            if (caPushLevels.includes(lcPush) && !caNoChangeOutputTypes.includes(lcType.replace(/\[\]$/, '')) && !hasChangeOutput(lcSrc, lcProp)) {
                warn(`${lcFileRel}: "${lcProp}" hat pushToServer=${lcPush}, aber kein Output "${lcProp}Change" - Aenderungen erreichen den Server nicht`);
            }
            if (lcType === 'dataprovider' && !caPushLevels.includes(lcPush)) info(`${lcSpecRel}: dataprovider "${lcProp}" ohne pushToServer - nur lesend`);
        }
        for (const lcH of Object.keys(loHandlers)) {
            if (loHandlers[lcH] && loHandlers[lcH].private) continue;
            if (!hasInput(lcSrc, lcH) && !hasInheritedInputs) err(`${lcFileRel}: Handler-Input "${lcH}" fehlt - Handler kann nie ausgeloest werden`);
        }
        for (const lcApiName of Object.keys(loApi)) {
            if (!hasMethod(lcSrc, lcApiName) && !hasInheritedInputs && !serverImplements(loSpec, lcApiName)) {
                err(`${lcFileRel}: api "${lcApiName}" weder als Methode noch im serverscript implementiert`);
            }
        }
        for (const lcApiName of Object.keys(loSpec.internalApi || {})) {
            if (!hasMethod(lcSrc, lcApiName)) info(`${lcFileRel}: internalApi "${lcApiName}" nicht im Client - muss im serverscript ($scope.${lcApiName}) liegen`);
        }

        // NgModule
        if (lcClassName && lcModuleSrc) {
            const laDecl = lcModuleSrc.match(/declarations\s*:\s*\[([\s\S]*?)\]/);
            const laExp = lcModuleSrc.match(/exports\s*:\s*\[([\s\S]*?)\]/);
            if (!laDecl || !new RegExp(`\\b${lcClassName}\\b`).test(laDecl[1])) err(`${lcModuleClass}: ${lcClassName} nicht in declarations`);
            if (!laExp || !new RegExp(`\\b${lcClassName}\\b`).test(laExp[1])) err(`${lcModuleClass}: ${lcClassName} nicht in exports`);
        }
        if (!isExportedViaApi(lcClassFile)) warn(`${lcClassName}: nicht aus der public-api exportiert`);
    }

    if (lbIsSvc) {
        // --- Service-Pruefungen
        const loNg2 = loSpec.ng2Config;
        if (!loNg2) { err(`${lcSpecRel}: "ng2Config" fehlt - Servoy kann den Angular-Service nicht registrieren`); continue; }
        for (const lcKey of ['packageName', 'serviceName', 'entryPoint']) if (!loNg2[lcKey]) err(`${lcSpecRel}: ng2Config.${lcKey} fehlt`);
        if (loLibPkg && loNg2.packageName && loNg2.packageName !== loLibPkg.name) err(`${lcSpecRel}: ng2Config.packageName "${loNg2.packageName}" != Library-Name "${loLibPkg.name}"`);
        if (loNgPackage && loNg2.entryPoint && resolve(lcLibDir, loNgPackage.dest || '') !== resolve(lcRoot, loNg2.entryPoint)) err(`${lcSpecRel}: ng2Config.entryPoint != ng-package.json dest`);
        const lcSvcFile = loNg2.serviceName ? findClassFile(loNg2.serviceName) : null;
        if (loNg2.serviceName && !lcSvcFile) { err(`${lcSpecRel}: Service-Klasse "${loNg2.serviceName}" nicht gefunden`); continue; }
        const lcSvcSrc = lcSvcFile ? loTsSrc[lcSvcFile] : '';
        if (lcSvcFile && !/@Injectable\s*\(/.test(lcSvcSrc)) err(`${lcRel(lcSvcFile)}: @Injectable() fehlt`);
        if (lcSvcFile && !isExportedViaApi(lcSvcFile)) err(`${loNg2.serviceName}: nicht aus der public-api exportiert`);
        if (loNg2.moduleName) {
            const lcModFile = findClassFile(loNg2.moduleName);
            if (!lcModFile) err(`${lcSpecRel}: ng2Config.moduleName "${loNg2.moduleName}" nicht gefunden`);
            else {
                const laProv = loTsSrc[lcModFile].match(/providers\s*:\s*\[([\s\S]*?)\]/);
                if (!laProv || !laProv[1].includes(loNg2.serviceName)) err(`${loNg2.moduleName}: stellt ${loNg2.serviceName} nicht in providers bereit`);
                if (!isExportedViaApi(lcModFile)) err(`${loNg2.moduleName}: nicht aus der public-api exportiert`);
            }
        }
        for (const lcApiName of Object.keys(loApi)) {
            if (!hasMethod(lcSvcSrc, lcApiName) && !serverImplements(loSpec, lcApiName)) {
                err(`${loNg2.serviceName}: api "${lcApiName}" weder als Methode noch im serverscript implementiert`);
            }
        }
        if (/sendServiceChanges\s*\(/.test(lcSvcSrc)) warn(`${loNg2.serviceName}: sendServiceChanges() ist deprecated - sendServiceChangeToServer() verwenden`);
    }
}

// --- Ausgabe
const lcOut = [
    ...gaErrors.map(lcM => `ERROR   ${lcM}`),
    ...gaWarnings.map(lcM => `WARN    ${lcM}`),
    ...gaInfos.map(lcM => `INFO    ${lcM}`)
].join('\n');
console.log(lcOut || 'Keine Befunde.');
console.log(`\n${gaErrors.length} Fehler, ${gaWarnings.length} Warnungen, ${gaInfos.length} Hinweise (${laEntrySpecs.length} Specs geprueft)`);
process.exit(gaErrors.length ? 1 : 0);
