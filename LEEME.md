# Monitor de citas DIAN (devolución IVA vehículos eléctricos e híbridos)

Revisa cada 2-3 minutos el portal de agendamiento de la DIAN y te avisa por Telegram apenas
aparecen citas, con el link y tus datos listos para copiar. **No reserva solo:** la reserva
(que pide el captcha) la confirmas tú desde el celular en un minuto.

## Cómo sabe si hay citas
Recorre: Agendar cita > Persona natural > Siguiente > Videoatención > Devoluciones.
Cuando no hay cupos, el portal muestra *"No se encontraron especialidades relacionadas según los
filtros seleccionados"*. Si ese aviso no sale, te manda la alerta con una captura de la pantalla.

## Cuándo corre
- GitHub Actions lanza una tanda cada hora entre 6 a. m. y 8 p. m. (hora Colombia), lunes a sábado.
- Cada tanda dura ~5 h 40 min y consulta en ciclo. Solo corre una a la vez; la siguiente queda en
  cola y arranca apenas termina la anterior, así el retraso del cron de GitHub no deja huecos.
- Si hay cupo te avisa y te recuerda cada 10 min mientras siga habiendo.
- Cada mañana te avisa que el monitor está activo.

## Configuración (una sola vez)
1. En Telegram, habla con **@BotFather**, envía `/newbot` y guarda el token.
2. Escríbele cualquier cosa a tu bot nuevo (si no, no te puede escribir).
3. Abre en el navegador `https://api.telegram.org/bot<TOKEN>/getUpdates` y copia el número
   que aparece en `"chat":{"id": ...}`. Ese es tu chat_id.
4. En este repo: **Settings > Secrets and variables > Actions > New repository secret**:
   - `TELEGRAM_TOKEN`: el token del bot.
   - `TELEGRAM_CHAT_ID`: tu chat_id.
   - `DATOS_CITA` (opcional): datos que pide el formulario, para tenerlos a mano en el aviso.
5. Prueba: **Actions > Monitor citas DIAN > Run workflow** con modo `diagnostico`. Te llega a Telegram
   una foto de cada paso y el resultado.

Variables opcionales (pestaña *Variables*): `CIUDAD` (Medellín), `INTERVALO_SEG` (150),
`PASOS` (textos del recorrido separados por `|`; un `?` adelante lo vuelve opcional).

## Apagar
Cuando consigas la cita: **Actions > Monitor citas DIAN > ⋯ > Disable workflow**.

El repo es público para tener minutos ilimitados de Actions. Por eso los datos personales y el token
van solo en Secrets, nunca en el código. El workflow *Recordatorio citas DIAN* queda solo manual.
