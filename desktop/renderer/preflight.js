const list = document.getElementById('checks');
const status = document.getElementById('status');
const retry = document.getElementById('retry');

function render(result) {
  list.replaceChildren();
  for (const c of result.checks) {
    const li = document.createElement('li');
    li.className = c.ok ? 'ok' : 'fail';
    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = `${c.ok ? '✓' : '✕'} ${c.label}`;
    const detail = document.createElement('div');
    detail.className = 'detail';
    detail.textContent = c.detail;
    li.append(label, detail);
    if (!c.ok && c.fix) {
      const fix = document.createElement('div');
      fix.className = 'fix';
      fix.textContent = `Cómo arreglarlo: ${c.fix}`;
      li.append(fix);
    }
    list.append(li);
  }
}

async function run() {
  retry.hidden = true;
  retry.disabled = true;
  status.textContent = 'Revisando dependencias…';
  let result;
  try {
    result = await window.creapp.runPreflight();
  } catch (err) {
    status.textContent = `No se pudo verificar: ${err.message}`;
    retry.hidden = false;
    retry.disabled = false;
    return;
  }
  render(result);
  if (result.ok) {
    status.textContent = 'Todo listo. Iniciando CreAPP…';
    window.creapp.proceed();
  } else {
    const n = result.checks.filter((c) => !c.ok).length;
    status.textContent = `Faltan ${n} requisito(s). Resolvelos y tocá Reintentar.`;
    retry.hidden = false;
    retry.disabled = false;
  }
}

retry.addEventListener('click', run);
run();
