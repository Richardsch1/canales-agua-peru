# Canales de agua y saneamiento · Perú

Catálogo abierto y reutilizable de canales oficiales, con fuentes, condiciones de uso y revisión por entrada. Incluye una biblioteca JavaScript, una herramienta de consulta y exportación JSON/CSV.

**Estado: versión inicial 0.1.0.** Son cinco entradas de SUNASS y Sedapal, revisadas el **27 de octubre de 2026**. No es un directorio nacional de todos los prestadores, municipalidades o JASS. No se afirma adopción, usuarios, alianzas ni impacto social validado.

## Para qué sirve

Un teléfono sin contexto puede llevar a la persona al canal equivocado. Este catálogo conserva el ámbito, la finalidad, las condiciones y la evidencia oficial junto con cada contacto. Otros proyectos pueden consultar esos datos y conocer qué entradas requieren una nueva revisión.

La biblioteca excluye por defecto entradas vencidas, futuras o incompatibles con la selección. Sedapal requiere confirmación explícita del prestador. El WhatsApp operativo de SUNASS requiere declarar contacto previo con el prestador. Los formatos se distinguen de los canales de atención. **Estos filtros no verifican competencia, cobertura ni atención efectiva.**

## Usar la herramienta

Requiere Node.js 22 o 24. Sin dependencias de terceros, claves, cuentas ni servidor.

```sh
git clone https://github.com/Richardsch1/canales-agua-peru.git
cd canales-agua-peru
npm ci --ignore-scripts
npm start
```

Consultas y exportaciones:

```sh
# Orientación cuando no se conoce el prestador
node bin/canales-agua.js list --need orientacion

# Solo si la persona confirmó que su prestador es Sedapal
node bin/canales-agua.js list --provider sedapal --need operativo

# Problema operativo después de haber contactado al prestador
node bin/canales-agua.js list --need operativo --provider-contacted --json

# Exportar la selección segura por defecto
node bin/canales-agua.js export --format json
node bin/canales-agua.js export --format csv > canales.csv

# Contrato estructural del catálogo
npm run catalog:validate
```

No ingreses descripciones ciudadanas, nombres, DNI, números de suministro, direcciones ni teléfonos privados. La herramienta solo recibe opciones de listas cerradas. No llama a números, envía correos, abre WhatsApp ni presenta trámites.

Las consultas ordinarias trabajan localmente. En un entorno sin conectividad, el uso del catálogo no necesita una API; las fuentes oficiales pueden abrirse aparte para confirmar su vigencia. No hay un proceso de actualización automática.

## Usar como biblioteca

```js
import { queryChannels, toCsv } from './src/index.js';

const result = queryChannels({
  provider: 'desconocido',
  need: 'orientacion',
});

console.log(result.channels);
console.log(result.excluded); // Explica filtros y revisiones pendientes.
console.log(result.guidance);
const csv = toCsv(result);
```

API documentada en [docs/API.md](docs/API.md). El JSON completo está en [data/catalog.json](data/catalog.json); contiene también entradas que pueden estar vencidas. Los consumidores del JSON deben aplicar sus propias reglas de revisión. El paquete se mantiene `private: true` para evitar publicación accidental a npm; **el repositorio es público**. No se ha publicado ni se atribuyen descargas de un paquete npm.

## Entradas y fuentes iniciales

| Entrada | Finalidad y condición | Fuente primaria |
| --- | --- | --- |
| Fono SUNASS, 1899 | Orientación nacional; no ejecuta reparaciones. | [Plataformas de atención de SUNASS](https://www.gob.pe/43281-conoce-las-plataformas-de-atencion-y-orientacion-de-usuarios-de-la-sunass) |
| WhatsApp SUNASS, (01) 614 3180 | Problemas operativos no atendidos por el prestador; primero contactarlo. | [Contacto de SUNASS](https://www.gob.pe/institucion/sunass/contacto-y-numeros-de-emergencias), [corroboración oficial de 2026](https://www.gob.pe/institucion/sunass/noticias/1384581-problemas-con-los-servicios-de-saneamiento-sunass-recuerda-sus-canales-gratuitos-de-atencion-a-usuarios) |
| sunass@sunass.gob.pe | Orientación a usuarios. | [Contacto de SUNASS](https://www.gob.pe/institucion/sunass/contacto-y-numeros-de-emergencias) |
| Sedapal Aquafono, (01) 317 8000 | Solo si Sedapal presta el servicio. | [Servicio Aquafono](https://www.gob.pe/institucion/sedapal/pages/12786-llamar-a-sedapal-aquafono) |
| Formatos de SUNASS | Recurso documental; confirmar el procedimiento aplicable. | [Publicación oficial de formatos](https://www.gob.pe/institucion/sunass/informes-publicaciones/4502284-formatos-para-presentar-un-reclamo-en-servicios-de-agua-potable-y-saneamiento) |

No se deduce el prestador a partir de una ubicación. Falta validar un directorio rural y regional más amplio. Los canales pueden cambiar; comprueba la fuente antes de compartir información. No es una herramienta de emergencias ni asesoría legal o sanitaria.

## Qué significa «revisado»

Se contrastó la entrada con el texto de una fuente institucional disponible e indexado. Algunas páginas de gob.pe respondieron HTTP 418 al acceso automatizado directo. No se hicieron llamadas, se enviaron mensajes ni se presentaron solicitudes para probar atención real.

Cada entrada conserva `checkedOn`, `reviewWithinDays` y evidencia para sus campos. A los 90 días requiere revisión. Actualizar una entrada no renueva las demás. `--include-stale` permite una exportación de auditoría con estado `stale`; una fecha futura nunca se considera válida. `--as-of` sirve para auditoría histórica y no debe usarse para presentar una entrada vencida como vigente hoy.

Puedes comprobar únicamente la accesibilidad HTTP de las fuentes:

```sh
npm run sources:check
```

Ese comando autoriza explícitamente conexiones a las URLs oficiales del catálogo, de forma secuencial y sin datos ciudadanos. No sigue redirecciones. Un HTTP 200 **no verifica el contenido**, y un 418/403/429 requiere revisión manual. No modifica fechas ni borra entradas. Devuelve código 2 cuando hay enlaces que requieren revisión; las consultas locales siguen disponibles.

## Desarrollo

```sh
npm run check
npm test
npm audit --omit=dev --audit-level=high
```

Las pruebas usan respuestas de red simuladas. CI ejecuta contrato, sintaxis, pruebas y auditoría en Node 22 y 24. Los controles de sintaxis y patrones básicos de secretos no sustituyen revisión humana. Consulta [PRUEBAS.md](docs/PRUEBAS.md), [CONTRIBUTING.md](CONTRIBUTING.md) y [SECURITY.md](SECURITY.md).

## Origen, licencia y alcance

Este proyecto extrae y amplía la función de catálogo del MVP [AyniVoz AI](https://github.com/Richardsch1/aynivoz-ai). Su propósito independiente es mantener datos con procedencia, filtros y exportaciones que puedan reutilizarse en otras aplicaciones. AyniVoz no se ha migrado automáticamente a esta biblioteca.

Código y selección original del catálogo bajo [licencia MIT](LICENSE), aprobada por OSI. Las páginas oficiales enlazadas pertenecen a sus respectivos titulares. No se copian formularios ni se emplean logotipos oficiales. No hay afiliación con SUNASS, Sedapal o Anthropic.

Publicar este repositorio **no garantiza elegibilidad para [Claude for OSS](https://claude.com/contact-sales/claude-for-oss)**. Es un proyecto nuevo: no se atribuyen mantenimientos históricos, contribuidores externos, uso o métricas inexistentes.
