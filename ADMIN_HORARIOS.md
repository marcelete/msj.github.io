# Administrar horarios del turnero (Bell Studio)

Los horarios de atención NO están en el código: se leen de la planilla "Reservas Bell Studio" (Google Sheets). Para cambiarlos solo se edita la planilla; el turnero los toma en el siguiente refresco (hasta ~1 minuto por la caché).

## Reglas generales

- No renombrar la pestaña "Hoja 1" (es donde se guardan las reservas).
- Horas y fechas se escriben como TEXTO: poner un apóstrofe adelante al tipear (por ejemplo '10:00) para que Sheets no las convierta en fecha/hora.
- Hora: hh:mm en formato 24 h. "24:00" significa medianoche (fin del día).
- Fecha: d/m/aaaa (por ejemplo 6/11/2026).
- Los turnos se ofrecen cada 30 minutos y tienen que terminar dentro del rango abierto (un masaje de 90 min no puede empezar a las 22:45 si cierra a las 24:00).
- Si la planilla no se puede leer o está mal configurada, el turnero no ofrece horarios (falla cerrado: es a propósito).

## Pestaña "Horario semanal"

Una fila por rango. Columnas: día de la semana, desde, hasta. Un día puede tener varias filas (por ejemplo lunes 10:00–11:30 y 20:00–24:00). Un día sin filas está cerrado.

Horario base vigente al 5/11/2026: lunes 10:00–11:30 y 20:00–24:00; miércoles 18:30–24:00; martes y jueves cerrado.

## Pestaña "Excepciones"

Una excepción para una fecha REEMPLAZA al horario semanal de ese día. Columnas: fecha, tipo (abierto o cerrado), desde, hasta. Para "cerrado" se dejan desde/hasta vacíos. Para varios rangos el mismo día, una fila por rango.

Fines de semana libres (alternan común / largo):

- Fin de semana común libre: viernes 18:30–24:00, sábado 8:00–24:00, domingo 8:00–24:00, lunes 8:00–11:30.
- Fin de semana largo o feriado libre: 8:00–24:00 todos los días del fin de semana.
- Cargados hoy: 6 al 9/11/2026 (común). Hay que agregar los siguientes fines de semana libres a medida que se conozcan las fechas.

## Reservas (pestaña "Hoja 1")

- Columna J: servicio. Columna K: estado (pendiente / confirmado / cancelado).
- Una reserva nueva queda "pendiente" y vence a las 24 h si no se confirma la seña.
- Para confirmarla: escribir "confirmado" en la columna K. Para liberar el horario: "cancelado".
- Filas viejas con K vacía se consideran confirmadas. Filas sin servicio ocupan 90 min.

## Backend

El código está en apps-script/Codigo.gs (publicado como v8). Si se modifica hay que publicarlo desde Apps Script como "Nueva versión" de la implementación existente (una implementación nueva cambia la URL y rompe el turnero). Después de cualquier cambio, actualizar los .md (ver CLAUDE.md).
