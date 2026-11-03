# Turnero: pendientes para mañana (miércoles 4/11/2026)

Esta nota sirve para retomar el turnero sin tener que reconstruir el contexto. Cuenta cómo funciona hoy, qué se arregló el 3/11 y qué falta hacer, por orden de prioridad. En cada tarea se indica qué archivo se toca y cómo probarlo sin romper lo que ya anda.

---

## 1. Cómo funciona hoy

El turnero es `turnero.html`, un único archivo publicado en GitHub Pages (bellstudio.com.ar). No tiene servidor propio: habla con un **Google Apps Script** que funciona como backend y está pegado a la planilla de Google Sheets.

- **GET** a `GOOGLE_SCRIPT_URL` → el Apps Script devuelve la lista de turnos tomados, un texto por turno con el formato `fecha|hora`.
- **POST** a `GOOGLE_SCRIPT_URL` → el turnero envía la reserva. El Apps Script la anota en la planilla y manda los emails al dueño y al cliente. Esta parte funciona bien y **no se tocó**.

El POST se manda con `mode: 'no-cors'`. Eso implica que el turnero **no puede leer la respuesta** del Apps Script: siempre muestra "Reserva registrada", aunque el script falle o rechace la reserva. Esto es importante para la tarea 2.1.

### Lo que se arregló el 3/11 (commit `9ab9bcd`)

- **Causa del problema:** Sheets guarda la fecha y la hora como valores de fecha. El Apps Script los devolvía como texto largo (`Sat Nov 07 2026 00:00:00 GMT-0300 …|Sat Dec 30 1899 08:30:00 GMT-0416 …`). El turnero comparaba contra `7/11/2026|08:30` y, como nunca coincidían, todo aparecía libre.
- Ahora el turnero entiende los dos formatos, el largo y el corto `7/11/2026|08:30`. Si recibe un formato que no reconoce, **no ofrece horarios** (falla cerrada) y muestra un aviso.
- Los horarios ocupados y los que ya pasaron no se muestran, y los días completos quedan deshabilitados.
- La disponibilidad se vuelve a consultar al elegir un día, al volver a la pestaña y **justo antes de confirmar**.
- Se tiene en cuenta la duración del servicio elegido: un masaje de 120 min no se ofrece si pisa un turno ya tomado.
- Todo se calcula en hora de Buenos Aires, aunque el cliente reserve desde otro país.

### Dónde está cada cosa dentro de `turnero.html`

| Qué | Dónde (buscar por nombre) |
|---|---|
| Días y horarios de atención | `const SCHEDULE` |
| Días puntuales sin atención | `const BLOCKED_DATES` |
| Feriados | `const HOLIDAYS` |
| Lectura de la lista de turnos tomados | `function buildOccupancy`, `parseBookedDate`, `parseBookedTime` |
| Regla de "¿se superpone?" | `function isSlotTaken` |
| Envío de la reserva (POST) | buscar `mode: 'no-cors'` |

---

## 2. Pendientes, por prioridad

### 2.1 Bloquear reservas simultáneas (Apps Script + turnero) — PRIORIDAD ALTA

**Problema.** El turnero re-chequea la disponibilidad justo antes de confirmar, pero entre ese chequeo y el momento en que el Apps Script escribe la fila pasan uno o dos segundos. Si dos personas confirman el mismo horario dentro de esa ventana, **las dos reservas entran** y los dos clientes reciben el email. Es muy poco probable, pero la única forma de que sea imposible es que el propio Apps Script controle la ocupación antes de escribir.

**Solución en dos pasos, en este orden:**

**Paso A — Apps Script.** Sumar un candado (`LockService`) en `doPost` y, con el candado tomado, fijarse si ese horario ya está en la planilla. Si está ocupado, responder `{ ok: false, reason: 'taken' }` **sin escribir la fila ni mandar emails**. Si está libre, hacer exactamente lo que hace hoy y responder `{ ok: true }`.

Este es el esquema, a adaptar al `doPost` actual. Los nombres de la hoja y de las columnas hay que reemplazarlos por los reales:

