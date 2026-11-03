/**
 * Bell Studio — backend del turnero (Google Apps Script) — PLANTILLA ENDURECIDA
 *
 * Este archivo NO se ejecuta desde GitHub: hay que pegarlo en el proyecto de Apps Script
 * (script.google.com) que está atado a la planilla, adaptando los puntos marcados con "AJUSTAR",
 * y publicarlo como "Nueva versión" de la implementación existente (así la URL no cambia).
 *
 * Qué agrega respecto de un doPost simple:
 *  1. Candado (LockService): dos reservas simultáneas no pueden pisarse.
 *  2. Validación de TODO en el servidor (el navegador se puede saltear): servicio, día y horario
 *     permitidos, fecha futura y dentro de la ventana de reserva, largo y formato de los datos.
 *  3. Anti-bots: campo trampa, tiempo mínimo de llenado, límite por email / teléfono, límite
 *     global por hora y tope de reservas pendientes sin seña por persona.
 *  4. Liberación automática de pre-reservas sin seña (para que un bot o un cliente que no paga
 *     no pueda dejar la agenda ocupada indefinidamente).
 *  5. Neutraliza fórmulas en la planilla (=IMPORTXML(...)) y escapa HTML en los emails.
 *  6. doGet devuelve solo fecha|hora|servicio de turnos vigentes: ningún dato personal.
 *
 * Columnas esperadas en la hoja (AJUSTAR si tu planilla es distinta):
 *  A fecha | B hora | C servicio | D nombre | E apellido | F email | G teléfono |
 *  H primera vez | I comentarios | J estado | K creado
 *  Estados: "pendiente" (pre-reserva sin seña), "confirmado" (seña recibida), "cancelado".
 *  El dueño pasa a mano la celda J de "pendiente" a "confirmado" cuando llega la seña.
 */

// ===================== CONFIGURACIÓN (AJUSTAR) =====================
const SHEET_NAME = 'Reservas';          // AJUSTAR: nombre real de la hoja
const OWNER_EMAIL = 'tu-mail@ejemplo.com'; // AJUSTAR: dónde llegan los avisos

const SERVICES = {                      // código -> duración en minutos (igual que turnero.html)
  sesion90: 90, sesion60: 60, sesion120: 120, '4manos': 60, entrenamiento: 60
};
const SCHEDULE = {                      // igual que SCHEDULE en turnero.html (0 = domingo)
  weekday: { days: [3, 5], starts: ['19:00', '20:30'] },
  weekend: { days: [0, 6], starts: ['07:00', '08:30', '10:00', '11:30'] }
};
const HOLIDAYS = [];                    // AJUSTAR: mismas fechas 'AAAA-MM-DD' que HOLIDAYS del turnero
const BLOCKED_DATES = [];               // AJUSTAR: mismas fechas que BLOCKED_DATES del turnero
const TZ = 'America/Argentina/Buenos_Aires';

const MAX_DAYS_AHEAD = 60;              // no se puede reservar más allá de 60 días
const HOLD_HOURS = 24;                  // una pre-reserva "pendiente" se libera a las 24 h sin seña
const MAX_PENDING_PER_PERSON = 2;       // pre-reservas sin seña simultáneas por email o teléfono
const MAX_BOOKINGS_PER_HOUR = 8;        // tope global de reservas nuevas por hora (freno a ataques)
const MIN_FILL_SECONDS = 5;             // un humano tarda más que esto en completar el formulario
// ===================================================================

const COL = { FECHA: 0, HORA: 1, SERVICIO: 2, NOMBRE: 3, APELLIDO: 4, EMAIL: 5, TEL: 6,
              PRIMERA: 7, COMENT: 8, ESTADO: 9, CREADO: 10 };

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------- GET: turnos ocupados (sin datos personales) ----------
function doGet() {
  const rows = getRows_();
  const list = rows
    .filter(r => r[COL.FECHA] && r[COL.HORA] && isActive_(r))
    .map(r => `${r[COL.FECHA]}|${r[COL.HORA]}|${r[COL.SERVICIO]}`);
  return json_(list);
}

