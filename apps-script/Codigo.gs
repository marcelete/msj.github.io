/**
 * Bell Studio - backend del turnero (Google Apps Script) - v2
 *
 * COPIA del script publicado (version 8 de la implementacion, 5/11/2026).
 * No se despliega desde GitHub: los cambios se hacen en el proyecto de Apps Script
 * "Agendar y enviar comprobantes de turno de Bell Studio" y se publican como NUEVA VERSION
 * de la implementacion existente (una implementacion nueva cambia la URL y rompe el turnero).
 * Mantener esta copia igual a la publicada.
 *
 * Planilla "Reservas Bell Studio". Pestaña de reservas: "Hoja 1" con las columnas
 *   A creado | B nombre | C apellido | D email | E celular | F primera vez | G dia | H hora |
 *   I comentarios | J servicio | K estado
 * Estados: "pendiente" (pre-reserva sin sena, se libera sola a las 24 h),
 *          "confirmado" (sena recibida; vacio = confirmado, para las filas viejas) y "cancelado".
 *
 * Horarios de atencion (se editan en la planilla, sin tocar codigo; ver ADMIN_HORARIOS.md):
 *   Pestana "Horario semanal": dia | desde | hasta   (una fila por tramo)
 *   Pestana "Excepciones":     fecha | tipo (abierto/cerrado) | desde | hasta | nota
 *   Si una fecha figura en "Excepciones", reemplaza al horario semanal de ese dia.
 *
 * GET              -> lista de turnos ocupados "d/m/aaaa|hh:mm|servicio" (sin datos personales)
 * GET ?action=schedule -> horarios de atencion en JSON
 * POST             -> nueva reserva (candado, validacion, anti-bots, emails)
 */

// ===================== CONFIGURACION =====================
const ADMIN_EMAIL = "marcebellizia@gmail.com";
const TZ = "America/Argentina/Buenos_Aires";

const SHEET_NAME = "Hoja 1";
const SHEET_WEEKLY = "Horario semanal";
const SHEET_EXCEPTIONS = "Excepciones";

// false = no se rechaza por horario (solo para publicar sin romper un turnero viejo).
// true  = solo se aceptan turnos que entren en "Horario semanal" / "Excepciones" (ACTIVO desde la v4).
const ENFORCE_SCHEDULE = true;

const SERVICES = { sesion60: 60, sesion90: 90, sesion120: 120, "4manos": 60, entrenamiento: 60 };
const DEFAULT_DURATION = 90;   // servicio desconocido o filas viejas sin servicio
const SLOT_STEP_MIN = 30;      // los turnos arrancan en multiplos de 30 minutos
const MAX_DAYS_AHEAD = 90;     // no se reserva mas alla de 90 dias
const HOLD_HOURS = 24;         // una pre-reserva sin sena se libera a las 24 h
const MAX_PENDING_PER_PERSON = 3;
const MAX_BOOKINGS_PER_HOUR = 8;
const MIN_FILL_SECONDS = 5;
// =========================================================

const COL = { CREADO: 0, NOMBRE: 1, APELLIDO: 2, EMAIL: 3, TEL: 4, PRIMERA: 5, FECHA: 6, HORA: 7,
              COMENT: 8, SERVICIO: 9, ESTADO: 10 };

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------- GET
function doGet(e) {
  const action = e && e.parameter && e.parameter.action;
  if (action === "schedule") return json_(getScheduleConfig_());
  const today = todayKey_();
  const list = getBookings_()
    .filter(b => b.key >= today)
    .map(b => b.dateDisplay + "|" + b.timeDisplay + "|" + (b.service || "sesion90"));
  return json_(list);
}

