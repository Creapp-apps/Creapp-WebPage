# CreAPP · IT Solutions — Spec de rediseño web (para Fable 5.2)

Fecha: 2026-11-25 · Repo: `Creapp-WebPage` (React 19 + Vite + R3F + framer-motion + gsap + lenis + xterm)
Estado: **lista para aprobar antes de construir.** Fable 5.2 ejecuta esta spec sección por sección.

> **Regla madre:** el problema de la web actual NO es lo visual, es **ausencia de contenido y arquitectura** (todo el sitio tiene ~1.379 caracteres de texto, zonas negras muertas de hasta ~2.000px, un mockup de browser vacío, y en mobile mide ~11.858px de los cuales ~90% es negro). Esta spec **construye el cuerpo** y mata el "AI slop". Cada sección tiene contenido real + un gráfico que *significa* algo + (donde corresponde) interacción real.

---

## 0. Fuentes de verdad y disciplina de claims (INQUEBRANTABLE)

- **Contenido:** `storage/clients/creapp/client_profile.json` (del motor) + el PDF institucional aprobado (`CreAPP-IT-Solutions-Servicios-2026.pdf`). Esta spec ya trae el copy; si algo falta, se pregunta, no se inventa.
- **Nombre:** banner **"CreAPP · IT Solutions"** (expande "Software Lab"). Actualizar `<title>` (hoy dice "CreAPP – Software Lab").
- **Prohibido inventar** (del perfil `claims_prohibidos`): métricas de ahorro/eficiencia sin fuente, plazos fijos sin contrato, "#1 de Argentina", features no implementadas, testimonios con nombre real sin autorización, precios fijos de dev a medida.
- **Ciberseguridad:** modo **capacidad**, sin certificaciones ni estadísticas inventadas.
- **IA:** genérico "LLMs / IA", NO nombrar "Google Gemini" en superficie pública (decisión del usuario).
- **Productos propios** (Stacked, Trazapp, Dental-IA): aparecen como **prueba de capacidad**, sin precio ni CTA propio.

---

## 1. Posicionamiento y narrativa (Híbrido)

**Qué es CreAPP:** un software lab / IT Solutions **AI-native**. La base vendible = IT Solutions (dev a medida + 6 áreas + productos propios como prueba). El diferencial = **operamos con IA y automatización de punta a punta, y lo mostramos funcionando en vivo** (motor de contenido autónomo, portales de cliente, publicación automática). No es un claim: es un producto que se ve trabajar en pantalla.

**Impresión en los primeros 5 segundos:** "esta gente construye software serio **y** tiene IA propia corriendo sola — no es una agencia genérica más".

**A quién le habla:** pymes, startups y profesionales argentinos con un proceso sin digitalizar, o que quieren incorporar IA real a su operación. Tono: técnico pero accesible, rioplatense (voseo), confiante sin arrogancia, "muestra antes de decir".

---

## 2. Sistema de diseño — Dark-refined + toggle claro

Decisión del usuario: **A) dark-refined, violeta/navy neón prolijo, con switch a claro.** La clave anti-slop: **neón disciplinado + mucho aire + un solo acento por vista**. Nada de saturación plana ni partículas decorativas sin sentido.

