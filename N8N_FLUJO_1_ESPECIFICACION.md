# 🔧 FLUJO #1: Sistema de Reservas - Especificación Técnica

**Nombre del Flujo**: `Booking - Recibir Reserva`  
**URL del Webhook**: `https://belliziawellness.app.n8n.cloud/webhook/booking-reserva`  
**Método HTTP**: POST + GET (para check-availability)

---

## 📋 FLUJO COMPLETO (Con pasos exactos)

### TRIGGER: HTTP Webhook

1. Ve a **n8n → Create New Workflow**
2. Busca **"HTTP Request"** en el panel izquierdo
3. Click en **"Webhook"** (NOT HTTP Request, es WEBHOOK)
4. En el nodo, configura:
   - **Method**: `POST, GET`
   - **Path**: `/booking-reserva`
   - **Authentication**: Leave blank
   - **Authenticate Webhook**: No (desactivado)

**Output esperado**: Recibir JSON con datos del formulario

---

## 🔀 PASO 1: Validar solicitud

1. Agregar nodo **"If"** (Conditional)
2. Configura:
   - **Condition**: `Request Query String` → `action` → `equals` → `"check-availability"`
3. **When true**: Continuar a PASO 2A (obtener disponibilidad)
4. **When false**: Continuar a PASO 3 (procesar reserva)

---

## 📅 PASO 2A: Validar disponibilidad (rama GET)

### 2A.1 - Consultar Google Calendar

1. Agregar nodo **"Google Calendar"**
   - **Credential**: `Google-Calendar-Personal` (que creaste antes)
   - **Resource**: `Event`
   - **Operation**: `Get All`
   - **Calendar ID**: `6028e7e14bb7a4abddf9d61ccdeb4170d67b330aaacb055332cb2385f45908f2@group.calendar.google.com`
   - **Time Min**: `{{ $now.toISOString() }}` (hoy)
   - **Time Max**: `{{ $now.add(3, 'months').toISOString() }}` (próximos 3 meses)

**Output**: Array de eventos ocupados

### 2A.2 - Transformar a formato simple

1. Agregar nodo **"Set"** (Variables)
   - Nombre: `Occupied Slots`
   - **Assignment**:
     ```javascript
     {{
       $json.events.map(e => ({
         date: e.start.dateTime.split('T')[0],
         time: e.start.dateTime.split('T')[1].substring(0, 5)
       }))
     }}
     ```

### 2A.3 - Responder con disponibilidad

1. Agregar nodo **"Respond to Webhook"**
   - **Status Code**: `200`
   - **Body**:
     ```json
     {
       "occupiedSlots": {{ $json.occupied_slots }},
       "message": "Disponibilidad actualizada"
     }
     ```

---

## 💾 PASO 3: Procesar Reserva (rama POST)

### 3.1 - Validar que no esté duplicada

1. Agregar nodo **"Supabase"**
   - **Credential**: `Supabase-BellStudio` (que creaste antes)
   - **Method**: `SELECT`
   - **Table**: `reservas`
   - **Where**: 
     ```
     email = '{{ $json.email }}' AND 
     fecha_reserva = '{{ $json.date }}' AND 
     hora_reserva = '{{ $json.time }}'
     ```

### 3.2 - Validar Google Calendar (doble check)

1. Agregar nodo **"Google Calendar"** 
   - **Operation**: `Get All`
   - **Time Min**: Parsear `$json.date` + `$json.time`
   - Buscar si hay conflicto

### 3.3 - Condicional: ¿Disponible?

1. Agregar nodo **"If"**
   - **Condition**: Length de resultados de 3.1 y 3.2 = 0
   - **When true**: Continuar a 3.4 (guardar)
   - **When false**: Ir a ERROR (responder no disponible)

### 3.4 - Guardar en Supabase

1. Agregar nodo **"Supabase"**
   - **Method**: `INSERT`
   - **Table**: `reservas`
   - **Fields**:
     ```json
     {
       "nombre": "{{ $json.firstName }} {{ $json.lastName }}",
       "email": "{{ $json.email }}",
       "telefono": "{{ $json.phone }}",
       "fecha_reserva": "{{ $json.date }}",
       "hora_reserva": "{{ $json.time }}",
       "servicio": "{{ $json.service }}",
       "estado": "confirmada"
     }
     ```

**Guardar el output en variable**:
- Nombre: `reservation_id` = `$json.id` (UUID de Supabase)

### 3.5 - Crear evento en Google Calendar

1. Agregar nodo **"Google Calendar"**
   - **Operation**: `Create`
   - **Calendar ID**: `6028e7e14bb7a4abddf9d61ccdeb4170d67b330aaacb055332cb2385f45908f2@group.calendar.google.com`
   - **Summary**: `Turno Bell Studio: {{ $json.service }}`
   - **Description**: 
     ```
     Cliente: {{ $json.firstName }} {{ $json.lastName }}
     Email: {{ $json.email }}
     Teléfono: {{ $json.phone }}
     Servicio: {{ $json.service }}
     Primera vez: {{ $json.firstTime }}
     Comentarios: {{ $json.comments }}
     ```
   - **Start**: Parsear fecha y hora
   - **End**: +90 minutos (o según servicio)
   - **Guests**: `{{ $json.email }}`

**Guardar en variable**: `google_calendar_event_id`

### 3.6 - Actualizar Supabase con Google Calendar ID

1. Agregar nodo **"Supabase"**
   - **Method**: `UPDATE`
   - **Table**: `reservas`
   - **Where**: `id = '{{ reservation_id }}'`
   - **Fields**: `google_calendar_event_id = '{{ google_calendar_event_id }}'`

