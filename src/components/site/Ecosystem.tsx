import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { Billboard, Html, Line, Stars, useTexture } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';
import { GROUP_LABELS, SERVICES, servicePath, type Service, type ServiceGroup } from './services';

// "Somos un ecosistema": CreAPP como una galaxia 3D real (Three.js / R3F) que
// abarca todo lo digital. Núcleo-sol emisivo con bloom (el logo) y las áreas
// orbitando como planetas en discos inclinados — pasan por detrás del sol
// (profundidad real). Etiquetas drei <Html> siempre derechas y clickeables →
// su página de servicio. Colores por frente. prefers-reduced-motion: congela.

// Colores de marca (Three no lee CSS vars; se fijan en hex).
const FRENTE_HEX: Record<ServiceGroup, string> = {
    desarrollo: '#8B5CF6', // violeta
    seguridad: '#FF2D78',  // magenta
    marketing: '#00F0FF',  // cian
};

const PLANET_LABEL: Record<string, string> = {
    software: 'Software',
    ia: 'IA',
    'apis-escala': 'APIs',
    pentesting: 'Pentesting',
    soc: 'SOC',
    auditorias: 'Auditorías',
    community: 'Contenidos',
    publicidad: 'Ads',
};

// Tres discos orbitales inclinados (galaxia). radio en unidades 3D; tilt = euler
// del disco; speed = rad/s (signo = sentido).
const RINGS: { radius: number; tilt: [number, number, number]; speed: number; from: number; to: number }[] = [
    { radius: 2.1, tilt: [0.5, 0, 0.18], speed: 0.16, from: 0, to: 3 },
    { radius: 3.25, tilt: [0.62, 0, -0.24], speed: -0.1, from: 3, to: 6 },
    { radius: 4.5, tilt: [0.42, 0, 0.34], speed: 0.07, from: 6, to: 9 },
];

const REDUCED =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function circlePoints(r: number, seg = 160): THREE.Vector3[] {
    const a: THREE.Vector3[] = [];
    for (let i = 0; i <= seg; i++) {
        const t = (i / seg) * Math.PI * 2;
        a.push(new THREE.Vector3(Math.cos(t) * r, 0, Math.sin(t) * r));
    }
    return a;
}