### 2.1 Tokens (CSS variables, light/dark via `[data-theme]`)
Dark (default):
```
--bg:        #05070F   /* navy casi negro, más profundo que el #030712 actual */
--bg-2:      #0A0E1C   /* paneles */
--surface:   #111729   /* cards */
--ink:       #F4F6FC   /* texto */
--soft:      #9AA3B8   /* texto secundario */
--muted:     #5A6478
--line:      rgba(255,255,255,.08)
--accent:    #8B5CF6   /* VIOLETA = acento primario (identidad) */
--accent-2:  #FF2D78   /* magenta = segundo acento, uso puntual */
--accent-3:  #00F0FF   /* cyan = detalle/datos vivos, uso mínimo */
--glow:      rgba(139,92,246,.22)
```
Light (toggle):
```
--bg:#F7F8FB  --bg-2:#FFFFFF  --surface:#FFFFFF  --ink:#0B1020
--soft:#5A6478  --line:rgba(11,16,32,.10)  --accent:#7C3AED  --accent-2:#E11D6B
--glow:rgba(124,58,237,.14)   /* todo baja saturación y sube contraste en claro */
```
- **Regla del acento único por sección:** cada sección usa el **violeta** como acento base; magenta solo para UN elemento de impacto (una palabra, un estado crítico); cyan solo para datos vivos (ticks, telemetría). Nunca los tres gritando juntos.
- **Gradiente de marca** (violeta→magenta) reservado para: logo, divisores finos, bordes de acento, números gigantes de sección. **En titulares, el acento va SÓLIDO** (aprendido en el PDF: `background-clip:text` grande deja un hairline en export).

### 2.2 Tipografía
- **Display:** `Archivo Black` (hero, números de sección, remates). Identidad CreAPP.
- **Cuerpo:** `Inter` (400–700).
- **Mono/labels:** `Geist Mono` (eyebrows "ÁREA 01", "ARRASTRÁ", timestamps vivos, data). El mono-label es parte del lenguaje editorial de las refs.
- Tracking ajustado en display (`-0.02em`), interlineado generoso en cuerpo (1.6), mucho whitespace.

### 2.3 Reglas anti-slop (acceptance, ver §10)
1. Cero mockups vacíos. Cero zonas negras muertas. Toda altura tiene contenido o respiro intencional, nunca vacío por accidente.
2. Todo gráfico es **themeable** (lee los tokens) y **significa** algo (ilustra el servicio o muestra dato real). Prohibidas las partículas decorativas como relleno.
3. Mobile: altura razonable (cada sección colapsa a 1 columna, el gráfico se achica, NO se estira el vacío). Objetivo: mobile < 1/3 de la altura actual.
4. Un acento por vista. Aire. Restraint.

---

## 3. Sistema de layout — Editorial alternado con cabecera sticky

Tomado de **ferrow**: el sitio se lee "como un libro corto".
- **Hero ancho** (full-bleed) con gráfico interactivo.
- **Capítulos numerados**: cada uno = `chapter-head` (sticky a la **izquierda** mientras scrollea: nº "01" en mono + título display + bajada) y `chapter-body` (derecha: gráfico + contenido). **Se alterna**: en capítulos pares el gráfico va a la izquierda y el texto a la derecha, para romper el ritmo.
- Cabecera sticky se mantiene fija hasta que el cuerpo termina de pasar (sensación de narrativa guiada).
- Ancho de contenido ~1200px, gutter lateral generoso, 1 columna en mobile.
- Divisores finos con gradiente de marca entre secciones. Número gigante tenue de sección como marca de agua (como en el PDF).

---

## 4. Modelo de motion e interacción

Principios (de las refs, especialmente la restraint de ferrow):
- **Interacción REAL** (decisión del usuario) solo en: **Hero** (orbe) + **2 áreas firma** (IA y Ciberseguridad). Ahí el usuario arrastra / hover / click y el gráfico responde.
- **Scroll-triggered** en el resto: la ilustración isométrica se "arma" / anima al entrar en viewport (gsap ScrollTrigger + framer-motion), loopea mientras está visible, **pausa al salir** y en pestaña oculta.
- **`prefers-reduced-motion`:** cada gráfico muestra un frame fijo y los datos vivos dejan de tickear.
- **Smooth scroll** con `lenis` (ya instalado), suave, sin exagerar.
- Easings: entradas con `cubic-bezier(.2,.8,.2,1)` / resortes framer; nada lineal.
- "Nada se mueve porque sí": el movimiento ambiental es mínimo (respiración sutil); el protagonismo es del gráfico que el usuario toca o que el scroll dispara.

---

## 5. Sistema de gráficos — 3 familias

