# Monitor de citas DIAN (devolución IVA vehículos eléctricos e híbridos)

Revisa cada 2-3 minutos si hay citas en el portal de agendamiento de la DIAN para tu ciudad
y te avisa por Telegram con el link para reservar. **No reserva solo ni resuelve el captcha:**
la reserva la confirmas tú desde el celular.

## Cómo funciona
- GitHub Actions lanza una tanda cada hora entre 6 a. m. y 8 p. m. (hora Colombia), de lunes a sábado.
- Cada tanda dura ~5 h 40 min y consulta en ciclo cada 2-3 min. Solo corre una a la vez;
  la siguiente queda en cola y arranca apenas termina la anterior, así el retraso del cron no deja huecos.
- Si hay cupo, te llega un mensaje con la fecha, el link, la ruta en el portal y tus datos para copiar.
  Si sigue habiendo cupo, te recuerda cada 10 min.
- Cada mañana te avisa que el monitor está activo.

## Configuración (una sola vez)
1. En Telegram, habla con **@BotFather**, envía `/newbot` y guarda el token.
2. Escríbele cualquier cosa a tu bot nuevo.
3. Saca tu chat_id abriendo en el navegador `https://api.telegram.org/bot<TOKEN>/getUpdates`
   y buscando `"chat":{"id": ...}`.
4. En el repo: **Settings > Secrets and variables > Actions > New repository secret**:
   - `TELEGRAM_TOKEN`: el token del bot.
   - `TELEGRAM_CHAT_ID`: tu chat_id.
   - `DATOS_CITA` (opcional): los datos que pide el formulario, para tenerlos a mano en el aviso.
5. Variables opcionales (pestaña *Variables*): `CIUDAD` (por defecto Medellín), `INTERVALO_SEG` (por defecto 150),
   `PASOS` (textos del flujo separados por `|`, si la DIAN cambia el portal).

## Probar
**Actions > Monitor citas DIAN > Run workflow**, modo `diagnostico`: hace una sola consulta y te manda
a Telegram una foto de cada paso. Sirve para confirmar que el bot recorre bien el portal.

El repo es público para tener minutos ilimitados de Actions. Por eso los datos personales y el token
van solo en Secrets, nunca en el código.
