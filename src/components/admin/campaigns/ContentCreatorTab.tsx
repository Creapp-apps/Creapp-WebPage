import React, { useState } from 'react';
import { Settings, X } from 'lucide-react';
import { PresenceSemaphore } from './PresenceSemaphore';
import { ConnectMotorPrompt } from './ConnectMotorPrompt';
import { usePresence } from './usePresence';
import { studioSrc } from '@/lib/adminDeepLink';

const STUDIO_URL = 'http://localhost:8000/';

type OpenResult = { ok: boolean; error?: string };
type DesktopBridge = { openMotorTerminal?: (command: string) => Promise<OpenResult> };

function getBridge(): DesktopBridge | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { creappDesktop?: DesktopBridge }).creappDesktop;
}

const IAS: { id: string; label: string; command: string }[] = [
  { id: 'claude', label: 'Claude', command: 'claude' },
  { id: 'codex', label: 'Codex', command: 'codex' },
  { id: 'gemini', label: 'Gemini', command: 'gemini' },
  { id: 'custom', label: 'Comando personalizado', command: '' },
];

function enElectron(): boolean {
  if (getBridge()) return true;
  return typeof navigator !== 'undefined' && /electron/i.test(navigator.userAgent);
}

function TerminalLauncher() {
  const bridge = getBridge();
  const enDesktop = typeof bridge?.openMotorTerminal === 'function';
  const desktopDesactualizado = !enDesktop && enElectron();
  const [iaId, setIaId] = useState('claude');
  const [custom, setCustom] = useState('');
  const [estado, setEstado] = useState<null | OpenResult>(null);
  const [abriendo, setAbriendo] = useState(false);

  const ia = IAS.find((x) => x.id === iaId) ?? IAS[0];
  const comando = (iaId === 'custom' ? custom : ia.command).trim();

  const iniciar = async () => {
    if (!enDesktop || !comando) return;
    setAbriendo(true);
    try {
      const r = await bridge!.openMotorTerminal!(comando);
      setEstado(r);
    } catch (e) {
      setEstado({ ok: false, error: e instanceof Error ? e.message : String(e) });
    } finally {
      setAbriendo(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0e0e14] p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">1 · Abrí la terminal del motor</h3>
        <PresenceSemaphore />
      </div>

      <p className="text-xs text-zinc-400">
        Esto abre una terminal <strong className="text-zinc-200">en el repo del motor</strong> (ahí se lee el{' '}
        <code className="text-zinc-300">.mcp.json</code> solo) y arranca tu IA. Cuando conecte, el semáforo pasa a 🟢.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-zinc-400">IA:</label>
        <select
          value={iaId}
          onChange={(e) => { setIaId(e.target.value); setEstado(null); }}
          className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-zinc-200"
        >
          {IAS.map((x) => (
            <option key={x.id} value={x.id}>{x.label}</option>
          ))}
        </select>
        {iaId === 'custom' && (
          <input
            type="text"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="ej. claude --model opus"
            className="rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-zinc-200 min-w-[200px]"
          />
        )}
      </div>

      {enDesktop ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={iniciar}
            disabled={!comando || abriendo}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 text-xs font-medium text-white transition-colors"
          >
            {abriendo ? 'Abriendo…' : '▶ Iniciar Terminal'}
          </button>
          {estado?.ok && (
            <span className="text-xs text-emerald-400">Terminal abierta — arrancando «{comando}».</span>
          )}
          {estado && !estado.ok && (
            <span className="text-xs text-amber-400">No pude abrir la terminal: {estado.error}</span>
          )}
        </div>
      ) : desktopDesactualizado ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
          <p className="text-xs text-amber-300">
            Estás en la app de escritorio, pero esta build no trae el botón todavía.
            Rebuildeá la app y reabrila: <code className="text-zinc-200">npm --prefix desktop run dist</code>.
            Mientras tanto, abrí una terminal en el repo del motor y corré:
          </p>
          <pre className="whitespace-pre-wrap rounded-lg bg-black/50 p-2 text-xs text-zinc-200 select-all">
{comando || 'claude'}
          </pre>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-1">
          <p className="text-xs text-zinc-400">
            El botón para abrir la terminal solo está en la <strong className="text-zinc-200">app de escritorio</strong>.
            Desde la web, abrí una terminal en el repo del motor y corré:
          </p>
          <pre className="whitespace-pre-wrap rounded-lg bg-black/50 p-2 text-xs text-zinc-200 select-all">
{comando || 'claude'}
          </pre>
        </div>
      )}
    </div>
  );
}

