import original from '../data/catalog.json' with { type: 'json' };
import { assertCatalog, isDate, NEEDS, PROVIDERS } from './validate.js';
export { validateCatalog, isOfficialSource } from './validate.js';

export function getCatalog() { return structuredClone(assertCatalog(original)); }

export function reviewState(entry, asOf = new Date().toISOString().slice(0, 10)) {
  if (!isDate(asOf) || !isDate(entry.checkedOn) || !Number.isInteger(entry.reviewWithinDays) || entry.reviewWithinDays < 1 || entry.reviewWithinDays > 365) throw new Error('Fecha o intervalo de revisión inválidos.');
  const ageDays = (Date.parse(`${asOf}T00:00:00Z`) - Date.parse(`${entry.checkedOn}T00:00:00Z`)) / 86400000;
  const dueOn = new Date(Date.parse(`${entry.checkedOn}T00:00:00Z`) + entry.reviewWithinDays * 86400000).toISOString().slice(0, 10);
  return { status: ageDays < 0 ? 'future' : ageDays >= entry.reviewWithinDays ? 'stale' : 'current', checkedOn: entry.checkedOn, dueOn };
}

export function queryChannels(options = {}, catalog = original) {
  const allowed = ['provider', 'need', 'providerContacted', 'asOf', 'includeStale'];
  if (!options || typeof options !== 'object' || Array.isArray(options) || Object.keys(options).some(key => !allowed.includes(key))) throw new Error('Opciones de consulta inválidas. No se aceptan reportes ni datos personales.');
  const { provider = 'desconocido', need, providerContacted = false, asOf = new Date().toISOString().slice(0, 10), includeStale = false } = options;
  if (!PROVIDERS.includes(provider) || (need !== undefined && !NEEDS.includes(need)) || typeof providerContacted !== 'boolean' || typeof includeStale !== 'boolean' || !isDate(asOf)) throw new Error('Revisa el prestador, la necesidad y las opciones de consulta.');
  assertCatalog(catalog);
  const channels = [];
  const excluded = [];
  for (const entry of catalog.channels) {
    const review = reviewState(entry, asOf);
    let reason;
    if (entry.provider !== 'cualquiera' && entry.provider !== provider) reason = 'prestador-no-confirmado';
    else if (need && !entry.needs.includes(need)) reason = 'otra-necesidad';
    else if (entry.providerContactedRequired && !providerContacted) reason = 'contactar-primero-al-prestador';
    else if (review.status === 'future') reason = 'fecha-de-revision-futura';
    else if (review.status === 'stale' && !includeStale) reason = 'revision-pendiente';
    if (reason) excluded.push({ id: entry.id, reason });
    else channels.push({ ...structuredClone(entry), review });
  }
  return {
    catalogVersion: catalog.version, asOf, channels, excluded,
    notice: catalog.notice,
    guidance: provider === 'desconocido' ? 'Confirma tu prestador en el recibo o con orientación oficial. No se asigna prestador por ubicación; falta un directorio rural validado.' : 'La selección declarada no comprueba cobertura. Revisa las condiciones y la fuente oficial antes de contactar.',
  };
}

function csvCell(value) {
  let safe = String(value);
  // Prevent spreadsheet formula injection when data is opened in Excel or similar tools.
  if (/^[\s\uFEFF]*[=+\-@]/u.test(safe)) safe = `'${safe}`;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function toCsv(result) {
  if (!Array.isArray(result?.channels)) throw new Error('Resultado de consulta inválido.');
  const columns = ['id', 'name', 'organization', 'kind', 'contact', 'coverage', 'conditions', 'checkedOn', 'reviewStatus', 'dueOn', 'sourceUrls'];
  const rows = result.channels.map(entry => [entry.id, entry.name, entry.organization, entry.kind, entry.contact, entry.coverage, entry.conditions, entry.checkedOn, entry.review.status, entry.review.dueOn, entry.sources.map(source => source.url).join(' | ')]);
  return '\uFEFF' + [columns, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