1. **Centro interactivo canvas/WebGL (familia "orbe").** Hero + áreas firma. Técnica: R3F/three (ya instalado) o `ogl` para algo liviano. Miles de puntos (stipple) formando una esfera/red violeta→magenta. **Arrastrar = girar, hover = separa los puntos, click = onda.** Recolorea con el tema. Es la metáfora de "sistema vivo / inteligencia".
2. **Ilustración isométrica themeable (familia "ferrow").** Las 6 áreas (las no-firma) y procesos. SVG isométrico de línea, lee `--accent`/`--ink`/`--line`, se arma por scroll. Cada una ilustra literalmente el servicio (pipeline, escáner, nodos, línea de montaje). Un solo elemento en magenta por ilustración.
3. **Widgets de dato vivo (familia "telemetría").** Prueban el ángulo AI-autónomo: timestamps que tickean ("publicado hace 3s"), mini-terminal (`xterm`, instalado) mostrando el motor corriendo, contadores. Discretos, reales, con cyan.

---

## 6. Arquitectura sección por sección

Orden de lectura del sitio. Copy = grounded (editar en el repo, no inventar). "Gráfico" = concepto + familia + técnica. "Interacción" = real | scroll.

### S0 · Nav + toggle tema
Logo cohete + wordmark. Links reales (anclas que EXISTEN): Servicios · Proceso · Productos · Nosotros · Contacto. Botón tema (sol/luna). CTA "Hablemos". Navbar translúcida con blur al scrollear.

### S1 · HERO (interacción REAL)
- **Layout:** texto izquierda / **orbe interactivo** derecha (full-bleed, dark).
- **Copy (DEFINIDO):** eyebrow mono `CREAPP · IT SOLUTIONS`. H1 display, dos líneas: **"El software y la `IA`* que tu negocio necesita."** (`IA` en acento sólido violeta) + remate display más chico: **"Y te los mostramos funcionando."** Bajada: "Un software lab AI-native con productos propios en producción. Dev a medida, IA, diseño, infraestructura, ciberseguridad y marketing — bajo un mismo techo." CTAs: `Agendá una llamada` (primario) + `Explorar` (scroll). Micro-prueba: chips de las 6 áreas o "productos propios en producción".
- **Gráfico:** familia orbe (canvas R3F). Esfera stipple violeta→magenta, hint mono "ARRASTRÁ PARA GIRAR".
- **Interacción:** arrastrar gira, hover separa puntos, click = onda. Recolorea con tema.

### S2 · Qué hacemos — intro de las 6 áreas
- Breve statement + grilla/índice de las 6 áreas (ancla a cada capítulo). Setea expectativa de "las 6 áreas bajo un techo". Número gigante de arranque.

### S3–S8 · Las 6 ÁREAS (capítulos numerados, layout alternado)
Cada una: head sticky (nº + título + bajada del PDF) + body (gráfico + sub-servicios en cards + "Entregables" + línea de cierre del PDF). Copy exacto del PDF §áreas.

