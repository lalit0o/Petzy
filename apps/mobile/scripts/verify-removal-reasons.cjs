// Reglas de motivo y nota de retirada (D-140); deben coincidir con RemoveContentDto del servidor.
/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');

const file = path.resolve(__dirname, '../lib/removal-reasons.ts');
const module_ = { exports: {} };
const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
vm.runInNewContext(js, { module: module_, exports: module_.exports });
const { REMOVAL_REASONS, REMOVAL_NOTE_MAX, removalReasonLabel, removalReasonHint, validateRemoval, removalPayload } = module_.exports;

assert.equal(JSON.stringify(REMOVAL_REASONS.map(item => item.value)), JSON.stringify(['SPAM', 'OFFENSIVE', 'HARASSMENT', 'OFF_TOPIC', 'FALSE_INFO', 'OTHER']));
assert.equal(JSON.stringify(REMOVAL_REASONS.map(item => item.label)), JSON.stringify(['Spam o publicidad', 'Lenguaje ofensivo', 'Acoso', 'Fuera del tema', 'Información falsa', 'Otro']));
assert.equal(REMOVAL_NOTE_MAX, 200);

assert.equal(validateRemoval(null, ''), 'Elige un motivo de la lista.');
assert.equal(validateRemoval('SPAM', ''), '');
assert.equal(validateRemoval('SPAM', '   '), '');
assert.equal(validateRemoval('OTHER', ''), 'Cuéntanos el motivo en la nota.');
assert.equal(validateRemoval('OTHER', '    '), 'Cuéntanos el motivo en la nota.');
assert.equal(validateRemoval('OTHER', 'Publicidad'), '');
assert.equal(validateRemoval('SPAM', 'x'.repeat(200)), '');
assert.equal(validateRemoval('SPAM', 'x'.repeat(201)), 'La nota admite hasta 200 caracteres.');
assert.equal(validateRemoval('SPAM', ` ${'x'.repeat(200)} `), '', 'los espacios de los extremos no cuentan');

assert.equal(JSON.stringify(removalPayload('SPAM', '')), JSON.stringify({ reason: 'SPAM' }));
assert.equal(JSON.stringify(removalPayload('SPAM', '   ')), JSON.stringify({ reason: 'SPAM' }));
assert.equal(JSON.stringify(removalPayload('OTHER', '  Un detalle  ')), JSON.stringify({ reason: 'OTHER', note: 'Un detalle' }));

assert.equal(removalReasonLabel('FALSE_INFO'), 'Información falsa');
assert.equal(removalReasonLabel(null), null);
assert.equal(removalReasonLabel(undefined), null);

assert.equal(removalReasonHint('OFF_TOPIC'), 'No corresponde a lo que se comparte aquí.');
assert.equal(removalReasonHint(null), null);

console.log('Motivos de retirada: reglas y textos verificados.');
