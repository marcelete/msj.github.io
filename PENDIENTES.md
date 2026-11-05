# PENDIENTES — Instrucciones para un agente (Claude en Chrome)

Este archivo es una lista de tareas **para que las ejecute un agente de IA que maneja el navegador** (la extensión *Claude in Chrome*) con la sesión de Google del dueño ya abierta. También sirve como checklist para hacerlas a mano.

> Los pendientes del código del turnero están aparte, en `PENDIENTES_TURNERO.md`. El plan de marca y crecimiento está en `MARCA_Y_CRECIMIENTO.md`. Lo hecho en SEO y seguridad está en `SEO_Y_SEGURIDAD.md`.

## Reglas para el agente (leer primero)

1. **El dueño es quien inicia sesión.** Nunca pidas, leas ni escribas contraseñas, códigos de verificación en 2 pasos ni datos de tarjetas. Si aparece un login, un captcha o un código, pausá y pedile al dueño que lo resuelva en su pantalla.
2. **Detenete y preguntá antes de:** pagar o activar cualquier cosa con costo (Google Ads, upgrades), aceptar términos legales en nombre del dueño, borrar o fusionar perfiles/propiedades existentes, publicar contenido que no figure en este archivo, o responder reseñas.
3. **No inventes datos.** Usá solo los datos de la sección "Datos del negocio". Si falta uno (por ejemplo precios definitivos), preguntá.
4. **Verificá y mostrá evidencia.** Al terminar cada tarea, describí qué quedó configurado (URLs, capturas de pantalla o textos visibles) y marcá el `[ ]` correspondiente en tu informe al dueño.
5. **Prometer "primero en Google Maps" es imposible:** el orden lo decide Google según relevancia, distancia y prominencia. Este plan maximiza esas tres cosas de forma honesta y gratuita. No uses técnicas prohibidas (nombre con palabras clave agregadas, reseñas falsas o compradas, direcciones falsas, varios perfiles para el mismo local): Google suspende el perfil.

## Datos del negocio (fuente de verdad)

| Campo | Valor |
|---|---|
| Nombre | **Bell Studio** (exactamente así, sin agregar palabras clave) |
| Responsable | Marcelo Bellizia — Profesor Superior de Educación Física y Masoterapeuta |
| Dirección | Combate de los Pozos 1680, Piso 7, Depto B — entre Av. Brasil y Av. Juan de Garay — Ciudad Autónoma de Buenos Aires, Argentina |
| Barrio | Parque Patricios (limítrofe con Constitución, San Cristóbal, Nueva Pompeya y Barracas) |
| Teléfono / WhatsApp | +54 9 11 6511-8935 |
| Sitio web | https://bellstudio.com.ar/ |
| Reservas (link de turnos) | https://bellstudio.com.ar/turnero.html |
| Instagram | https://instagram.com/bell.studio.arg |
| Atención | **Solo con turno previo.** Lunes 10:00–11:30 y 20:00–24:00; miércoles 18:30–24:00; martes y jueves cerrado; fines de semana libres y feriados según la planilla (fin de semana común: vie 18:30–24, sáb y dom 8–24, lun 8–11:30; fin de semana largo/feriado: 8–24). Fuente de verdad: pestañas "Horario semanal" y "Excepciones" de la planilla (ver ADMIN_HORARIOS.md). index.html ya actualizado el 5/11/2026 (horarios y precio Express $45.000). **Pendiente: actualizar estos horarios en Google Business Profile.** |
| Categoría principal | Masajista / Terapeuta de masajes (en inglés: *Massage therapist*) |
| Categorías secundarias | Servicio de masajes, Entrenador personal, Centro de bienestar (usar solo las que Google ofrezca en la lista) |
| Servicios | Masaje Express 60 min · Masaje Integral 90 min · Inmersión Total 120 min · Masaje a 4 manos 60 min · Entrenamiento personalizado 60 min |
| Precios | ⚠️ **Preguntar al dueño antes de publicarlos.** La web muestra Express $60.000, Integral $70.000, Inmersión $90.000, 4 manos $100.000, Entrenamiento $25.000; el turnero muestra Express $45.000. |
| Descripción corta (≤ 750 caracteres) | "Bell Studio es un estudio de masajes terapéuticos y descontracturantes y entrenamiento personalizado en Parque Patricios, Ciudad de Buenos Aires. Atiende Marcelo Bellizia, Profesor Superior de Educación Física y Masoterapeuta. Cada sesión empieza con una evaluación para tratar contracturas, dolores de espalda, tensión por trabajo de oficina o desgaste deportivo. Atendemos a vecinos de Parque Patricios, Nueva Pompeya, Barracas, San Cristóbal y Constitución. Reservá tu turno online." |
| Fotos disponibles | `img/marcelo.png` del repositorio. El resto (fachada/entrada, interior, camilla, ambiente) las tiene que aportar el dueño. |

---

