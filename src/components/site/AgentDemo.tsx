import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Check } from 'lucide-react';
import { reducedMotion, useLive } from './iso';

/**
 * Área 02 · IA — demo guiada de un agente. Sin backend: las respuestas son un guion de
 * ejemplo (y se rotula así). Muestra el patrón real: leer → entender → actuar → responder.
 */

interface Task {
    id: string;
    chip: string;
    ask: string;
    steps: string[];
    reply: string;
    match: RegExp;
}

const TASKS: Task[] = [
    {
        id: 'whatsapp',
        chip: 'Responder consultas',
        ask: 'Respondé las consultas que llegan por WhatsApp.',
        steps: ['Lee el mensaje que entra', 'Entiende qué pide: un turno', 'Consulta la agenda', 'Responde y deja el turno reservado'],
        reply: 'Listo. Entendí el pedido, revisé la agenda y respondí con horarios disponibles. Si el caso se complica, se lo paso a una persona.',
        match: /whats|consult|mensaj|respond|turno|chat|atenci/i,
    },
    {
        id: 'docs',
        chip: 'Clasificar documentos',
        ask: 'Clasificá estos documentos y cargalos al sistema.',
        steps: ['Lee cada documento', 'Extrae los datos clave', 'Los clasifica: factura · contrato · remito', 'Carga los datos al sistema'],
        reply: 'Hecho. Cada documento quedó clasificado y con sus datos cargados. Lo que no pude leer con certeza lo marqué para revisión.',
        match: /document|factur|clasific|pdf|contrato|extra|carg/i,
    },
    {
        id: 'forecast',
        chip: 'Anticipar la demanda',
        ask: '¿Qué tengo que preparar para la semana que viene?',
        steps: ['Toma el historial de tu negocio', 'Busca patrones por día y horario', 'Estima la demanda de la semana', 'Avisa qué conviene preparar'],
        reply: 'Te armé una estimación con los datos de tu negocio y te marco qué días conviene reforzar. Es una estimación: te muestro también cuánta confianza tiene.',
        match: /semana|demanda|predic|anticip|stock|venta|prepar|pron[oó]s/i,
    },
];

const FALLBACK =
    'Esta es una demo guiada: todavía no estoy conectado a tus sistemas. Probá con una de las tres tareas de abajo. En un proyecto real, el agente trabaja sobre tus datos y tus herramientas.';

const PATTERN = ['Lee lo que entra', 'Entiende qué se pide', 'Actúa sobre tus sistemas', 'Responde y deja registro'];

type Phase = 'idle' | 'working' | 'done';

export const AgentDemo: React.FC = () => {
    const ref = useLive<HTMLDivElement>();
    const [ask, setAsk] = useState<string | null>(null);
    const [task, setTask] = useState<Task | null>(null);
    const [shown, setShown] = useState(0);
    const [phase, setPhase] = useState<Phase>('idle');
    const [text, setText] = useState('');
    const timers = useRef<number[]>([]);

    const clear = () => {
        timers.current.forEach((t) => window.clearTimeout(t));
        timers.current = [];
    };
    useEffect(() => clear, []);

    const run = (t: Task | null, asked: string) => {
        clear();
        setAsk(asked);
        setTask(t);
        setShown(0);
        if (!t) {
            setPhase('done');
            return;
        }
        if (reducedMotion()) {
            setShown(t.steps.length);
            setPhase('done');
            return;
        }
        setPhase('working');
        t.steps.forEach((_, i) => {
            timers.current.push(window.setTimeout(() => setShown(i + 1), 550 + i * 750));
        });
        timers.current.push(window.setTimeout(() => setPhase('done'), 550 + t.steps.length * 750 + 250));
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const q = text.trim();
        if (!q) return;
        run(TASKS.find((t) => t.match.test(q)) ?? null, q);
        setText('');
    };

    const status = phase === 'working' ? 'Trabajando' : phase === 'done' ? 'Listo' : 'En espera';

    return (
        <div ref={ref} className="cw-demo" data-phase={phase}>
            <div className="cw-demo-bar">
                <span className="cw-agent" aria-hidden="true">
                    <svg viewBox="0 0 40 40">
                        <circle className="cw-agent-ring r1" cx="20" cy="20" r="17" />
                        <circle className="cw-agent-ring r2" cx="20" cy="20" r="11" />
                        <circle className="cw-agent-core" cx="20" cy="20" r="4.5" />
                    </svg>
                </span>
                <span className="cw-mono cw-demo-status">Agente · {status}</span>
                <span className="cw-mono cw-gfx-note">Demo guiada · respuestas de ejemplo</span>
            </div>

            <div className="cw-demo-log" aria-live="polite">
                {!ask && (
                    <p className="cw-msg is-agent">
                        Elegí una tarea o escribí la tuya. Te muestro, paso a paso, cómo la resuelve un agente.
                    </p>
                )}
                {ask && <p className="cw-msg is-user">{ask}</p>}
                {/* Sin tarea elegida se ve el patrón general: el alto no salta y no queda vacío. */}
                {(
                    <ol className="cw-steps-log">
                        {(task?.steps ?? PATTERN).map((s, i) => (
                            <li key={s} className={i < shown ? 'is-on' : ''}>
                                <span className="cw-tickbox">{i < shown && <Check size={12} strokeWidth={3} />}</span>
                                {s}
                            </li>
                        ))}
                    </ol>
                )}
                {ask && phase === 'done' && <p className="cw-msg is-agent">{task ? task.reply : FALLBACK}</p>}
            </div>

            <div className="cw-demo-chips">
                {TASKS.map((t) => (
                    <button key={t.id} type="button" onClick={() => run(t, t.ask)} aria-pressed={task?.id === t.id}>
                        {t.chip}
                    </button>
                ))}
            </div>

            <form className="cw-demo-input" onSubmit={submit}>
                <label htmlFor="cw-agent-q" className="cw-sr">Pedile una tarea al agente</label>
                <input
                    id="cw-agent-q"
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Pedile una tarea al agente…"
                    autoComplete="off"
                    maxLength={120}
                />
                <button type="submit" aria-label="Enviar" disabled={!text.trim()}>
                    <ArrowUp size={16} />
                </button>
            </form>
        </div>
    );
};

export default AgentDemo;