// ---------------------------------------------------------------- POST
function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return json_({ ok: false, result: "error", reason: "busy" });
  try {
    let data;
    try { data = JSON.parse(e.postData.contents); }
    catch (_) { return json_({ ok: false, result: "error", reason: "invalid" }); }
    if (!data || typeof data !== "object") return json_({ ok: false, result: "error", reason: "invalid" });

    // 1) Anti-bots: campo trampa lleno o formulario completado demasiado rapido.
    //    Se responde "ok" para no darle pistas al bot, pero no se escribe nada.
    if (String(data.website || "") !== "" ||
        (data.elapsed !== undefined && Number(data.elapsed) < MIN_FILL_SECONDS)) {
      return json_({ ok: true, result: "success" });
    }

    // 2) Validacion y limpieza.
    const c = validate_(data);
    if (!c) return json_({ ok: false, result: "error", reason: "invalid" });

    // 3) Tope global por hora (frena un ataque y protege la cuota de emails).
    const cache = CacheService.getScriptCache();
    const hourKey = "h_" + Utilities.formatDate(new Date(), TZ, "yyyyMMddHH");
    const hourCount = Number(cache.get(hourKey) || 0);
    if (hourCount >= MAX_BOOKINGS_PER_HOUR) return json_({ ok: false, result: "error", reason: "rate" });

    // 4) Horario de atencion (solo si esta activado el modo estricto).
    if (ENFORCE_SCHEDULE && !fitsSchedule_(c.key, c.startMin, c.duration)) {
      return json_({ ok: false, result: "error", reason: "closed" });
    }

    // 5) Que no se superponga con otro turno y limite de pre-reservas por persona.
    const bookings = getBookings_();
    if (overlaps_(bookings, c.key, c.startMin, c.duration)) {
      return json_({ ok: false, result: "error", reason: "taken" });
    }
    const mine = bookings.filter(b => b.pending &&
      ((c.email && b.email === c.email) || (digits_(c.phone) && digits_(b.tel) === digits_(c.phone))));
    if (mine.length >= MAX_PENDING_PER_PERSON) return json_({ ok: false, result: "error", reason: "limit" });

    // 6) Guardar la fila (texto plano, sin formulas) y avisar por email.
    const sheet = getSheet_();
    sheet.appendRow([
      new Date(), safeCell_(c.firstName), safeCell_(c.lastName), safeCell_(c.email), c.phoneCell,
      c.firstTime, c.dateRaw, c.time, safeCell_(c.comments), c.service, "pendiente"
    ]);
    SpreadsheetApp.flush();
    cache.put(hourKey, String(hourCount + 1), 3600);

    sendEmails_(c);
    return json_({ ok: true, result: "success" });
  } catch (err) {
    console.error("Error general:", err.toString());
    return json_({ ok: false, result: "error", reason: "server" });
  } finally {
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------- Validacion
function validate_(d) {
  const str = (v, max) => String(v == null ? "" : v).trim().slice(0, max);
  const out = {
    firstName: str(d.firstName, 50), lastName: str(d.lastName, 50),
    email: str(d.email, 100).toLowerCase(), phone: str(d.phone, 25),
    firstTime: String(d.firstTime || "").toLowerCase() === "no" ? "no" : "si",
    comments: str(d.comments, 500), service: str(d.service, 20), time: str(d.time, 5)
  };
  if (!out.firstName || !out.lastName) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(out.email)) return null;
  const nd = digits_(out.phone).length;
  if (nd < 8 || nd > 15) return null;
  out.phoneCell = out.phone.replace(/^[+\-=@]+/, ""); // evita que "+54..." se lea como formula
  out.duration = SERVICES[out.service] || DEFAULT_DURATION;

  const dt = parseDate_(d.date);
  if (!dt) return null;
  const startMin = parseTime_(out.time);
  if (startMin == null || startMin >= 1440) return null;
  const when = new Date(dt.key + "T" + pad_(Math.floor(startMin / 60)) + ":" + pad_(startMin % 60) + ":00-03:00");
  if (isNaN(when.getTime())) return null;
  const now = Date.now();
  if (when.getTime() < now) return null;                              // ya paso
  if (when.getTime() > now + MAX_DAYS_AHEAD * 86400000) return null;  // demasiado lejos

  out.key = dt.key;
  out.dateRaw = dt.display;
  out.startMin = startMin;
  out.time = pad_(Math.floor(startMin / 60)) + ":" + pad_(startMin % 60);
  return out;
}

// ---------------------------------------------------------------- Horarios
function fitsSchedule_(key, startMin, duration) {
  if (startMin % SLOT_STEP_MIN !== 0) return false;
  return rangesFor_(key).some(r => startMin >= r.from && startMin + duration <= r.to);
}

