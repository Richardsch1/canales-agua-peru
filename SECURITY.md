# Seguridad

Este proyecto consulta datos institucionales estáticos y no está diseñado para recibir reportes ciudadanos. No tiene cuentas, almacenamiento de ciudadanos, servidor HTTP ni claves de API.

## Controles

- Solo se aceptan opciones de consulta de listas cerradas.
- Catálogo validado antes de usarlo; se rechazan campos desconocidos, texto activo y controles Unicode peligrosos.
- Las fuentes se restringen a URLs HTTPS de www.gob.pe sin credenciales ni parámetros.
- Las consultas y exportaciones no realizan peticiones de red.
- La comprobación HTTP opcional no sigue redirecciones, limita el tiempo de espera y no interpreta una respuesta como validación del contenido.
- CSV escapa celdas y neutraliza posibles fórmulas.
- Las acciones de CI están fijadas por SHA, con permisos de lectura y sin persistir credenciales en el checkout.

Los filtros no detectan toda información personal que alguien pudiera añadir al JSON. La procedencia institucional y el contenido requieren revisión humana. Un teléfono correcto puede quedar fuera de servicio; la cobertura declarada no verifica competencia. Un usuario puede modificar su copia del catálogo, las fechas o el código: no se ofrece una certificación criptográfica de fuentes.

## Reportar una vulnerabilidad

No publiques secretos ni datos personales en issues. Si GitHub ofrece **Report a vulnerability** en Security, utiliza el canal privado. Si no está habilitado, pide al mantenedor un canal privado sin incluir información sensible o detalles explotables. Aporta pasos con datos ficticios. No hay un compromiso de tiempos de respuesta.
