# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Static website for Bell Studio (masajes terapéuticos y entrenamiento, Argentina), served by GitHub Pages at `bellstudio.com.ar` (see `CNAME`). The site content and the docs are in Spanish (Argentine); keep user-facing text and commit messages in Spanish.

There is **no build system, package manager, linter or test suite**. Every page is a hand-written, self-contained HTML file with inline `<style>` and `<script>`. To preview, open the file in a browser or serve the folder (`python3 -m http.server`). Work happens directly on `main` (the owner's instruction); changes pushed to it are published directly by GitHub Pages.

## Files

- `index.html` – landing page (hero, services, about, contact). Multilanguage via `data-i18n` attributes plus an inline translations object and a language switcher. When adding visible text, add it to every language.
- `turnero.html` – the appointment booking flow (multi-step form, ~1300 lines). All logic is inline.
- `PENDIENTES_TURNERO.md` – detailed handoff notes on how the turnero works and the prioritized to-do list (read it before touching booking logic).
- `apps-script/Codigo.gs` – hardened *template* of the Apps Script backend (validation, locking, rate limits, expiring unpaid holds). It is not deployed from here; it must be pasted into the Google Apps Script project by hand. `SCHEDULE`/`HOLIDAYS`/`BLOCKED_DATES`/`SERVICES` there must mirror `turnero.html`.
- `SEO_Y_SEGURIDAD.md` – what SEO/security work exists and the owner's manual to-do list.
- `PENDIENTES.md` – step-by-step task list written for a browser agent (Claude in Chrome): Google Business Profile, Analytics, Search Console. `MARCA_Y_CRECIMIENTO.md` – brand and growth plan. Business data (address, hours, phone) lives in `PENDIENTES.md`; keep it in sync with `index.html`.
- `robots.txt`, `sitemap.xml` – update `sitemap.xml` when adding pages.
- `automation_plan.md` – aspirational plan (n8n + Supabase + WhatsApp); **not implemented**. The real backend is the Google Apps Script described below.
- `img/` – static images.

## Turnero architecture (`turnero.html`)

There is no own server. The page talks to a **Google Apps Script web app** (`GOOGLE_SCRIPT_URL`) attached to a Google Sheet. The Apps Script source is **not in this repo** (it lives in the Google account); changes to it must be made there and redeployed as a *new version of the existing deployment* (a new deployment changes the URL and breaks the page).

- `GET` → list of already booked slots, one string per slot (`fecha|hora`). The script may return either long JS date strings (`Sat Nov 07 2026 00:00:00 GMT-0300 …|…`) or short `7/11/2026|08:30`; `parseBookedDate`/`parseBookedTime`/`buildOccupancy` handle both and **fail closed** (offer no slots) on an unknown format.
- `POST` → creates the booking (sheet row + emails to owner and client), sent as plain text (no custom headers) so the JSON response (`{ok, reason}`) is readable; if the response can't be read, availability is re-fetched to detect whether the booking landed. Client-side abuse guards: honeypot `#website`, `MIN_FILL_SECONDS`, `MAX_BOOKINGS_PER_DAY` via localStorage — these are bypassable; real enforcement belongs in the Apps Script. Availability is re-fetched on day selection, tab focus, and right before confirming (`AVAILABILITY_MAX_AGE_MS`).
- Overlap logic: `isSlotTaken` accounts for the chosen service duration, but booked slots are assumed to last `BOOKED_SLOT_MINUTES` (90) because the GET does not return the service.
- All dates/times are interpreted in Buenos Aires time (`STUDIO_TZ`, fixed `-03:00` offset), regardless of the visitor's timezone.

Config constants near the top of the script: `SCHEDULE` (weekday slots Wed/Fri evenings, weekend slots mornings; holidays use the weekend schedule), `BLOCKED_DATES` (`'AAAA-MM-DD'`), `HOLIDAYS` (hardcoded for 2026 — must be extended for later years), `MIN_NOTICE_MINUTES`.

`index.html` links to `turnero.html` from several "Reservar/Agendar Turno" buttons, so keep that filename.

## Security / SEO conventions

- Both pages set a CSP via `<meta>` (GitHub Pages can't set headers). Any new external script/style/image/connect host must be added to that meta in every page or it will be blocked.
- Never put user-supplied text into `innerHTML`; use `textContent`.
- `index.html` carries JSON-LD (business + FAQ); keep the FAQ markup and JSON-LD in sync.