- **01 · Desarrollo de Software** — *scroll*. Gráfico: isométrico "idea → producto", línea de montaje que ensambla una app (cajas→dispositivo). Sub: Apps nativas / Plataformas web / Software a medida / APIs & automatización. Cierre: "Un producto propio, no un parche sobre el problema."
- **02 · IA & Machine Learning** — **ÁREA FIRMA, interacción REAL**. Gráfico: mini-orbe "agente" + un panel donde el usuario **tipea/clickea** y ve al agente responder/automatizar (demo controlada, sin backend real: respuestas scripteadas que ilustran). Prueba el diferencial AI. Sub: Agentes & chatbots / Automatización / Modelos predictivos / NLP. Cierre: "IA que resuelve tu trabajo, en serio."
- **03 · UX/UI & Diseño de Producto** — *scroll*. Gráfico: isométrico wireframe→UI (un low-fi que se "resuelve" en alta fidelidad al scrollear). Sub: Discovery / Prototipos validados / Interfaz / Design systems.
- **04 · Integración & Escala** — *scroll*. Gráfico: isométrico de nodos/sistemas conectándose, pulsos de datos por los cables (loop). Sub: Arquitectura / CI/CD / Monitoreo / Integraciones. Cierre: "Para que el próximo pico de uso no sea un incendio."
- **05 · Ciberseguridad** *(nueva)* — **ÁREA FIRMA, interacción REAL**. Gráfico: isométrico de un sistema + un **escáner** que el usuario **dispara** (botón "Escanear") y barre la infra surgiendo chips de severidad (crítico/alto/medio, colores) — en **modo capacidad**, datos de ejemplo rotulados. Sub: Análisis de Vulnerabilidades / Informes SOC / Auditorías / Plan de remediación. Cierre: "Primero entender el riesgo; después, un plan para bajarlo."
- **06 · Marketing & Contenidos** — *scroll + dato vivo*. Gráfico: pipeline isométrico de contenido (brief→pieza→calendario→publicado) con **timestamp vivo** "publicado hace Xs" (familia telemetría = prueba del motor autónomo). Sub: Estrategia / Producción audiovisual / Gestión de redes & publicación / Campañas & Google Ads. Cierre: "Que tu producto se vea tanto como funciona."

### S9 · El motor en vivo (prueba del ángulo AI-autónomo)
- **Franja oscura dedicada.** Muestra el diferencial *funcionando*: mini-**terminal** (`xterm`) o dashboard que simula el motor de CreAPP produciendo + publicando (pasos que avanzan, "running unattended", timestamps). Texto: "Mientras dormís, nuestro sistema produce, revisa y publica. Esto no es una promesa: es nuestro propio motor." (grounded: es real, lo tenemos). Restraint: un acento cyan, mucho negro intencional (acá SÍ el negro es protagonista, no vacío).

### S10 · Cómo trabajamos (4 etapas)
- El proceso del PDF, **bien hecho** (no el cohete solo en 2.000px de vacío). Secuencia horizontal/scroll Descubrimiento→Diseño→Desarrollo→Lanzamiento, cada etapa card con sub-línea (del perfil `RocketProcess`), el cohete como remate de "Lanzamiento", no como relleno. Chips: proceso con contrato · SLA · respuesta <2h.

### S11 · Productos propios (prueba, showroom DONE RIGHT)
- Reemplaza el browser vacío actual. **Interacción superficial** (decisión del usuario): el usuario solo selecciona/hover; nada de interactividad compleja. Técnica por producto (framing verificado 2026-11-25):
  - **Stacked → embed vivo del tenant Damafa** (DEFINIDO: hay autorización): `https://software.stacked.com.ar/damafa` (200, sin X-Frame-Options → iframe real). Lazy-load al entrar en viewport, skeleton mientras carga, fallback a loop si no carga en ~2s.
  - **Dental-IA → loop grabado** (DEFINIDO: no embeddable, curadent/dentalva mandan X-Frame-Options DENY). Un **video/secuencia grabada** del producto dentro de un chrome de browser prolijo (barra con la URL). Parece vivo, cero iframe roto.
  - **Trazapp → loop grabado** hasta tener una instancia demo embeddable (URL pendiente).
- **Técnica común:** chrome de browser prolijo con la URL; un producto activo a la vez, los otros en preview estático hasta hover/select; loop pausa fuera de viewport + reduced-motion con frame fijo. 1-2 líneas del PDF por producto + badge "En producción". Sin precios ni CTA de producto.
- **Regla dura:** si un producto no se puede embeber limpio → loop/screenshot, **jamás** un iframe vacío o roto.

### S12 · Nosotros (el perfil corporativo que falta hoy)
- Lab en Buenos Aires, remote-first. **El equipo: Seba y Facu** (personas reales; fundadores). **Sin fotos/avatares por ahora** (decisión del usuario 2026-11-25: se resuelve después) → presentarlos con sus nombres + rol en una tarjeta editorial limpia, con un **placeholder de monograma/iniciales** (no foto, no avatar genérico, no silueta "slop"), listo para swapear a foto real luego. Roles exactos a confirmar. "No somos freelancers que desaparecen." Stack, forma de trabajo, valores. Editorial, con una ilustración isométrica de "el lab". (Cubre el nav "NOSOTROS" que hoy no existe.)