// ---------- POST: nueva reserva ----------
function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return json_({ ok: false, reason: 'busy' });
  try {
    let data;
    try { data = JSON.parse(e.postData.contents); } catch (_) { return json_({ ok: false, reason: 'invalid' }); }
    if (!data || typeof data !== 'object') return json_({ ok: false, reason: 'invalid' });

    // 1) Bots: campo trampa lleno o formulario completado demasiado rápido.
    //    Se responde "ok" para no darle pistas al bot, pero no se escribe nada.
    if (String(data.website || '') !== '' || Number(data.elapsed) < MIN_FILL_SECONDS) {
      return json_({ ok: true });
    }

    // 2) Validación y limpieza de datos.
    const clean = validate_(data);
    if (!clean) return json_({ ok: false, reason: 'invalid' });

    // 3) Límite global por hora (protege la agenda y la cuota de emails ante un ataque).
    const props = PropertiesService.getScriptProperties();
    const hourKey = 'h_' + Utilities.formatDate(new Date(), TZ, 'yyyyMMddHH');
    const hourCount = Number(props.getProperty(hourKey) || 0);
    if (hourCount >= MAX_BOOKINGS_PER_HOUR) return json_({ ok: false, reason: 'rate' });

    // 4) Horario libre y límite de pre-reservas por persona.
    const rows = getRows_().filter(isActive_);
    if (overlaps_(rows, clean.key, clean.startMin, clean.duration)) return json_({ ok: false, reason: 'taken' });
    const mine = rows.filter(r => String(r[COL.ESTADO]).toLowerCase() === 'pendiente' &&
      (String(r[COL.EMAIL]).toLowerCase() === clean.email || digits_(r[COL.TEL]) === digits_(clean.phone)));
    if (mine.length >= MAX_PENDING_PER_PERSON) return json_({ ok: false, reason: 'limit' });

    // 5) Escribir la fila (texto plano, sin fórmulas) y avisar por email.
    const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
    sheet.appendRow([
      clean.dateDisplay, clean.time, clean.service,
      safeCell_(clean.firstName), safeCell_(clean.lastName), safeCell_(clean.email), safeCell_(clean.phone),
      safeCell_(clean.firstTime), safeCell_(clean.comments), 'pendiente', new Date()
    ]);
    SpreadsheetApp.flush();
    props.setProperty(hourKey, String(hourCount + 1));

    sendEmails_(clean);   // AJUSTAR: reemplazar por tus emails actuales (ver más abajo)
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

// ---------- Validación ----------
function validate_(d) {
  const str = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
  const out = {
    firstName: str(d.firstName, 50), lastName: str(d.lastName, 50),
    email: str(d.email, 100).toLowerCase(), phone: str(d.phone, 25),
    firstTime: d.firstTime === 'no' ? 'no' : 'si', comments: str(d.comments, 500),
    service: str(d.service, 20), time: str(d.time, 5), lang: str(d.lang, 2)
  };
  if (!/^[\p{L}][\p{L}\p{M}'’. -]*$/u.test(out.firstName)) return null;
  if (!/^[\p{L}][\p{L}\p{M}'’. -]*$/u.test(out.lastName)) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(out.email)) return null;
  const nd = digits_(out.phone).length;
  if (nd < 8 || nd > 15) return null;
  if (!Object.prototype.hasOwnProperty.call(SERVICES, out.service)) return null;
  out.duration = SERVICES[out.service];

  // Fecha "d/m/aaaa" -> clave 'AAAA-MM-DD'
  const m = String(d.date || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const key = `${m[3]}-${('0' + m[2]).slice(-2)}-${('0' + m[1]).slice(-2)}`;
  const when = new Date(`${key}T${out.time}:00-03:00`);
  if (isNaN(when.getTime())) return null;
  const now = new Date();
  if (when.getTime() < now.getTime()) return null;                       // ya pasó
  if (when.getTime() > now.getTime() + MAX_DAYS_AHEAD * 86400000) return null; // demasiado lejos
  if (BLOCKED_DATES.indexOf(key) !== -1) return null;

  // El día y el horario tienen que existir en la agenda real.
  const dow = Number(Utilities.formatDate(when, TZ, 'u')) % 7; // 'u': 1=lunes … 7=domingo -> 0=domingo
  const isWeekend = HOLIDAYS.indexOf(key) !== -1 || SCHEDULE.weekend.days.indexOf(dow) !== -1;
  const starts = isWeekend ? SCHEDULE.weekend.starts
    : (SCHEDULE.weekday.days.indexOf(dow) !== -1 ? SCHEDULE.weekday.starts : []);
  if (starts.indexOf(out.time) === -1) return null;

  out.key = key;
  out.dateDisplay = `${Number(m[1])}/${Number(m[2])}/${m[3]}`;
  out.startMin = Number(out.time.slice(0, 2)) * 60 + Number(out.time.slice(3, 5));
  return out;
}

// ---------- Utilidades ----------
function digits_(s) { return String(s || '').replace(/\D/g, ''); }

// Evita que un texto escrito por un visitante se interprete como fórmula en Sheets.
function safeCell_(v) {
  const s = String(v == null ? '' : v);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function escapeHtml_(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function getRows_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
  return sheet.getDataRange().getDisplayValues().slice(1); // sin encabezado
}

// Un turno "ocupa" agenda si no está cancelado y, si sigue "pendiente", no venció la retención.
function isActive_(r) {
  const estado = String(r[COL.ESTADO] || 'pendiente').toLowerCase();
  if (estado === 'cancelado') return false;
  if (estado === 'pendiente') {
    const created = new Date(r[COL.CREADO]);
    if (!isNaN(created.getTime()) && Date.now() - created.getTime() > HOLD_HOURS * 3600000) return false;
  }
  return true;
}

function toMin_(hora) {
  const m = String(hora).match(/^(\d{1,2}):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
function keyFromDisplay_(f) {
  const m = String(f).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${('0' + m[2]).slice(-2)}-${('0' + m[1]).slice(-2)}` : null;
}

function overlaps_(rows, key, startMin, duration) {
  return rows.some(r => {
    if (keyFromDisplay_(r[COL.FECHA]) !== key) return false;
    const bStart = toMin_(r[COL.HORA]);
    if (bStart == null) return false;
    const bDur = SERVICES[r[COL.SERVICIO]] || 90;
    return bStart < startMin + duration && startMin < bStart + bDur;
  });
}

// ---------- Emails (AJUSTAR: pegar acá el texto de tus emails actuales) ----------
// Importante: todo dato del visitante pasa por escapeHtml_ antes de entrar al HTML.
function sendEmails_(c) {
  const resumen = `${escapeHtml_(c.service)} — ${escapeHtml_(c.dateDisplay)} ${escapeHtml_(c.time)}`;
  MailApp.sendEmail({
    to: OWNER_EMAIL,
    subject: 'Nueva reserva: ' + c.firstName + ' ' + c.lastName,
    htmlBody: `<p><b>${escapeHtml_(c.firstName)} ${escapeHtml_(c.lastName)}</b> — ${resumen}</p>
      <p>Email: ${escapeHtml_(c.email)}<br>Tel: ${escapeHtml_(c.phone)}<br>Comentarios: ${escapeHtml_(c.comments)}</p>`
  });
  MailApp.sendEmail({
    to: c.email,
    subject: 'Tu turno en Bell Studio quedó pre-reservado',
    htmlBody: `<p>Hola ${escapeHtml_(c.firstName)}, tu turno (${resumen}) quedó pre-reservado.
      Para confirmarlo, transferí la seña y enviá el comprobante por WhatsApp. Si no la recibimos en ${HOLD_HOURS} horas, el horario se libera.</p>`
  });
}
