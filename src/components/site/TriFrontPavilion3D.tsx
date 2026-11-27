// TriFrontPavilion3D — "Tres frentes, un mismo techo".
//
// Ilustración 3D procedural (three.js, sin modelos ni imágenes) para la sección de
// servicios: una cubierta/techo común flotando sobre tres fachadas iluminadas —
// Desarrollo (</>), Seguridad (escudo/radar) y Marketing (señal/ondas) — sobre una
// base compartida con un bus de datos que las une. Un techo = un equipo; tres
// frentes = los tres servicios. Flota libre sobre el lienzo, sin contenedor.
//
// Mismo paradigma visual que AgenticLab3D: paleta violeta/magenta/cian, respiración
// e idle continuos, hover que enciende la fachada. Sin paneles ni controles.

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

export type FrontId = 'dev' | 'sec' | 'mkt'

export type TriFrontPavilion3DProps = {
  height?: number | string
  className?: string
  /** Hover/tap sobre una fachada. */
  onFront?: (id: FrontId | null) => void
  onReady?: () => void
}

export default function TriFrontPavilion3D({
  height = '100%',
  className,
  onFront,
  onReady,
}: TriFrontPavilion3DProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const handlers = useRef({ onFront, onReady })
  useEffect(() => {
    handlers.current = { onFront, onReady }
  }, [onFront, onReady])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    let dispose: (() => void) | undefined
    let cancelled = false
    document.fonts.ready.then(() => {
      if (cancelled) return
      dispose = initPavilion(root, getComputedStyle(root).fontFamily, {
        onFront: (id) => handlers.current.onFront?.(id),
        onReady: () => handlers.current.onReady?.(),
      })
    })
    return () => {
      cancelled = true
      dispose?.()
    }
  }, [])

  return (
    <div
      ref={rootRef}
      className={['tri-pavilion-3d', className].filter(Boolean).join(' ')}
      style={{ height }}
    >
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div
        id="pscene"
        role="img"
        aria-label="Ilustración 3D de un pabellón con un techo común sobre tres fachadas: Desarrollo, Seguridad y Marketing. Arrastrá para rotar."
      />
      <div className="pvignette" />
      <div id="ploading">
        <i />
      </div>
      <div id="perror" role="alert">
        No se pudo iniciar la escena 3D. Verificá que WebGL esté activado.
      </div>
    </div>
  )
}

type Options = {
  onFront?: (id: FrontId | null) => void
  onReady?: () => void
}

type FrontDef = { id: FrontId; name: string; color: number; x: number }

