// Monitor de disponibilidad de citas DIAN (devolución IVA vehículos eléctricos/híbridos).
// Solo CONSULTA disponibilidad y avisa por Telegram. No reserva ni resuelve captchas:
// la reserva la confirma la persona desde el link del aviso.
const { chromium } = require('playwright');
const tg = require('./telegram');

const URL_PORTAL = process.env.URL_PORTAL || 'https://agendamiento.dian.gov.co/';
const MODO = (process.env.MODO || 'monitor').toLowerCase(); // monitor | diagnostico
const DURACION_MIN = Number(process.env.DURACION_MIN || 340); // GitHub corta a los 360
const INTERVALO_SEG = Number(process.env.INTERVALO_SEG || 150);
const HORA_INICIO = Number(process.env.HORA_INICIO || 6); // hora Colombia
const HORA_FIN = Number(process.env.HORA_FIN || 21);
const CIUDAD = process.env.CIUDAD || 'Medellín';
const DATOS_CITA = process.env.DATOS_CITA || ''; // secreto: datos para copiar al reservar
const REAVISO_MIN = 10;

// Pasos del flujo, en orden. Cada uno es un texto (o regex) que se busca y se pulsa.
// Se pueden cambiar sin tocar el código con la variable PASOS (separados por "|").
const PASOS = (process.env.PASOS
  ? process.env.PASOS.split('|')
  : ['Agendar cita', 'Persona natural', 'Videoatención', 'Devoluciones', 'veh[ií]culos', CIUDAD]
).map((p) => p.trim()).filter(Boolean);

const SIN_CITAS = /no hay (citas|agenda|disponibilidad)|sin disponibilidad|no se encontr(ó|aron)|no existen? (citas|agenda)|no (tiene|cuenta con) disponibilidad|agotad/i;

function horaColombia(d = new Date()) {
  const p = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota', hour: 'numeric', weekday: 'short', hour12: false,
  }).formatToParts(d);
  return {
    hora: Number(p.find((x) => x.type === 'hour').value) % 24,
    domingo: /dom/i.test(p.find((x) => x.type === 'weekday').value),
  };
}

function enHorario() {
  const { hora, domingo } = horaColombia();
  return !domingo && hora >= HORA_INICIO && hora < HORA_FIN;
}

