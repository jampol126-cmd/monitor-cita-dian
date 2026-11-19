// Muestra el chat_id de quien le escribió al bot. Uso: TELEGRAM_TOKEN=... node chat-id.js
(async () => {
  const r = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/getUpdates`).then((x) => x.json());
  const chats = new Map();
  for (const u of r.result || []) { const c = (u.message || u.channel_post || {}).chat; if (c) chats.set(c.id, c.first_name || c.title); }
  if (!chats.size) console.log('Escríbele cualquier cosa a tu bot en Telegram y vuelve a correr esto.');
  for (const [id, nombre] of chats) console.log(`${nombre}: ${id}`);
})();
