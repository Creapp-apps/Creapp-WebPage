# Hero 3D — Cohete de marca que se ensambla (CreAPP)

Fecha: 2026-11-27 · Estado: **en revisión del usuario** (no construir hasta aprobar)

## Intención y el porqué

El hero principal (`/`) hoy muestra un **orbe de puntos (stipple)** a la derecha del titular.
El usuario siente — con razón — que la esfera de puntos **no representa a la marca**. La
identidad de CreAPP ya es un **cohete** (el isotipo), y el relato de la empresa es "hacer
despegar tu negocio". Queremos una **bienvenida impactante**: un **cohete 3D que arranca
desarmado y se ensambla solo** al cargar, bajo la frase *"Tenemos las piezas que faltan para
hacer despegar tu negocio"*. El objetivo emocional: sorprender en los primeros segundos e
**incitar a investigar quiénes somos** (scroll + "Explorar").

## Decisión de dirección (aprobada por el usuario)

**B — Cohete de marca stylized, bajo-poly, procedural en three.js.** El isotipo vuelto 3D,
neón violeta/magenta/cian sobre negro. 0 descarga (geometría procedural, sin GLB ni texturas),
interactivo al instante, 100% on-brand.

- Se descartó **A** (modelo real H-IIA): los GLB pesan **47 MB** c/u (inviable en un hero), y
  el cohete gris fotorrealista choca con la estética neón. El H-IIA queda solo como
  **referencia de proporciones**.
- Se descartó **C** (híbrido real decimado + shader): más trabajo, resultado incierto.

## Goals

- Hero con un **cohete 3D procedural de marca** que se **ensambla solo** al entrar (welcome moment).
- **Interactivo**: arrastrar para orbitar; interacción que invite a explorar.
- **Liviano**: 0 assets externos; un solo contexto WebGL, pausado fuera de viewport.
- Coherente con el lenguaje de las escenas 3D existentes (TriFrontPavilion3D / AgenticLab3D):
  paleta neón, idle/respiración continuos, flota libre sin caja, viñeta.
- Accesible: `prefers-reduced-motion` y fallback sin WebGL.

## Non-goals

- No usar el GLB H-IIA ni ningún modelo/textura externa.
- No tocar el resto de la home (secciones, nav, otras escenas 3D) más allá de reemplazar el orbe.
- No agregar librerías nuevas (ya están three 0.182 + drei/fiber, pero seguimos el patrón **three
  crudo** como Tri/AgenticLab).

## Anti-goals (qué sería un fracaso aunque "funcione")

- Que parezca un cohete genérico de stock / no se lea como *el* cohete de CreAPP.
- Que el ensamblado sea confuso o lento y el usuario no entienda qué pasó.
- Que meta jank/caída de FPS en la home (ya hay 3 escenas WebGL).
- Que en mobile quede diminuto o rompa el layout del hero.

## Restricciones

- Stack: `three@0.182`, patrón **raw three.js** en un componente autocontenido con wrapper React
  que monta en un div y devuelve `dispose()` (igual que `TriFrontPavilion3D.tsx`).
- La home ya corre AgenticLab3D + TriFrontPavilion3D + Ecosystem (WebGL). El cohete es la 4ª
  escena: **debe** pausar `requestAnimationFrame` fuera de viewport y liberar el contexto al
  desmontar (límite ~16 contextos WebGL por página).
- Colores desde tokens de marca: `--accent` #8B5CF6, `--accent-2` #FF2D78 (magenta), `--accent-3`
  #00F0FF (cian). Fondo negro #05070F. Theme-aware (dark/toggle claro).
- El hero es lo primero que se ve: la escena arranca visible, no diferida.

## Aproximaciones consideradas (para el "cómo")

Todas dentro de la dirección B ya elegida; lo que sigue es cómo se construye la pieza:

1. **Raw three.js procedural, un archivo** (igual que TriFrontPavilion3D). ✅ **Elegida.** Encaja con
   el patrón existente, 0 assets, control total de la animación de ensamblado. Contra: geometría a
   mano (más código), pero es el paradigma que el repo ya usa y domina.
2. R3F + drei (`<Canvas>`, useFrame). Más declarativo, pero introduce otro paradigma de 3D en la
   home (hoy Tri/AgenticLab son raw-three) y overhead del reconciler. Descartada por consistencia.
3. GLB propio bajo-poly modelado aparte. Reintroduce descarga + pipeline de assets y pierde la
   ventaja "0 KB". Descartada.

## El cohete (geometría procedural, mi diseño)

Bajo-poly, construido con primitivas de three. Partes separables (cada una es un `Group`/`Mesh`
con su posición final y una posición "explotada" de origen):

- **Nariz / cono** (ConeGeometry) — punta con rim-light.
- **Fuselaje** (CylinderGeometry, cuerpo principal) — cuerpo oscuro mate con banda emisiva y el
  **monograma/llama** del isotipo en relieve o como luz.
- **Ventana / ojo de buey** (circle emisivo cian) — guiño de vida.
- **3 aletas** (shapes/extrude triangulares) — magenta.
- **Motor / tobera** (CylinderGeometry invertido) — boquilla.
- **Llama + estela** (cono emisivo + partículas/puntos) — violeta→magenta, flicker continuo.

Materiales: cuerpo `MeshStandardMetalness` oscuro con `RoomEnvironment` para reflejos sobrios +
acentos **emisivos** neón (bordes, banda, ventana, llama). Un halo/bloom sutil. Nada de gris
fotorrealista: lectura de "juguete premium de marca", limpio y luminoso.