### 3.7 - Enviar Email al Cliente

1. Agregar nodo **"Gmail"**
   - **Credential**: `Google-Personal` (Gmail)
   - **To**: `{{ $json.email }}`
   - **Subject**: `¡Reserva Confirmada! Bell Studio - {{ $json.date }}`
   - **Body HTML**:
     ```html
     <h2>¡Tu reserva está registrada!</h2>
     <p>Hola {{ $json.firstName }},</p>
     
     <h3>Detalles de tu turno:</h3>
     <ul>
       <li><strong>Servicio:</strong> {{ $json.service }}</li>
       <li><strong>Fecha:</strong> {{ $json.date }}</li>
       <li><strong>Hora:</strong> {{ $json.time }}</li>
     </ul>
     
     <h3>Pasos siguientes:</h3>
     <ol>
       <li>Transferí el 50% de la seña al alias: <strong>bell.studio</strong></li>
       <li>Enviame el comprobante por WhatsApp</li>
       <li>¡Tu turno queda asegurado!</li>
     </ol>
     
     <p>Cualquier duda, contactame por WhatsApp: +54 9 1165118935</p>
     <p>Saludos,<br>Marcelo Bellizia<br>Bell Studio</p>
     ```

### 3.8 - Enviar Email a Masajista

1. Agregar nodo **"Gmail"**
   - **To**: `bellizia.wellness.studio@gmail.com` (usar variable o hardcoded)
   - **Subject**: `🔔 Nueva Reserva - {{ $json.firstName }} - {{ $json.date }}`
   - **Body HTML**:
     ```html
     <h2>Nueva Reserva Registrada</h2>
     <p><strong>Cliente:</strong> {{ $json.firstName }} {{ $json.lastName }}</p>
     <p><strong>Email:</strong> {{ $json.email }}</p>
     <p><strong>Teléfono:</strong> {{ $json.phone }}</p>
     <p><strong>Servicio:</strong> {{ $json.service }}</p>
     <p><strong>Fecha:</strong> {{ $json.date }} - {{ $json.time }}</p>
     <p><strong>Primera vez:</strong> {{ $json.firstTime }}</p>
     <p><strong>Comentarios:</strong> {{ $json.comments }}</p>
     ```

### 3.9 - Responder al webhook (SUCCESS)

1. Agregar nodo **"Respond to Webhook"**
   - **Status Code**: `200`
   - **Body**:
     ```json
     {
       "success": true,
       "message": "Reserva confirmada",
       "reservation_id": "{{ reservation_id }}",
       "deposit_amount": "Según servicio"
     }
     ```

---

## ❌ RAMA ERROR: No disponible

1. Agregar nodo **"Respond to Webhook"** (en la rama FALSE del Step 3.3)
   - **Status Code**: `409` (Conflict)
   - **Body**:
     ```json
     {
       "success": false,
       "message": "Este horario no está disponible. Por favor selecciona otro.",
       "error_code": "SLOT_UNAVAILABLE"
     }
     ```

---

## 📊 DIAGRAMA DEL FLUJO

```
┌─ Webhook (POST/GET)
│
├─ If: action == "check-availability"?
│
├─ TRUE → Google Calendar (Get All)
│        └─ Set (Transform)
│        └─ Respond (occupiedSlots)
│
└─ FALSE → Supabase (Check duplicates)
         └─ Google Calendar (Check conflicts)
         └─ If: Available?
            ├─ TRUE → Supabase (INSERT)
            │       └─ Google Calendar (CREATE EVENT)
            │       └─ Supabase (UPDATE calendar_id)
            │       └─ Gmail (Customer)
            │       └─ Gmail (Massage Therapist)
            │       └─ Respond (SUCCESS)
            │
            └─ FALSE → Respond (ERROR: Not available)
```

---

## 🔑 CREDENCIALES NECESARIAS EN N8N

**Antes de crear el flujo, asegúrate de que existan:**

- ✅ **Google-Calendar-Personal**: Google Calendar API (ya conectado)
- ✅ **Google-Personal**: Gmail (para enviar emails)
- ✅ **Supabase-BellStudio**: Supabase (ya conectado)

**Si alguna falta**: Ve a **Credentials** → **New Credential** → Configura

---

## 🧪 TESTING DEL FLUJO

### Test 1: Check Availability (GET)
```bash
curl -X GET "https://belliziawellness.app.n8n.cloud/webhook/booking-reserva?action=check-availability"
```

### Test 2: Crear Reserva (POST)
```bash
curl -X POST https://belliziawellness.app.n8n.cloud/webhook/booking-reserva \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Juan",
    "lastName": "García",
    "email": "juan@example.com",
    "phone": "+54 9 1123456789",
    "firstTime": "si",
    "comments": "Tengo dolor de espalda",
    "date": "2026-05-30",
    "time": "19:00",
    "service": "sesion90",
    "lang": "es"
  }'
```

**Respuesta esperada**:
```json
{
  "success": true,
  "message": "Reserva confirmada",
  "reservation_id": "uuid-aqui",
  "deposit_amount": "35000"
}
```

---

## 📝 NOTAS IMPORTANTES

1. **Variables en n8n**: Usa `{{ $json.field }}` para acceder a datos POST
2. **Timestamps**: Google Calendar usa ISO8601, Supabase usa DATE/TIME
3. **Zona horaria**: Argentina es UTC-3 (actualizar si es necesario)
4. **Gmail**: Primero conecta tu Gmail a n8n (OAuth)
5. **Testing**: Cada nodo tiene botón "Test" - úsalo para verificar

---

**Última actualización**: 26-05-2026  
**Estado**: Listo para implementación
