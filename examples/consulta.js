import { queryChannels } from '../src/index.js';

// No se reciben ni transmiten datos de ciudadanos.
const result = queryChannels({ provider: 'desconocido', need: 'orientacion' });
console.info(result.guidance);
for (const entry of result.channels) {
  console.info(`${entry.name}: ${entry.contact}`);
  console.info(`Condiciones: ${entry.conditions}`);
  console.info(`Fuente: ${entry.sources[0].url}`);
}
if (result.channels.length === 0) console.info('No hay entradas compatibles con revisión vigente; consulta las fuentes oficiales y solicita una nueva revisión del catálogo.');