### S13 · Confianza / clientes (DEFINIDO)
- **6 clientes reales en producción, con link saliente** (`target="_blank" rel="noopener"`). URLs verificadas (responden 200) al 2026-11-25:
  - **Curadent** (odontología · Dental-IA) → https://www.curadent.com.ar
  - **Consultorio Álvarez** (odontología · Dental-IA) → https://www.dentalva.ar
  - **AlPaso** (gastronomía · Stacked) → https://software.stacked.com.ar/alpaso  *(sin `www`)*
  - **Damafa** (gastronomía · Stacked) → https://software.stacked.com.ar/damafa  *(sin `www`)*
  - **Zolsea** (web a medida) → https://www.zolsea.com.ar
  - **Transportes Maralan** (logística · software a medida) → https://www.transportesmaralan.com.ar
- Presentarlos como fila **"clientes / plataformas en producción"** (estilo "backed by" de las refs): logo/nombre + 1 línea de rubro + link.
- **Testimonios (con cita):** el usuario confirma que son clientes actuales y que pidió consentimiento. Workflow obligatorio: los quotes de abajo son **BORRADORES redactados por nosotros** → el usuario se los muestra a cada cliente → **el cliente confirma o ajusta el texto exacto** → recién ahí se publican como cita genuina. Hasta esa confirmación, en el sitio van como **clientes-con-link sin cita**, o con la cita marcada internamente como "pendiente". No se publican palabras inventadas firmadas con el nombre del cliente. Sin métricas inventadas.
  - **BORRADORES (pendientes de confirmación de cada cliente):**
    - *Curadent:* "Los turnos y las consultas por WhatsApp dejaron de ser un quilombo. El sistema nos ordenó el día a día del consultorio."
    - *Consultorio Álvarez:* "Pasamos de las fichas de papel a tener todo el historial clínico en un solo lugar. El equipo lo adoptó enseguida."
    - *AlPaso:* "La cocina y los pedidos por fin hablan el mismo idioma. Menos errores, menos gritos, más foco en cocinar."
    - *Damafa:* "Tener nuestra propia tienda, sin comisiones de terceros, nos cambió la ecuación. Y el soporte siempre está."
    - *Zolsea:* "Nos entregaron una web que de verdad nos representa, y cuando necesitamos algo, responden."
    - *Transportes Maralan:* "Digitalizaron una operación que llevábamos a mano. Hoy tenemos todo bajo control y a la vista."
  - (Tono rioplatense, sin cifras. Son puntos de partida para que el cliente los haga propios; cualquiera puede reemplazarse por el texto del cliente.)

### S14 · CTA / Contacto
- "Empecemos tu proyecto." Form actual (nombre, email, descripción, presupuesto, urgencia) — mantener, pulir visual. Contacto: creapp.ar@gmail.com + @creapp.ar + LinkedIn + GitHub. "Respuesta en <2h." Footer con lockup.

---

## 7. Tech (reutilizar el stack del repo)

- **Framework:** React 19 + Vite (el que ya está). Reescribir `LandingPage.tsx` y `components/landing/*` según esta spec.
- **Orbe / áreas firma:** `@react-three/fiber` + `@react-three/drei` + `three` (instalados) o `ogl` para algo liviano. Puntos stipple, lighting, interacción pointer.
- **Scroll / motion:** `gsap` (ScrollTrigger) + `framer-motion` + `lenis` (todos instalados).
- **Terminal vivo (S9):** `@xterm/xterm` (instalado).
- **Ilustraciones isométricas:** SVG inline themeable (patrón ferrow: el SVG lee CSS vars `--accent`/`--ink`/`--line`). Generar nuevas isométricas por área (no copiar las de ferrow — son de otro producto/licencia; **reimplementar**, no reusar).
- **Theming light/dark:** `data-theme` en `<html>` + CSS vars + persistir en localStorage. Los gráficos leen las vars y recolorean.
- **Performance:** lazy-load de los canvas por sección (no montar los 3 WebGL a la vez); pausar loops fuera de viewport; respetar reduced-motion.

