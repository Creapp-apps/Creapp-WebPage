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
    }
  } catch (err) {
    showFail(`No se pudo verificar: ${err.message}`);
  }
}

retry.addEventListener('click', run);
run();
