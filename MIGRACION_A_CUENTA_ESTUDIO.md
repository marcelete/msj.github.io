# 🔄 Guía de Migración a Cuenta del Estudio

**De**: Cuenta personal (marcelete)  
**A**: Cuenta del estudio (bellizia.wellness.studio@gmail.com)

---

## ⏱️ RESUMEN RÁPIDO

Cuando el sistema esté listo en tu cuenta personal y quieras migrar:

1. **n8n**: Crear nuevas credenciales con email del estudio
2. **Supabase**: Cambiar credenciales (o crear proyecto nuevo)
3. **Google Calendar**: Usar el calendar del estudio
4. **Gmail**: Apuntar a bellizia.wellness.studio@gmail.com
5. **GitHub**: Actualizar URLs en turnero.html

**Tiempo estimado**: 1-2 horas

---

## 🔐 FASE 1: Preparar credenciales en cuenta del estudio

### 1.1 - Google Calendar (Estudio)

**En Google Account de bellizia.wellness.studio@gmail.com**:

1. Ve a https://calendar.google.com
2. Crea nuevo calendario: `Bell Studio - Turnos`
3. Obtén el Calendar ID:
   - Settings → Integrations → Calendar ID (copiar)
   - Formato: `xxxxxxxx@group.calendar.google.com`
4. **Guarda este ID**: Lo usarás en n8n

### 1.2 - Supabase (Estudio)

**Opciones**:

**A. Usar mismo proyecto** (más fácil):
- Solo cambiar credenciales en n8n
- Los datos permanecen igual
- Ideal si no hay conflictos

**B. Crear proyecto nuevo**:
1. Crea cuenta en https://supabase.com con bellizia.wellness.studio@gmail.com
2. Crea nuevo proyecto
3. Copia tablas del proyecto actual (exportar SQL)
4. Obtén nuevas credenciales:
   - Project URL
   - Anon Key

---

## 🔧 FASE 2: Actualizar n8n

### 2.1 - Crear credencial Google Calendar (Estudio)

**En n8n**:

1. Ve a **Credentials** → **New Credential**
2. Tipo: **Google Calendar**
3. Autoriza con bellizia.wellness.studio@gmail.com
4. Nombre: `Google-Calendar-Studio`
5. Save

### 2.2 - Crear credencial Gmail (Estudio)

**En n8n**:

1. Ve a **Credentials** → **New Credential**
2. Tipo: **Gmail**
3. Autoriza con bellizia.wellness.studio@gmail.com
4. Nombre: `Gmail-Studio`
5. Save

### 2.3 - Crear credencial Supabase (si nuevo proyecto)

**En n8n**:

1. Ve a **Credentials** → **New Credential**
2. Tipo: **Supabase**
3. Rellena:
   - **URL**: Tu nueva URL
   - **API Key**: Tu nueva Anon Key
4. Nombre: `Supabase-BellStudio-Studio`
5. Save

### 2.4 - Actualizar Flujo #1 en n8n

**En el workflow de booking**:

1. **Google Calendar node** (check availability):
   - Cambiar credencial a `Google-Calendar-Studio`
   - Cambiar Calendar ID al nuevo

2. **Google Calendar node** (create event):
   - Cambiar credencial a `Google-Calendar-Studio`
   - Cambiar Calendar ID al nuevo

3. **Gmail node** (customer email):
   - Cambiar credencial a `Gmail-Studio`
   - Cambiar dirección de envío si es necesario

4. **Gmail node** (massage therapist notification):
   - Cambiar credencial a `Gmail-Studio`
   - **Cambiar To**: de `bellizia.wellness.studio@gmail.com` a tu correo (o dejar igual si tienes email forwarding)

5. **Save & Activate** el workflow

---

## 📝 FASE 3: Actualizar código GitHub

**En turnero.html**, estos valores ya están parametrizados:

```javascript
const N8N_WEBHOOK_URL = 'https://belliziawellness.app.n8n.cloud/webhook/booking-reserva';
```

Si cambian:
1. Actualiza esta URL en turnero.html
2. Commit y push

---

## 📧 FASE 4: Actualizar Email del Estudio

Si creas proyecto Supabase nuevo o necesitas cambiar el email que recibe notificaciones:

**En N8N_FLUJO_1_ESPECIFICACION.md, Paso 3.8**:

Busca:
```javascript
"To": "bellizia.wellness.studio@gmail.com"
```

Y cámbialo a tu correo preferido si es distinto.

---

## ✅ CHECKLIST DE MIGRACIÓN

- [ ] Crear Calendar en cuenta del estudio (obtener ID)
- [ ] Crear credencial Google Calendar en n8n
- [ ] Crear credencial Gmail en n8n
- [ ] Crear/migrar proyecto Supabase si es necesario
- [ ] Crear credencial Supabase en n8n
- [ ] Actualizar todos los nodos del Flujo #1 en n8n
- [ ] Activar y testar el workflow
- [ ] Verificar que emails se envíen desde bellizia.wellness.studio@gmail.com
- [ ] Confirmar que el Google Calendar del estudio recibe eventos
- [ ] Actualizar URLs en GitHub si cambió n8n

---

## 🧪 TEST POST-MIGRACIÓN

1. **Hacer una reserva** desde turnero.html
2. **Verificar**:
   - ✅ Email de confirmación llega
   - ✅ Evento aparece en Google Calendar del estudio
   - ✅ Notificación llega al email del estudio
   - ✅ Datos guardados en Supabase

---

## 🆘 POSIBLES PROBLEMAS

### Problema: "Email not authorized"
**Solución**: Reconectar credencial Gmail en n8n

### Problema: "Calendar not found"
**Solución**: Copiar el Calendar ID correcto, sin espacios

### Problema: "API Key invalid"
**Solución**: Regenerar Anon Key en Supabase → Settings → API

### Problema: "Webhook not found"
**Solución**: Verificar que n8n URL sea correcta

---

## 📞 SOPORTE

Si algo falla durante la migración:
1. Revisa los logs de n8n
2. Verifica que todas las credenciales estén conectadas
3. Haz un test de cada nodo individualmente

---

**Documento creado**: 26-05-2026
