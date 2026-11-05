# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Static website for Bell Studio (masajes terapéuticos y entrenamiento, Argentina), served by GitHub Pages at `bellstudio.com.ar` (see `CNAME`). The site content and the docs are in Spanish (Argentine); keep user-facing text and commit messages in Spanish.

There is **no build system, package manager, linter or test suite**. Every page is a hand-written, self-contained HTML file with inline `<style>` and `<script>`. To preview, open the file in a browser or serve the folder (`python3 -m http.server`). Work happens directly on `main` (the owner's instruction); changes pushed to it are published directly by GitHub Pages.

## Files

- `index.html` – landing page (hero, services, about, contact). Multilanguage via `data-i18n` attributes plus an inline translations object and a language switcher. When adding visible text, add it to every language.
- `turnero.html` – the appointment booking flow (multi-step form, ~1300 lines). All logic is inline.
- `PENDIENTES_TURNERO.md` – detailed handoff notes on how the turnero works and the prioritized to-do list (read it before touching booking logic).
- `apps-script/Codigo.gs` – copia del Apps Script **publicado** (v2, versión 7 de la implementación): candado, validación, anti-bots, pre-reservas que vencen a las 24 h, y lectura de horarios desde la planilla. No se despliega desde acá: hay que pegarlo a mano en el proyecto de Apps Script y publicarlo como *nueva versión* de la implementación existente. Mantener esta copia igual a la publicada.
- `ADMIN_HORARIOS.md` – cómo cambiar horarios, fines de semana libres y feriados desde la planilla (sin tocar código).
- `SEO_Y_SEGURIDAD.md` – what SEO/security work exists and the owner's manual to-do list.
- `PENDIENTES.md` – step-by-step task list written for a browser agent (Claude in Chrome): Google Business Profile, Analytics, Search Console. `MARCA_Y_CRECIMIENTO.md` – brand and growth plan. Business data (address, hours, phone) lives in `PENDIENTES.md`; keep it in sync with `index.html`.
- `robots.txt`, `sitemap.xml` – update `sitemap.xml` when adding pages.
- `automation_plan.md` – aspirational plan (n8n + Supabase + WhatsApp); **not implemented**. The real backend is the Google Apps Script described below.
- `img/` – static images.

## Turnero architecture (`turnero.html`)

There is no own server. The page talks to a **Google Apps Script web app** (`GOOGLE_SCRIPT_URL`) attached to a Google Sheet. The Apps Script lives in the Google account (proyecto "Agendar y enviar comprobantes de turno de Bell Studio", planilla "Reservas Bell Studio"); `apps-script/Codigo.gs` es su copia. Los cambios se hacen allá y se vuelven a publicar como *nueva versión de la implementación existente* (una implementación nueva cambia la URL y rompe la página).

- `GET` → lista de turnos ocupados, un texto por turno (`7/11/2026|08:30|sesion90`: fecha, hora, código de servicio). `GET ?action=schedule` → horarios de atención en JSON (`weekly` y `exceptions`, en minutos desde las 00:00). `parseBookedDate`/`parseBookedTime`/`buildOccupancy` siguen aceptando los formatos viejos y **fallan cerrado** (no ofrecen turnos) ante un formato desconocido o si los horarios no se pueden leer.
- `POST` → creates the booking (sheet row + emails to owner and client), sent as plain text (no custom headers) so the JSON response (`{ok, reason}`) is readable; if the response can't be read, availability is re-fetched to detect whether the booking landed. Client-side abuse guards: honeypot `#website`, `MIN_FILL_SECONDS`, `MAX_BOOKINGS_PER_DAY` via localStorage — these are bypassable; real enforcement belongs in the Apps Script. Availability is re-fetched on day selection, tab focus, and right before confirming (`AVAILABILITY_MAX_AGE_MS`).
- Superposición: `isSlotTaken` usa la duración del servicio elegido y la duración real de cada turno tomado (`SERVICE_MINUTES`); los turnos viejos sin servicio se asumen de `BOOKED_SLOT_MINUTES` (90).
- All dates/times are interpreted in Buenos Aires time (`STUDIO_TZ`, fixed `-03:00` offset), regardless of the visitor's timezone.

Los horarios de atención **ya no están en el código**: salen de la planilla (pestañas `Horario semanal` y `Excepciones`, ver `ADMIN_HORARIOS.md`). Un turno puede empezar cada 30 minutos y tiene que terminar dentro del tramo. Constantes que quedan arriba del script: `SERVICE_MINUTES`, `MIN_NOTICE_MINUTES`, `BOOKED_SLOT_MINUTES`. Los feriados ya no se cargan en el código: se agregan en `Excepciones`.

`index.html` links to `turnero.html` from several "Reservar/Agendar Turno" buttons, so keep that filename.

## Security / SEO conventions

- Both pages set a CSP via `<meta>` (GitHub Pages can't set headers). Any new external script/style/image/connect host must be added to that meta in every page or it will be blocked.
- Never put user-supplied text into `innerHTML`; use `textContent`.
- `index.html` carries JSON-LD (business + FAQ); keep the FAQ markup and JSON-LD in sync.

## Regla de trabajo

Después de **cada cambio** (código del sitio, Apps Script, estructura de la planilla, horarios, textos de negocio) hay que actualizar los `.md` que lo describen: como mínimo `CLAUDE.md`, `PENDIENTES_TURNERO.md`, `SEO_Y_SEGURIDAD.md` y, si cambian datos del negocio, `PENDIENTES.md`; y dejar `apps-script/Codigo.gs` igual a lo publicado. Es una instrucción permanente del dueño.