```js
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000); // espera hasta 20 s si hay otra reserva procesándose
  try {
    const data = JSON.parse(e.postData.contents);

    if (turnoOcupado(data.date, data.time)) {
      return json({ ok: false, reason: 'taken' }); // no escribe ni manda emails
    }

    // ===== ACÁ VA TODO LO QUE HACE HOY TU doPost, SIN CAMBIOS =====
    // (appendRow en la planilla + email al dueño + email al cliente)

    SpreadsheetApp.flush(); // asegura que la fila quede escrita antes de soltar el candado
    return json({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function turnoOcupado(fecha, hora) {
  const hoja = SpreadsheetApp.getActive().getSheetByName('NOMBRE_DE_LA_HOJA'); // ajustar
  const filas = hoja.getDataRange().getDisplayValues(); // texto tal cual se ve en la planilla
  const COL_FECHA = 0, COL_HORA = 1; // ajustar: 0 = columna A, 1 = B, etc.
  const normFecha = s => String(s).split('/').map(Number).join('/'); // "07/11/2026" → "7/11/2026"
  const normHora  = s => { const [h, m] = String(s).split(':'); return `${h.padStart(2, '0')}:${m}`; }; // "8:30:00" → "08:30"
  return filas.slice(1).some(f =>
    normFecha(f[COL_FECHA]) === normFecha(fecha) && normHora(f[COL_HORA]) === normHora(hora)
  );
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Este paso, por sí solo, ya no rompe nada: el turnero actual sigue enviando igual y, como usa `no-cors`, ignora la respuesta. Lo único que cambia es que un turno duplicado deja de anotarse y de generar emails.

**Paso B — turnero.** Cambiar el POST para poder **leer** la respuesta, y si llega `taken`, volver al paso 2 con el aviso que ya existe (`alerts.taken`). La idea es sacar `mode: 'no-cors'` y el header `Content-Type`. Así el navegador lo envía como texto plano, el Apps Script recibe exactamente el mismo contenido en `e.postData.contents` y la respuesta se puede leer:

```js
const response = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: JSON.stringify(formData) });
let result = null;
try { result = await response.json(); } catch (_) { /* respuesta vieja o sin JSON: se toma como OK */ }
if (result && result.ok === false && result.reason === 'taken') {
  // ocultar overlay, refrescar disponibilidad y volver al paso 2:
  // stopLoading(); await refreshAvailability(true); revalidateSelection('taken'); return;
}
```

**Cuidados:**

- **Publicar el Apps Script sin cambiar la URL:** *Implementar → Administrar implementaciones → lápiz (editar) → Versión: "Nueva versión" → Implementar*. **No** usar "Nueva implementación", porque genera otra URL y el turnero dejaría de funcionar.
- Hacer primero el paso A y probarlo. Recién después, el paso B.
- **Prueba:** reservar un turno de prueba con tu propio email y después intentar reservar el mismo horario desde otra pestaña que haya quedado abierta de antes. La segunda tiene que volver al paso 2 con el aviso, no tiene que llegar un segundo email y en la planilla tiene que haber una sola fila. Al terminar, **borrar la fila de prueba**.

### 2.2 Que el GET informe qué servicio se reservó (Apps Script + turnero) — PRIORIDAD MEDIA

**Problema.** El GET solo devuelve `fecha|hora`. El turnero no sabe cuánto dura cada turno ya tomado y asume 90 minutos. Si alguien reservó un masaje de 120 min a las 07:00 (termina 09:00), el turno de las 08:30 **sigue apareciendo libre**.

**Paso A — Apps Script (`doGet`).** Devolver un tercer dato con el código del servicio (`sesion90`, `sesion60`, `sesion120`, `4manos`, `entrenamiento`), quedando `fecha|hora|servicio`. Conviene aprovechar y usar `getDisplayValues()`, que devuelve el texto tal como se ve en la planilla (`7/11/2026`, `8:30:00`) en lugar de objetos de fecha:

```js
function doGet(e) {
  const hoja = SpreadsheetApp.getActive().getSheetByName('NOMBRE_DE_LA_HOJA'); // ajustar
  const filas = hoja.getDataRange().getDisplayValues();
  const COL_FECHA = 0, COL_HORA = 1, COL_SERVICIO = 2; // ajustar a las columnas reales
  const lista = filas.slice(1)
    .filter(f => f[COL_FECHA] && f[COL_HORA])
    // opcional: .filter(f => f[COL_ESTADO] !== 'cancelado') para liberar turnos cancelados
    .map(f => `${f[COL_FECHA]}|${f[COL_HORA]}|${f[COL_SERVICIO]}`);
  return ContentService.createTextOutput(JSON.stringify(lista))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Este cambio también es compatible con el turnero actual: hoy toma solo los dos primeros datos e ignora el tercero. Antes de seguir, abrir la URL del script en el navegador y confirmar que la lista se vea así: `["7/11/2026|8:30:00|sesion120", ...]`.

**Paso B — turnero.**

- En `buildOccupancy`, leer el tercer dato y convertirlo en duración. La duración ya está en el HTML, en el atributo `data-duration` de cada `<option>` del selector de servicio. Guardar cada turno como `{ start, duration }` en lugar de solo los minutos de inicio.
- En `isSlotTaken`, usar la duración de cada turno tomado en lugar de `BOOKED_SLOT_MINUTES`. Si el servicio no se reconoce, usar 90 como ahora.
- Ajustar también `sessionBookings` y el `push` que se hace después de reservar, para que guarden el mismo formato.
- **Prueba:** con un turno de 120 min a las 07:00 en la planilla, el sábado tiene que dejar de ofrecer las 08:30.

### 2.3 Cargar los feriados 2027 (solo turnero) — PRIORIDAD MEDIA, antes de fin de diciembre

`HOLIDAYS` tiene únicamente los de 2026. Los feriados abren el horario de fin de semana (07:00 a 13:00), así que desde enero un feriado entre semana va a mostrar el horario de un día común, o nada si cae en un día que no se atiende.

Estos ya se conocen porque son fijos o dependen de Semana Santa (Pascua 2027 = 28/3):

```js
"2027-01-01", // Año Nuevo (vie)
"2027-02-08", // Carnaval (lun)
"2027-02-09", // Carnaval (mar)
"2027-03-24", // Memoria (mié)
"2027-03-26", // Viernes Santo (vie)
"2027-04-02", // Malvinas (vie)
"2027-05-01", // Trabajador (sáb)
"2027-05-25", // Revolución (mar)
"2027-06-20", // Bandera (dom)
"2027-07-09", // Independencia (vie)
"2027-12-08", // Inmaculada (mié)
"2027-12-25", // Navidad (sáb)
```

**Faltan confirmar** los trasladables (Güemes 17/6, San Martín 17/8, Diversidad 12/10, Soberanía 20/11) y los días no laborables con fines turísticos, porque el Gobierno los fija por decreto. Verificarlos en el calendario oficial (argentina.gob.ar → Feriados) antes de cargarlos.

### 2.4 Bloquear los fines de semana que no atendés (solo turnero) — CADA 15 DÍAS

Hoy el turnero ofrece **todos** los sábados y domingos. Para cerrar un día puntual, agregarlo a `BLOCKED_DATES` con formato `AAAA-MM-DD`:

```js
const BLOCKED_DATES = [
    '2026-11-14', '2026-11-15', // ejemplo: fin de semana sin atención
];
```

Esto sirve también para vacaciones o para un día entre semana que no puedas atender. Si un cliente ya había reservado ese día, el turno sigue en la planilla: bloquear el día no cancela reservas.

---

## 3. Antes de publicar cualquier cambio

1. **No tocar** la URL del Apps Script (`GOOGLE_SCRIPT_URL`) ni el contenido que se envía en el POST (`firstName`, `lastName`, `email`, `phone`, `firstTime`, `comments`, `date` como `D/M/AAAA`, `time` como `HH:MM`, `service`, `lang`). El Apps Script y los emails dependen de ese formato.
2. Después de publicar, abrir bellstudio.com.ar/turnero.html y elegir el sábado 7/11: el horario de las 08:30 **no** tiene que aparecer, porque ya está tomado en la planilla. Si aparece, algo se rompió en la lectura de turnos.
3. Si aparece el aviso amarillo "No pudimos consultar la disponibilidad", el GET del Apps Script está fallando o cambió de formato. Abrir la URL del script en el navegador para ver qué está devolviendo.
4. Cualquier reserva de prueba se hace con email propio y después **se borra la fila** de la planilla.
