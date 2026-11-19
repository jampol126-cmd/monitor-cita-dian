// Envío de mensajes y fotos a Telegram usando la Bot API (sin dependencias).
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function configurado() {
  return Boolean(TOKEN && CHAT_ID);
}

async function llamar(metodo, cuerpo) {
  if (!configurado()) {
    console.log(`[telegram desactivado] ${metodo}`);
    return null;
  }
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${metodo}`, { method: 'POST', body: cuerpo });
  const json = await res.json().catch(() => ({}));
  if (!json.ok) console.error(`Telegram ${metodo} falló: ${res.status} ${json.description || ''}`);
  return json;
}

async function enviarMensaje(texto) {
  const form = new FormData();
  form.append('chat_id', CHAT_ID || '');
  form.append('text', texto.slice(0, 4000));
  form.append('disable_web_page_preview', 'true');
  return llamar('sendMessage', form);
}

async function enviarFoto(buffer, leyenda = '') {
  const form = new FormData();
  form.append('chat_id', CHAT_ID || '');
  form.append('caption', leyenda.slice(0, 1000));
  form.append('photo', new Blob([buffer], { type: 'image/png' }), 'captura.png');
  return llamar('sendPhoto', form);
}

module.exports = { enviarMensaje, enviarFoto, configurado };