---

## 8. Orden de construcción (fases para Fable)

1. **Fundaciones:** tokens light/dark + toggle + tipografías + layout system (sticky chapters, alternado) + nav real + smooth scroll. (Sin contenido todavía: el esqueleto.)
2. **Hero con orbe interactivo** (la pieza firma; valida el lenguaje visual completo).
3. **Las 6 áreas** (scroll primero; luego las 2 firma IA + Ciber con interacción real).
4. **S9 motor en vivo** + **S10 proceso** + **S11 productos** (reemplazar zonas muertas).
5. **S12 Nosotros** + **S13 confianza** + **S14 contacto** + pulido responsive/mobile + reduced-motion + QA anti-slop (§10).

Cada fase: preview → OK del usuario → siguiente. (Workflow preview-first, como el resto de CreAPP.)

---

## 9. Lo que NO es (non-goals)
- No es un rediseño solo-visual del hero actual: se **reconstruye el cuerpo**.
- No inventa servicios, métricas, plazos, testimonios ni certificaciones.
- No vende los productos propios (son prueba).
- No mete neón saturado plano ni partículas decorativas de relleno.
- No deja anclas de nav sin sección real.

## 10. Checklist de aceptación anti-slop (QA final)
- [ ] Cero mockups vacíos / zonas negras muertas. Cada altura justifica su espacio.
- [ ] Todo gráfico es themeable (light/dark) y significa algo.
- [ ] Hero + 2 áreas firma tienen interacción real que responde al usuario.
- [ ] Resto scroll-triggered, pausa fuera de viewport, reduced-motion con frame fijo.
- [ ] Un acento por vista; titulares con acento sólido (sin hairline).
- [ ] Nav con todas las anclas reales (incluida Nosotros).
- [ ] Copy 100% grounded (PDF/perfil), sin claims prohibidos, IA genérica, ciber en capacidad.
- [ ] Mobile razonable (sin 11.000px de vacío); 1 columna, gráficos achicados.
- [ ] `<title>` = "CreAPP · IT Solutions".

## 11. Decisiones (CERRADAS 2026-11-25) + datos pendientes de cargar

**Cerradas:**
1. **Hook del hero:** AI-forward → "El software y la IA que tu negocio necesita." + "Y te los mostramos funcionando." (ver S1).
2. **Nosotros:** Seba y Facu, personas reales (fundadores), **sin fotos/avatares por ahora** → monograma/iniciales, swapeable luego (ver S12).
3. **Clientes (S13):** Curadent · Consultorio Álvarez · Damafa · AlPaso, con link saliente a su plataforma. Como proof/clientes, no quotes fabricados.
4. **Productos (S11):** embed vivo del producto (iframe real, con lazy-load + skeleton + fallback, nunca rectángulo negro).

**Cerrado:**
- **S13:** 6 clientes con URLs verificadas + 6 **testimonios borrador** (redactados; el usuario los revisa y cada cliente confirma el texto exacto antes de publicar como cita genuina).
- **S11 embeds:** Stacked = embed vivo de **Damafa** (autorizado); Dental-IA = **loop grabado** (bloquea iframe); Trazapp = loop grabado. Interacción **superficial** (hover/select), sin interactividad compleja.

**Pendientes menores (NO bloquean Fase 1–2):**
- **S11:** grabar los loops (Dental-IA, Trazapp) y, para Trazapp, una instancia/metraje demo.
- **S12:** roles exactos de Seba y Facu (si no, "fundadores").
- **S13:** confirmación final del texto de cada testimonio por el cliente.

**Fable puede arrancar YA la Fase 1–2** (fundaciones + hero con el orbe). S13 se puede cablear entera (links + quotes borrador). S11 espera los loops/embed.