## TEMA 1 — Aparecer lo más alto posible en Google Maps y anunciarse gratis (Perfil de Empresa de Google)

**Qué es:** el Perfil de Empresa de Google (Google Business Profile, GBP) es la ficha gratuita que aparece en Google Maps y en el panel lateral de la búsqueda. Es la "publicidad gratis" en Maps: no hay que pagar anuncios.

### 1.1 Revisar si ya existe un perfil  `[ ]`
1. Con la sesión de Google del dueño, abrir https://business.google.com/ y buscar "Bell Studio".
2. Buscar también en Google Maps "Bell Studio Combate de los Pozos 1680" por si alguien ya creó la ficha.
3. **Si existe una ficha** → no crear otra (duplicar causa suspensión). Reclamarla ("Administrar este perfil") y seguir con 1.3.
4. **Si no existe** → seguir con 1.2.

### 1.2 Crear el perfil  `[ ]`
1. En business.google.com → "Agregar tu empresa". Nombre: **Bell Studio**.
2. Tipo de empresa: la categoría principal de la tabla.
3. Ubicación: **sí, los clientes visitan el local**. Cargar la dirección de la tabla, incluyendo "Piso 7, Depto B". Marcar el pin exacto en el mapa sobre Combate de los Pozos 1680.
4. Área de servicio: agregar Parque Patricios, Nueva Pompeya, Barracas, San Cristóbal y Constitución (si Google lo ofrece).
5. Teléfono y sitio web de la tabla.
6. **Verificación:** elegir el método que ofrezca Google (suele ser video o llamada; a veces postal). Si pide video, **detenerse y avisar al dueño**: tiene que mostrar con el celular la calle y la entrada del edificio, el timbre/portero con el nombre o depto B, y el interior donde atiende. El agente no puede hacerlo.

### 1.3 Completar el perfil al 100%  `[ ]`
- Horarios exactos de la tabla (con el día de la semana cerrado donde corresponda) y marcar **"Con cita previa"** / "Solo con cita".
- Descripción: la de la tabla.
- Atributos: elegir los que apliquen y sean ciertos (por ejemplo "Se requiere cita previa").
- Servicios: cargar los cinco con nombre y descripción corta; precios **solo si el dueño los confirmó**.
- Enlace de reservas / cita: https://bellstudio.com.ar/turnero.html
- Redes: agregar el Instagram.
- Fotos: subir `img/marcelo.png` como foto del equipo y pedir al dueño las de fachada, entrada, interior y camilla. Mínimo 10 fotos reales en total, con el tiempo.
- Logo y portada, si el dueño tiene los archivos.

### 1.4 Publicar actividad (anuncio gratuito)  `[ ]`
Con el perfil verificado, crear **3 publicaciones** ("Novedades") con foto real y botón "Reservar" hacia el link de turnos. Proponer los textos al dueño y esperar su OK antes de publicar:
1. Presentación: "Masajes descontracturantes en Parque Patricios — Bell Studio. Reservá tu turno online."
2. Un servicio (Integral 90 min), con qué se trabaja y para quién es.
3. Horarios de atención y cómo reservar.
Repetir una publicación por semana (ver `MARCA_Y_CRECIMIENTO.md`).

### 1.5 Reseñas (el factor que más empuja)  `[ ]`
1. Copiar el **link corto para pedir reseñas** (panel del perfil → "Pedir reseñas") y dárselo al dueño para enviarlo por WhatsApp después de cada sesión.
2. Dejar un texto sugerido para el mensaje: "¡Gracias por venir a Bell Studio! Si te sirvió la sesión, ¿me dejás una reseña? Me ayuda muchísimo: [link]".
3. **No** pedir reseñas a cambio de descuentos y **no** escribir reseñas desde cuentas propias.
4. Preparar (sin enviar) respuestas a cada reseña para que el dueño las apruebe.

### 1.6 Consistencia de datos (NAP)  `[ ]`
Verificar que nombre, dirección y teléfono sean **idénticos** en: Google, `index.html` (pie de página y datos estructurados), Instagram (bio) y cualquier directorio. Reportar diferencias; no editar el sitio desde el navegador (eso lo hace Claude Code en el repositorio).

