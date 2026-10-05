#!/usr/bin/env node
/**
 * Setzt die Versionsnummer eines Servoy-Web-Packages an allen Stellen gleichzeitig:
 *   META-INF/MANIFEST.MF (Bundle-Version), package.json, package-lock.json (Root-Eintrag),
 *   <srcDir>/package.json (laut .sourcepath) und servoy-package.config.json (falls vorhanden).
 *
 * Aufruf:  node scripts/set-version.mjs <x.y.z> [packageRoot]
 *          npm run set-version -- 1.0.4
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const crSemver = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

const lcVersion = process.argv[2];
const lcRoot = resolve(process.argv[3] || '.');
if (!lcVersion || !crSemver.test(lcVersion)) {
    console.error('Usage: node scripts/set-version.mjs <x.y.z> [packageRoot]   (z. B. 1.0.4)');
    process.exit(1);
}

/** @type {string[]} */
const laChanged = [];

/**
 * Setzt das Feld "version" in einer JSON-Datei, ohne die restliche Formatierung zu veraendern.
 * @param {string} pcPath
 * @param {boolean} [pbLockFile] - package-lock.json: zusaetzlich packages[""].version
 */
function setJsonVersion(pcPath, pbLockFile) {
    if (!existsSync(pcPath)) return;
    const lcRaw = readFileSync(pcPath, 'utf8');
    const loJson = JSON.parse(lcRaw);
    loJson.version = lcVersion;
    if (pbLockFile && loJson.packages && loJson.packages['']) loJson.packages[''].version = lcVersion;
    const lcIndent = (lcRaw.match(/^\{\r?\n([ \t]+)/) || [null, '  '])[1];
    const lcEol = lcRaw.includes('\r\n') ? '\r\n' : '\n';
    writeFileSync(pcPath, JSON.stringify(loJson, null, lcIndent).replace(/\n/g, lcEol) + lcEol);
    laChanged.push(pcPath);
}

// MANIFEST.MF
const lcManifestPath = join(lcRoot, 'META-INF', 'MANIFEST.MF');
if (!existsSync(lcManifestPath)) {
    console.error(`ERROR: ${lcManifestPath} fehlt - kein Servoy-Web-Package?`);
    process.exit(1);
}
const lcManifest = readFileSync(lcManifestPath, 'utf8');
if (!/^Bundle-Version:.*$/m.test(lcManifest)) {
    console.error('ERROR: MANIFEST.MF enthaelt keine Zeile "Bundle-Version:"');
    process.exit(1);
}
writeFileSync(lcManifestPath, lcManifest.replace(/^Bundle-Version:.*$/m, `Bundle-Version: ${lcVersion}`));
laChanged.push(lcManifestPath);

// package.json-Dateien
setJsonVersion(join(lcRoot, 'package.json'));
setJsonVersion(join(lcRoot, 'package-lock.json'), true);
if (existsSync(join(lcRoot, '.sourcepath'))) {
    const loSourcePath = JSON.parse(readFileSync(join(lcRoot, '.sourcepath'), 'utf8'));
    setJsonVersion(join(lcRoot, loSourcePath.srcDir, 'package.json'));
}
setJsonVersion(join(lcRoot, 'servoy-package.config.json'));

console.log(`Version ${lcVersion} gesetzt in:\n  ${laChanged.map((lcF) => lcF.slice(lcRoot.length + 1).replace(/\\/g, '/')).join('\n  ')}`);
