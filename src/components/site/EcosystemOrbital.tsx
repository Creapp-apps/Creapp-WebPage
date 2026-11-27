import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    ClipboardCheck,
    Code,
    Megaphone,
    MessageSquare,
    Radar,
    Share2,
    ShieldAlert,
    Sparkles,
    type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    GROUP_LABELS,
    SERVICES,
    servicePath,
    type Service,
    type ServiceGroup,
} from './services';

// "Somos un ecosistema" / selector de servicios: timeline orbital multi-anillo.
// 100% DOM/CSS (liviano, sin WebGL), flota limpio sobre el lienzo. Cada FRENTE
// es una órbita concéntrica propia (Desarrollo · Seguridad · Marketing), girando
// a su velocidad. Nodos solo-ícono (como la referencia 21st.dev): el nombre
// aparece al hover y la ficha completa al tocar, con botón que entra a la página
// del servicio. prefers-reduced-motion: congela.

const FRENTE_HEX: Record<ServiceGroup, string> = {
    desarrollo: '#8B5CF6', // violeta
    seguridad: '#FF2D78', // magenta
    marketing: '#00F0FF', // cian
};

const SERVICE_ICON: Record<string, LucideIcon> = {
    software: Code,
    ia: Sparkles,
    'apis-escala': Share2,
    pentesting: ShieldAlert,
    soc: Radar,
    auditorias: ClipboardCheck,
    community: MessageSquare,
    publicidad: Megaphone,
};

// Servicios excluidos del orbital (redundantes con otras secciones).
const HIDDEN_SLUGS = new Set(['ux-ui']);

// Órbitas, de adentro hacia afuera. radiusFactor ∈ (0,1] sobre el radio máximo.
// speed = grados por tick (50ms); signo = sentido. phase = offset angular inicial.
const ORBITS: { group: ServiceGroup; radiusFactor: number; speed: number; phase: number }[] = [
    { group: 'desarrollo', radiusFactor: 0.46, speed: 0.09, phase: -90 },
    { group: 'seguridad', radiusFactor: 0.73, speed: -0.058, phase: 30 },
    { group: 'marketing', radiusFactor: 1.0, speed: 0.042, phase: 120 },
];

type Placed = {
    s: Service;
    group: ServiceGroup;
    hex: string;
    Icon: LucideIcon;
    orbitRadius: number; // factor
    baseAngle: number; // grados (phase + reparto)
    speed: number;
};

