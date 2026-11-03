# SEO y seguridad: qué se hizo y qué falta hacer vos

## Lo que ya está en el código (3/11/2026)

**SEO (`index.html`, `robots.txt`, `sitemap.xml`)**
- Título, descripción y H1 con la búsqueda real: "masajes en Parque Patricios" + Barracas, Pompeya, San Cristóbal y Constitución.
- Datos estructurados (JSON-LD): negocio local con `areaServed` por barrio y preguntas frecuentes (pueden aparecer como resultado enriquecido en Google).
- Secciones nuevas con texto indexable: "Masajes en Parque Patricios y barrios cercanos" y "Preguntas frecuentes".
- `robots.txt` + `sitemap.xml`, canonical, Open Graph / Twitter, dimensiones de imágenes, link de LinkedIn roto eliminado.

**Seguridad**
- `turnero.html` / `index.html`: política de contenido (CSP) por meta, `referrer`, SRI en Font Awesome, `rel="noopener"` en links externos.
- `turnero.html`: campo trampa anti-bot, tiempo mínimo de llenado, máximo 2 reservas por navegador cada 24 h, `maxlength` en los campos, y ahora **lee la respuesta** del servidor (si el horario ya estaba tomado vuelve al paso 2).
- `apps-script/Codigo.gs`: plantilla de backend endurecido (ver abajo). **Hasta que no la publiques, las protecciones reales del servidor NO están activas.**

## Lo que tenés que hacer vos (en orden de impacto)

1. **Publicar `apps-script/Codigo.gs`** en tu Apps Script: copiar, ajustar `SHEET_NAME`, `OWNER_EMAIL`, columnas y el texto de tus emails actuales, y publicar como *Implementar → Administrar implementaciones → editar → Nueva versión* (no "nueva implementación", cambia la URL). Con eso: candado anti-simultáneas, validación de día/hora/servicio, tope por hora, tope de pre-reservas por persona/email/teléfono, **pre-reservas sin seña que se liberan a las 24 h** (lo que frena a un bot que quiera llenarte la agenda) y protección contra fórmulas/HTML inyectados. Agregá una columna **Estado** y marcá "confirmado" a mano cuando llegue la seña.
2. **La planilla**: dejala privada (solo vos), con verificación en 2 pasos en tu cuenta de Google. No la compartas con "cualquiera con el enlace". El Apps Script debe estar como *Ejecutar como: yo* / *Acceso: cualquier persona* (es lo que necesita el turnero), pero el GET solo devuelve fecha/hora/servicio, sin datos personales.
3. **Google Search Console**: verificar bellstudio.com.ar, enviar `https://bellstudio.com.ar/sitemap.xml` y pedir indexar la home.
4. **Perfil de Empresa en Google (Google Business Profile)**: es lo que más pesa para "masajes cerca de mí / Parque Patricios". La dirección (Combate de los Pozos 1680, Piso 7 Depto B) ya está en el sitio y en los datos estructurados; el paso a paso para crear y verificar el perfil está en `PENDIENTES.md` (Tema 1), pensado para que lo ejecute un agente en Chrome.
5. **Reseñas y menciones**: pedir reseñas en Google a cada cliente; vincular Instagram y el sitio entre sí.
6. **Opcional, más fuerte contra bots**: agregar Cloudflare Turnstile (gratis) al formulario; requiere crear una clave en Cloudflare y verificarla en el Apps Script.
7. **Dominio**: en GitHub (Settings → Pages) activar "Enforce HTTPS"; y cuenta de GitHub con 2FA.

## Cosas a revisar
- Los pendientes de Google Maps, Analytics y Search Console están en `PENDIENTES.md`; el plan de marca en `MARCA_Y_CRECIMIENTO.md`.
- **Precios distintos**: la home muestra Masaje Express a $60.000 y el turnero a $45.000.
- Las secciones nuevas (zonas, preguntas) están solo en español; los 4 idiomas siguen cubriendo el resto de la home.
- La CSP no pudo probarse contra Google Analytics real desde el entorno de desarrollo; después de publicar, abrir la consola del navegador (F12) y verificar que no haya errores de "Content Security Policy".
