import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const command = fileURLToPath(new URL('../bin/canales-agua.js', import.meta.url));
function cli(...args) { return spawnSync(process.execPath, [command, ...args], { encoding: 'utf8', timeout: 10000 }); }

test('CLI valida el catálogo sin red ni claves', () => {
  const result = cli('validate'); assert.equal(result.status, 0); assert.match(result.stdout, /Catálogo válido/);
});
test('CLI produce JSON válido con filtros y condiciones', () => {
  const result = cli('list', '--provider', 'sedapal', '--need', 'operativo', '--as-of', '2026-10-27', '--json');
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout).channels.map(entry => entry.id), ['sedapal-aquafono']);
});
test('CLI exporta CSV y JSON, incluido el estado de revisión', () => {
  const csv = cli('export', '--format', 'csv', '--as-of', '2026-10-27');
  assert.equal(csv.status, 0); assert.ok(csv.stdout.includes('"reviewStatus"'));
  const json = cli('export', '--format', 'json', '--as-of', '2026-10-27');
  assert.equal(json.status, 0); assert.ok(JSON.parse(json.stdout).notice);
});
test('CLI requiere autorización de red explícita para check-links', () => {
  const result = cli('check-links'); assert.equal(result.status, 1); assert.match(result.stderr, /allow-network/);
});
test('CLI rechaza comandos, valores ausentes, filtros inválidos y opciones duplicadas', () => {
  for (const args of [['inventado'], ['list', '--provider'], ['list', '--provider', 'lima'], ['list', '--need', 'operativo', '--need', 'formatos'], ['validate', '--json'], ['list', '--format', 'json'], ['export', '--format', 'xml'], ['export', '--format', 'json', '--json']]) assert.equal(cli(...args).status, 1);
});
test('CLI rechaza argumentos de datos personales sin reflejarlos en la salida', () => {
  const result = cli('list', '--description', 'EJEMPLO PRIVADO FICTICIO');
  assert.equal(result.status, 1); assert.ok(!result.stderr.includes('EJEMPLO PRIVADO FICTICIO')); assert.equal(result.stdout, '');
});
test('CLI explica el uso y sus límites en español', () => {
  const result = cli('--help'); assert.equal(result.status, 0); assert.match(result.stdout, /No ingreses descripciones/);
});
