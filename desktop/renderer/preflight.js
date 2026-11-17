const list = document.getElementById('checks');
const status = document.getElementById('status');
const title = document.getElementById('title');
const retry = document.getElementById('retry');
const wrap = document.getElementById('rocketWrap');
const flame = document.getElementById('flame');

// Orden de armado: nariz -> cuerpo -> aletas -> motores -> ventana.
const PARTS = ['nose', 'body', 'fins', 'engines', 'window'];
const STEP_MS = 170;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Estrellas de fondo (puro DOM, sin assets).
(function stars() {
  const box = document.getElementById('stars');
  for (let i = 0; i < 40; i++) {
    const s = document.createElement('i');
    s.style.left = `${Math.random() * 100}%`;
    s.style.top = `${Math.random() * 100}%`;
    s.style.animationDelay = `${(Math.random() * 3).toFixed(2)}s`;
    box.append(s);
  }
})();

function resetRocket() {
  wrap.classList.remove('launch', 'live');
  flame.classList.remove('on');
  document.querySelectorAll('.part').forEach((p) => p.classList.remove('on'));
}

function buildItem(c) {
  const li = document.createElement('li');
  li.className = 'pending';
  const badge = document.createElement('div');
  badge.className = 'badge';
  const txt = document.createElement('div');
  txt.className = 'txt';
  const label = document.createElement('div');
  label.className = 'label';
  label.textContent = c.label;
  const detail = document.createElement('div');
  detail.className = 'detail';
  detail.textContent = c.detail || '';
  txt.append(label, detail);
  li.append(badge, txt);
  return { li, badge, txt };
}

function setState(item, c) {
  item.li.classList.remove('pending');
  item.li.classList.add(c.ok ? 'ok' : 'fail');
  item.badge.textContent = c.ok ? '✓' : '✕';
  if (!c.ok && c.fix) {
    const fix = document.createElement('div');
    fix.className = 'fix';
    fix.textContent = `Cómo arreglarlo: ${c.fix}`;
    item.txt.append(fix);
  }
}

// Capa de presentación: los 8 checks llegan juntos, se revelan en secuencia.
async function reveal(checks) {
  list.replaceChildren();
  const items = checks.map(buildItem);
  let partIdx = 0;
  for (let i = 0; i < checks.length; i++) {
    list.append(items[i].li);
    void items[i].li.offsetWidth;
    items[i].li.classList.add('in');
    await sleep(STEP_MS);
    setState(items[i], checks[i]);
    if (checks[i].ok) {
      // Reparte las 5 piezas proporcionalmente entre los checks OK.
      const target = Math.round(((i + 1) / checks.length) * PARTS.length);
      while (partIdx < target && partIdx < PARTS.length) {
        document.querySelector(`[data-part="${PARTS[partIdx++]}"]`).classList.add('on');
      }
    }
    await sleep(STEP_MS * 0.6);
  }
}

async function launch() {
  PARTS.forEach((p) => document.querySelector(`[data-part="${p}"]`).classList.add('on'));
  flame.classList.add('on');
  wrap.classList.add('live');
  status.textContent = '¡Despegue! Iniciando CreAPP…';
  await sleep(900);
  wrap.classList.add('launch');
  await sleep(1300);
}

// Copia idéntica de src/terminalCommand.mjs (fuente de verdad testeada).
const shq = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;
function buildInstallTerminalCommand(label, command) {
  const cmd = String(command == null ? '' : command).replace(/[\r\n]+/g, ' ').trim();
  const lbl = String(label == null ? '' : label).replace(/[\r\n]+/g, ' ').trim();
  const intro = `CreAPP va a instalar: ${lbl}. Si algo falla, el error se ve acá abajo.`;
  return `echo ${shq(intro)} && echo ${shq('> ' + cmd)} && ${cmd}`;
}

const FRIENDLY = {
  python: 'Python es el lenguaje en el que corre el motor de contenidos de CreAPP.',
  ffmpeg: 'FFmpeg procesa y renderiza el audio y el video de tus piezas.',
  ffprobe: 'FFprobe lee los datos de los videos; viene junto con FFmpeg.',
  node: 'Node.js corre el render de Remotion y las herramientas de la interfaz.',
  venv: 'El entorno virtual de Python guarda las librerías del motor.',
  remotion_modules: 'Los módulos de Remotion generan los videos animados.',
  paths: 'CreAPP no encuentra la carpeta del motor. Revisá la configuración de rutas.',
  ui_build: 'Falta compilar la interfaz del estudio.',
};
const friendlyFor = (c) => FRIENDLY[c.id] || 'CreAPP necesita este componente para funcionar.';

const modal = document.getElementById('modal');
const modalList = document.getElementById('modalList');
document.getElementById('modalRetry').addEventListener('click', () => { hideModal(); run(); });
function hideModal() { modal.hidden = true; modalList.replaceChildren(); }

function showManual(box, command) {
  if (box.querySelector('.manual')) return;
  const m = document.createElement('div');
  m.className = 'manual';
  const note = document.createElement('div');
  note.textContent = 'Abrí una terminal y pegá:';
  const code = document.createElement('code');
  code.textContent = command;
  m.append(note, code);
  box.append(m);
}

function showModal(checks) {
  modalList.replaceChildren();
  checks.filter((c) => !c.ok).forEach((c) => {
    const box = document.createElement('div');
    box.className = 'mitem';
    const h = document.createElement('div');
    h.className = 'mlabel';
    h.textContent = c.label;
    const f = document.createElement('div');
    f.className = 'mfriendly';
    f.textContent = friendlyFor(c);
    box.append(h, f);
    if (c.fix) {
      const fx = document.createElement('div');
      fx.className = 'fix';
      fx.textContent = `Cómo arreglarlo: ${c.fix}`;
      box.append(fx);
    }
    if (c.installable && c.install) {
      const btn = document.createElement('button');
      btn.className = 'install';
      btn.textContent = 'Instalar';
      btn.addEventListener('click', async () => {
        try {
          if (!window.creappDesktop) throw new Error('sin bridge');
          const r = await window.creappDesktop.openMotorTerminal(buildInstallTerminalCommand(c.label, c.install));
          if (!r || !r.ok) showManual(box, c.install);
        } catch (e) {
          showManual(box, c.install);
        }
      });
      box.append(btn);
    }
    modalList.append(box);
  });
  modal.hidden = false;
}

function showFail(msg) {
  document.body.classList.add('err');
  title.textContent = 'Faltan componentes';
  status.textContent = msg;
  retry.hidden = false;
  retry.disabled = false;
}

async function run() {
  document.body.classList.remove('err');
  title.textContent = 'Armando tu estación';
  retry.hidden = true;
  retry.disabled = true;
  hideModal();
  resetRocket();
  list.replaceChildren();
  status.textContent = 'Ensamblando tu estación…';
  try {
    const result = await window.creapp.runPreflight();
    await reveal(result.checks);
    if (result.ok) {
      await launch();
      window.creapp.proceed();
    } else {
      const n = result.checks.filter((c) => !c.ok).length;
      showFail(`Faltan ${n} requisito(s). Resolvelos y tocá Reintentar.`);
      showModal(result.checks);
    }
  } catch (err) {
    showFail(`No se pudo verificar: ${err.message}`);
  }
}

retry.addEventListener('click', run);
run();