// Textura de glow radial (para el fulgor del sol).
function makeGlowTexture(inner: string, mid: string): THREE.Texture {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, inner);
    g.addColorStop(0.28, mid);
    g.addColorStop(1, 'rgba(139,92,246,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

const Planet: React.FC<{ s: Service; radius: number; angle0: number; onPick: (s: Service) => void }> = ({
    s,
    radius,
    angle0,
    onPick,
}) => {
    const color = FRENTE_HEX[s.group];
    const pos = useMemo<[number, number, number]>(
        () => [Math.cos(angle0) * radius, 0, Math.sin(angle0) * radius],
        [angle0, radius],
    );
    const go = () => onPick(s);
    return (
        <group position={pos}>
            <mesh>
                <sphereGeometry args={[0.13, 24, 24]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.4} toneMapped={false} />
            </mesh>
            <Html center distanceFactor={11} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
                <button
                    type="button"
                    className="cw-galaxy-label"
                    style={{ ['--c' as string]: color, pointerEvents: 'auto' }}
                    aria-label={`${s.title} — ${GROUP_LABELS[s.group]}`}
                    onClick={go}
                >
                    <span className="cw-galaxy-dot" />
                    {PLANET_LABEL[s.slug] ?? s.title}
                </button>
            </Html>
        </group>
    );
};

const Ring: React.FC<{
    radius: number;
    tilt: [number, number, number];
    speed: number;
    planets: { s: Service; angle0: number }[];
    onPick: (s: Service) => void;
}> = ({ radius, tilt, speed, planets, onPick }) => {
    const spin = useRef<THREE.Group>(null);
    const pts = useMemo(() => circlePoints(radius), [radius]);
    useFrame((_, dt) => {
        if (spin.current && !REDUCED) spin.current.rotation.y += speed * Math.min(dt, 0.05);
    });
    return (
        <group rotation={tilt}>
            <group ref={spin}>
                <Line points={pts} color="#8FA0C8" transparent opacity={0.12} lineWidth={1} />
                {planets.map((p) => (
                    <Planet key={`${p.s.group}-${p.s.slug}`} s={p.s} radius={radius} angle0={p.angle0} onPick={onPick} />
                ))}
            </group>
        </group>
    );
};

const Sun: React.FC = () => {
    const logo = useTexture('/CREAPP%20LOGO%20VECTOR.png');
    const glow = useMemo(() => makeGlowTexture('rgba(255,255,255,0.95)', 'rgba(139,92,246,0.75)'), []);
    const coreRef = useRef<THREE.Mesh>(null);
    useFrame(({ clock }) => {
        if (coreRef.current && !REDUCED) {
            const s = 1 + Math.sin(clock.elapsedTime * 1.4) * 0.05;
            coreRef.current.scale.setScalar(s);
        }
    });
    return (
        <group>
            {/* Núcleo emisivo (dispara el bloom) */}
            <mesh ref={coreRef}>
                <sphereGeometry args={[0.42, 32, 32]} />
                <meshStandardMaterial color="#ffffff" emissive="#C4B5FD" emissiveIntensity={3} toneMapped={false} />
            </mesh>
            {/* Fulgor */}
            <Billboard>
                <mesh>
                    <planeGeometry args={[5.2, 5.2]} />
                    <meshBasicMaterial map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
                </mesh>
            </Billboard>
            {/* Logo al frente, siempre de cara */}
            <Billboard>
                <mesh position={[0, 0, 0.01]}>
                    <planeGeometry args={[1.2, 1.56]} />
                    <meshBasicMaterial map={logo} transparent depthWrite={false} toneMapped={false} />
                </mesh>
            </Billboard>
        </group>
    );
};

const GalaxyGroup: React.FC<{ onPick: (s: Service) => void }> = ({ onPick }) => {
    const root = useRef<THREE.Group>(null);
    useFrame(({ clock }) => {
        if (root.current && !REDUCED) {
            // Deriva lenta del disco galáctico.
            root.current.rotation.z = Math.sin(clock.elapsedTime * 0.08) * 0.04;
        }
    });
    const rings = useMemo(
        () =>
            RINGS.map((ring) => {
                const items = SERVICES.slice(ring.from, ring.to);
                return {
                    ...ring,
                    planets: items.map((s, j) => ({ s, angle0: (j / items.length) * Math.PI * 2 })),
                };
            }),
        [],
    );
    return (
        <group ref={root}>
            <Sun />
            {rings.map((ring) => (
                <Ring key={ring.radius} radius={ring.radius} tilt={ring.tilt} speed={ring.speed} planets={ring.planets} onPick={onPick} />
            ))}
        </group>
    );
};

export const Ecosystem: React.FC = () => {
    const navigate = useNavigate();
    const onPick = (s: Service) => navigate(servicePath(s));
    const wrapRef = useRef<HTMLDivElement>(null);
    const [near, setNear] = useState(false); // alguna vez cerca → crea el contexto WebGL
    const [inView, setInView] = useState(false); // visible ahora → corre el render loop

    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;
        const io = new IntersectionObserver(
            (entries) => {
                const e = entries[0];
                if (e.isIntersecting) setNear(true);
                setInView(e.isIntersecting);
            },
            { rootMargin: '250px' },
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);

    return (
        <div ref={wrapRef} className="cw-galaxy-gl-wrap">
            {near && (
                <Canvas
                    className="cw-galaxy-gl"
                    frameloop={inView ? 'always' : 'never'}
                    dpr={[1, 1.75]}
                    camera={{ position: [0, 2.4, 9.2], fov: 44 }}
                    gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
                    style={{ background: 'transparent' }}
                >
                    <ambientLight intensity={0.3} />
                    <Suspense fallback={null}>
                        <Stars radius={60} depth={40} count={2600} factor={3.5} saturation={0} fade speed={REDUCED ? 0 : 0.6} />
                        <GalaxyGroup onPick={onPick} />
                        <EffectComposer>
                            <Bloom intensity={1.25} luminanceThreshold={0.22} luminanceSmoothing={0.9} mipmapBlur />
                        </EffectComposer>
                    </Suspense>
                </Canvas>
            )}
        </div>
    );
};

export default Ecosystem;
