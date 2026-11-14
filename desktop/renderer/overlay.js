// Overlay autocontenido del desktop: toast es-AR + indicador de conectividad.
// Se inyecta en la UI de CreAPP desde el main. No toca la app React.
(() => {
  if (window.__creappOverlay || !window.creappDesktop) return;
  window.__creappOverlay = true;
  const api = window.creappDesktop;

  const root = document.createElement('div');
  root.id = 'creapp-desktop-overlay';
  root.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none;font-family:-apple-system,system-ui,sans-serif';

  const dot = document.createElement('div');
  dot.title = 'Conectividad';
  dot.style.cssText = 'position:absolute;right:12px;bottom:12px;display:flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;background:#070709;border:1px solid #A855F7;color:#fff;font-size:12px;pointer-events:auto';
  const led = document.createElement('span');
  led.style.cssText = 'width:8px;height:8px;border-radius:50%;background:#6b7280';
  const txt = document.createElement('span');
  txt.textContent = 'Conectando…';
  dot.append(led, txt);

  const stack = document.createElement('div');
  stack.style.cssText = 'position:absolute;left:50%;top:16px;transform:translateX(-50%);display:flex;flex-direction:column;gap:8px;align-items:center';
  root.append(stack, dot);
  document.body.appendChild(root);

  api.onConnectivity((s) => {
    const on = !!(s && s.online);
    led.style.background = on ? '#22c55e' : '#ef4444';
    txt.textContent = on ? 'En línea' : 'Sin conexión';
  });

  api.onToast((t) => {
    if (!t) return;
    const el = document.createElement('div');
    el.style.cssText = 'pointer-events:auto;min-width:280px;max-width:420px;padding:12px 14px;border-radius:12px;background:#070709;border:1px solid #A855F7;color:#fff;box-shadow:0 8px 30px rgba(0,0,0,.5)';
    const h = document.createElement('div');
    h.style.cssText = 'font-weight:700;font-size:14px';
    h.textContent = t.title;
    const b = document.createElement('div');
    b.style.cssText = 'font-size:13px;opacity:.85;margin-top:4px';
    b.textContent = t.body;
    el.append(h, b);
    const close = () => el.remove();
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;margin-top:10px;justify-content:flex-end';
    if (t.action && t.id != null) {
      const rb = document.createElement('button');
      rb.textContent = t.action;
      rb.style.cssText = 'background:#A855F7;color:#fff;border:0;border-radius:8px;padding:6px 12px;font-weight:600;cursor:pointer';
      rb.onclick = () => { api.retry(t.id); close(); };
      row.appendChild(rb);
    }
    const cb = document.createElement('button');
    cb.textContent = 'Cerrar';
    cb.style.cssText = 'background:transparent;color:#fff;border:1px solid #444;border-radius:8px;padding:6px 12px;cursor:pointer';
    cb.onclick = close;
    row.appendChild(cb);
    el.appendChild(row);
    stack.appendChild(el);
    if (!t.action) setTimeout(close, 8000);
  });
})();
