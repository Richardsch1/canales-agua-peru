# Verificación de la primera versión

Fecha: 2026-10-27. Entorno local: Node.js v24.12.0, Windows.

- `npm run check`: validación del catálogo, sintaxis y revisión de patrones básicos de secretos.
- `npm test`: 32 pruebas aprobadas. Cubren contrato, fuentes, fechas, condiciones de prestador y contacto previo, exclusiones, copias independientes, CSV, comandos y comprobación HTTP con respuestas simuladas.
- `npm audit --omit=dev --audit-level=high`: no se reportaron vulnerabilidades; no hay dependencias externas.
- `npm run sources:check`: las cinco URLs oficiales únicas respondieron HTTP 200 en la comprobación puntual. No se siguieron redirecciones, no se comprobó atención efectiva y no se renovaron fechas automáticamente.

No se contactó a personas, se llamó a números ni se enviaron correos para comprobar atención efectiva. Las fuentes se contrastaron con texto institucional disponible e indexado; varias páginas de gob.pe pueden responder HTTP 418 a solicitudes automatizadas. Un chequeo HTTP no verifica el contenido.

CI versionado para Node 22 y 24 en Ubuntu. Su resultado vigente se consulta en la pestaña Actions; la configuración por sí sola no implica una ejecución aprobada. No se ejecutan comprobaciones de fuentes en CI ni se generan tareas recurrentes.

Pendientes: mayor cobertura de prestadores con evidencia local, revisión comunitaria, auditoría independiente del catálogo y pruebas con aplicaciones consumidoras reales. No hay métricas de adopción o impacto validadas.