function ahora() {
  return new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

function aRegex(texto) {
  // Acepta regex escrita como texto; si no compila, busca el texto tal cual.
  try { return new RegExp(texto, 'i'); } catch { return new RegExp(texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); }
}

// Busca un elemento con ese texto y lo pulsa. Prueba botones, links, opciones de listas y texto suelto.
async function pulsar(page, texto) {
  const rx = aRegex(texto);

  // Listas desplegables nativas (<select>)
  for (const sel of await page.locator('select:visible').all()) {
    const opciones = await sel.locator('option').allTextContents();
    const op = opciones.find((o) => rx.test(o));
    if (op) { await sel.selectOption({ label: op.trim() }); return `lista: ${op.trim()}`; }
  }

  const candidatos = [
    page.getByRole('button', { name: rx }),
    page.getByRole('link', { name: rx }),
    page.getByRole('option', { name: rx }),
    page.getByRole('tab', { name: rx }),
    page.getByRole('radio', { name: rx }),
    page.getByText(rx),
  ];
  for (const loc of candidatos) {
    const n = await loc.count();
    for (let i = 0; i < n; i++) {
      const el = loc.nth(i);
      if (await el.isVisible().catch(() => false)) {
        await el.click({ timeout: 8000 });
        return (await el.innerText().catch(() => texto)).trim().slice(0, 60);
      }
    }
  }
  return null;
}

async function hayCaptchaVisible(page) {
  for (const f of page.frames()) {
    if (/recaptcha\/(api2|enterprise)\/bframe/.test(f.url())) {
      const el = await f.frameElement().catch(() => null);
      if (el && (await el.isVisible().catch(() => false))) return 'desafío';
    }
  }
  const casilla = page.locator('iframe[src*="recaptcha"][src*="anchor"]');
  if (await casilla.first().isVisible().catch(() => false)) return 'casilla';
  return null;
}

// Señales de que hay fechas u horas para escoger.
async function buscarDisponibles(page) {
  const selectores = [
    '.ui-datepicker-calendar td:not(.ui-datepicker-unselectable):not(.ui-state-disabled) a',
    '.mat-calendar-body-cell:not(.mat-calendar-body-disabled)',
    '.p-datepicker-calendar td:not(.p-disabled) span:not(.p-disabled)',
    '.flatpickr-day:not(.flatpickr-disabled):not(.prevMonthDay):not(.nextMonthDay)',
    '.fc-event, .fc-daygrid-event',
    '[class*="disponible" i]:not([disabled])',
    '[class*="available" i]:not([disabled])',
    '[class*="slot" i]:not([disabled])',
    '[class*="horario" i] button:not([disabled])',
  ];
  const hallados = [];
  for (const s of selectores) {
    const loc = page.locator(s);
    const n = await loc.count().catch(() => 0);
    for (let i = 0; i < Math.min(n, 12); i++) {
      const el = loc.nth(i);
      if (await el.isVisible().catch(() => false)) hallados.push((await el.innerText().catch(() => '')).trim());
    }
    if (hallados.length) return { selector: s, valores: hallados.filter(Boolean).slice(0, 12) };
  }
  return null;
}

// Para el diagnóstico: HTML y lista de textos pulsables visibles.
async function describir(page) {
  const html = await page.content().catch(() => '');
  const clicables = await page.evaluate(() => {
    const els = [...document.querySelectorAll('a, button, [role=button], [role=link], [role=tab], [onclick], select, input, label, li, h1, h2, h3')];
    return els.filter((e) => e.offsetParent !== null)
      .map((e) => `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}: ${(e.innerText || e.value || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 80)}`)
      .filter((t) => !t.endsWith(': ')).slice(0, 80).join('\n');
  }).catch((e) => `error: ${e.message}`);
  const frames = page.frames().map((f) => f.url()).filter((u) => u && u !== 'about:blank').join('\n');
  return { html, clicables: `${clicables}\n-- frames --\n${frames}\n-- url: ${page.url()}` };
}

// Una consulta completa. Devuelve { estado, detalle, captura }.
// estado: disponible | sin_citas | desconocido | captcha
async function consultar(browser, { fotosPorPaso = false } = {}) {
  const context = await browser.newContext({
    locale: 'es-CO', timezoneId: 'America/Bogota', viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  const fotos = [];
  const foto = async (nombre) => { if (fotosPorPaso) fotos.push({ nombre, png: await page.screenshot({ fullPage: true }) }); };
  try {
    await page.goto(URL_PORTAL, { waitUntil: 'networkidle', timeout: 60000 });
    await foto('Inicio');
    const recorrido = [];
    for (const paso of PASOS) {
      const hecho = await pulsar(page, paso);
      if (!hecho) {
        await foto(`No encontré "${paso}"`);
        const extra = fotosPorPaso ? await describir(page) : {};
        return { estado: 'desconocido', detalle: `No encontré el paso "${paso}". Pasos hechos: ${recorrido.join(' > ') || 'ninguno'}`, captura: await page.screenshot({ fullPage: true }), fotos, ...extra };
      }
      recorrido.push(hecho);
      await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
      await esperar(1200);
      await foto(`Paso: ${hecho}`);
      const cap = await hayCaptchaVisible(page);
      if (cap === 'desafío') {
        return { estado: 'captcha', detalle: `Apareció el reto del captcha después de "${hecho}".`, captura: await page.screenshot({ fullPage: true }), fotos };
      }
    }
    const texto = await page.locator('body').innerText().catch(() => '');
    const disp = await buscarDisponibles(page);
    const captura = await page.screenshot({ fullPage: true });
    if (disp) return { estado: 'disponible', detalle: `${disp.valores.join(', ') || 'fechas habilitadas'} (${disp.selector})`, captura, fotos };
    if (SIN_CITAS.test(texto)) return { estado: 'sin_citas', detalle: (texto.match(SIN_CITAS) || [''])[0], captura, fotos };
    return { estado: 'desconocido', detalle: `Recorrí ${recorrido.join(' > ')} pero no reconozco la pantalla final.`, captura, fotos };
  } finally {
    await context.close();
  }
}

function mensajeDisponible(r) {
  let m = `🚨 ¡HAY CITA DIAN en ${CIUDAD}!\n\n${r.detalle}\n\nReserva YA: ${URL_PORTAL}\nRuta: ${PASOS.join(' > ')}\n(${ahora()})`;
  if (DATOS_CITA) m += `\n\nTus datos para copiar:\n${DATOS_CITA}`;
  return m;
}

async function diagnostico(browser) {
  await tg.enviarMensaje(`🔎 Diagnóstico del monitor DIAN (${ahora()}). Te mando una foto por cada paso.`);
  const r = await consultar(browser, { fotosPorPaso: true });
  const fs = require('fs');
  fs.mkdirSync('diagnostico', { recursive: true });
  r.fotos.forEach((f, i) => fs.writeFileSync(`diagnostico/${String(i).padStart(2, '0')}.png`, f.png));
  if (r.html) fs.writeFileSync('diagnostico/ultima-pantalla.html', r.html);
  if (r.clicables) console.log(`Elementos visibles en la última pantalla:\n${r.clicables}`);
  for (const f of r.fotos) await tg.enviarFoto(f.png, f.nombre);
  await tg.enviarMensaje(`Resultado: ${r.estado}\n${r.detalle}`);
  console.log(`Diagnóstico: ${r.estado} | ${r.detalle}`);
}

async function monitor(browser) {
  const fin = Date.now() + DURACION_MIN * 60000;
  const { hora } = horaColombia();
  if (hora === HORA_INICIO) {
    await tg.enviarMensaje(`☀️ Monitor de citas DIAN activo hoy. Reviso ${CIUDAD} cada ${Math.round(INTERVALO_SEG / 60)} min hasta las ${HORA_FIN}:00.`);
  }
  let ultimoAviso = 0;
  let avisoRaro = false;
  let errores = 0;
  let consultas = 0;

  while (Date.now() < fin && enHorario()) {
    consultas++;
    try {
      const r = await consultar(browser);
      errores = 0;
      console.log(`${ahora()} #${consultas}: ${r.estado} | ${r.detalle}`);
      if (r.estado === 'disponible') {
        if (Date.now() - ultimoAviso > REAVISO_MIN * 60000) {
          await tg.enviarMensaje(mensajeDisponible(r));
          await tg.enviarFoto(r.captura, 'Así se ve ahora el portal');
          ultimoAviso = Date.now();
        }
      } else {
        ultimoAviso = 0;
        if ((r.estado === 'desconocido' || r.estado === 'captcha') && !avisoRaro) {
          await tg.enviarMensaje(`⚠️ El monitor no pudo leer la disponibilidad: ${r.detalle}\nSigo intentando; esto puede necesitar un ajuste.`);
          await tg.enviarFoto(r.captura, 'Pantalla donde me quedé');
          avisoRaro = true;
        }
      }
    } catch (e) {
      errores++;
      console.error(`${ahora()} #${consultas}: error ${e.message}`);
      if (errores === 3) await tg.enviarMensaje(`⚠️ El monitor DIAN falló 3 veces seguidas: ${e.message.slice(0, 300)}`);
    }
    // Pequeña variación para no consultar siempre en el mismo segundo.
    await esperar((INTERVALO_SEG + Math.floor(Math.random() * 30)) * 1000);
  }
  console.log(`Fin de la tanda: ${consultas} consultas.`);
}

(async () => {
  if (MODO !== 'diagnostico' && !enHorario()) {
    console.log(`Fuera de horario (${ahora()}). No consulto.`);
    return;
  }
  const browser = await chromium.launch();
  try {
    if (MODO === 'diagnostico') await diagnostico(browser);
    else await monitor(browser);
  } finally {
    await browser.close();
  }
})().catch(async (e) => {
  console.error(e);
  await tg.enviarMensaje(`❌ El monitor DIAN se detuvo: ${e.message.slice(0, 300)}`).catch(() => {});
  process.exit(1);
});
