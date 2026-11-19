// Recordatorio por Telegram para revisar citas DIAN (devolución IVA vehículos eléctricos/híbridos).
// No entra al portal: solo te manda el link y la ruta para que revises tú.
const tg = require('./telegram');

const URL_PORTAL = process.env.URL_PORTAL || 'https://agendamiento.dian.gov.co/';
const CIUDAD = process.env.CIUDAD || 'Medellín';
const DATOS_CITA = process.env.DATOS_CITA || '';

const hora = new Date().toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: 'numeric', minute: '2-digit' });

let m = `⏰ Revisa citas DIAN (${hora})\n\n${URL_PORTAL}\n\nRuta: Agendar cita > Persona natural > Videoatención > Devoluciones > vehículos eléctricos o híbridos > ${CIUDAD}`;
if (DATOS_CITA) m += `\n\nTus datos para copiar:\n${DATOS_CITA}`;
m += '\n\nCuando consigas la cita, apaga los avisos en GitHub: Actions > Recordatorio citas DIAN > Disable workflow.';

(async () => {
  if (!tg.configurado()) {
    // Sin Telegram configurado no se envía nada, y tampoco se marca error
    // (así GitHub no te manda correos de fallo cada hora).
    console.log('Faltan los secretos TELEGRAM_TOKEN y TELEGRAM_CHAT_ID. No envío nada.');
    return;
  }
  const r = await tg.enviarMensaje(m);
  if (!r || !r.ok) process.exit(1);
  console.log(`Recordatorio enviado (${hora}).`);
})();