function initPavilion(root: HTMLElement, fontFamily: string, options: Options): () => void {
  const cleanups: Array<() => void> = []
  const fw = () => root.clientWidth
  const fh = () => root.clientHeight
  const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
    const el = root.querySelector<T>(`#${id}`)
    if (!el) throw new Error(`Falta #${id}`)
    return el
  }
  const listen = (t: EventTarget, type: string, h: (e: never) => void) => {
    const fn = h as unknown as EventListener
    t.addEventListener(type, fn)
    cleanups.push(() => t.removeEventListener(type, fn))
  }
  const showError = () => {
    $('ploading').classList.add('done')
    $('perror').style.display = 'block'
  }
  const dispose = () => {
    for (const fn of cleanups.reverse()) fn()
    cleanups.length = 0
  }

  try {
    const TAU = Math.PI * 2
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
    const VIOLET = 0x8b5cf6
    const CYAN = 0x00f0ff
    const MAGENTA = 0xff2d78

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(33, fw() / fh(), 0.1, 150)
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    } catch (e) {
      showError()
      throw e
    }
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(devicePixelRatio, fw() < 900 ? 1.5 : 1.75))
    renderer.setSize(fw(), fh())
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    $('pscene').appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.07
    controls.enablePan = false
    controls.enableZoom = false
    controls.minPolarAngle = 0.3
    controls.maxPolarAngle = Math.PI * 0.49
    controls.rotateSpeed = 0.5
    // Sin giro completo (mostraría los dorsos): un vaivén sutil mantiene las
    // tres fachadas de frente. El drag queda disponible para explorar.
    controls.autoRotate = false
    if (matchMedia('(pointer:coarse)').matches) controls.enableRotate = false

    const pmrem = new THREE.PMREMGenerator(renderer)
    const room = new RoomEnvironment()
    const env = pmrem.fromScene(room, 0.04)
    scene.environment = env.texture
    scene.environmentIntensity = 0.6
    room.dispose()
    pmrem.dispose()

    scene.add(new THREE.HemisphereLight(0xdbe5f4, 0x241f33, 1.9))
    const key = new THREE.DirectionalLight(0xf0ecff, 4)
    key.position.set(-5, 11, 7)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 0.5, far: 34 })
    key.shadow.normalBias = 0.035
    key.shadow.bias = -0.0002
    key.shadow.radius = 4
    scene.add(key)
    const rim = new THREE.DirectionalLight(0xc4d4ed, 2.6)
    rim.position.set(4, 6, -8)
    scene.add(rim)
    const warm = new THREE.PointLight(0x9d6bff, 22, 22, 2)
    warm.position.set(0, 5, 4)
    scene.add(warm)

    const mat = (
      color: number,
      metalness = 0.1,
      roughness = 0.4,
      extra: THREE.MeshStandardMaterialParameters = {}
    ) => new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra })
    const M = {
      body: mat(0x2c313a, 0.72, 0.3),
      base: mat(0x24282f, 0.82, 0.34),
      edge: mat(0x6b7480, 0.85, 0.24),
      chrome: mat(0xc3cad0, 0.92, 0.18),
      dark: mat(0x111419, 0.4, 0.4),
      panel: mat(0x0d1016, 0.3, 0.5),
    }

    const geoCache = new Map<string, THREE.BufferGeometry>()
    const boxGeo = (w: number, h: number, d: number, r = 0.05) => {
      const k = `b${w},${h},${d},${r}`
      if (!geoCache.has(k))
        geoCache.set(
          k,
          r ? new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 3, h / 3, d / 3)) : new THREE.BoxGeometry(w, h, d)
        )
      return geoCache.get(k)!
    }
    const box = (
      parent: THREE.Object3D,
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      m: THREE.Material = M.body,
      r = 0.05
    ) => {
      const o = new THREE.Mesh(boxGeo(w, h, d, r), m)
      o.position.set(x, y, z)
      o.castShadow = true
      o.receiveShadow = true
      parent.add(o)
      return o
    }
    const cyl = (
      parent: THREE.Object3D,
      r: number,
      h: number,
      x: number,
      y: number,
      z: number,
      m: THREE.Material = M.chrome,
      seg = 20
    ) => {
      const k = `c${r},${h},${seg}`
      if (!geoCache.has(k)) geoCache.set(k, new THREE.CylinderGeometry(r, r, h, seg))
      const o = new THREE.Mesh(geoCache.get(k)!, m)
      o.position.set(x, y, z)
      o.castShadow = true
      o.receiveShadow = true
      parent.add(o)
      return o
    }

    // Supersample x2 + anisotropía máxima: texto nítido aun en ángulo.
    const SS = 2
    type Tex = { texture: THREE.CanvasTexture; ctx: CanvasRenderingContext2D }
    const canvasTexture = (w: number, h: number): Tex => {
      const c = document.createElement('canvas')
      c.width = w * SS
      c.height = h * SS
      const ctx = c.getContext('2d')!
      ctx.scale(SS, SS)
      const texture = new THREE.CanvasTexture(c)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy()
      return { texture, ctx }
    }
    const hex = (c: number) => '#' + c.toString(16).padStart(6, '0')

    const pavilion = new THREE.Group()
    scene.add(pavilion)

    // Sombra de contacto suave bajo el pabellón.
    const shadowTex = canvasTexture(128, 128)
    {
      const g = shadowTex.ctx.createRadialGradient(64, 64, 10, 64, 64, 64)
      g.addColorStop(0, 'rgba(0,0,0,.72)')
      g.addColorStop(0.6, 'rgba(0,0,0,.34)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      shadowTex.ctx.fillStyle = g
      shadowTex.ctx.fillRect(0, 0, 128, 128)
      shadowTex.texture.needsUpdate = true
    }
    const contact = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 8),
      new THREE.MeshBasicMaterial({ map: shadowTex.texture, transparent: true, depthWrite: false, opacity: 0.6 })
    )
    contact.rotation.x = -Math.PI / 2
    contact.position.y = 0.02
    scene.add(contact)

    // Base compartida (el piso que sostiene los tres frentes).
    box(pavilion, 8, 0.4, 4.6, 0, 0.2, 0, M.base, 0.16)
    box(pavilion, 7.8, 0.06, 4.4, 0, 0.42, 0, M.edge, 0.1)
    box(pavilion, 7.7, 0.08, 4.3, 0, 0.47, 0, M.body, 0.09)
    // Riel de luz frontal de la base.
    const baseGlow = mat(VIOLET, 0.2, 0.3, { emissive: VIOLET, emissiveIntensity: 1.4 })
    box(pavilion, 7.2, 0.03, 0.04, 0, 0.3, 2.31, baseGlow, 0.01)

    // Techo común: una marquesina/canopy fina que corona las tres fachadas y las
    // unifica (sin encerrarlas), con un riel de luz y un haz que la barre.
    const roofY = 3.6
    const roof = new THREE.Group()
    roof.position.y = roofY
    pavilion.add(roof)
    box(roof, 8.6, 0.26, 1.9, 0, 0, 0.25, M.base, 0.12)
    box(roof, 8.2, 0.05, 1.7, 0, -0.15, 0.25, M.edge, 0.08)
    const roofGlowMat = mat(VIOLET, 0.2, 0.3, { emissive: VIOLET, emissiveIntensity: 0.9 })
    const roofGlow = box(roof, 8.0, 0.03, 0.05, 0, -0.17, 1.18, roofGlowMat, 0.01)
    // Haz de luz que barre la cara inferior de la marquesina.
    const sweepMat = new THREE.MeshBasicMaterial({ color: VIOLET, transparent: true, opacity: 0, depthWrite: false })
    const sweep = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.7), sweepMat)
    sweep.rotation.x = Math.PI / 2
    sweep.position.set(0, -0.14, 0.25)
    roof.add(sweep)

    // Cuatro postes que sostienen la marquesina sobre la base.
    for (const sx of [-3.9, 3.9])
      for (const sz of [-0.5, 0.95]) {
        cyl(pavilion, 0.1, roofY - 0.56, sx, (roofY + 0.56) / 2, sz, M.chrome)
        cyl(pavilion, 0.15, 0.1, sx, 0.56, sz, M.edge)
      }

    // ── Las tres fachadas ──
    const fronts: FrontDef[] = [
      { id: 'dev', name: 'Desarrollo', color: VIOLET, x: -2.5 },
      { id: 'sec', name: 'Seguridad', color: CYAN, x: 0 },
      { id: 'mkt', name: 'Marketing', color: MAGENTA, x: 2.5 },
    ]

    type Front = FrontDef & {
      group: THREE.Group
      glow: THREE.MeshStandardMaterial
      tex: Tex
      draw: (t: number) => void
    }
    const builtFronts: Front[] = []

    // Fondo con tinte de color para que cada fachada "prenda" aun vista de lejos.
    const tintBg = (c: CanvasRenderingContext2D, base: string, r: number, gc: number, b: number) => {
      c.fillStyle = base
      c.fillRect(0, 0, 320, 400)
      const g = c.createRadialGradient(160, 180, 20, 160, 200, 250)
      g.addColorStop(0, `rgba(${r},${gc},${b},0.30)`)
      g.addColorStop(1, `rgba(${r},${gc},${b},0)`)
      c.fillStyle = g
      c.fillRect(0, 0, 320, 400)
    }
    const label = (c: CanvasRenderingContext2D, txt: string, color: string) => {
      c.textAlign = 'center'
      c.font = `800 26px ${fontFamily}`
      // Barra de contraste + texto, para legibilidad total.
      c.fillStyle = 'rgba(8,6,14,0.72)'
      c.fillRect(0, 346, 320, 54)
      c.fillStyle = 'rgba(0,0,0,0.6)'
      c.fillText(txt, 161, 383)
      c.fillStyle = color
      c.fillText(txt, 160, 382)
      c.textAlign = 'left'
    }
    const drawDev = (tx: Tex, t: number) => {
      const c = tx.ctx
      tintBg(c, '#0e0a1a', 139, 92, 246)
      // Líneas de código que scrollean, tenues.
      const off = (t * 22) % 24
      for (let i = -1; i < 16; i++) {
        const y = 66 + i * 24 + off
        const wd = [96, 150, 70, 120, 58, 162, 104][(i + 14) % 7]
        c.fillStyle = 'rgba(167,139,250,0.16)'
        c.fillRect(30, y, wd, 6)
      }
      c.fillStyle = '#0e0a1a'
      c.fillRect(0, 0, 320, 44)
      c.fillRect(0, 352, 320, 48)
      // </> grande.
      c.font = `800 118px ${fontFamily}`
      c.fillStyle = hex(VIOLET)
      c.textAlign = 'center'
      c.fillText('</>', 160, 240)
      label(c, 'DESARROLLO', '#cbbdf4')
      tx.texture.needsUpdate = true
    }
    const shieldPath = (c: CanvasRenderingContext2D) => {
      c.beginPath()
      c.moveTo(160, 58)
      c.lineTo(254, 100)
      c.lineTo(254, 206)
      c.quadraticCurveTo(254, 286, 160, 330)
      c.quadraticCurveTo(66, 286, 66, 206)
      c.lineTo(66, 100)
      c.closePath()
    }
    const drawSec = (tx: Tex, t: number) => {
      const c = tx.ctx
      tintBg(c, '#08121a', 0, 240, 255)
      // Escudo grande.
      shieldPath(c)
      c.strokeStyle = hex(CYAN)
      c.lineWidth = 8
      c.stroke()
      // Barrido de radar dentro del escudo.
      c.save()
      shieldPath(c)
      c.clip()
      const a = (t * 1.6) % TAU
      const g = c.createLinearGradient(160, 200, 160 + Math.cos(a) * 90, 200 + Math.sin(a) * 90)
      g.addColorStop(0, 'rgba(0,240,255,0.5)')
      g.addColorStop(1, 'rgba(0,240,255,0)')
      c.strokeStyle = g
      c.lineWidth = 80
      c.beginPath()
      c.moveTo(160, 200)
      c.lineTo(160 + Math.cos(a) * 170, 200 + Math.sin(a) * 170)
      c.stroke()
      c.restore()
      // Check central.
      c.strokeStyle = hex(CYAN)
      c.lineWidth = 12
      c.lineCap = 'round'
      c.lineJoin = 'round'
      c.beginPath()
      c.moveTo(124, 196)
      c.lineTo(150, 222)
      c.lineTo(198, 162)
      c.stroke()
      c.lineCap = 'butt'
      label(c, 'SEGURIDAD', '#bdeef6')
      tx.texture.needsUpdate = true
    }
    const drawMkt = (tx: Tex, t: number) => {
      const c = tx.ctx
      tintBg(c, '#160912', 255, 45, 120)
      const cx = 118
      const cy = 192
      // Ondas de señal concéntricas que se expanden.
      for (let i = 0; i < 5; i++) {
        const phase = (t * 0.55 + i / 5) % 1
        const r = 26 + phase * 168
        c.strokeStyle = `rgba(255,45,120,${(1 - phase) * 0.95})`
        c.lineWidth = 9
        c.beginPath()
        c.arc(cx, cy, r, -0.78, 0.78)
        c.stroke()
      }
      // Emisor.
      c.fillStyle = hex(MAGENTA)
      c.beginPath()
      c.arc(cx, cy, 17, 0, TAU)
      c.fill()
      label(c, 'MARKETING', '#ffcfdd')
      tx.texture.needsUpdate = true
    }
    const drawers: Record<FrontId, (tx: Tex, t: number) => void> = { dev: drawDev, sec: drawSec, mkt: drawMkt }

    for (const f of fronts) {
      const g = new THREE.Group()
      g.position.set(f.x, 0, 0.1)
      pavilion.add(g)
      // Peana con una barra de luz fina al frente (no un pad pastel).
      box(g, 1.9, 0.16, 1.5, 0, 0.6, 0, M.dark, 0.06)
      const glow = mat(f.color, 0.3, 0.35, { emissive: f.color, emissiveIntensity: 0.9 })
      box(g, 1.5, 0.05, 0.05, 0, 0.64, 0.73, glow, 0.02)
      // Chasis de la pantalla.
      box(g, 1.7, 2.3, 0.16, 0, 1.95, -0.32, M.body, 0.08)
      box(g, 0.14, 2.1, 0.14, -0.86, 1.95, -0.3, M.edge, 0.03)
      box(g, 0.14, 2.1, 0.14, 0.86, 1.95, -0.3, M.edge, 0.03)
      // Pantalla con el motivo.
      const tex = canvasTexture(320, 400)
      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(1.46, 1.96),
        new THREE.MeshBasicMaterial({ map: tex.texture, toneMapped: false })
      )
      screen.position.set(0, 2.02, -0.22)
      g.add(screen)
      const draw = (t: number) => drawers[f.id](tex, t)
      draw(0)
      builtFronts.push({ ...f, group: g, glow, tex, draw })
    }

    // Bus de datos en la base que conecta las tres peanas.
    const busMat = mat(0x3a4152, 0.6, 0.35)
    box(pavilion, 5.6, 0.05, 0.12, 0, 0.52, 1.5, busMat, 0.02)
    const pulses: THREE.Mesh[] = []
    const pulseMat = new THREE.MeshBasicMaterial({ color: VIOLET })
    for (let i = 0; i < 3; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), pulseMat)
      p.position.set(0, 0.55, 1.5)
      pavilion.add(p)
      pulses.push(p)
    }

    // ── Raycast hover sobre las fachadas ──
    builtFronts.forEach((f) => f.group.traverse((o) => (o.userData.front = f.id)))
    const pickables = builtFronts.map((f) => f.group)
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let hovered: FrontId | null = null
    let width = fw()
    let height = fh()
    const hit = (x: number, y: number): FrontId | null => {
      pointer.set((x / width) * 2 - 1, (-y / height) * 2 + 1)
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObjects(pickables, true)
      return hits.length ? ((hits[0].object.userData.front as FrontId) ?? null) : null
    }
    listen(renderer.domElement, 'pointermove', (e: PointerEvent) => {
      const r = root.getBoundingClientRect()
      const h = hit(e.clientX - r.left, e.clientY - r.top)
      renderer.domElement.style.cursor = h ? 'pointer' : 'grab'
      if (h !== hovered) {
        hovered = h
        options.onFront?.(h)
      }
    })
    listen(renderer.domElement, 'pointerleave', () => {
      if (hovered !== null) {
        hovered = null
        options.onFront?.(null)
      }
    })

    // ── Cámara (centrada, estilo embed) ──
    const viewDir = new THREE.Vector3(2, 0.4, 12).normalize()
    const target = new THREE.Vector3(0, 1.9, 0)
    let sized = false
    let readySent = false
    const layout = () => {
      if (!fw() || !fh()) return
      width = fw()
      height = fh()
      const mobile = width <= 900
      renderer.setSize(width, height)
      camera.aspect = width / height
      const aspect = width / height
      const availW = mobile ? 0.94 : 0.86
      const hFit = 11 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect * availW)
      const vFit = 8.5 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 0.8)
      const dist = Math.max(hFit, vFit) * (mobile ? 1.04 : 0.98)
      camera.position.copy(viewDir).multiplyScalar(dist).add(target)
      controls.target.copy(target)
      camera.updateProjectionMatrix()
      controls.update()
      sized = true
    }
    layout()
    listen(window, 'resize', layout)
    const ro = new ResizeObserver(() => layout())
    ro.observe(root)
    cleanups.push(() => ro.disconnect())

    let visible = true
    const io = new IntersectionObserver(([en]) => (visible = en.isIntersecting && !document.hidden), {
      threshold: 0.01,
    })
    io.observe(renderer.domElement)
    cleanups.push(() => io.disconnect())
    listen(document, 'visibilitychange', () => (visible = !document.hidden))

    let last = performance.now()
    let lastDraw = -1
    let raf = 0
    const animate = (now: number) => {
      raf = requestAnimationFrame(animate)
      const dt = Math.min((now - last) / 1000, 0.045)
      last = now
      if (!visible) return
      const t = reduceMotion ? 0 : now / 1000
      const smooth = 1 - Math.exp(-dt * 6)

      // Respiración sutil + vaivén de yaw (fachadas siempre de frente).
      const breath = 1 + Math.sin(t * 0.8) * 0.012
      pavilion.scale.setScalar(breath)
      pavilion.rotation.y = Math.sin(t * 0.3) * 0.08

      // Redibujo de pantallas ~18 fps.
      if (t - lastDraw > 1 / 18 || lastDraw < 0) {
        builtFronts.forEach((f) => f.draw(t))
        lastDraw = t
      }

      // Hover + latido de glow por fachada.
      builtFronts.forEach((f, i) => {
        const pulse = 0.5 + Math.sin(t * 1.6 - i * 1.1) * 0.25
        const targetI = hovered === f.id ? 2.6 : 0.55 + pulse * 0.5
        f.glow.emissiveIntensity = THREE.MathUtils.lerp(f.glow.emissiveIntensity, targetI, smooth)
        f.group.position.y = THREE.MathUtils.lerp(f.group.position.y, hovered === f.id ? 0.12 : 0, smooth)
      })

      // Riel inferior del techo: latido.
      roofGlowMat.emissiveIntensity = 0.7 + (Math.sin(t * 1.2) * 0.5 + 0.5) * 0.9
      ;(roofGlow.material as THREE.MeshStandardMaterial).needsUpdate = false
      // Barrido de luz del techo.
      sweep.position.x = Math.sin(t * 0.5) * 3.4
      sweepMat.opacity = 0.12 + (Math.sin(t * 0.5) * 0.5 + 0.5) * 0.06
      // Riel frontal de la base.
      baseGlow.emissiveIntensity = 1.1 + (Math.sin(t * 1.4 + 1) * 0.5 + 0.5) * 0.7

      // Pulsos de datos recorriendo el bus (de -2.8 a 2.8 en x).
      pulses.forEach((p, i) => {
        const ph = (t * 0.33 + i / 3) % 1
        p.position.x = -2.8 + ph * 5.6
        const s = Math.sin(ph * Math.PI)
        p.scale.setScalar(0.5 + s * 0.9)
        ;(p.material as THREE.MeshBasicMaterial).opacity = s
      })

      controls.update()
      renderer.render(scene, camera)
      if (!readySent && sized) {
        readySent = true
        options.onReady?.()
      }
    }
    raf = requestAnimationFrame(animate)

    $('ploading').classList.add('done')
    cleanups.push(() => {
      cancelAnimationFrame(raf)
      controls.dispose()
      const texes = new Set<THREE.Texture>()
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.geometry) m.geometry.dispose()
        const list = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : []
        for (const mm of list) {
          for (const v of Object.values(mm)) if (v instanceof THREE.Texture) texes.add(v)
          mm.dispose()
        }
      })
      geoCache.forEach((g) => g.dispose())
      texes.forEach((t) => t.dispose())
      env.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    })
    renderer.compile(scene, camera)
  } catch (err) {
    console.error('Pabellón 3D: no se pudo iniciar', err)
    showError()
  }

  return dispose
}

