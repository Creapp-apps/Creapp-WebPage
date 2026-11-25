# Portal del cliente — Home con valor + Sidebar tematizado por cliente (P3)

Fecha: 2026-11-25
Estado: diseño, pendiente de aprobación
Repo: `creapp---fintech-innovation-hub`. Construye sobre P1 (shell+calendario) y P2
(insights), ambos ya en `main`.

## 1. Intención y por qué

Tras probar en prod (Materalia), surgieron 4 ajustes del shell/home:
1. Colapsado el sidebar, **no hay botón para volver a expandir** (bug).
2. El sidebar **no se tiñe con el branding del cliente** — queda violeta/grafito
   CreAPP, incongruente con el contenido (Materalia navy+amarillo).
3. El **home ("Campaña") no muestra nada de valor** — solo hero + paleta + barra.
4. El **mark del sidebar** ("C" violeta) no es del cliente; CreAPP debe seguir
   presente pero sin confundir al cliente.

El por qué: el portal es la cara premium hacia el cliente. Tiene que sentirse
**suyo** (su marca manda) y darle valor al entrar (estado + qué se viene), con
CreAPP presente pero subordinado.

## 2. Decisiones del usuario (confirmadas)
- **#2**: el sidebar **se tiñe con el tema del cliente** (invierte la decisión
  previa de "sidebar = identidad CreAPP"). Manda el branding del cliente.
- **#4**: **logo del cliente arriba** del sidebar; **CreAPP abajo** (el badge que
  ya existe), sin generar confusión.
- **#3**: el home pasa a ser un **resumen con valor** (layout aprobado abajo).