function rangesFor_(key) {
  const cfg = readSchedule_();
  const ex = cfg.exceptions.filter(x => x.key === key);
  if (ex.length) return ex.filter(x => !x.closed).map(x => ({ from: x.from, to: x.to }));
  const dow = dowOf_(key);
  return cfg.weekly.filter(w => w.dow === dow).map(w => ({ from: w.from, to: w.to }));
}

function getScheduleConfig_() {
  const cfg = readSchedule_();
  return {
    configured: cfg.configured, tz: TZ, step: SLOT_STEP_MIN, maxDaysAhead: MAX_DAYS_AHEAD,
    weekly: cfg.weekly,
    exceptions: cfg.exceptions.map(x => ({ date: x.key, closed: x.closed, from: x.from, to: x.to }))
  };
}

function readSchedule_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const wsW = ss.getSheetByName(SHEET_WEEKLY);
  const wsE = ss.getSheetByName(SHEET_EXCEPTIONS);
  const weekly = [], exceptions = [];
  const DAYS = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 };

  if (wsW) {
    wsW.getDataRange().getDisplayValues().slice(1).forEach(r => {
      const dow = DAYS[noAccents_(r[0])];
      const from = parseTime_(r[1]), to = parseTime_(r[2], true);
      if (dow !== undefined && from != null && to != null && to > from) weekly.push({ dow: dow, from: from, to: to });
    });
  }
  if (wsE) {
    wsE.getDataRange().getDisplayValues().slice(1).forEach(r => {
      const dt = parseDate_(r[0]);
      if (!dt) return;
      const closed = noAccents_(r[1]) === "cerrado";
      const from = parseTime_(r[2]), to = parseTime_(r[3], true);
      if (closed) exceptions.push({ key: dt.key, closed: true, from: 0, to: 0 });
      else if (from != null && to != null && to > from) exceptions.push({ key: dt.key, closed: false, from: from, to: to });
    });
  }
  return { configured: !!(wsW && wsE), weekly: weekly, exceptions: exceptions };
}

// ---------------------------------------------------------------- Reservas
function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
}

// Turnos que ocupan agenda: no cancelados y, si estan "pendiente", dentro de la retencion.
function getBookings_() {
  const range = getSheet_().getDataRange();
  const raw = range.getValues();
  const disp = range.getDisplayValues();
  const out = [];
  for (let i = 1; i < disp.length; i++) {
    const r = disp[i];
    const dt = parseDate_(r[COL.FECHA]);
    const start = parseTime_(r[COL.HORA]);
    if (!dt || start == null) continue;
    const estado = String(r[COL.ESTADO] || "").trim().toLowerCase();
    if (estado === "cancelado") continue;
    const pending = estado === "pendiente";
    if (pending) {
      const created = raw[i][COL.CREADO];
      if (created instanceof Date && Date.now() - created.getTime() > HOLD_HOURS * 3600000) continue;
    }
    const service = String(r[COL.SERVICIO] || "").trim();
    out.push({
      key: dt.key, dateDisplay: dt.display, start: start,
      timeDisplay: pad_(Math.floor(start / 60)) + ":" + pad_(start % 60),
      service: service, duration: SERVICES[service] || DEFAULT_DURATION,
      pending: pending, email: String(r[COL.EMAIL] || "").toLowerCase(), tel: r[COL.TEL]
    });
  }
  return out;
}

function overlaps_(bookings, key, startMin, duration) {
  return bookings.some(b => b.key === key && b.start < startMin + duration && startMin < b.start + b.duration);
}

// ---------------------------------------------------------------- Utilidades
function pad_(n) { return ("0" + n).slice(-2); }
function digits_(s) { return String(s == null ? "" : s).replace(/\D/g, ""); }
function noAccents_(s) {
  return String(s == null ? "" : s).trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}
