import React, { useEffect, useRef, useState } from 'react';
import { RotateCw, ScanLine } from 'lucide-react';
import { Box, makeIso, pts, reducedMotion, useLive } from './iso';

/**
 * Área 05 · Ciberseguridad — el usuario dispara un escaneo sobre un sistema de ejemplo.
 * Modo capacidad: los hallazgos son datos de ejemplo (rotulado), sin estadísticas ni certificaciones.
 */

type Sev = 'critico' | 'alto' | 'medio' | 'bajo';
const SEV_LABEL: Record<Sev, string> = { critico: 'Crítico', alto: 'Alto', medio: 'Medio', bajo: 'Bajo' };
const SEV_ORDER: Sev[] = ['critico', 'alto', 'medio', 'bajo'];

interface Asset { id: string; label: string; at: [number, number]; sev: Sev; finding: string }

const ASSETS: Asset[] = [
    { id: 'web', label: 'WEB', at: [1, 1], sev: 'alto', finding: 'Dependencia desactualizada' },
    { id: 'users', label: 'USUARIOS', at: [1, 5], sev: 'medio', finding: 'Contraseñas sin rotación' },
    { id: 'api', label: 'API', at: [5, 1], sev: 'critico', finding: 'Panel de administración expuesto' },
    { id: 'data', label: 'DATOS', at: [5, 5], sev: 'bajo', finding: 'Backups sin prueba de restauración' },
];

const SCAN_MS = 2600;
const X0 = -0.8, X1 = 7.8;

type Phase = 'idle' | 'scanning' | 'done';

export const ScanDemo: React.FC = () => {
    const ref = useLive<HTMLDivElement>();
    const k = makeIso(262, 62, 30);
    const S = 1.6;
    const [phase, setPhase] = useState<Phase>('idle');
    const [found, setFound] = useState<string[]>([]);
    const timers = useRef<number[]>([]);

    const clear = () => {
        timers.current.forEach((t) => window.clearTimeout(t));
        timers.current = [];
    };
    useEffect(() => clear, []);

    const scan = () => {
        clear();
        setFound([]);
        if (reducedMotion()) {
            setFound(ASSETS.map((a) => a.id));
            setPhase('done');
            return;
        }
        setPhase('scanning');
        ASSETS.forEach((a) => {
            // El hallazgo aparece cuando el plano de escaneo cruza el activo.
            const at = ((a.at[0] + S / 2 - X0) / (X1 - X0)) * SCAN_MS;
            timers.current.push(window.setTimeout(() => setFound((f) => [...f, a.id]), at));
        });
        timers.current.push(window.setTimeout(() => setPhase('done'), SCAN_MS + 200));
    };

    const [tx, ty] = k.V(X1 - X0, 0);
    const plane = pts([k.P(X0, -0.6, 0), k.P(X0, 7.2, 0), k.P(X0, 7.2, 2.6), k.P(X0, -0.6, 2.6)]);
    // Al terminar, la lista se reordena por severidad: ese orden es el plan.
    const rows = phase === 'done' ? SEV_ORDER.flatMap((s) => ASSETS.filter((a) => a.sev === s)) : ASSETS;

    return (
        <div ref={ref} className="cw-scan" data-phase={phase}>
            <div className="cw-scan-stage">
                <svg className="iso" viewBox="0 0 520 300" role="img" aria-label="Sistema de ejemplo con cuatro activos: web, API, usuarios y datos.">
                    <polygon className="iso-floor" points={pts([k.P(-0.6, -0.6), k.P(7.2, -0.6), k.P(7.2, 7.2), k.P(-0.6, 7.2)])} />
                    <path className="iso-cable" d={`M${k.P(1.8, 1.8).join(' ')} L${k.P(5.8, 1.8).join(' ')} L${k.P(5.8, 5.8).join(' ')} L${k.P(1.8, 5.8).join(' ')} Z`} />
                    {ASSETS.map((a) => {
                        const hit = found.includes(a.id);
                        const top = k.P(a.at[0] + S / 2, a.at[1] + S / 2, 1.3);
                        const lp = k.P(a.at[0] + S, a.at[1] + S); // vértice frontal de la caja
                        return (
                            <g key={a.id}>
                                <Box k={k} x={a.at[0]} y={a.at[1]} z={0} w={S} d={S} h={1.3} />
                                {hit && (
                                    <g className={`cw-sev-mark sev-${a.sev}`}>
                                        <circle className="halo" cx={top[0]} cy={top[1]} r={11} />
                                        <circle className="dot" cx={top[0]} cy={top[1]} r={5} />
                                    </g>
                                )}
                                <text x={lp[0]} y={lp[1] + 19} textAnchor="middle">{a.label}</text>
                            </g>
                        );
                    })}
                    {phase === 'scanning' && (
                        <polygon className="cw-scan-plane" points={plane}
                            style={{ ['--tx' as string]: `${tx.toFixed(1)}px`, ['--ty' as string]: `${ty.toFixed(1)}px`, animationDuration: `${SCAN_MS}ms` }} />
                    )}
                </svg>
            </div>

            <div className="cw-scan-panel">
                <div className="cw-scan-head">
                    <button type="button" className="cw-btn cw-btn-primary cw-btn-sm" onClick={scan} disabled={phase === 'scanning'}>
                        {phase === 'done' ? <><RotateCw size={15} /> Volver a escanear</> : <><ScanLine size={15} /> {phase === 'scanning' ? 'Escaneando…' : 'Escanear'}</>}
                    </button>
                    <span className="cw-mono cw-gfx-note">Datos de ejemplo</span>
                </div>
                <ol className="cw-findings" aria-live="polite">
                    {rows.map((a, i) => {
                        const hit = found.includes(a.id);
                        return (
                            <li key={a.id} className={hit ? 'is-hit' : ''}>
                                <span className="cw-mono cw-find-n">{phase === 'done' ? `0${i + 1}` : '··'}</span>
                                <span className="cw-find-t">
                                    {hit ? a.finding : 'Sin evaluar'}
                                    <small className="cw-mono">{a.label}</small>
                                </span>
                                {hit ? <span className={`cw-sev sev-${a.sev}`}>{SEV_LABEL[a.sev]}</span> : <span className="cw-sev sev-none">—</span>}
                            </li>
                        );
                    })}
                </ol>
                <p className="cw-scan-plan cw-mono">
                    {phase === 'done' ? 'Plan de remediación · en este orden' : 'Cuatro activos · disparás el escaneo y se ordenan por severidad'}
                </p>
            </div>
        </div>
    );
};

export default ScanDemo;