## La interacción y el motion (mi propuesta — a confirmar)

1. **Carga (welcome):** las piezas entran **desde posiciones explotadas/dispersas** (nariz arriba,
   aletas desde los lados, motor desde abajo) y **se ensamblan** con físicas de resorte
   (overshoot elástico), con un **destello** en cada "encastre" y un *whoosh* visual. ~1.6–2.0 s.
   Termina en el cohete armado.
2. **Idle continuo:** el cohete **flota** (bob vertical suave), **gira lento** sobre su eje, la
   **llama titila** y hay **respiración** de escala — nunca queda quieto (regla de vida visual de
   las otras escenas).
3. **Interactivo:**
   - **Arrastrar = orbitar** (OrbitControls amortiguado, sin zoom).
   - **Hover sobre una pieza = se ilumina** (micro feedback "son piezas").
   - **Click/tap en el cohete = re-ensamblar** (vuelve a explotar y armarse) — para poder
     "volver a verlo armarse", que es el gancho. Alternativa/añadido: click = **encender motores**
     (pulso de empuje + la llama crece) como micro-recompensa.
   - Hint al pie: `ARRASTRÁ PARA GIRAR · TOCÁ PARA RE-ENSAMBLAR` (mismo estilo que el hint actual
     del orbe).

**Decisión de interacción (mi call, el usuario puede corregir):** *auto-ensambla al cargar* +
*click para re-ensamblar* + *arrastrar para orbitar*. Se evaluó "el usuario arrastra las piezas
para juntarlas manualmente": se descarta como modo principal (fiddly, poca gente lo descubre,
frágil en mobile), aunque el hover-highlight deja la sensación de "piezas".

## Copy del hero (a confirmar con el usuario)

La frase es el corazón del concepto. Propongo que **sea el titular**:

```
CREAPP · SOFTWARE & AGENTIC LAB
Tenemos las piezas que faltan
para hacer DESPEGAR tu negocio.        ← "DESPEGAR" en acento violeta
[remate] Software, IA y seguridad, listos para ensamblar.
[lead] Un software lab AI-native…  (se mantiene)
[CTAs] Agendá una llamada · Explorar
```

- Alternativa si el usuario quiere conservar el titular actual ("El software y la IA que tu
  negocio necesita"): la frase del cohete va como **caption/rótulo** de la ilustración.
- **Pendiente de decisión del usuario.** (El resto del copy del hero no se toca.)

## Resuelto en revisión (calls del builder, el usuario puede corregir)

- **Modo claro:** el cohete es un objeto **luminoso neón siempre** (no se re-colorea por tema, a
  diferencia del `Orb`). Se sigue el patrón de `TriFrontPavilion3D` (canvas transparente, flota),
  **más** un **halo/viñeta oscura radial propia detrás del cohete** ("bahía de lanzamiento") para
  que lea bien también sobre fondo claro — nunca un cohete oscuro flotando sobre blanco. Es decir:
  no hay rama de material "claro"; hay un backdrop propio que lo despega del fondo en cualquier tema.
- **Silueta canónica:** la referencia de proporciones/silueta es el **isotipo oficial de CreAPP**
  (el cohete de marca: `public/creapp/rocket.png` / `CREAPP LOGO VECTOR.png`, el mismo que usa el
  nav), no las variantes dibujadas a mano de `AreaGraphics`/`SectionFigures`. Así se cumple el
  anti-goal "que se lea como *el* cohete de CreAPP".

## Layout y responsive

- Se mantiene `cw-hero-grid` (copy izquierda, visual derecha). El `<Orb>` se reemplaza por
  `<RocketHero>` en el mismo slot de `HomePage.tsx`.
- Mobile (≤ 860px): el cohete pasa **arriba del copy** o debajo, con alto reducido; ensamblado
  igual pero con menos partículas. Sin scroll horizontal, gutter 16px.
- El orbe (`Orb.tsx`) queda en el repo por si se quiere en otro lado, pero deja de usarse en el hero.

## Accesibilidad y performance

- `prefers-reduced-motion: reduce` → el cohete aparece **ya armado y estático** (sin animación de
  ensamblado ni giro; a lo sumo un float mínimo o nada). `role="img"` + `aria-label` descriptivo.
- **Sin WebGL** (o si falla la creación del contexto) → **fallback**: el isotipo-cohete de marca
  grande en SVG/PNG, estático, centrado. Nunca un canvas negro.
- IntersectionObserver: `rAF` corre solo con el hero en viewport y la pestaña visible; al salir,
  pausa; al desmontar, `renderer.dispose()` + libera geometrías/materiales.
- Objetivo 60 FPS en desktop; degradar partículas/bloom en mobile.

## Qué queda a criterio del builder

- Geometría exacta de cada pieza (segmentos, biseles) y el "look" fino del material neón, siempre
  dentro de la paleta y del paradigma Tri/AgenticLab.
- Curvas de easing/resorte concretas del ensamblado (damping/stiffness) buscando el "encastre"
  satisfactorio.
- Implementación del hint, del fallback y del gating por viewport siguiendo el patrón existente.
- Nombre del componente: `RocketHero` en `src/components/site/RocketHero.tsx` (+ estilos propios,
  igual que Tri).

## Verificación

- `tsc` 0, `vite build` OK, `npm test` verde (los tests existentes no deberían romperse; si algún
  test referencia al Orb en el hero, actualizar).
- QA visual por screenshots (headless) del ensamblado y del estado armado + idle, y revisión del
  usuario en preview `:5199`.
