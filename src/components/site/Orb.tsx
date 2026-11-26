import React, { useEffect, useRef } from 'react';
import { GROUP_LABELS, type ServiceGroup } from './services';
import { onThemeChange, readToken } from './theme';

/**
 * Orbe stipple interactivo (canvas 2D, sin WebGL: un solo contexto liviano).
 * - Arrastrar = gira (con inercia). Hover = separa los puntos. Click = onda.
 * - Tres nodos rotulados = los 3 frentes: un solo sistema.
 * - Lee los tokens del tema y recolorea. Pausa fuera de viewport / pestaña oculta.
 * - prefers-reduced-motion: frame fijo; solo se redibuja cuando el usuario lo mueve.
 */

type RGB = [number, number, number];

function parseColor(v: string, fallback: RGB): RGB {
    const s = v.trim();
    if (s.startsWith('#')) {
        const h = s.length === 4 ? s.slice(1).split('').map((c) => c + c).join('') : s.slice(1, 7);
        const n = parseInt(h, 16);
        if (!Number.isNaN(n)) return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    const m = s.match(/(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)/);
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : fallback;
}

const BUCKETS = 14;
const TILT = 0.38;

interface Wave { ox: number; oy: number; oz: number; t0: number }

export const Orb: React.FC<{ className?: string }> = ({ className }) => {
    const wrapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const wrap = wrapRef.current;
        const canvas = canvasRef.current;
        if (!wrap || !canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const coarse = window.matchMedia('(pointer: coarse)').matches;
        const N = coarse ? 1500 : 2600;

        // Esfera de Fibonacci (distribución pareja = look stipple).
        const bx = new Float32Array(N), by = new Float32Array(N), bz = new Float32Array(N);
        const bucket = new Uint8Array(N);
        const jitter = new Float32Array(N);
        const ox = new Float32Array(N), oy = new Float32Array(N); // desplazamiento hover (suavizado)
        const golden = Math.PI * (3 - Math.sqrt(5));
        for (let i = 0; i < N; i++) {
            const y = 1 - (i / (N - 1)) * 2;
            const r = Math.sqrt(1 - y * y);
            const th = golden * i;
            bx[i] = Math.cos(th) * r; by[i] = y; bz[i] = Math.sin(th) * r;
            // Gradiente pegado a la esfera: violeta arriba-izquierda → magenta abajo-derecha.
            const g = Math.min(1, Math.max(0, (bx[i] * 0.55 - y * 0.75 + 1) / 2));
            bucket[i] = Math.min(BUCKETS - 1, Math.floor(g * BUCKETS));
            jitter[i] = 0.75 + ((i * 9301 + 49297) % 233280) / 233280 * 0.6;
        }

        // Nodos de los 3 frentes, repartidos sobre la esfera.
        const FRENTES: ServiceGroup[] = ['desarrollo', 'seguridad', 'marketing'];
        const nodes = FRENTES.map((g, i) => {
            const lat = (i % 2 === 0 ? 0.42 : -0.38) + (i % 3) * 0.06;
            const lon = (i / FRENTES.length) * Math.PI * 2;
            const r = Math.cos(lat);
            const label = g === 'marketing' ? 'MARKETING' : GROUP_LABELS[g].toUpperCase();
            return { label, x: Math.cos(lon) * r, y: Math.sin(lat), z: Math.sin(lon) * r };
        });

        let palette: string[] = [];
        let ink: RGB = [244, 246, 252];
        let accent: RGB = [139, 92, 246];
        let dark = true;
        const loadTheme = () => {
            accent = parseColor(readToken('--accent'), [139, 92, 246]);
            const a2 = parseColor(readToken('--accent-2'), [255, 45, 120]);
            ink = parseColor(readToken('--ink'), [244, 246, 252]);
            dark = document.documentElement.getAttribute('data-theme') !== 'light';
            palette = Array.from({ length: BUCKETS }, (_, k) => {
                const t = k / (BUCKETS - 1);
                const c = accent.map((v, j) => Math.round(v + (a2[j] - v) * t));
                return `rgb(${c[0]},${c[1]},${c[2]})`;
            });
        };
        loadTheme();

        let w = 0, h = 0, dpr = 1, R = 0, cx = 0, cy = 0;
        const resize = () => {
            const rect = wrap.getBoundingClientRect();
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = rect.width; h = rect.height;
            canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
            R = Math.min(w, h) * 0.39;
            cx = w / 2; cy = h / 2;
        };

        // Estado de interacción
        let rotY = 0.6, rotX = TILT;
        let vY = reduced ? 0 : 0.0022, vX = 0;
        let dragging = false, moved = 0, lastX = 0, lastY = 0;
        let px = -9999, py = -9999;
        const waves: Wave[] = [];
        let raf = 0, visible = true, running = false;
        const t0 = performance.now();

        const draw = (now: number) => {
            const time = (now - t0) / 1000;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, w, h);

            const cyR = Math.cos(rotY), syR = Math.sin(rotY);
            const cxR = Math.cos(rotX), sxR = Math.sin(rotX);
            const breath = reduced ? 1 : 1 + Math.sin(time * 0.8) * 0.012;
            const hoverR = R * 0.42;
            const live = waves.filter((wv) => now - wv.t0 < 2200);
            waves.length = 0; waves.push(...live);

            for (let i = 0; i < N; i++) {
                // Onda: anillo que viaja por la superficie desde el punto clickeado.
                let radial = breath;
                for (let k = 0; k < waves.length; k++) {
                    const wv = waves[k];
                    const age = (now - wv.t0) / 2200;
                    const d = Math.acos(Math.max(-1, Math.min(1, bx[i] * wv.ox + by[i] * wv.oy + bz[i] * wv.oz)));
                    const front = age * Math.PI * 1.15;
                    const g = (d - front) / 0.22;
                    radial += 0.16 * Math.exp(-g * g) * (1 - age);
                }
                // Rotación Y, luego X.
                const x1 = bx[i] * cyR + bz[i] * syR;
                const z1 = -bx[i] * syR + bz[i] * cyR;
                const y2 = by[i] * cxR - z1 * sxR;
                const z2 = by[i] * sxR + z1 * cxR;
                const persp = 1 / (1 - z2 * 0.22);
                let sx = cx + x1 * R * radial * persp;
                let sy = cy + y2 * R * radial * persp;

                // Hover: los puntos se abren alrededor del cursor.
                let tx = 0, ty = 0;
                const ddx = sx - px, ddy = sy - py;
                const dist2 = ddx * ddx + ddy * ddy;
                if (dist2 < hoverR * hoverR && z2 > -0.2) {
                    const dist = Math.sqrt(dist2) || 1;
                    const f = 1 - dist / hoverR;
                    const push = f * f * R * 0.2;
                    tx = (ddx / dist) * push; ty = (ddy / dist) * push;
                }
                ox[i] += (tx - ox[i]) * 0.14; oy[i] += (ty - oy[i]) * 0.14;
                sx += ox[i]; sy += oy[i];

                const depth = (z2 + 1) / 2; // 0 atrás, 1 adelante
                const size = (0.55 + depth * 1.25) * jitter[i] * (R / 300 + 0.45);
                ctx.globalAlpha = dark ? 0.1 + depth * depth * 0.9 : 0.22 + depth * depth * 0.78;
                ctx.fillStyle = palette[bucket[i]];
                ctx.beginPath();
                ctx.arc(sx, sy, size, 0, 6.2832);
                ctx.fill();
            }

            // Nodos de área: solo los que miran al frente llevan rótulo.
            ctx.font = `500 ${w < 420 ? 10 : 11}px "Geist Mono", ui-monospace, monospace`;
            ctx.textBaseline = 'middle';
            for (const n of nodes) {
                const x1 = n.x * cyR + n.z * syR;
                const z1 = -n.x * syR + n.z * cyR;
                const y2 = n.y * cxR - z1 * sxR;
                const z2 = n.y * sxR + z1 * cxR;
                if (z2 < 0.05) continue;
                const persp = 1 / (1 - z2 * 0.22);
                const sx = cx + x1 * R * breath * persp, sy = cy + y2 * R * breath * persp;
                const a = Math.min(1, (z2 - 0.05) / 0.35);
                const side = x1 >= 0 ? 1 : -1;
                const ex = cx + x1 * R * 1.22 + side * 14, ey = cy + y2 * R * 1.22;
                ctx.globalAlpha = a * 0.55;
                ctx.strokeStyle = `rgb(${ink[0]},${ink[1]},${ink[2]})`;
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
                ctx.globalAlpha = a;
                ctx.fillStyle = dark ? '#05070F' : '#FFFFFF';
                ctx.beginPath(); ctx.arc(sx, sy, 5, 0, 6.2832); ctx.fill();
                ctx.strokeStyle = `rgb(${ink[0]},${ink[1]},${ink[2]})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.arc(sx, sy, 5, 0, 6.2832); ctx.stroke();
                ctx.fillStyle = `rgb(${ink[0]},${ink[1]},${ink[2]})`;
                // El rótulo nunca se sale del canvas.
                const tw = ctx.measureText(n.label).width;
                let lx = side > 0 ? ex + 6 : ex - 6 - tw;
                lx = Math.max(6, Math.min(w - tw - 6, lx));
                ctx.textAlign = 'left';
                ctx.fillText(n.label, lx, ey);
            }
            ctx.globalAlpha = 1;
        };

        const settled = () =>
            Math.abs(vY) < 0.0002 && Math.abs(vX) < 0.0002 && waves.length === 0 && px < -9000;

        const frame = (now: number) => {
            if (!dragging) {
                rotY += vY; rotX += vX;
                // Inercia: vuelve al giro de reposo y a la inclinación base.
                const rest = reduced ? 0 : 0.0022;
                vY += (rest - vY) * 0.03; vX *= 0.93;
                rotX += (TILT - rotX) * 0.012;
            }
            rotX = Math.max(-1.1, Math.min(1.1, rotX));
            draw(now);
            if (reduced && !dragging && settled()) { running = false; return; }
            raf = requestAnimationFrame(frame);
        };
        const start = () => {
            if (running || !visible || document.hidden) return;
            running = true;
            raf = requestAnimationFrame(frame);
        };
        const stop = () => { running = false; cancelAnimationFrame(raf); };

        const local = (e: PointerEvent) => {
            const r = canvas.getBoundingClientRect();
            return [e.clientX - r.left, e.clientY - r.top] as const;
        };
        const onDown = (e: PointerEvent) => {
            dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY;
            canvas.setPointerCapture(e.pointerId);
            wrap.classList.add('is-dragging');
            start();
        };
        const onMove = (e: PointerEvent) => {
            const [lx, ly] = local(e);
            if (e.pointerType === 'mouse' && !reduced) { px = lx; py = ly; }
            if (!dragging) return;
            const dx = e.clientX - lastX, dy = e.clientY - lastY;
            lastX = e.clientX; lastY = e.clientY;
            moved += Math.abs(dx) + Math.abs(dy);
            vY = dx * 0.006; vX = dy * 0.006;
            rotY += vY; rotX += vX;
        };
        const onUp = (e: PointerEvent) => {
            if (!dragging) return;
            dragging = false;
            wrap.classList.remove('is-dragging');
            wrap.classList.add('is-touched');
            if (moved < 6) {
                // Click: onda desde el punto de la esfera bajo el cursor.
                const [lx, ly] = local(e);
                const nx = (lx - cx) / R, ny = (ly - cy) / R;
                const d2 = nx * nx + ny * ny;
                const vx = d2 > 1 ? nx / Math.sqrt(d2) : nx;
                const vy = d2 > 1 ? ny / Math.sqrt(d2) : ny;
                const vz = d2 > 1 ? 0 : Math.sqrt(1 - d2);
                // Inversa de la rotación (X y después Y) para pasar a espacio del objeto.
                const cxR = Math.cos(rotX), sxR = Math.sin(rotX), cyR = Math.cos(rotY), syR = Math.sin(rotY);
                const y1 = vy * cxR + vz * sxR, z1 = -vy * sxR + vz * cxR;
                waves.push({ ox: vx * cyR - z1 * syR, oy: y1, oz: vx * syR + z1 * cyR, t0: performance.now() });
                if (waves.length > 4) waves.shift();
            }
            if (e.pointerType !== 'mouse') { px = -9999; py = -9999; }
            start();
        };
        const onLeave = () => { px = -9999; py = -9999; };

        canvas.addEventListener('pointerdown', onDown);
        canvas.addEventListener('pointermove', onMove);
        canvas.addEventListener('pointerup', onUp);
        canvas.addEventListener('pointercancel', onUp);
        canvas.addEventListener('pointerleave', onLeave);

        const ro = new ResizeObserver(() => { resize(); if (!running) draw(performance.now()); });
        ro.observe(wrap);
        const io = new IntersectionObserver(([en]) => {
            visible = en.isIntersecting;
            if (visible) start(); else stop();
        }, { threshold: 0.05 });
        io.observe(wrap);
        const onVis = () => { if (document.hidden) stop(); else start(); };
        document.addEventListener('visibilitychange', onVis);
        const offTheme = onThemeChange(() => { loadTheme(); if (!running) draw(performance.now()); });
        // La fuente mono puede llegar después del primer frame.
        document.fonts?.load('500 11px "Geist Mono"').then(() => { if (!running) draw(performance.now()); }).catch(() => {});

        resize();
        draw(performance.now());
        start();

        return () => {
            stop(); ro.disconnect(); io.disconnect(); offTheme();
            document.removeEventListener('visibilitychange', onVis);
            canvas.removeEventListener('pointerdown', onDown);
            canvas.removeEventListener('pointermove', onMove);
            canvas.removeEventListener('pointerup', onUp);
            canvas.removeEventListener('pointercancel', onUp);
            canvas.removeEventListener('pointerleave', onLeave);
        };
    }, []);

    return (
        <div ref={wrapRef} className={`cw-orb ${className ?? ''}`}>
            <canvas
                ref={canvasRef}
                role="img"
                aria-label="Esfera de puntos interactiva con los tres frentes de CreAPP: desarrollo, seguridad y marketing."
            />
            <span className="cw-orb-hint cw-mono" aria-hidden="true">
                Arrastrá para girar · click para una onda
            </span>
        </div>
    );
};

export default Orb;
