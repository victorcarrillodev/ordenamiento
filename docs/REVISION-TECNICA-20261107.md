# Revisión técnica de Ordena — 7 de noviembre de 2026

## Encargo y alcance

Revisar el audio proporcionado, mejorar la presentación del correo, facilitar la baja de cuentas y buscar fallos generales. Trabajo realizado sobre la copia local de la rama `leo`. No se enviaron correos, no se eliminaron cuentas reales y no se publicó en el servidor.

El audio se transcribió localmente desde el archivo MP3 ya descargado. Describe falta de recepción de correos, el remitente de la consulta, textos de dependencias, cartografía aún no entregada y numeración física/digital. La transcripción automática puede contener errores; no constituye una especificación adicional aprobada.

## Cambios realizados

- Plantilla institucional de correo con encabezado guinda y dorado, folio destacado, tablas de datos y estilos esenciales en línea. Acuse y respuesta conservan sus textos específicos y adjuntos. Vista previa en `artifacts/correos/index.html`, generada con las mismas funciones utilizadas por el envío y datos ficticios; no envía mensajes.
- Botón **Eliminar cuenta** visible en Usuarios, con confirmación que identifica el correo y explica que el contenido se conserva. Los permisos vigentes se mantienen y no se permite borrar al último root.
- Bajas y cambios de rango vuelven a consultar permisos y número de roots dentro de una transacción bloqueada. Evita que dos solicitudes simultáneas decidan con un recuento anterior y dejen el sistema sin root. El endpoint responde con conflicto si la operación ya no está autorizada.
- Cuando falta configurar SMTP, el registro de la participación se conserva y queda constancia del motivo del correo fallido. La confirmación ciudadana recomienda descargar el PDF y no promete una entrega que no se ha comprobado.
- El frontend rechaza operaciones de escritura con origen web ajeno antes de reenviarlas con la sesión al backend. Se contempla que un proxy termine HTTPS y conserve el host público. Los clientes sin encabezados de navegador siguen admitidos: esto no equivale a una evaluación exhaustiva de todas las defensas contra CSRF.
- Actualización de Nodemailer y SheetJS en backend; actualización compatible de las versiones principales de Vite, Vitest y Storybook. SheetJS utiliza su [distribución oficial](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/), porque el paquete antiguo de npm tenía avisos conocidos.

## Comprobaciones

- Backend: **134 pruebas aprobadas en nueve archivos**, con las versiones finales instaladas, sobre correo, permisos, bajas, folios, participaciones, exportación XLSX y seguridad de la plantilla. SMTP y base de datos se sustituyen por dobles donde corresponde; no se prueba aquí la concurrencia contra PostgreSQL real ni la recepción en un buzón.
- Frontend: ejecución final completa con **90 archivos y 1,216 pruebas aprobadas** después de actualizar dependencias y ajustar dos expectativas de texto desactualizadas. Incluye la nueva comprobación del botón de baja.
- Comprobación de tipos del frontend y backend, y revisión de estilo de los archivos de implementación seleccionados: aprobadas. `git diff --check`: aprobado.
- `bun install --frozen-lockfile --ignore-scripts` en la raíz: aprobado, sin cambios. La instalación congelada del backend también aprobó. Bun falló inicialmente al acceder al caché desde el entorno restringido; con acceso al caché la instalación funcionó. Ese fallo local no demuestra una incompatibilidad de las bibliotecas ni del servidor.
- Auditoría de dependencias posterior a los cambios: backend sin avisos devueltos por `bun audit`; frontend aún presenta avisos en dos paquetes: `esbuild` (bajo) y `minimatch` (moderado). Se fijaron versiones compatibles corregidas de `brace-expansion` 5.0.12, `source-map-js` 1.2.2 y `undici` 8.12.4 mediante overrides. El inventario incluye herramientas de desarrollo y pruebas. La presencia de un aviso no demuestra que la ruta vulnerable sea explotable en producción; tampoco permite descartarla sin revisar su uso. Esta parte queda pendiente.
- Vista previa HTML generada. La comprobación visual por control de Windows se interrumpió porque la herramienta no pudo verificar la dirección del navegador con suficiente confianza. No se ha comprobado la apariencia en una bandeja real de Gmail u Outlook.

## Pendientes concretos

1. **Servidor y correo:** confirmar configuración SMTP, cuenta autorizada para enviar como la consulta y entrega real a un buzón. Sistemas debe verificar autorización del remitente y sus registros SPF/DKIM/DMARC. No se cambió la cuenta institucional ni se inventaron credenciales.
2. **Publicación:** instalar y publicar los cambios de frontend y backend con el procedimiento del servidor. Un commit local no actualiza por sí solo el sitio. La publicación y el estado actual del servidor no se verificaron en esta revisión.
3. **Folios:** la copia local ya usa secuencias separadas E/P para nuevos folios y conserva los emitidos. Su prueba aprobó. El servidor necesita tener aplicado el esquema correspondiente; no se renumeraron expedientes ni se migró producción aquí.
4. **Cartografía:** faltan los shapes y datos oficiales que mencionan en el audio. El mapa base no sustituye esas capas. Los nombres y textos del pie ya tienen campos de personalización; el contenido definitivo lo confirma el área responsable.
5. **Dependencias del frontend:** completar la actualización de los dos paquetes señalados y validar compatibilidad antes de cerrar los avisos restantes.
6. **Privacidad y archivo:** siguen pendientes la validación institucional del aviso y la confirmación escrita de serie, subserie y plazos de conservación por Archivo General Municipal. La revisión del código no proporciona esa aprobación.
7. **Validación visual y operativa:** abrir la vista previa, comprobar un envío en Gmail/Outlook y ensayar la baja con una cuenta de prueba en un entorno controlado. No se realizó una prueba destructiva sobre cuentas reales.

Esta revisión identifica y corrige problemas concretos; no es una certificación ni acredita cumplimiento completo de una norma. No incluyó una prueba de penetración, una auditoría completa de accesibilidad, la configuración del servidor, las copias de seguridad o todos los flujos de la aplicación.

## Ajuste posterior del correo

Se consultaron las [recomendaciones de HTML de Mailchimp](https://templates.mailchimp.com/getting-started/html-email-basics/) y su [guía de diseño](https://templates.mailchimp.com/design/). La plantilla se ajustó a 600 px, los datos se apilan en pantallas pequeñas y los encabezados de fila tienen semántica para lectores de pantalla. Acuse y respuesta incluyen ahora una alternativa MIME de texto sencillo junto al HTML y al PDF. Se conservan remitente, destinatario, asunto y configuración SMTP. Las 42 pruebas de correo y plantilla aprobaron; el transporte se simula, por lo que sigue pendiente comprobar la recepción real en el servidor y la apariencia en Gmail/Outlook.
