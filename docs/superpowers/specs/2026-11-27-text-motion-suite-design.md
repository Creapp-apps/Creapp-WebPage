# Suite de motion de texto + piezas (CreAPP) — design

Fecha: 2026-11-27 · Estado: en construcción por slices (home primero, decisión del usuario)

## Intención

Subir de categoría el movimiento del sitio: los títulos se "despliegan" al scrollear (efecto tipo
21st.dev), los subtítulos entran con reveals tipo typewriter **variados** (anti-monotonía), las
palabras resaltadas tienen **shimmer** constante, y las piezas/figuras entran con fade + slide
lateral al scroll (spawn dinámico, no fijas). Más 2 bugs reportados.

## Alcance / orden

Home primero como vara; luego roll-out a las 9 páginas de servicio. Admin/portal fuera.

## Decisiones

- **Componente del usuario (`TextReveal` de 21st.dev):** se adapta a `framer-motion` (misma lib que
  `motion/react`, ya instalada) + `whileInView` + tokens del sistema. NO se instala `motion` (dup) ni
  se mete Tailwind/shadcn al sitio (el sitio es CSS propio `cw-*`).
- **Títulos con acento:** los títulos llevan `<span class="cw-accent">` (shimmer). El reveal se hace
  con **SplitText al scroll** (preserva los spans internos, igual que el hero), no con el componente
  string-based. → `SplitReveal` (GSAP SplitText + ScrollTrigger, type lines, máscara).
- **Subtítulos (texto plano):** `TextReveal` string-based con presets variados por sección.
- **Shimmer:** CSS sobre `.cw-accent` (gradiente clip-text animado), apagado en reduced-motion.
- **Bug "g" (NEGOCIO):** `.cw-display { line-height: 1.02 }` + máscara recortaba descendentes → se
  sube line-height del hero y se da aire inferior a las líneas de máscara.
- **Bug "título colado":** `.cw-chapter-head { position: sticky }` → se hace `static`.

## Estado por slices

- **Slice 1 (hecho):** bugs (sticky estático + g-clip), shimmer en `.cw-accent`, `SplitReveal` +
  títulos del home (Servicios, Clientes, Contacto). Hero ya tenía su reveal por líneas.
- **Slice 2 (pendiente):** subtítulos con reveals typewriter variados (líneas · char/cursor · word
  blur-in · segmento lento), rotados para que no se repitan entre secciones contiguas.
- **Slice 3 (pendiente):** piezas/figuras con fade + slide lateral al scroll; título de Metodología
  (vía `Chapter`); roll-out del paquete a las páginas de servicio.

## Verificación

tsc 0 · vite build OK · node --test 186/186 · QA visual del usuario en `:5199` (incl. reduced-motion).
