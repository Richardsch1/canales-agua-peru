import test from 'node:test';
import assert from 'node:assert/strict';
import { getCatalog, validateCatalog, isOfficialSource, queryChannels, reviewState, toCsv } from '../src/index.js';

const asOf = '2026-10-27';

test('el catálogo inicial cumple el contrato y tiene evidencia por entrada', () => {
  const catalog = getCatalog();
  assert.deepEqual(validateCatalog(catalog), []);
  for (const entry of catalog.channels) {
    assert.ok(entry.sources.every(source => source.evidence && source.title && isOfficialSource(source.url)));
    assert.equal(entry.checkedOn, asOf);
  }
});
test('cada llamada devuelve datos independientes', () => {
  const catalog = getCatalog();
  catalog.channels[0].name = 'modificado';
  assert.notEqual(getCatalog().channels[0].name, 'modificado');
  const result = queryChannels({ asOf });
  result.channels[0].sources[0].title = 'modificado';
  assert.notEqual(queryChannels({ asOf }).channels[0].sources[0].title, 'modificado');
});
test('solo admite fuentes HTTPS del dominio permitido, sin credenciales ni consultas', () => {
  assert.equal(isOfficialSource('https://www.gob.pe/institucion/sunass'), true);
  for (const url of ['http://www.gob.pe/', 'https://www.gob.pe.example.invalid/', 'https://www.gob.pe@127.0.0.1/', 'https://user:secret@www.gob.pe/', 'https://www.gob.pe:444/', 'https://www.gob.pe/?dni=00000000', 'https://www.gob.pe/#dato', 'javascript:alert(1)', 'https://127.0.0.1/']) assert.equal(isOfficialSource(url), false);
});
test('rechaza raíz inválida, campos extra y catálogos vacíos', () => {
  for (const catalog of [null, [], {}, { ...getCatalog(), extra: 'dato' }, { ...getCatalog(), channels: [] }]) assert.ok(validateCatalog(catalog).length);
});
test('rechaza campos desconocidos, identificadores repetidos y textos activos', () => {
  for (const change of [entry => { entry.unexpected = 'dato'; }, entry => { entry.name = '<script>alert(1)</script>'; }, entry => { entry.name = 'Texto\u202eoculto'; }]) {
    const catalog = getCatalog(); change(catalog.channels[0]); assert.ok(validateCatalog(catalog).length);
  }
  const catalog = getCatalog();
  catalog.channels.push(structuredClone(catalog.channels[0]));
  assert.ok(validateCatalog(catalog).some(error => error.includes('duplicado')));
});
test('rechaza fuentes ausentes o mal formadas sin fallar con datos nulos', () => {
  for (const sources of [[], [null], [{ url: 'https://example.invalid' }]]) {
    const catalog = getCatalog(); catalog.channels[0].sources = sources;
    assert.ok(validateCatalog(catalog).length);
  }
});
test('valida teléfonos y correo institucional', () => {
  for (const [index, contact] of [[0, '000'], [1, 'https://example.invalid'], [2, 'persona@example.invalid']]) {
    const catalog = getCatalog(); catalog.channels[index].contact = contact;
    assert.ok(validateCatalog(catalog).length);
  }
});
test('no admite fechas imposibles ni intervalos de revisión inválidos', () => {
  for (const checkedOn of ['2026-02-30', 'ayer', '2026-1-1']) {
    const catalog = getCatalog(); catalog.channels[0].checkedOn = checkedOn;
    assert.ok(validateCatalog(catalog).length);
  }
  for (const reviewWithinDays of [0, -1, 366, 1.5, '90']) {
    const catalog = getCatalog(); catalog.channels[0].reviewWithinDays = reviewWithinDays;
    assert.ok(validateCatalog(catalog).length);
  }
});
test('consulta por defecto no atribuye Sedapal a un prestador desconocido', () => {
  const result = queryChannels({ asOf });
  assert.ok(!result.channels.some(entry => entry.id === 'sedapal-aquafono'));
  assert.ok(result.excluded.some(entry => entry.id === 'sedapal-aquafono' && entry.reason === 'prestador-no-confirmado'));
  assert.match(result.guidance, /No se asigna prestador por ubicación/);
});
test('Sedapal aparece solo con confirmación expresa y necesidad compatible', () => {
  assert.ok(queryChannels({ asOf, provider: 'sedapal', need: 'operativo' }).channels.some(entry => entry.id === 'sedapal-aquafono'));
  assert.ok(!queryChannels({ asOf, provider: 'otro' }).channels.some(entry => entry.id === 'sedapal-aquafono'));
});
test('reporte operativo a SUNASS exige contacto previo declarado', () => {
  assert.equal(queryChannels({ asOf, need: 'operativo' }).channels.length, 0);
  const result = queryChannels({ asOf, need: 'operativo', providerContacted: true });
  assert.deepEqual(result.channels.map(entry => entry.id), ['sunass-whatsapp-operativo']);
});
test('filtra recursos documentales sin tratarlos como atención operativa', () => {
  const result = queryChannels({ asOf, need: 'formatos' });
  assert.deepEqual(result.channels.map(entry => entry.id), ['sunass-formatos']);
  assert.equal(result.channels[0].kind, 'resource');
});
test('calcula el vencimiento por entrada, no por fecha global', () => {
  const entry = getCatalog().channels[0];
  assert.deepEqual(reviewState(entry, asOf), { status: 'current', checkedOn: asOf, dueOn: '2027-01-25' });
  assert.equal(reviewState(entry, '2027-01-24').status, 'current');
  assert.equal(reviewState(entry, '2027-01-25').status, 'stale');
  assert.equal(reviewState(entry, '2026-10-26').status, 'future');
  assert.throws(() => reviewState(entry, 'invalid'));
});
test('excluye vencidas por defecto e identifica el motivo', () => {
  const result = queryChannels({ asOf: '2027-02-01', provider: 'sedapal', providerContacted: true });
  assert.equal(result.channels.length, 0);
  assert.ok(result.excluded.every(entry => entry.reason === 'revision-pendiente'));
  const audit = queryChannels({ asOf: '2027-02-01', includeStale: true });
  assert.ok(audit.channels.length > 0);
  assert.ok(audit.channels.every(entry => entry.review.status === 'stale'));
});
test('actualizar una entrada no rejuvenece las otras', () => {
  const catalog = getCatalog(); catalog.channels[0].checkedOn = '2027-02-01';
  const result = queryChannels({ asOf: '2027-02-01', provider: 'sedapal', providerContacted: true }, catalog);
  assert.deepEqual(result.channels.map(entry => entry.id), ['sunass-fono']);
});
test('revisión futura nunca se muestra como vigente, ni con includeStale', () => {
  const result = queryChannels({ asOf: '2026-10-26', includeStale: true });
  assert.equal(result.channels.length, 0);
  assert.ok(result.excluded.some(entry => entry.reason === 'fecha-de-revision-futura'));
});
test('rechaza opciones desconocidas, texto libre y declaraciones ambiguas', () => {
  for (const options of [{ description: 'texto privado' }, { locality: 'Distrito ficticio' }, { provider: 'lima' }, { need: 'inventada' }, { providerContacted: 'sí' }, { includeStale: 'true' }, { asOf: '2026-02-30' }, null, []]) assert.throws(() => queryChannels(options));
});
test('CSV conserva las fuentes, fecha y estado de revisión', () => {
  const csv = toCsv(queryChannels({ asOf, need: 'orientacion' }));
  assert.ok(csv.startsWith('\uFEFF"id"'));
  assert.ok(csv.includes('"reviewStatus"'));
  assert.ok(csv.includes('https://www.gob.pe/'));
  assert.ok(csv.includes('"2026-10-27"'));
});
test('CSV escapa comillas y neutraliza fórmulas de hojas de cálculo', () => {
  const result = queryChannels({ asOf });
  result.channels[0].name = '=HYPERLINK("https://example.invalid")';
  result.channels[0].coverage = 'Zona, "ficticia"';
  const csv = toCsv(result);
  assert.ok(csv.includes('"\'=HYPERLINK(""https://example.invalid"")"'));
  assert.ok(csv.includes('"Zona, ""ficticia"""'));
  assert.throws(() => toCsv({}));
});
