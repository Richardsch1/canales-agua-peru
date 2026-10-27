#!/usr/bin/env node
import { getCatalog, queryChannels, toCsv } from '../src/index.js';
import { checkSourceLinks } from '../src/check-links.js';

const help = `Canales de agua y saneamiento · Perú

Uso:
  node bin/canales-agua.js list [opciones]
  node bin/canales-agua.js export --format json|csv [opciones]
  node bin/canales-agua.js validate
  node bin/canales-agua.js check-links --allow-network

Opciones de consulta:
  --provider desconocido|sedapal|otro
  --need orientacion|operativo|formatos
  --provider-contacted     Declara que ya contactaste al prestador.
  --as-of AAAA-MM-DD       Evaluar antigüedad en otra fecha (UTC).
  --include-stale          Incluir entradas vencidas, marcadas como tales.
  --json                  Salida estructurada de list.

No ingreses descripciones, nombres, DNI, teléfonos privados ni direcciones.
El catálogo es limitado. No presenta solicitudes ni confirma competencia.
`;

try {
  const [command = 'list', ...args] = process.argv.slice(2);
  if (command === '--help' || command === 'help') { process.stdout.write(help); }
  else if (command === 'validate') {
    if (args.length) throw new Error('validate no acepta opciones.');
    const catalog = getCatalog();
    console.info(`Catálogo válido: ${catalog.channels.length} entradas; versión ${catalog.version}. Esto no comprueba la atención efectiva ni la vigencia del contenido de las fuentes.`);
  } else if (command === 'check-links') {
    if (args.length !== 1 || args[0] !== '--allow-network') throw new Error('Para consultar URLs oficiales utiliza check-links --allow-network. No se envían datos ciudadanos.');
    const results = await checkSourceLinks(getCatalog());
    console.info(JSON.stringify({ notice: 'HTTP accesible no significa contenido verificado. No se sigue ninguna redirección. No se actualizan fechas del catálogo.', results }, null, 2));
    if (results.some(result => result.state !== 'reachable')) process.exitCode = 2;
  } else if (['list', 'export'].includes(command)) {
    const options = {};
    let json = false;
    let format;
    const seen = new Set();
    const valued = new Map([['--provider', 'provider'], ['--need', 'need'], ['--as-of', 'asOf']]);
    for (let index = 0; index < args.length; index += 1) {
      const flag = args[index];
      if (seen.has(flag)) throw new Error('No repitas opciones.');
      seen.add(flag);
      if (valued.has(flag) || flag === '--format') {
        const value = args[++index];
        if (!value || value.startsWith('--')) throw new Error('Falta el valor de una opción.');
        if (flag === '--format') format = value;
        else options[valued.get(flag)] = value;
      } else if (flag === '--provider-contacted') options.providerContacted = true;
      else if (flag === '--include-stale') options.includeStale = true;
      else if (flag === '--json') json = true;
      else throw new Error('Opción desconocida. Consulta --help.');
    }
    if (command === 'export' && (!['json', 'csv'].includes(format) || json)) throw new Error('export requiere --format json o csv y no acepta --json.');
    if (command === 'list' && format !== undefined) throw new Error('Usa export para seleccionar formato.');
    const result = queryChannels(options);
    if (format === 'csv') process.stdout.write(toCsv(result));
    else if (json || format === 'json') console.info(JSON.stringify(result, null, 2));
    else {
      console.info(`${result.notice}\n${result.guidance}\nFecha de consulta: ${result.asOf}\n`);
      for (const entry of result.channels) {
        console.info(`${entry.name}\n  ${entry.contact}\n  ${entry.coverage}\n  Condiciones: ${entry.conditions}\n  Revisión: ${entry.checkedOn} / ${entry.review.status} / próxima: ${entry.review.dueOn}\n  Fuentes: ${entry.sources.map(source => source.url).join('\n           ')}\n`);
      }
      console.info(`${result.channels.length} entradas mostradas. ${result.excluded.length} excluidas por filtros o revisión; usa --json para ver motivos.`);
    }
  } else throw new Error('Comando desconocido. Consulta --help.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
