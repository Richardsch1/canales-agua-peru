export const NEEDS = Object.freeze(['orientacion', 'operativo', 'formatos']);
export const PROVIDERS = Object.freeze(['desconocido', 'sedapal', 'otro']);
const KINDS = ['phone', 'whatsapp', 'email', 'resource'];
const REQUIRED = ['id', 'name', 'organization', 'kind', 'contact', 'needs', 'provider', 'providerContactedRequired', 'coverage', 'conditions', 'checkedOn', 'reviewWithinDays', 'sources'];
const SOURCE_FIELDS = ['url', 'title', 'evidence', 'method'];

export function isDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isOfficialSource(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'www.gob.pe' && url.port === '' && !url.username && !url.password && !url.search && !url.hash;
  } catch { return false; }
}

function record(value) { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function safeText(value, max = 1200) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069<>]/u.test(value);
}
function keys(value, fields) { return record(value) && Object.keys(value).length === fields.length && fields.every(field => Object.hasOwn(value, field)); }

export function validateCatalog(value) {
  const errors = [];
  if (!keys(value, ['schemaVersion', 'version', 'country', 'language', 'notice', 'channels'])) return ['Estructura raíz inválida.'];
  if (value.schemaVersion !== 1 || value.country !== 'PE' || value.language !== 'es-PE' || !/^\d+\.\d+\.\d+$/u.test(value.version) || !safeText(value.notice)) errors.push('Metadatos del catálogo inválidos.');
  if (!Array.isArray(value.channels) || value.channels.length === 0 || value.channels.length > 500) return [...errors, 'El catálogo debe tener entre una y quinientas entradas.'];
  const ids = new Set();
  value.channels.forEach((entry, index) => {
    const at = `Entrada ${index + 1}`;
    if (!keys(entry, REQUIRED)) { errors.push(`${at}: faltan campos o hay campos desconocidos.`); return; }
    if (typeof entry.id !== 'string' || !/^[a-z][a-z0-9-]{2,79}$/u.test(entry.id) || ids.has(entry.id)) errors.push(`${at}: identificador inválido o duplicado.`);
    ids.add(entry.id);
    for (const key of ['name', 'organization', 'contact', 'coverage', 'conditions']) if (!safeText(entry[key])) errors.push(`${at}: texto inválido en ${key}.`);
    if (!KINDS.includes(entry.kind) || !['cualquiera', 'sedapal'].includes(entry.provider) || typeof entry.providerContactedRequired !== 'boolean') errors.push(`${at}: tipo, prestador o condición inválidos.`);
    if (!Array.isArray(entry.needs) || entry.needs.length === 0 || new Set(entry.needs).size !== entry.needs.length || entry.needs.some(need => !NEEDS.includes(need))) errors.push(`${at}: necesidades inválidas.`);
    if (!isDate(entry.checkedOn) || !Number.isInteger(entry.reviewWithinDays) || entry.reviewWithinDays < 1 || entry.reviewWithinDays > 365) errors.push(`${at}: fecha o intervalo de revisión inválido.`);
    if (['phone', 'whatsapp'].includes(entry.kind) && (typeof entry.contact !== 'string' || !/^(?:\d{4}|\(\d{2,3}\) \d{3} \d{4})$/u.test(entry.contact))) errors.push(`${at}: teléfono inválido.`);
    if (entry.kind === 'email' && (typeof entry.contact !== 'string' || !/^[a-z0-9._%+-]+@[a-z0-9.-]+\.gob\.pe$/iu.test(entry.contact))) errors.push(`${at}: correo institucional inválido.`);
    if (!Array.isArray(entry.sources) || entry.sources.length === 0 || entry.sources.length > 10) { errors.push(`${at}: faltan fuentes oficiales.`); return; }
    const urls = new Set();
    for (const source of entry.sources) {
      if (!keys(source, SOURCE_FIELDS) || !isOfficialSource(source.url) || !safeText(source.title) || !safeText(source.evidence) || source.method !== 'official-indexed-text') errors.push(`${at}: fuente o evidencia inválida.`);
      if (urls.has(source?.url)) errors.push(`${at}: fuente duplicada.`);
      urls.add(source?.url);
    }
  });
  return errors;
}

export function assertCatalog(value) {
  const errors = validateCatalog(value);
  if (errors.length) throw new Error(`Catálogo inválido: ${errors.join(' ')}`);
  return value;
}
