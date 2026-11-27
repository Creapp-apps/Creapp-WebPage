// RocketHero — SPIKE / prototipo descartable (2026-11-27).
// Cohete de marca 3D procedural (three.js crudo, sin modelos ni texturas) que arranca
// desarmado y se ensambla solo al cargar. Arrastrá = orbitar · Click = re-ensamblar.
// Mismo paradigma que TriFrontPavilion3D. NO es código final: sin tests, para decidir.

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export default function RocketHero({ height = '100%', className }: { height?: number | string; className?: string }) {
    const rootRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        let dispose: (() => void) | undefined;
        let cancelled = false;
        document.fonts.ready.then(() => {
            if (cancelled) return;
            dispose = initRocket(root);
        });
        return () => { cancelled = true; dispose?.(); };
    }, []);
    return (
        <div ref={rootRef} className={['rocket-hero', className].filter(Boolean).join(' ')} style={{ height }}>
            <style dangerouslySetInnerHTML={{ __html: STYLES }} />
            <div id="rkscene" role="img" aria-label="Cohete 3D de CreAPP que se ensambla a partir de sus piezas. Arrastrá para girar, tocá para re-ensamblar." />
            <div className="rk-fallback" aria-hidden="true">🚀</div>
        </div>
    );
}

const VIOLET = 0x8b5cf6, MAGENTA = 0xff2d78, CYAN = 0x00f0ff;
const easeOutBack = (x: number) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

type Part = { mesh: THREE.Object3D; to: THREE.Vector3; from: THREE.Vector3; delay: number; flash?: THREE.MeshStandardMaterial; baseEmissive?: number };

