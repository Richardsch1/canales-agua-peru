import test from 'node:test';
import assert from 'node:assert/strict';
import { getCatalog } from '../src/index.js';
import { checkSourceLinks } from '../src/check-links.js';

test('deduplica URLs y no sigue redirecciones ni usa datos ciudadanos', async () => {
  const calls = [];
  const results = await checkSourceLinks(getCatalog(), { fetchImpl: async (url, options) => {
    calls.push(url);
    assert.equal(new URL(url).hostname, 'www.gob.pe');
    assert.equal(options.redirect, 'manual');
    assert.equal(options.body, undefined);
    return new Response('official page', { status: 200 });
  } });
  assert.equal(calls.length, new Set(getCatalog().channels.flatMap(entry => entry.sources.map(source => source.url))).size);
  assert.ok(results.every(result => result.state === 'reachable' && result.contentVerified === false));
});
test('HTTP 418 o bloqueo no se interpreta como desaparición del canal', async () => {
  const results = await checkSourceLinks(getCatalog(), { fetchImpl: async () => new Response(null, { status: 418 }) });
  assert.ok(results.every(result => result.state === 'blocked-manual-review' && result.contentVerified === false));
});
test('una redirección externa se informa y nunca se sigue', async () => {
  let calls = 0;
  const results = await checkSourceLinks(getCatalog(), { fetchImpl: async () => { calls += 1; return new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/private' } }); } });
  assert.equal(calls, results.length);
  assert.ok(results.every(result => result.state === 'redirect-review'));
});
test('errores de red y HTTP requieren revisión; no filtran errores internos', async () => {
  const failed = await checkSourceLinks(getCatalog(), { fetchImpl: async () => { throw new Error('internal detail'); } });
  assert.ok(failed.every(result => result.state === 'network-review'));
  assert.ok(!JSON.stringify(failed).includes('internal detail'));
  const missing = await checkSourceLinks(getCatalog(), { fetchImpl: async () => new Response(null, { status: 404 }) });
  assert.ok(missing.every(result => result.state === 'http-review'));
});
test('rechaza catálogos con URLs no permitidas antes de hacer peticiones', async () => {
  const catalog = getCatalog(); catalog.channels[0].sources[0].url = 'http://127.0.0.1/secret';
  let calls = 0;
  await assert.rejects(checkSourceLinks(catalog, { fetchImpl: async () => { calls += 1; } }));
  assert.equal(calls, 0);
});
test('no modifica la fecha de revisión ni los datos del catálogo', async () => {
  const catalog = getCatalog(); const before = JSON.stringify(catalog);
  await checkSourceLinks(catalog, { fetchImpl: async () => new Response(null, { status: 200 }) });
  assert.equal(JSON.stringify(catalog), before);
});