function todayKey_() { return Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd"); }

// "d/m/aaaa" o "aaaa-mm-dd" -> { key: "aaaa-mm-dd", display: "d/m/aaaa" }
function parseDate_(v) {
  const s = String(v == null ? "" : v).trim();
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return { key: m[3] + "-" + pad_(m[2]) + "-" + pad_(m[1]), display: Number(m[1]) + "/" + Number(m[2]) + "/" + m[3] };
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return { key: s, display: Number(m[3]) + "/" + Number(m[2]) + "/" + m[1] };
  return null;
}

// "8:30", "08:30", "21:00:00" -> minutos desde las 00:00. Con allow24, "24:00" = 1440.
function parseTime_(v, allow24) {
  const m = String(v == null ? "" : v).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  if (mi > 59) return null;
  if (h === 24 && mi === 0 && allow24) return 1440;
  if (h > 23) return null;
  return h * 60 + mi;
}

function dowOf_(key) { // 0 = domingo
  const d = new Date(key + "T12:00:00-03:00");
  return Number(Utilities.formatDate(d, TZ, "u")) % 7;
}

// Evita que un texto del visitante se interprete como formula en Sheets.
function safeCell_(v) {
  const s = String(v == null ? "" : v);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function escapeHtml_(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, ch =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

// ---------------------------------------------------------------- Emails
function sendEmails_(c) {
  let quota = 0;
  try { quota = MailApp.getRemainingDailyQuota(); } catch (_) {}
  console.log("Cuota de emails restante:", quota);

  const fecha = escapeHtml_(c.dateRaw), hora = escapeHtml_(c.time);
  const nombre = escapeHtml_(c.firstName), apellido = escapeHtml_(c.lastName);

  // Mail al administrador
  try {
    MailApp.sendEmail({
      to: ADMIN_EMAIL,
      subject: "NUEVA RESERVA: " + c.firstName + " " + c.lastName,
      body: "Nueva reserva para el " + c.dateRaw + " a las " + c.time + ". Cliente: " + c.firstName + ".\nTel: " + c.phone,
      htmlBody: '<div style="font-family: sans-serif; color: #333;">' +
        '<h2 style="color: #7A694A;">Nueva Solicitud de Turno</h2>' +
        "<p><strong>Cliente:</strong> " + nombre + " " + apellido + "</p>" +
        "<p><strong>Fecha y Hora:</strong> " + fecha + " a las " + hora + "</p>" +
        "<p><strong>WhatsApp:</strong> " + escapeHtml_(c.phone) + "</p>" +
        "<p><strong>Servicio:</strong> " + escapeHtml_(c.service || "No especificado") + "</p>" +
        "<p><strong>Comentarios:</strong> " + escapeHtml_(c.comments || "Ninguno") + "</p>" +
        "<hr><p>Esperando comprobante de transferencia al alias <b>bell.studio</b></p></div>"
    });
  } catch (mailError) {
    console.error("Error enviando email a admin:", mailError.toString());
  }

  // Mail al cliente
  try {
    MailApp.sendEmail({
      to: c.email,
      subject: "Tu pre-reserva en Bell Studio",
      body: "Hola " + c.firstName + ", recibimos tu solicitud para el día " + c.dateRaw + " a las " + c.time +
            ". Por favor envía el comprobante por WhatsApp.",
      htmlBody: '<div style="font-family: sans-serif; color: #333;">' +
        "<h2>Hola " + nombre + ",</h2>" +
        "<p>Recibimos tu solicitud para el día <strong>" + fecha + " a las " + hora + "</strong>.</p>" +
        "<p>Tu lugar está reservado temporalmente. Para confirmarlo, por favor realizá la transferencia " +
        "de la seña al alias: <b>bell.studio</b> y envianos el comprobante por WhatsApp.</p>" +
        "<p>Atte,<br>Marcelo - Bell Studio</p></div>"
    });
  } catch (mailError) {
    console.error("Error enviando email a cliente:", mailError.toString());
  }
}

// Funcion de prueba - ejecutar manualmente para verificar permisos
function testEmail() {
  console.log("Cuota disponible:", MailApp.getRemainingDailyQuota());
  MailApp.sendEmail({
    to: ADMIN_EMAIL,
    subject: "Test desde Bell Studio Script",
    body: "Este es un email de prueba para verificar que MailApp funciona correctamente."
  });
  console.log("Email de prueba enviado!");
}

// Prueba sin efectos: muestra en el registro como se leen las reservas y los horarios.
function selfTest() {
  console.log("Reservas leidas:", getBookings_().length);
  console.log("Horarios:", JSON.stringify(getScheduleConfig_()));
}
