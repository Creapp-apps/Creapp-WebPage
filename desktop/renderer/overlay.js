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

  // Chip de estado del motor: qué pieza procesa en vivo. Flota arriba de la píldora
  // de conectividad, no bloquea clics (pointer-events:none), oculto cuando no hay nada.
  const motorChip = document.createElement('div');
  motorChip.title = 'Estado del motor';
  motorChip.style.cssText = 'position:absolute;right:12px;bottom:48px;display:none;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;background:#070709;border:1px solid #A855F7;color:#fff;font-size:12px;pointer-events:none';
  const motorLed = document.createElement('span');
  motorLed.style.cssText = 'width:8px;height:8px;border-radius:50%;background:#A855F7;box-shadow:0 0 8px #A855F7';
  const motorTxt = document.createElement('span');
  motorChip.append(motorLed, motorTxt);

  const stack = document.createElement('div');
  stack.style.cssText = 'position:absolute;left:50%;top:16px;transform:translateX(-50%);display:flex;flex-direction:column;gap:8px;align-items:center';
  root.append(stack, dot, motorChip);
  document.body.appendChild(root);

  api.onMotorStatus((s) => {
    if (!s || !s.active) { motorChip.style.display = 'none'; return; }
    motorTxt.textContent = s.chipText;
    motorChip.style.display = 'flex';
  });

  api.onConnectivity((s) => {
    if (!s || s.online == null) {
      led.style.background = '#6b7280';
      txt.textContent = 'Sin monitoreo';
      return;
    }
    led.style.background = s.online ? '#22c55e' : '#ef4444';
    txt.textContent = s.online ? 'En línea' : 'Sin conexión';
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
    const close = () => { el.remove(); if (t.id != null && api.dismiss) api.dismiss(t.id); };
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;margin-top:10px;justify-content:flex-end';
    if (t.action && t.id != null) {
      const rb = document.createElement('button');
      rb.textContent = t.action;
      rb.style.cssText = 'background:#A855F7;color:#fff;border:0;border-radius:8px;padding:6px 12px;font-weight:600;cursor:pointer';
      rb.onclick = () => { api.retry(t.id); el.remove(); };
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

  // ── Modal de confirmación de salida ──────────────────────────────────────
  // Dock → Salir / Tray → Salir / Cmd+Q frenan el cierre en el main y piden este modal:
  // app blurreada + overlay negro + card central con entrada de desliz. Solo "Sí, cerrar"
  // dispara el cierre real del sistema operativo.
  const qStyle = document.createElement('style');
  qStyle.textContent =
    '@keyframes creappQuitFade{from{opacity:0}to{opacity:1}}' +
    '@keyframes creappQuitSlide{from{opacity:0;transform:translateY(-26px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}';
  document.head.appendChild(qStyle);

  const backdrop = document.createElement('div');
  backdrop.style.cssText = 'position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(3,3,6,.62);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);pointer-events:auto';

  const card = document.createElement('div');
  card.style.cssText = 'width:min(90vw,420px);background:linear-gradient(180deg,#0d0d12,#070709);border:1px solid #A855F7;border-radius:18px;padding:26px 24px;box-shadow:0 24px 80px rgba(0,0,0,.6),0 0 0 1px rgba(168,85,247,.25);text-align:center';

  const qTitle = document.createElement('div');
  qTitle.textContent = '¿Desea salir de CreAPP Desktop suite?';
  qTitle.style.cssText = 'font-size:18px;font-weight:800;color:#fff;letter-spacing:-.2px';

  const qSub = document.createElement('div');
  qSub.textContent = 'La agencia y las notificaciones dejarán de correr en segundo plano.';
  qSub.style.cssText = 'font-size:13px;color:#cbd5e1;opacity:.85;margin-top:8px;line-height:1.4';

  const qRow = document.createElement('div');
  qRow.style.cssText = 'display:flex;gap:10px;margin-top:22px';

  const qCancel = document.createElement('button');
  qCancel.textContent = 'Cancelar';
  qCancel.style.cssText = 'flex:1;background:transparent;color:#fff;border:1px solid #3a3a42;border-radius:10px;padding:11px 0;font-size:14px;font-weight:600;cursor:pointer';

  const qConfirm = document.createElement('button');
  qConfirm.textContent = 'Sí, cerrar';
  qConfirm.style.cssText = 'flex:1;background:#A855F7;color:#fff;border:0;border-radius:10px;padding:11px 0;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 6px 20px rgba(168,85,247,.4)';

  qRow.append(qCancel, qConfirm);
  card.append(qTitle, qSub, qRow);
  backdrop.appendChild(card);
  root.appendChild(backdrop);

  let quitModalOpen = false;
  const openQuitModal = () => {
    if (quitModalOpen) return;
    quitModalOpen = true;
    qConfirm.disabled = false;
    qConfirm.textContent = 'Sí, cerrar';
    backdrop.style.display = 'flex';
    backdrop.style.animation = 'creappQuitFade .18s ease';
    card.style.animation = 'creappQuitSlide .26s cubic-bezier(.16,1,.3,1)';
    qConfirm.focus();
  };
  const closeQuitModal = () => { quitModalOpen = false; backdrop.style.display = 'none'; };
  const cancelQuit = () => { closeQuitModal(); if (api.cancelQuit) api.cancelQuit(); };

  qCancel.onclick = cancelQuit;
  backdrop.onclick = (e) => { if (e.target === backdrop) cancelQuit(); };
  qConfirm.onclick = () => { qConfirm.disabled = true; qConfirm.textContent = 'Cerrando…'; if (api.confirmQuit) api.confirmQuit(); };
  document.addEventListener('keydown', (e) => {
    if (!quitModalOpen) return;
    if (e.key === 'Escape') cancelQuit();
    else if (e.key === 'Enter') qConfirm.click();
  });

  if (api.onConfirmQuit) api.onConfirmQuit(openQuitModal);
})();
