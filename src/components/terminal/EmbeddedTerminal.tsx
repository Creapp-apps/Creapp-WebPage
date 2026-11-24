import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

// Puente que expone el preload del desktop (window.creappTerm). En la web no existe.
type CreappTerm = {
  start: (size?: { cols: number; rows: number }) => Promise<{ ok: boolean; error?: string }>;
  onData: (cb: (d: string) => void) => () => void;
  onExit: (cb: (e: unknown) => void) => () => void;
  write: (d: string) => void;
  resize: (cols: number, rows: number) => void;
  dispose: () => void;
};

export default function EmbeddedTerminal() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const creappTerm: CreappTerm | undefined = (window as unknown as { creappTerm?: CreappTerm }).creappTerm;
    const el = containerRef.current;
    if (!el) return;

    if (!creappTerm) {
      el.innerHTML =
        '<div style="padding:16px;color:#A1A1AA;font-size:13px">La terminal está disponible en la app de escritorio (CreAPP Suite).</div>';
      return;
    }

    const term = new Terminal({
      fontSize: 13,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      cursorBlink: true,
      // Estética CreAPP: negro #070709 + violeta #A855F7 (tokens de @theme en src/index.css).
      theme: {
        background: '#070709',
        foreground: '#ECECEF',
        cursor: '#A855F7',
        cursorAccent: '#070709',
        selectionBackground: 'rgba(168,85,247,0.30)',
      },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(el);
    fit.fit();

    let disposed = false;
    const offData = creappTerm.onData((d) => { if (!disposed) term.write(d); });
    const onInput = term.onData((d) => creappTerm.write(d));

    // Shift+Enter = salto de línea, no envío. xterm por defecto manda `\r` pelado
    // (igual que Enter) y Claude Code lo lee como "enviar". Lo mapeamos a la
    // secuencia meta-enter (`\x1b\r`), la misma que produce Option+Enter en Mac,
    // que Claude Code interpreta como newline. Devolver false corta el default de
    // xterm (no se dispara onData para esa tecla).
    term.attachCustomKeyEventHandler((e) => {
      if (e.type === 'keydown' && e.key === 'Enter' && e.shiftKey) {
        if (!disposed) creappTerm.write('\x1b\r');
        return false;
      }
      return true;
    });

    creappTerm.start({ cols: term.cols, rows: term.rows });

    const ro = new ResizeObserver(() => {
      try {
        fit.fit();
        creappTerm.resize(term.cols, term.rows);
      } catch { /* ignore */ }
    });
    ro.observe(el);

    return () => {
      disposed = true;
      try { offData(); } catch { /* ignore */ }
      try { onInput.dispose(); } catch { /* ignore */ }
      try { ro.disconnect(); } catch { /* ignore */ }
      try { term.dispose(); } catch { /* ignore */ }
      // No se llama creappTerm.dispose() acá: el cajón se mantiene montado (keep-mounted),
      // así que este cleanup solo corre al desmontar de verdad (cerrar la app), donde el
      // main ya mata el PTY en before-quit.
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', padding: '8px 10px', background: '#070709', boxSizing: 'border-box' }}
    />
  );
}
