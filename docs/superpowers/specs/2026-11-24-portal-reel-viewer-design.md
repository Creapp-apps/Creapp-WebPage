# Portal — Visor de piezas tipo reel (rediseño de la revisión del cliente)

Fecha: 2026-11-24 · Estado: propuesto (pendiente de aprobación)

## Intención y porqué
El portal del cliente muestra hoy las piezas en **rieles por tipo** (Reels / Carruseles / Historias) con tarjetas **9:16 angostas y altas**. En desktop se ve pobre y poco ergonómico: un thumbnail vertical flotando en un plano ancho. El cliente revisa **de a una**, mira la pieza completa y decide. El rediseño reemplaza la grilla por un **visor centrado tipo reel/historia**: una pieza a la vez, grande y centrada, decisión clara, y avance a la siguiente.

## Objetivos
- Una pieza a la vez, **centrada**, con el video/arte como protagonista (alto cómodo ~70vh, nunca estirado).
- Decisión siempre visible y obvia: **Aprobar / Pedir cambios**.
- **Progreso claro**: "Pieza X de N" + barras tipo stories; navegación anterior / siguiente.
- **Auto-avance** a la siguiente pieza sin decidir al aprobar o pedir cambios.
- Familiar para un cliente no técnico (se siente como ver un reel).
- Responsive: en celular es ancho completo natural.
- Respeta el **theming por campaña** (navy+amarillo de Materalia, etc.).

## No-objetivos
- No es una galería para ver todo junto (enfoque B, descartado).
- No pantalla completa inmersiva sin contexto (enfoque C, descartado).
- No cambia el flujo de datos, la aprobación (`submitDecision`) ni la conversación (`PieceThread`).
- No toca cómo se publican las piezas (push / botón "Enviar al cliente").

## Enfoque elegido (A — visor centrado tipo reel)
```
                 Pieza 1 de 3
          ▓▓▓▓▓▓▓  ░░░░░░  ░░░░░░        ← barras de progreso (stories); tocar una = saltar

   REEL                      ┌───────────┐
   3 errores que pueden      │    9:16   │   player grande, alto ~70vh
   complicar tu obra         │  video ▶  │   (carrusel: ‹ › con contador de láminas)
                             └───────────┘
   [caption · hashtags]     ‹ anterior        siguiente ›

              [   Aprobar   ]   [ Pedir cambios ]
        ── Conversación con tu equipo (hilo) ──
```
En desktop: media centrada, meta y botones alrededor con aire. En celular: media ancho completo, meta y botones debajo.

**Reutiliza lo que ya existe** (hoy dentro de `PiecePlayer`, el modal): `PortalVideo` (video), navegación de láminas (carruseles), cover (fallback), meta (tipo/título/caption/descripción/hashtags), decisión (Aprobar / Pedir cambios + comentario), estado "Aprobada por vos", y `PieceThread` (conversación). El rediseño **lo saca del modal** y lo envuelve en el visor centrado con progreso + navegación.

**Toca:**
- `PortalView.tsx`: deja de renderizar rieles; renderiza el visor único sobre la cola de piezas.
- Nuevo `PieceReview.tsx` (o refactor de `PiecePlayer` a no-modal) con el visor + progreso + navegación + auto-avance.
- `portal.css`: estilos del visor; los de rieles/tarjetas quedan sin uso.
- `PortalPreview.tsx` (vista admin "así lo ve el cliente"): usa el mismo visor para que coincida.
- `PieceCard.tsx` / `PieceRail.tsx`: quedan sin uso (remover o dejar — decisión del builder).

## Decisiones (mis llamadas, corregibles)
- **Cola**: todas las piezas en orden reel → carrusel → historia, aplanadas (sin secciones por tipo).
- **Arranque**: en la primera pieza **pendiente** (`status: 'sent'`); si todas están decididas, en la primera.
- **Progreso**: barras tipo stories arriba; tocar una barra salta a esa pieza; flechas anterior/siguiente; teclado (← →, Esc).
- **Auto-avance**: al Aprobar o Enviar cambios, avanza a la siguiente **sin decidir**. Si no quedan, muestra estado **"Revisaste todo"** con resumen (X aprobadas · Y con cambios).
- **Bulk approve**: se **elimina** la barra prominente "Aprobar pendientes" (contradice el flujo de a una). En el estado "Revisaste todo" se ofrece un **atajo chico y secundario "aprobar las que falten"** (decisión del usuario, 2026-11-24): ahorra tiempo si el cliente lo desea, sin competir con el flujo de a una.
- **Carruseles**: el visor muestra las láminas con ‹ › y contador, igual que hoy.

## Restricciones
- Vite + React + Tailwind + `portal.css` (vars de tema). Accesibilidad: teclado (Esc, flechas), `prefers-reduced-motion`.
- Sin romper `submitDecision`, `PieceThread`, ni la RLS.

## Qué queda al builder
- Refactor de `PiecePlayer` a no-modal vs nuevo `PieceReview`; animación del avance; estilos en `portal.css`; breakpoints responsive; destino de `PieceCard`/`PieceRail`.

Estado: **aprobado** por el usuario (2026-11-24).
