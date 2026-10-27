# Contrato de datos y API

## Catálogo v1

La raíz contiene exactamente `schemaVersion`, `version`, `country`, `language`, `notice` y `channels`. El contrato implementado por `validateCatalog` exige país PE, idioma es-PE, versión semántica y entre una y quinientas entradas. Los campos desconocidos son errores.

Cada entrada contiene:

| Campo | Uso |
| --- | --- |
| `id` | Identificador único y estable, en minúsculas y guiones. |
| `name`, `organization` | Nombre del canal y entidad. |
| `kind` | `phone`, `whatsapp`, `email` o `resource`. |
| `contact` | Contacto institucional público o indicación de consultar el recurso. No es un dato ciudadano. |
| `needs` | Uno o más de `orientacion`, `operativo`, `formatos`. |
| `provider` | `cualquiera` o `sedapal`; una ampliación necesita cambiar contrato, filtros y pruebas. |
| `providerContactedRequired` | Condición declarada de contacto previo con el prestador. |
| `coverage`, `conditions` | Ámbito, requisitos de selección y límites en lenguaje claro. |
| `checkedOn` | Fecha real YYYY-MM-DD de contraste con la fuente, distinta de su fecha de publicación. |
| `reviewWithinDays` | Días hasta requerir nueva revisión, de uno a 365. Inicialmente 90. |
| `sources` | Lista no vacía con `url`, `title`, `evidence` y `method`. |

El método inicial es `official-indexed-text`: contraste con texto institucional disponible e indexado. No representa atención efectiva comprobada. Las fuentes se restringen a HTTPS de www.gob.pe, sin credenciales, puertos no estándar, parámetros o fragmentos. Para incorporar otra institución o dominio se requiere revisar expresamente el contrato y los riesgos.

## Funciones públicas

`getCatalog()` devuelve una copia del catálogo validado. Modificarla no cambia consultas posteriores.

`validateCatalog(value)` devuelve una lista de errores estructurales. Una lista vacía no demuestra exactitud semántica ni actualidad del contacto. El validador no sustituye a una persona que revise las fuentes.

`queryChannels(options, catalog?)` valida y devuelve `{ catalogVersion, asOf, channels, excluded, notice, guidance }`.

Opciones admitidas:

- `provider`: `desconocido` por defecto, `sedapal` o `otro`. Es una declaración del llamante, no una comprobación.
- `need`: `orientacion`, `operativo` o `formatos`; si falta, no filtra por finalidad.
- `providerContacted`: booleano, falso por defecto. No verifica ni almacena un contacto previo.
- `asOf`: fecha YYYY-MM-DD; por defecto la fecha UTC del momento de ejecución.
- `includeStale`: booleano, falso por defecto. Las entradas futuras siempre se excluyen.

Cada resultado incluye `review: { status, checkedOn, dueOn }`. El estado es `current`, `stale` o `future`; en consultas solo se devuelve `future` en la lista de excluidos, nunca como canal utilizable. `current` describe la antigüedad de la revisión y no confirma que una línea esté operativa hoy.

Los motivos de exclusión son `prestador-no-confirmado`, `otra-necesidad`, `contactar-primero-al-prestador`, `fecha-de-revision-futura` y `revision-pendiente`. Se registra el primer motivo aplicable. No se genera un ranking de autoridades ni se determina competencia jurídica.

`reviewState(entry, asOf?)` calcula el vencimiento individual. Se considera vencida desde `checkedOn + reviewWithinDays`, usando días calendario UTC.

`toCsv(result)` exporta las entradas seleccionadas, con BOM UTF-8, comillas escapadas, fuentes y estado de revisión. Ante un valor que pudiera ejecutarse como fórmula de hoja de cálculo, antepone un apóstrofo. Los datos exportados deben seguir revisándose antes de reutilizarlos.

`isOfficialSource(url)` comprueba únicamente la forma y el dominio de una URL, sin conectarse.

## Comprobación HTTP opcional

`checkSourceLinks(catalog, options?)` está en `src/check-links.js`. Es una función separada para evitar conexiones al consultar el catálogo. Deduplica URLs, usa GET con espera máxima de cinco segundos por fuente, no sigue redirecciones y no lee el cuerpo. No se transmite el catálogo completo ni información de ciudadanos.

Estados: `reachable`, `redirect-review`, `blocked-manual-review`, `http-review` o `network-review`. Todos incluyen `contentVerified: false`. Errores internos se convierten en estados genéricos. La función no cambia el catálogo. Un consumidor que la invoque directamente es responsable de autorizar la red; la CLI requiere `--allow-network`.