// El Studio del motor embebido. Se habilita SOLO con la conexión confirmada (🟢).
// En desktop/dev local (página http) va en iframe; desde la web https (mixed content)
// no se puede embeber → botón para abrirlo aparte.
function StudioEmbed({ connected, fill = false, preflight }: { connected: boolean; fill?: boolean; preflight?: string }) {
  const esHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const src = studioSrc(STUDIO_URL, preflight);

  if (!connected) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0e0e14] p-8 text-center">
        <p className="text-sm text-zinc-400">
          🔒 El Studio se habilita cuando la IA esté conectada (semáforo en 🟢). Hacé los pasos 1 y 2.
        </p>
      </div>
    );
  }

  if (esHttps) {
    return (
      <div
        className={`${fill ? 'h-full flex flex-col items-center justify-center' : 'rounded-2xl border border-white/10'} bg-[#0e0e14] p-4 space-y-2`}
      >
        <p className="text-xs text-zinc-400">
          Desde la web no puedo embeber el Studio local (mixed content). Abrilo en otra pestaña:
        </p>
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="inline-block rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white transition-colors"
        >
          ↗ Abrir el Studio (:8000)
        </a>
      </div>
    );
  }

  if (fill) {
    return (
      <iframe
        src={src}
        title="Studio del motor"
        className="w-full h-full"
        style={{ border: 0 }}
      />
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0e0e14] overflow-hidden">
      <iframe
        src={src}
        title="Studio del motor"
        className="w-full"
        style={{ height: '80vh', border: 0 }}
      />
    </div>
  );
}

// Pasos 1 + 2: el onboarding de conexión. Se muestra completo cuando no hay
// conexión, y queda plegable (oculto por defecto) una vez conectado.
function PasosConexion() {
  return (
    <>
      <TerminalLauncher />
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-white px-1">2 · Pegá el prompt en la IA</h3>
        <ConnectMotorPrompt />
      </div>
    </>
  );
}

export default function ContentCreatorTab({ preflight }: { preflight?: string } = {}) {
  const p = usePresence('http://localhost:8000');
  const [pasosAbiertos, setPasosAbiertos] = useState(false);

  // 🔴 Sin conexión: onboarding completo, scrollable.
  if (!p.connected) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="rounded-3xl p-6 bg-gradient-to-r from-indigo-950/30 via-[#0e0e14] to-purple-950/20 border border-indigo-500/20 shadow-xl space-y-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Creador de Contenidos</h2>
            <p className="text-xs text-zinc-400">
              Universo único: arrancás tu IA conectada al motor, trabajás desde el chat y usás tu Studio acá adentro.
            </p>
          </div>

          <PasosConexion />

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white px-1">3 · Tu Studio del motor</h3>
            <StudioEmbed connected={false} />
          </div>
        </div>
      </div>
    );
  }

  // 🟢 Conectado: barra fina plegable + Studio a pantalla completa.
  return (
    <div className="h-full flex flex-col">
      <div className="relative shrink-0 z-10">
        <div className="flex items-center justify-between gap-2 border-b border-white/5 bg-[#0b0b0e]/80 px-3 py-2 sm:px-4">
          <PresenceSemaphore />
          <button
            type="button"
            onClick={() => setPasosAbiertos((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
            title="Ver pasos de conexión / reconectar"
          >
            {pasosAbiertos ? <X size={13} /> : <Settings size={13} />}
            Pasos
          </button>
        </div>

        {/* Panel plegable: overlay, no empuja al Studio. */}
        {pasosAbiertos && (
          <div className="absolute inset-x-0 top-full z-20 max-h-[72vh] space-y-4 overflow-y-auto border-b border-white/10 bg-[#0b0b0e]/98 p-4 shadow-2xl backdrop-blur-xl">
            <PasosConexion />
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 bg-[#0e0e14]">
        <StudioEmbed connected fill preflight={preflight} />
      </div>
    </div>
  );
}