function initRocket(root: HTMLElement): () => void {
    const cleanups: Array<() => void> = [];
    const fw = () => root.clientWidth;
    const fh = () => root.clientHeight;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, fw() / fh(), 0.1, 100);
    camera.position.set(0, 0.2, 10.9);
    camera.lookAt(0, 0.1, 0);

    let renderer: THREE.WebGLRenderer;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) {
        root.classList.add('rk-nogl');
        return () => {};
    }
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(devicePixelRatio, fw() < 900 ? 1.5 : 1.75));
    renderer.setSize(fw(), fh());
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    const sceneEl = root.querySelector('#rkscene') as HTMLElement;
    sceneEl.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.enablePan = false; controls.enableZoom = false;
    controls.rotateSpeed = 0.55;
    controls.target.set(0, 0.1, 0);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04);
    scene.environment = env.texture;
    scene.environmentIntensity = 0.55;
    room.dispose(); pmrem.dispose();

    scene.add(new THREE.HemisphereLight(0xcfd6ff, 0x1a1626, 1.4));
    const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(-4, 7, 6); scene.add(key);
    const rim = new THREE.DirectionalLight(0xb9a6ff, 2.2); rim.position.set(5, 3, -6); scene.add(rim);
    const flameLight = new THREE.PointLight(VIOLET, 0, 8, 2); flameLight.position.set(0, -1.9, 0); scene.add(flameLight);

    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const disposables: Array<{ dispose: () => void }> = [];
    const track = <T extends THREE.BufferGeometry | THREE.Material>(x: T): T => { disposables.push(x); return x; };
    const std = (o: THREE.MeshStandardMaterialParameters) => track(new THREE.MeshStandardMaterial(o));

    // ── Cohete (apunta a +Y). Grupo que luego flota/gira. ──
    const rocket = new THREE.Group();
    scene.add(rocket);
    const parts: Part[] = [];
    const add = (mesh: THREE.Object3D, from: [number, number, number], delay: number, flashMat?: THREE.MeshStandardMaterial) => {
        const to = mesh.position.clone();
        parts.push({ mesh, to, from: new THREE.Vector3(...from), delay, flash: flashMat, baseEmissive: flashMat?.emissiveIntensity });
        rocket.add(mesh);
        return mesh;
    };

    const TAU = Math.PI * 2;
    const coneGeo = (r: number, h: number, s = 40) => track(new THREE.ConeGeometry(r, h, s));
    const cylGeo = (rt: number, rb: number, h: number, s = 48) => track(new THREE.CylinderGeometry(rt, rb, h, s));
    const torusGeo = (r: number, t: number, rs: number, ts: number) => track(new THREE.TorusGeometry(r, t, rs, ts));
    const sphGeo = (r: number) => track(new THREE.SphereGeometry(r, 10, 8));

    const bodyMat = std({ color: 0x242b43, metalness: 0.6, roughness: 0.38 });
    const chromeMat = std({ color: 0xb9c1cd, metalness: 0.95, roughness: 0.22 });
    const seamMat = std({ color: 0x11151e, metalness: 0.55, roughness: 0.55 });
    const bandMat = std({ color: 0x160b2c, emissive: VIOLET, emissiveIntensity: 1.4, metalness: 0.3, roughness: 0.5 });
    const noseMat = std({ color: 0x2a1030, emissive: MAGENTA, emissiveIntensity: 0.5, metalness: 0.5, roughness: 0.3 });
    const finMat = std({ color: 0x3a1030, emissive: MAGENTA, emissiveIntensity: 0.55, metalness: 0.45, roughness: 0.34 });
    const nozzleMat = std({ color: 0x14171f, metalness: 0.85, roughness: 0.3 });
    const glassMat = std({ color: 0x06161c, emissive: CYAN, emissiveIntensity: 0.95, metalness: 0.4, roughness: 0.15 });

    // ── Fuselaje: cilindro con chapas (costuras) + tornillos + collar de nariz ──
    const bodyGroup = new THREE.Group();
    const bodyCyl = new THREE.Mesh(cylGeo(0.58, 0.62, 2.2, 48), bodyMat);
    bodyGroup.add(bodyCyl);
    const seam = (y: number, r: number) => { const s = new THREE.Mesh(torusGeo(r, 0.016, 8, 48), seamMat); s.rotation.x = Math.PI / 2; s.position.y = y; bodyGroup.add(s); };
    seam(0.62, 0.6); seam(-0.1, 0.61); seam(-0.72, 0.615);
    const boltRing = (y: number, r: number, n: number) => { for (let j = 0; j < n; j++) { const th = (j / n) * TAU; const bolt = new THREE.Mesh(sphGeo(0.021), chromeMat); bolt.position.set(Math.cos(th) * r, y, Math.sin(th) * r); bodyGroup.add(bolt); } };
    boltRing(0.62, 0.61, 16); boltRing(-0.72, 0.625, 16);
    const collar = new THREE.Mesh(torusGeo(0.6, 0.05, 10, 40), chromeMat); collar.rotation.x = Math.PI / 2; collar.position.y = 1.08; bodyGroup.add(collar);
    bodyGroup.position.set(0, 0.1, 0);
    add(bodyGroup, [0, -1.9, 0], 0);

    // Banda neón violeta — llega desde arriba.
    const band = new THREE.Mesh(torusGeo(0.63, 0.07, 16, 48), bandMat);
    band.rotation.x = Math.PI / 2; band.position.set(0, 0.6, 0);
    add(band, [0, 3.6, 0], 0.5, bandMat);

    // Ventanilla: marco cromado + vidrio cian + 4 tornillos — entra desde el frente.
    const winGroup = new THREE.Group();
    const winFrame = new THREE.Mesh(torusGeo(0.17, 0.045, 12, 32), chromeMat);
    const winGlass = new THREE.Mesh(track(new THREE.CircleGeometry(0.155, 32)), glassMat);
    winGlass.position.z = -0.02;
    winGroup.add(winFrame, winGlass);
    for (let j = 0; j < 6; j++) { const th = (j / 6) * TAU; const b = new THREE.Mesh(sphGeo(0.016), chromeMat); b.position.set(Math.cos(th) * 0.185, Math.sin(th) * 0.185, 0.01); winGroup.add(b); }
    winGroup.position.set(0, 0.82, 0.58); winGroup.lookAt(0, 0.82, 4);
    add(winGroup, [0, 0.82, 3.4], 0.78, glassMat);

    // Nariz / cono — magenta, cae desde arriba con giro.
    const nose = new THREE.Mesh(coneGeo(0.6, 1.2, 44), noseMat);
    nose.position.set(0, 1.78, 0);
    add(nose, [0.4, 4.8, 0.2], 0.22, noseMat);

    // Aletas (3) — ensambladas al fuselaje: raíz embebida en el cuerpo, en plano radial.
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0.9); finShape.lineTo(0, -0.12); finShape.lineTo(0.92, -0.55); finShape.lineTo(0.58, 0.14); finShape.closePath();
    const finGeo = track(new THREE.ExtrudeGeometry(finShape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1 }));
    finGeo.translate(0, 0, -0.05);
    for (let i = 0; i < 3; i++) {
        const a = (i / 3) * TAU;
        const fin = new THREE.Mesh(finGeo, finMat);
        fin.rotation.y = a;
        fin.position.set(Math.cos(a) * 0.46, -0.45, -Math.sin(a) * 0.46);
        const from: [number, number, number] = [Math.cos(a) * 3.4, -0.45, -Math.sin(a) * 3.4];
        add(fin, from, 0.34 + i * 0.08, finMat);
    }

    // Motor / tobera — metálica oscura con reborde, sube desde abajo.
    const nozzle = new THREE.Group();
    nozzle.add(new THREE.Mesh(cylGeo(0.42, 0.6, 0.55, 40), nozzleMat));
    const nozzleRim = new THREE.Mesh(torusGeo(0.42, 0.035, 10, 36), chromeMat); nozzleRim.rotation.x = Math.PI / 2; nozzleRim.position.y = 0.27; nozzle.add(nozzleRim);
    nozzle.position.set(0, -1.28, 0);
    add(nozzle, [0, -4.4, 0], 0.62);

    // Llama + estela (emisiva aditiva) — más corta, se "enciende" al final.
    const flame = new THREE.Group();
    const flameCone = new THREE.Mesh(coneGeo(0.32, 0.95, 24), track(new THREE.MeshBasicMaterial({ color: VIOLET, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })));
    flameCone.rotation.x = Math.PI; flameCone.position.set(0, -1.95, 0);
    const flameCore = new THREE.Mesh(coneGeo(0.16, 0.6, 20), track(new THREE.MeshBasicMaterial({ color: 0xe9d5ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })));
    flameCore.rotation.x = Math.PI; flameCore.position.set(0, -1.8, 0);
    flame.add(flameCone, flameCore);
    rocket.add(flame);

    // ── Ensamblado ──
    let assembleStart = performance.now() + 250; // pequeño beat antes de armar
    const DUR = 900; // ms por pieza
    const total = () => 250 + (parts.reduce((m, p) => Math.max(m, p.delay), 0) * 1000) + DUR;

    const applyAssembly = (now: number) => {
        const t = now - assembleStart;
        let allDone = true;
        for (const p of parts) {
            const local = clamp01((t - p.delay * 1000) / DUR);
            if (local < 1) allDone = false;
            if (t < 0) { p.mesh.position.copy(p.from); (p.mesh as THREE.Mesh).scale.setScalar(0.6); p.mesh.visible = false; continue; }
            p.mesh.visible = true;
            const e = reduceMotion ? 1 : easeOutBack(local);
            p.mesh.position.lerpVectors(p.from, p.to, e);
            const s = 0.6 + 0.4 * clamp01(local * 1.4);
            (p.mesh as THREE.Mesh).scale.setScalar(s);
            // flash al encastrar
            if (p.flash && p.baseEmissive != null) {
                const f = local > 0.72 && local < 1 ? (1 - Math.abs((local - 0.86) / 0.14)) : 0;
                p.flash.emissiveIntensity = p.baseEmissive * (1 + f * 1.8);
            }
        }
        return allDone;
    };

    // ── Loop ──
    const clock = new THREE.Clock();
    let assembled = false;
    let raf = 0; let running = true;
    const renderOnce = () => {
        const now = performance.now();
        const dt = clock.getDelta();
        const done = applyAssembly(now);
        if (done && !assembled) assembled = true;

        if (!reduceMotion) {
            if (assembled) {
                rocket.rotation.y += dt * 0.35;
                rocket.position.y = Math.sin(now * 0.0013) * 0.12;
                rocket.position.x = Math.sin(now * 0.0009) * 0.04;
            }
            // llama encendida tras ensamblar
            const on = assembled ? 1 : clamp01((now - assembleStart - (total() - 400)) / 400);
            const flick = 0.75 + Math.sin(now * 0.05) * 0.12 + Math.sin(now * 0.11) * 0.08;
            (flameCone.material as THREE.MeshBasicMaterial).opacity = on * 0.6 * flick;
            (flameCore.material as THREE.MeshBasicMaterial).opacity = on * 0.8 * flick;
            flame.scale.y = (0.8 + flick * 0.5);
            flameLight.intensity = on * (6 + flick * 4);
        } else {
            (flameCone.material as THREE.MeshBasicMaterial).opacity = 0.5;
            (flameCore.material as THREE.MeshBasicMaterial).opacity = 0.7;
            flameLight.intensity = 7;
        }
        controls.update();
        renderer.render(scene, camera);
    };
    const loop = () => { raf = requestAnimationFrame(loop); if (running) renderOnce(); };
    loop();

    // Click = re-ensamblar
    const onClick = () => { assembleStart = performance.now() + 120; assembled = false; };
    renderer.domElement.addEventListener('click', onClick);
    cleanups.push(() => renderer.domElement.removeEventListener('click', onClick));

    // Pausa fuera de viewport / pestaña oculta
    const io = new IntersectionObserver(([e]) => { running = e.isIntersecting && !document.hidden; }, { threshold: 0.05 });
    io.observe(root);
    const onVis = () => { running = !document.hidden; };
    document.addEventListener('visibilitychange', onVis);
    cleanups.push(() => { io.disconnect(); document.removeEventListener('visibilitychange', onVis); });

    // Resize
    const onResize = () => { camera.aspect = fw() / fh(); camera.updateProjectionMatrix(); renderer.setSize(fw(), fh()); };
    const ro = new ResizeObserver(onResize); ro.observe(root);
    cleanups.push(() => ro.disconnect());

    return () => {
        cancelAnimationFrame(raf);
        for (const fn of cleanups.reverse()) fn();
        controls.dispose();
        disposables.forEach((d) => d.dispose());
        env.texture.dispose();
        renderer.dispose();
        renderer.domElement.remove();
    };
}

const STYLES = `
.rocket-hero { position: relative; width: 100%; min-height: 460px; }
.rocket-hero #rkscene { position: absolute; inset: 0; cursor: grab; }
.rocket-hero #rkscene:active { cursor: grabbing; }
.rocket-hero #rkscene canvas { display: block; }
.rocket-hero::before {
    content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none;
    background: radial-gradient(58% 55% at 50% 44%, rgba(139,92,246,.16), transparent 70%);
}
.rocket-hero .rk-fallback { display: none; }
.rocket-hero.rk-nogl #rkscene { display: none; }
.rocket-hero.rk-nogl .rk-fallback { display: grid; place-items: center; position: absolute; inset: 0; font-size: 120px; filter: drop-shadow(0 0 30px rgba(139,92,246,.5)); }
@media (max-width: 860px) { .rocket-hero { min-height: 360px; } }
`;
