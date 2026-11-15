import React, { useState } from 'react';
import { usePresence } from './usePresence';

const MOTOR_BASE = 'http://localhost:8000';

// Prompt listo para pegar en Claude Code (la CLI). Está redactado para que el
// asistente (a) verifique la conexión con el MCP del motor, (b) sepa qué puede
// hacer directo y (c) respete el gate de acciones irreversibles. Espeja la norma
// de AGENTS.md para que el arranque de sesión sea congruente.
export const CONNECT_PROMPT = `Arrancá sesión de trabajo con el motor de CreAPP.

1. Verificá la conexión con el servidor MCP "motor": llamá la tool motor_estado. Si responde, estás conectado y la suite marca "Conectada".
2. A partir de ahí operás el motor desde el chat, directo: clientes, campañas, piezas, guiones, voz, b-rolls, thumbnails, carruseles y render.
3. Publicar a redes, programar y borrar requieren mi OK explícito por cada acción: preparalos y mostrámelos, pero NO los ejecutes (confirmar=True) sin que yo confirme. Un OK no vale para la siguiente acción.

Confirmame que motor_estado respondió y decime qué cliente o pieza miramos primero.`;

async function copiar(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    /* cae al fallback */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = texto;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function ConnectMotorPrompt() {
  const p = usePresence(MOTOR_BASE);
  const [copiado, setCopiado] = useState(false);
  const [falloCopia, setFalloCopia] = useState(false);

  const onCopiar = async () => {
    const ok = await copiar(CONNECT_PROMPT);
    setCopiado(ok);
    setFalloCopia(!ok);
    window.setTimeout(() => {
      setCopiado(false);
      setFalloCopia(false);
    }, 2500);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0e0e14] p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">Conectar el motor</h3>
        {p.connected ? (
          <span className="text-xs text-indigo-300">🟢 Conectado — ya podés trabajar desde el chat</span>
        ) : (
          <span className="text-xs text-zinc-400">🔴 Pegá este prompt en tu CLI (Claude Code) para conectar</span>
        )}
      </div>

      <p className="text-xs text-zinc-400">
        Abrí una terminal en el repo del motor, corré <code className="text-zinc-300">claude</code> y pegá esto.
        Cuando el asistente conecte, el semáforo de arriba pasa a 🟢.
      </p>

      <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-zinc-200 select-all max-h-64 overflow-auto">
{CONNECT_PROMPT}
      </pre>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCopiar}
          className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white transition-colors"
        >
          {copiado ? '¡Copiado!' : 'Copiar prompt'}
        </button>
        {falloCopia && (
          <span className="text-xs text-amber-400">No pude copiar — seleccioná el texto y copialo a mano.</span>
        )}
      </div>
    </div>
  );
}

export default ConnectMotorPrompt;