export default function EcosystemOrbital({ radius = 200 }: { radius?: number } = {}) {
    const navigate = useNavigate();
    const [t, setT] = useState(0);
    const [autoRotate, setAutoRotate] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [hovered, setHovered] = useState<string | null>(null);
    // Rotación rígida extra al abrir una ficha: lleva el nodo activo arriba-centro
    // para que la card caiga al medio y nunca desborde la columna.
    const [openDelta, setOpenDelta] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const orbitRef = useRef<HTMLDivElement>(null);

    const reduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Radio efectivo según el ancho del contenedor: nunca desborda.
    const [box, setBox] = useState(0);
    useEffect(() => {
        const el = containerRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(([e]) => setBox(e.contentRect.width));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    const R = box > 0 ? Math.max(110, Math.min(radius, box / 2 - 54)) : radius;

    // Reparte los servicios en sus órbitas (por frente), salteando los ocultos.
    const placed = useMemo<Placed[]>(() => {
        const out: Placed[] = [];
        for (const orbit of ORBITS) {
            const items = SERVICES.filter(
                (s) => s.group === orbit.group && !HIDDEN_SLUGS.has(s.slug),
            );
            items.forEach((s, i) => {
                out.push({
                    s,
                    group: orbit.group,
                    hex: FRENTE_HEX[orbit.group],
                    Icon: SERVICE_ICON[s.slug] ?? Code,
                    orbitRadius: orbit.radiusFactor,
                    baseAngle: orbit.phase + (i / items.length) * 360,
                    speed: orbit.speed,
                });
            });
        }
        return out;
    }, []);

    const relatedOf = (s: Service) =>
        SERVICES.filter((o) => o.group === s.group && o.slug !== s.slug && !HIDDEN_SLUGS.has(o.slug));

    const collapse = () => {
        setExpanded(null);
        setOpenDelta(0);
        setAutoRotate(!reduced);
    };

    const onEmptyClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === containerRef.current || e.target === orbitRef.current) collapse();
    };

    const toggle = (s: Service) => {
        if (expanded === s.slug) {
            collapse();
            return;
        }
        const node = placed.find((p) => p.s.slug === s.slug);
        if (node) {
            // Ángulo actual del nodo → delta rígido para dejarlo arriba-centro (-90°).
            const current = node.baseAngle + t * node.speed;
            setOpenDelta(-90 - current);
        }
        setExpanded(s.slug);
        setAutoRotate(false); // congela todas las órbitas: la ficha queda quieta.
    };

    useEffect(() => {
        if (!autoRotate || reduced) return;
        const id = setInterval(() => setT((p) => p + 1), 50);
        return () => clearInterval(id);
    }, [autoRotate, reduced]);

    const positionOf = (p: Placed) => {
        const angle = ((p.baseAngle + t * p.speed + openDelta) * Math.PI) / 180;
        const rr = R * p.orbitRadius;
        const x = rr * Math.cos(angle);
        const y = rr * Math.sin(angle);
        const zIndex = Math.round(100 + 50 * Math.cos(angle));
        const opacity = Math.max(0.5, Math.min(1, 0.5 + 0.5 * ((1 + Math.sin(angle)) / 2)));
        return { x, y, zIndex, opacity };
    };

    return (
        <div
            ref={containerRef}
            className="relative flex h-full w-full items-center justify-center overflow-visible"
            onClick={onEmptyClick}
        >
            <div
                ref={orbitRef}
                className="absolute flex h-full w-full items-center justify-center"
                style={{ perspective: '1100px' }}
            >
                {/* Anillos guía, uno por órbita/frente. */}
                {ORBITS.map((o) => (
                    <div
                        key={o.group}
                        className="absolute rounded-full border border-dashed"
                        style={{
                            width: R * o.radiusFactor * 2,
                            height: R * o.radiusFactor * 2,
                            borderColor: `${FRENTE_HEX[o.group]}22`,
                        }}
                    />
                ))}

                {/* Núcleo de marca CreAPP. */}
                <div
                    className="absolute z-10 flex h-16 w-16 items-center justify-center rounded-full"
                    style={{
                        background:
                            'radial-gradient(circle at 35% 30%, #a78bfa, #8B5CF6 38%, #FF2D78 72%, #00F0FF 120%)',
                        boxShadow: '0 0 34px 6px rgba(139,92,246,0.5), 0 0 70px 18px rgba(255,45,120,0.22)',
                    }}
                >
                    {!reduced && (
                        <>
                            <span className="absolute h-20 w-20 animate-ping rounded-full border border-white/25 opacity-70" />
                            <span
                                className="absolute h-24 w-24 animate-ping rounded-full border border-white/10 opacity-50"
                                style={{ animationDelay: '0.6s' }}
                            />
                        </>
                    )}
                    <span className="h-7 w-7 rounded-full bg-white/85 backdrop-blur-md" />
                </div>

                {placed.map((p) => {
                    const pos = positionOf(p);
                    const isOpen = expanded === p.s.slug;
                    const isHover = hovered === p.s.slug;
                    const showName = isOpen || isHover;

                    return (
                        <div
                            key={p.s.slug}
                            className="absolute cursor-pointer"
                            style={{
                                transform: `translate(${pos.x}px, ${pos.y}px)`,
                                zIndex: isOpen ? 200 : pos.zIndex,
                                opacity: isOpen ? 1 : pos.opacity,
                                // Sin transición de transform mientras giran (0ms = fluido por tick);
                                // al congelar, el snap arriba-centro anima suave.
                                transition: `opacity 500ms ease, transform ${
                                    autoRotate ? '0ms' : '620ms'
                                } cubic-bezier(0.22, 1, 0.36, 1)`,
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                toggle(p.s);
                            }}
                            onMouseEnter={() => setHovered(p.s.slug)}
                            onMouseLeave={() => setHovered((h) => (h === p.s.slug ? null : h))}
                        >
                            {/* Halo del nodo en el color del frente. */}
                            <div
                                className="absolute rounded-full"
                                style={{
                                    width: 56,
                                    height: 56,
                                    left: -8,
                                    top: -8,
                                    background: `radial-gradient(circle, ${p.hex}44 0%, ${p.hex}00 70%)`,
                                }}
                            />

                            {/* El nodo (solo ícono). */}
                            <div
                                className="flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300"
                                style={{
                                    borderColor: p.hex,
                                    background: isOpen ? p.hex : 'rgba(5,7,15,0.85)',
                                    color: isOpen ? '#05070f' : p.hex,
                                    transform: isOpen ? 'scale(1.4)' : isHover ? 'scale(1.12)' : 'scale(1)',
                                    boxShadow: isOpen ? `0 0 18px ${p.hex}88` : `0 0 10px ${p.hex}33`,
                                }}
                            >
                                <p.Icon size={16} />
                            </div>

                            {/* Nombre: solo al hover o abierto (no permanente → anillos limpios). */}
                            {showName && !isOpen && (
                                <div
                                    className="pointer-events-none absolute top-12 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold tracking-wider text-white"
                                    style={{ textShadow: '0 1px 8px #05070f, 0 1px 2px #05070f' }}
                                >
                                    {p.s.title}
                                </div>
                            )}

                            {isOpen && (
                                <Card className="absolute top-14 left-1/2 w-72 -translate-x-1/2 overflow-visible border-white/15 bg-[rgba(10,12,22,0.92)] text-white shadow-xl backdrop-blur-lg">
                                    <div
                                        className="absolute -top-3 left-1/2 h-3 w-px -translate-x-1/2"
                                        style={{ background: `${p.hex}88` }}
                                    />
                                    <CardHeader className="pb-2">
                                        <Badge
                                            className="w-fit px-2 text-[10px] uppercase tracking-wider"
                                            style={{ background: `${p.hex}22`, color: p.hex, borderColor: `${p.hex}66` }}
                                        >
                                            {GROUP_LABELS[p.group]}
                                        </Badge>
                                        <CardTitle className="mt-2 text-sm text-white">{p.s.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-xs text-white/75">
                                        <p className="leading-relaxed">{p.s.eyebrow}</p>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="mt-4 h-8 w-full justify-between border-white/20 bg-transparent text-white hover:bg-white/10"
                                            style={{ borderColor: `${p.hex}55` }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(servicePath(p.s));
                                            }}
                                        >
                                            Entrar
                                            <ArrowRight size={14} style={{ color: p.hex }} />
                                        </Button>

                                        {relatedOf(p.s).length > 0 && (
                                            <div className="mt-4 border-t border-white/10 pt-3">
                                                <h4 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-white/55">
                                                    {GROUP_LABELS[p.group]} · también
                                                </h4>
                                                <div className="flex flex-wrap gap-1">
                                                    {relatedOf(p.s).map((r) => (
                                                        <Button
                                                            key={r.slug}
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-6 rounded-full border-white/15 bg-transparent px-2 py-0 text-[11px] text-white/80 hover:bg-white/10 hover:text-white"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggle(r);
                                                            }}
                                                        >
                                                            {r.title}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