### 1.7 Directorios gratuitos adicionales  `[ ]`
Crear fichas con los mismos datos en: Bing Places (https://www.bingplaces.com/ — permite importar desde Google), Apple Business Connect (https://businessconnect.apple.com/) y Facebook/Instagram Business (dirección y botón de WhatsApp). Preguntar al dueño antes de crear cuentas nuevas.

### 1.8 Medir resultados  `[ ]`
Anotar al final: estado de verificación, cantidad de fotos, cantidad de reseñas y qué aparece al buscar "masajes parque patricios", "masajes pompeya", "masajes barracas", "masajes san cristóbal" y "masajes constitución" (hacerlo desde una ventana de incógnito). Repetir cada 4 semanas.

**Listo cuando:** el perfil está verificado, completo, con link de reservas, ≥ 10 fotos, 3 publicaciones y el link de reseñas en manos del dueño.

---

## TEMA 2 — Google Analytics (medir visitas y reservas)

**Estado actual:** ambas páginas (`index.html` y `turnero.html`) ya cargan la etiqueta de Google (`gtag.js`) con el ID **`G-EM5K1XNP3L`**. Lo que falta es verificar que esté recibiendo datos, configurarla bien y medir las reservas.

### 2.1 Verificar que recibe datos  `[ ]`
1. Abrir https://analytics.google.com/ con la cuenta del dueño y buscar la propiedad con el flujo de datos `G-EM5K1XNP3L` (Administrar → Flujos de datos). Si no existe, **avisar al dueño**: puede ser de otra cuenta.
2. Abrir https://bellstudio.com.ar/ en otra pestaña y comprobar en **Informes → Tiempo real** que aparece 1 usuario activo.
3. Repetir con https://bellstudio.com.ar/turnero.html.

### 2.2 Configuración recomendada  `[ ]`
- Zona horaria: Argentina; moneda: ARS.
- Flujo de datos web → **Medición mejorada** activada (páginas vistas, desplazamientos, clics salientes — incluye el clic a WhatsApp e Instagram —, búsqueda en el sitio).
- Retención de datos de eventos: **14 meses**.
- Excluir tráfico interno (IP del dueño) si la conoce: Administrar → Flujos → Configurar etiqueta → Definir tráfico interno.
- Vincular **Search Console** (Administrar → Vinculación de productos) cuando el sitio esté verificado allí.

### 2.3 Medir las reservas como "evento clave"  `[ ]`
Hoy el turnero no envía un evento propio al terminar una reserva. **Esta parte requiere cambiar código** (la hace Claude Code en el repo, no el agente del navegador). Instrucción para Claude Code:
- En `turnero.html`, dentro del handler de `submit`, justo después de `rememberBooking();` (reserva aceptada por el servidor), agregar:
  `if (typeof gtag === 'function') gtag('event', 'generate_lead', { currency: 'ARS', value: deposit, service: option.value });`
- No enviar nombre, email ni teléfono a Analytics (son datos personales).
- Después, en Analytics → Administrar → Eventos, marcar `generate_lead` como **evento clave**.
- Probar con una reserva de prueba y verificar el evento en Tiempo real (y borrar la fila de prueba de la planilla).

### 2.4 Privacidad  `[ ]`
Avisar al dueño que, como se miden visitas y se guardan datos personales de clientes (nombre, email, teléfono), conviene agregar al sitio una **Política de Privacidad** breve conforme a la Ley 25.326 de Protección de Datos Personales. Proponer el texto; no publicarlo sin su OK.

### 2.5 Primer informe  `[ ]`
A las 2–4 semanas, resumir: usuarios, canales de origen (búsqueda orgánica / Instagram / directo), páginas más vistas, ciudad/país, clics a WhatsApp y reservas (`generate_lead`).

**Listo cuando:** Tiempo real muestra visitas en las dos páginas, la medición mejorada está activa y `generate_lead` figura como evento clave.

---

## TEMA 3 — Search Console (necesario para el SEO y para Analytics)

### 3.1 Verificar el sitio y enviar el sitemap  `[ ]`
1. https://search.google.com/search-console → agregar propiedad **Dominio** `bellstudio.com.ar` (la verificación pide un registro DNS TXT: si el dueño no tiene acceso al DNS, usar propiedad "Prefijo de URL" `https://bellstudio.com.ar/` con la etiqueta HTML y avisar a Claude Code para que la agregue al `<head>` de `index.html`).
2. Sitemaps → enviar `https://bellstudio.com.ar/sitemap.xml`.
3. Inspección de URL → "Solicitar indexación" para `https://bellstudio.com.ar/`.
4. A las 2 semanas, revisar Rendimiento: consultas que traen clics y posición promedio para "masajes parque patricios", "masajes pompeya", "masajes barracas", "masajes san cristóbal", "masajes constitución".

**Listo cuando:** la propiedad está verificada, el sitemap figura como "Correcto" y la home fue enviada a indexar.

---

## Registro de avance (completar al terminar cada tarea)

| Tarea | Estado | Fecha | Notas / enlaces |
|---|---|---|---|
| 1.1 Revisar perfil existente | pendiente | | |
| 1.2 Crear y verificar perfil | pendiente | | |
| 1.3 Completar perfil | pendiente | | |
| 1.4 Publicaciones | pendiente | | |
| 1.5 Reseñas | pendiente | | |
| 1.6 Consistencia NAP | pendiente | | |
| 1.7 Otros directorios | pendiente | | |
| 2.1–2.2 Analytics verificado y configurado | pendiente | | |
| 2.3 Evento de reserva | pendiente | | |
| 2.4 Política de privacidad | pendiente | | |
| 3.1 Search Console | pendiente | | |