const STYLES = String.raw`
.tri-pavilion-3d {
  position: relative;
  width: 100%;
  overflow: hidden;
  color-scheme: dark;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.tri-pavilion-3d #pscene {
  position: absolute;
  inset: 0;
  touch-action: none;
  /* El pabellón flota sobre el lienzo (como la esfera del hero): los bordes del
     canvas se funden a transparente en vez de quedar en una caja negra. */
  -webkit-mask-image: radial-gradient(ellipse 80% 76% at 50% 44%, #000 56%, transparent 94%);
  mask-image: radial-gradient(ellipse 80% 76% at 50% 44%, #000 56%, transparent 94%);
}
.tri-pavilion-3d #pscene canvas {
  display: block;
  width: 100%;
  height: 100%;
}
.tri-pavilion-3d .pvignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  /* Sin viñeta negra que dibuje un recuadro; el fundido lo hace la máscara del #pscene. */
  background: none;
}
.tri-pavilion-3d #ploading {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  transition: opacity 0.4s;
}
.tri-pavilion-3d #ploading.done {
  opacity: 0;
  pointer-events: none;
}
.tri-pavilion-3d #ploading i {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid rgba(139, 92, 246, 0.22);
  border-top-color: #8b5cf6;
  animation: tri-pavilion-spin 1s linear infinite;
}
@keyframes tri-pavilion-spin {
  to {
    transform: rotate(360deg);
  }
}
.tri-pavilion-3d #perror {
  position: absolute;
  left: 8%;
  right: 8%;
  top: 42%;
  display: none;
  color: #c7b6f5;
  font-size: 13px;
  text-align: center;
}
@media (prefers-reduced-motion: reduce) {
  .tri-pavilion-3d #ploading i {
    animation: none;
  }
}
`
