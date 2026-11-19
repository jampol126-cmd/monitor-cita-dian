# Recordatorios de citas DIAN (devolución IVA vehículos eléctricos e híbridos)

Te manda un mensaje por Telegram **cada hora, de 7 a. m. a 7 p. m., de lunes a sábado** (hora Colombia)
con el link del portal y la ruta exacta, para que revises desde el celular en un minuto.
La DIAN suelta las citas en varias franjas a lo largo del día, así que revisar seguido sube tus chances.

## Por qué no es un monitor automático
El portal de agendamiento pide el reCAPTCHA de "No soy un robot" apenas se pulsa "Agendar cita",
antes de mostrar servicios, ciudades o fechas. Un programa no puede ver la disponibilidad sin saltarse
ese captcha, y eso va contra la medida de la DIAN y puede bloquear tu cédula. Por eso el bot solo
te recuerda; la consulta y la reserva las haces tú.

## Configuración (una sola vez)
1. En Telegram, habla con **@BotFather**, envía `/newbot` y guarda el token.
2. Escríbele cualquier cosa a tu bot nuevo (si no, no te puede escribir).
3. Abre en el navegador `https://api.telegram.org/bot<TOKEN>/getUpdates` y copia el número
   que aparece en `"chat":{"id": ...}`. Ese es tu chat_id.
4. En este repo: **Settings > Secrets and variables > Actions > New repository secret**:
   - `TELEGRAM_TOKEN`: el token del bot.
   - `TELEGRAM_CHAT_ID`: tu chat_id.
   - `DATOS_CITA` (opcional): datos que pide el formulario, para tenerlos a mano en el aviso.
5. Prueba: **Actions > Recordatorio citas DIAN > Run workflow**. Te debe llegar el mensaje.

## Cambiar o apagar
- Horario: edita los `cron` en `.github/workflows/recordatorio.yml` (están en hora UTC = Colombia + 5).
- Apagar cuando consigas la cita: **Actions > Recordatorio citas DIAN > ⋯ > Disable workflow**.

## Otros archivos
`monitor.js` y el workflow *Monitor citas DIAN* quedaron del intento de monitor automático.
Están apagados (solo se corren a mano) y no se usan.