## 3. Hallazgos (fundan el cómo)
- El theming del cliente **ya existe**: `usePortalTheme(campaign)` setea las vars
  del tema (`--bg/--navy/--navy2/--ink/--muted/--line/--wood`(acento)) en `.portal`
  según `aesthetic` (Materalia = `bold_colorblock_editorial`, navy #0E2A6E + amarillo
  #FFD60A). El contenido ya se tiñe; **el sidebar NO** porque usa colores
  hardcodeados (grafito #0b1020 + violeta #b06cff). `.psb` vive dentro de `.portal`
  → las vars del tema ya están disponibles para él.
- El logo del cliente ya está disponible: `pickBrandMark(campaign.client)` /
  `BrandMarkView` (lo usa `CampaignHero`).
- Los datos del home ya existen: `campaign` (título/mes/concepto/pieces) de
  `portalService`, y las publicaciones programadas de `calendarService`
  (`getMyCalendarPieces`, P1). Sin endpoints ni RLS nuevos.
- CreAPP abajo ya está: `AgencyBadge` al pie del sidebar.

## 4. Goals / Non-goals / Anti-goals
**Goals**
- Sidebar con toggle de colapsar/expandir **siempre visible**.
- Sidebar **tematizado por cliente** (vars del tema, no colores CreAPP fijos).
- **Logo del cliente** como mark superior del sidebar; **CreAPP** al pie.
- **Home = resumen** (sección "Campaña"): header compacto + tarjetas de estado +
  próximas publicaciones + rail de piezas + accesos a las secciones.

**Non-goals**
- No se tocan Calendario, Revisión ni Insights (salvo que el sidebar los tiñe).
- No se agregan endpoints ni migraciones.
- No se cambia el login/auth (puerta fija CreAPP, `authShell.tsx`).

**Anti-goals (fracaso aunque funcione)**
- Confundir al cliente sobre de quién es el portal (CreAPP compitiendo con su marca).
- Sidebar ilegible por bajo contraste al tematizar (romper WCAG).
- Home que dependa de datos que todavía no existen (campaña sin publicaciones
  programadas) y muestre error/vacío feo en vez de un estado honesto.

## 5. El "cómo"

### 5.1 Sidebar — toggle, theming, logo (`PortalShell.tsx` + `.psb-*` CSS)
- **Toggle siempre visible**: el botón de colapsar/expandir se mantiene en el
  `.psb-top` también en estado colapsado (en colapsado muestra `PanelLeft` =
  expandir). Se quita la regla `.collapsed .psb-collapse{display:none}`.
- **Theming**: `.psb` deja los colores fijos y pasa a **vars del tema**:
  fondo = mezcla de `--bg`/`--navy` del cliente (superficie elevada del tema,
  no grafito); borde = `--line`; ítem activo = acento del cliente
  (`--wood`/`--wood-rgb`) con su glow; hover con `--navy2`. Contraste: texto en
  `--ink`/`--muted` del tema (ya garantizados por `portalThemes`). Para separar
  visualmente el sidebar del contenido, usa una superficie un paso más oscura/clara
  que el fondo (`color-mix` sobre `--bg`) + el borde del tema.
- **Mark superior = logo del cliente**: reemplaza el `psb-mark` "C" violeta por
  `BrandMarkView` (logo del cliente; fallback a su inicial sobre el acento del
  tema, no violeta). Requiere pasar `client` (o la marca) al `PortalShell`.
- **CreAPP abajo**: `AgencyBadge` se mantiene al pie (ya está). Se revisa que lea
  "hecho con CreAPP"/marca chica, subordinada, sin competir.

### 5.2 Home — `PortalHome.tsx` (sección "Campaña")
Reemplaza el render actual de la sección Campaña (hoy `CampaignHero`) por un
resumen. Recibe `campaign`, `campaignId`, `onNavigate`, `pendingCount`.
Layout (aprobado por el usuario):

```
[logo cliente]  <Marca> · Campaña de <Mes>
"<Concepto del mes>"                       (si existe)

┌ 4 piezas ┐ ┌ 0 aprobadas ┐ ┌ próxima ┐
│ esta camp.│ │ 4 esperan vos│ │ sale 28/11│   ← tarjetas de estado
└───────────┘ └─────────────┘ └──────────┘

Próximas publicaciones
[▸ 28/11][▸ 30/11][▸ 02/12]                 ← de calendarService (futuras)

Tus piezas
[▪][▪][▪][▪]   (click → Revisión)            ← campaign.pieces (portadas)

→ Ir a Revisión   → Ver Calendario   → Insights   ← atajos (onNavigate)
```

- **Tarjetas de estado**: total de piezas, aprobadas, pendientes (de
  `campaign.pieces`), y "próxima publicación" (la fecha futura más cercana de
  `getMyCalendarPieces`). Si no hay publicaciones programadas (campaña aún en
  revisión), esa tarjeta muestra un estado honesto ("en revisión" / "cuando la
  aprobemos").
- **Próximas publicaciones**: las N (3–4) futuras más cercanas del calendario,
  con fecha + miniatura; click → abre la sección Calendario.
- **Rail de piezas**: portadas de `campaign.pieces`; click → sección Revisión.
- **Atajos**: botones a Revisión / Calendario / Insights (`onNavigate`).
- Acentos del tema del cliente (`--wood`), tipografía del tema.
- El hero gigante "Tu campaña" actual se reduce a un header compacto.

### 5.3 Wiring (`PortalView.tsx`)
- `active === 'campania'` renderiza `PortalHome` (con `campaign`, `campaignId`,
  `onNavigate = setActive`, `pendingCount`) en vez de `CampaignHero`.
- `PortalShell` recibe la marca del cliente para el mark superior.

## 6. Qué queda al builder
- Mezclas exactas de color del sidebar (`color-mix` sobre las vars) para separar
  del fondo manteniendo contraste; markup/CSS de las tarjetas y rails (prefijos
  `.psb-*` / `.home-*`).
- Cuántas "próximas publicaciones" mostrar (default 3) y formato de fecha.
- Si el rail de piezas navega a la pieza puntual o solo a Revisión (default:
  Revisión).
- Tests: la lógica nueva testeable es poca (derivar "próxima publicación" y los
  conteos); si se extrae un helper puro (`nextPublication(pieces, now)`), va con
  test node:test. El resto (sidebar/home) se verifica por build + humo.

## 7. Riesgos
- **Contraste al tematizar el sidebar**: temas claros/raros podrían bajar el
  contraste del sidebar. Mitigación: derivar la superficie del sidebar de `--bg`
  con `color-mix` y usar `--ink/--muted` del tema (ya contrastados); revisar en el
  humo con Materalia (navy) y algún tema claro.
- **Campaña sin publicaciones programadas**: "próximas" y "próxima publicación"
  vacías → estado honesto, no error.
