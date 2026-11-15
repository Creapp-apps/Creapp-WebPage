import React, { useState } from 'react';
import { PresenceSemaphore } from './PresenceSemaphore';
import { ConnectMotorPrompt } from './ConnectMotorPrompt';

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

function TerminalLauncher() {
  const bridge = getBridge();
  const enDesktop = typeof bridge?.openMotorTerminal === 'function';
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

export default function ContentCreatorTab() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl p-6 bg-gradient-to-r from-indigo-950/30 via-[#0e0e14] to-purple-950/20 border border-indigo-500/20 shadow-xl space-y-2">
        <h2 className="text-xl font-bold text-white tracking-tight">Creador de Contenidos</h2>
        <p className="text-xs text-zinc-400">
          Universo único: arrancás tu IA conectada al motor y trabajás desde el chat. Dos pasos.
        </p>
      </div>

      <TerminalLauncher />

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-white px-1">2 · Pegá el prompt en la IA</h3>
        <ConnectMotorPrompt />
      </div>
    </div>
  );
}
