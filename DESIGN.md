---
name: KuramaTracker
description: Un muro de streaming de tu vida como fan, con carteles que se levantan en 3D sobre tinta de noche y un único acento lima para tu progreso.
colors:
  lime-electric: "#c6f432"
  lime-pressed: "#a6d31a"
  ink-night: "#0c0e14"
  ink-rail: "#090b10"
  ink-surface: "#161922"
  ink-raised: "#1e222d"
  ink-hover: "#252a36"
  ink-line: "#262a36"
  frost-text: "#f2f4f7"
  fog-text: "#9ba1b0"
  chart-silver: "#c9cfdb"
  status-watching: "#7fa418"
  status-completed: "#3a8fe0"
  status-planning: "#c47a16"
  status-paused: "#9a76f0"
  status-dropped: "#e04a66"
  tier-bronze: "#c08457"
  tier-silver: "#c9cfdb"
  tier-gold: "#e3b341"
  tier-diamond: "#7cc8f0"
  urgency-rose: "#ff6b81"
  streak-ember: "#ff8a3d"
typography:
  display:
    fontFamily: "Lexend, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Lexend, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.1
    fontFeature: "\"tnum\" 1"
  title:
    fontFamily: "Lexend, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Lexend, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Lexend, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 600
    lineHeight: 1.25
  rank:
    fontFamily: "Lexend, system-ui, sans-serif"
    fontSize: "120px"
    fontWeight: 800
    lineHeight: 1
rounded:
  badge: "6px"
  tile: "10px"
  panel: "14px"
  billboard: "18px"
  pill: "9999px"
spacing:
  rail-gap: "16px"
  row-gap: "24px"
  gutter-mobile: "16px"
  gutter-desktop: "32px"
  panel-pad: "20px"
  billboard-pad: "40px"
components:
  button-primary:
    backgroundColor: "{colors.lime-electric}"
    textColor: "{colors.ink-night}"
    rounded: "{rounded.tile}"
    height: "48px"
    padding: "0 24px"
  button-secondary:
    backgroundColor: "{colors.ink-raised}"
    textColor: "{colors.frost-text}"
    rounded: "{rounded.tile}"
    padding: "8px 16px"
  button-secondary-hover:
    backgroundColor: "{colors.ink-hover}"
  button-increment:
    backgroundColor: "{colors.ink-raised}"
    textColor: "{colors.lime-electric}"
    rounded: "{rounded.pill}"
    height: "28px"
    padding: "0 10px"
  button-increment-hover:
    backgroundColor: "{colors.lime-electric}"
    textColor: "{colors.ink-night}"
  button-row-arrow:
    backgroundColor: "{colors.ink-raised}"
    textColor: "{colors.frost-text}"
    rounded: "{rounded.pill}"
    size: "32px"
  poster-tile:
    backgroundColor: "{colors.ink-raised}"
    textColor: "#ffffff"
    rounded: "{rounded.tile}"
    width: "172px"
  poster-badge:
    backgroundColor: "#000000b3"
    textColor: "#ffffff"
    typography: "{typography.label}"
    rounded: "{rounded.badge}"
    padding: "2px 6px"
  poster-badge-accent:
    backgroundColor: "{colors.lime-electric}"
    textColor: "{colors.ink-night}"
  panel:
    backgroundColor: "{colors.ink-surface}"
    rounded: "{rounded.billboard}"
    padding: "28px"
  nav-item-active:
    backgroundColor: "{colors.ink-raised}"
    textColor: "{colors.frost-text}"
    rounded: "{rounded.tile}"
    padding: "12px 16px"
  nav-rail:
    backgroundColor: "{colors.ink-rail}"
    width: "256px"
---

# Design System: KuramaTracker

## Overview

**Creative North Star: "Muro de Streaming"**

El perfil es un muro de streaming de tu propia vida como fan: filas horizontales de carteles 2:3 que se inclinan y se levantan en 3D, coronadas por un billboard con tu nivel y tu liga sobre el banner del anime que estás viendo. El suelo es tinta de noche y las superficies son sólidas; los carteles y banners de terceros son el único color rico de la pantalla. Todo lo demás es neutro frío salvo un acento lima eléctrica que solo aparece donde hay progreso, foco, selección o la acción principal.

La densidad es la de una plataforma de streaming: filas que se desplazan por cartel, tipografía Lexend única con cifras tabulares, esquinas de 10px en los carteles y sombras profundas con desplazamiento y desenfoque que separan cada pieza del suelo. La profundidad es física (giro, elevación en Z, sombra), nunca cristal ni halo. El movimiento es la firma: el cartel sigue al puntero con un brillo especular, la fila activa sube y las demás se apagan, y en navegadores con animaciones ligadas al scroll los carteles giran como una estantería al entrar y salir de la fila. Con movimiento reducido todo eso se reduce a una escala leve.

Este mundo sustituye a la cuadrícula gamificada de tarjetas bento de cristal; no conserva ni el ámbar ni sus reglas.

**Key Characteristics:**
- Suelo tinta-noche y superficies sólidas en tres escalones; sin cristal, sin bordes de color.
- Carteles 2:3 como unidad del sistema, con giro 3D, brillo especular y elevación en Z.
- Un único acento lima eléctrica con texto tinta encima, reservado para progreso, foco, selección y acción principal.
- Lexend como única familia; cifras tabulares en todo dato.
- Sombras con desplazamiento y desenfoque reales; ningún halo de desplazamiento cero.
- Movimiento reducido = solo escala; el destacado pierde su giro permanente.

## Colors

Una paleta de tinta azul-noche casi monocroma donde el color lo ponen los carteles y un solo acento lima eléctrica; el color semántico vive solo en los gráficos y los iconos de medalla.

### Primary
- **Lima Eléctrica** (lime-electric): barra de nivel y de progreso de episodios, anillo de foco (`:focus-visible` 2px con 2px de separación), cursor de texto, selección de texto, icono y marcador de la pestaña activa, punto de notificación, badge "Continúa aquí" y botón principal ("Jugar quiz diario"). Siempre con texto tinta encima, nunca texto lima sobre lima. Rampa en Tailwind `kurama` 50–700; `kurama-600` (lime-pressed) es el tono hundido.

### Neutral
- **Tinta de Noche** (ink-night): suelo de la app, `theme-color`, texto sobre lima y base de los degradados que oscurecen los banners.
- **Tinta de Raíl** (ink-rail): el raíl lateral de escritorio y la barra inferior móvil, un escalón por debajo del suelo.
- **Superficie de Fila** (ink-surface): tarjetas, panel de cifras, billboard sin banner, filas vacías.
- **Superficie Elevada** (ink-raised): botones secundarios, flechas de fila, pastilla "+1 ep", fondo del cartel mientras carga, ítem de navegación activo.
- **Tinta de Hover** (ink-hover): hover de botones secundarios y fondo de avatares sin imagen en Arena y El Grupo.
- **Línea Tinta** (ink-line): el borde por defecto. Los divisores dentro de paneles usan blanco al 5–10% de opacidad.
- **Texto Escarcha** (frost-text) para texto principal y **Texto Niebla** (fog-text) para etiquetas, notas y texto secundario. Sobre banner, el texto secundario es blanco al 60–75%.
- **Plata de Gráfico** (chart-silver): la serie única de los gráficos de una sola variable (géneros, reparto de notas); en hover la barra pasa a blanco.

### Tertiary (semántico, solo datos e iconos)
- **Estados de la lista**, paleta categórica validada para daltonismo en modo oscuro sobre la Superficie de Fila, en orden fijo: Viendo (status-watching), Completados (status-completed), Pendientes (status-planning), En pausa (status-paused), Abandonados (status-dropped). Siempre acompañados de etiqueta y cifra.
- **Medallas de división**: bronce, plata, oro y diamante (tier-*). Solo colorean el icono de medalla, nunca el texto ni fondos.
- **Rosa de Urgencia** (urgency-rose): temporizador del quiz en los últimos 5 segundos.
- **Brasa de Racha** (streak-ember): solo el icono de llama de la racha diaria.

### Named Rules
**The One Lime Rule.** El lima significa "tu progreso o tu siguiente acción". Si un elemento no es progreso, foco, selección o la acción principal, no es lima.

**The Posters Bring the Color Rule.** Las superficies son tinta neutra; el color rico lo aportan las portadas y banners de AniList. Ninguna superficie, borde o fondo de sistema lleva tinte de color.

**The Icon-Only Medal Rule.** Los colores de división tiñen únicamente el icono de medalla.

## Typography

**Display Font:** Lexend (con system-ui, sans-serif)
**Body Font:** Lexend (con system-ui, sans-serif)

**Character:** Una sola familia geométrica y legible, cargada de 300 a 800, que cambia de voz solo por peso y tamaño. Los números mandan: todo dato usa cifras tabulares.

### Hierarchy
- **Display** (700, 1.875rem en móvil / 3rem desde sm, tracking -0.025em): el nombre del usuario en el billboard.
- **Headline** (700, 1.875–2.25rem, tabular): las cifras grandes (series, episodios, días, nota media, PL de liga). "Nv. N" va a 1.5rem 700.
- **Title** (600, 1.125rem en móvil / 1.25rem desde sm): títulos de fila ("Sigues viendo", "Se emite esta semana") y de panel ("Tu anime en cifras").
- **Body** (400, 0.875rem): etiquetas de cifras, leyendas, navegación (500; 600 en activo). Títulos de cartel a 13px 600, meta a 11px.
- **Label** (600, 10px): badges sobre el cartel (día y hora, nota) y ejes de gráfico.
- **Rank** (800, 88px móvil / 120px desde sm): el numeral del Top 10, relleno tinta con contorno de 2px gris, detrás del cartel.

### Named Rules
**The Tabular Numbers Rule.** Toda cifra, progreso, hora, nota o contador lleva `font-variant-numeric: tabular-nums`.

**The One Family Rule.** Lexend es la única familia; la jerarquía sale del peso y el tamaño, no de una segunda tipografía.

## Layout

Raíl lateral fijo de 256px en escritorio (desde md, 768px) y barra inferior de cinco pestañas en móvil con relleno de zona segura. El contenido vive en un `main` de hasta 1440px, con 16px de gutter en móvil y 32px desde md, y 112px de relleno inferior en móvil para no chocar con la barra.

La página de perfil es una columna vertical: billboard a todo el ancho (padding 20 / 32 / 40px según breakpoint, rejilla de dos columnas desde lg con la liga en 300–380px), panel de cifras y luego las filas del muro separadas 24px. Cada fila es una cabecera (título, nota, "Ver todo", flechas solo desde sm) sobre un carril horizontal con scroll por cartel (`scroll-snap` obligatorio, sin barra), 16px entre carteles y un sangrado que escapa al gutter para que los carteles lleguen al borde. El carril reserva 24px arriba para que el cartel levantado en Z no se recorte.

Anchos de cartel: 172px por defecto; el destacado ocupa 78vw hasta 420px; la fila semanal usa carteles de 52vw hasta 228px. Las rejillas de catálogo pasan de 2 a 6 columnas (2 / 3 sm / 4 md / 6 lg) con 16px horizontales y 24px verticales.

## Elevation & Depth

Profundidad física: superficies sólidas separadas del suelo por sombras con desplazamiento vertical y desenfoque reales, más transformaciones 3D en los carteles. No hay cristal, desenfoque de fondo de interfaz ni halos de desplazamiento cero. El único desenfoque es el del banner de fondo del billboard, que es imagen, no superficie.

### Shadow Vocabulary
- **Sombra de Cartel** (`--shadow-tile: 0 18px 34px -14px rgb(0 0 0 / 0.75)`): reposo de carteles, tarjetas y panel de cifras.
- **Sombra Levantada** (`--shadow-lift: 0 30px 50px -18px rgb(0 0 0 / 0.85)`): billboard y cartel destacado.
- **Sombra de Hover del Cartel** (`0 34px 50px -16px rgb(0 0 0 / 0.9), 0 0 0 1px` lima al 90%): cartel en hover o con foco dentro; el anillo de 1px es el foco lima, no un halo.

### Named Rules
**The Real Shadow Rule.** Toda sombra tiene desplazamiento vertical y desenfoque con dispersión negativa. Un `0 0 Npx` de color no es una sombra de este sistema.

**The Lift, Don't Glow Rule.** El estado activo se expresa subiendo (Z, translateY, escala) y oscureciendo lo demás, nunca iluminando con halos.

## Shapes

Esquinas suaves y consistentes: 10px en carteles, botones principales, ítems de navegación y logotipo; 14px en contenedores internos, avatar del billboard y filas vacías; 18px en los grandes paneles (billboard, cifras). Badges a 6px, píldoras completas en "+1 ep", flechas de fila y barras de progreso. Los gráficos usan 3–4px. Sin bordes de color: los contenedores no llevan borde y los divisores son blanco al 5–10%. El cartel siempre recorta su imagen (`overflow: hidden`) con proporción 2:3; el destacado pasa a 4:3 en móvil y a 258px de alto desde sm.

## Components

### Buttons
- **Shape:** esquinas de 10px (o píldora en acciones compactas).
- **Primary:** fondo lima eléctrica, texto tinta 600, 48px de alto, icono relleno de 16px; hover escala 1.02, pulsado 0.98, 200ms. Uno por vista.
- **Secondary:** fondo Superficie Elevada, texto escarcha 500, 8×16px; hover a Tinta de Hover.
- **Increment ("+1 ep"):** píldora de 28px, Superficie Elevada con texto lima; hover se invierte a fondo lima con texto tinta; pulsado 0.95; deshabilitado al 60%.
- **Row arrows:** círculos de 32px en Superficie Elevada, solo desde sm; deshabilitadas al 30%.
- **Text link ("Ver todo"):** texto niebla 500 que pasa a blanco.

### Chips / Badges
- **Neutro:** negro al 70% con texto blanco, 10px 600 tabular, 6px de radio, encima del cartel.
- **En emisión:** fondo blanco con texto tinta.
- **Acento:** fondo lima con texto tinta, solo para "Continúa aquí".

### Cards / Containers
- **Corner Style:** 14px internos, 18px paneles de página.
- **Background:** Superficie de Fila; el panel de liga sobre banner usa tinta de noche al 80%.
- **Shadow Strategy:** Sombra de Cartel en reposo, Sombra Levantada en el billboard.
- **Border:** ninguno.
- **Internal Padding:** 20px en móvil, 28px desde sm.

### Inputs / Fields
- **Style:** fondo tinta oscura translúcida, borde blanco al 10–15%, texto blanco 0.875rem.
- **Focus:** el borde pasa a lima; cursor lima.

### Navigation
- **Escritorio:** raíl de 256px en Tinta de Raíl con divisor blanco al 5%. Ítem 0.875rem 500 en niebla; hover fondo blanco al 4% y texto blanco; activo con fondo Superficie Elevada de 10px que se desliza entre ítems (muelle) e icono lima. Ficha de usuario abajo en Superficie de Fila.
- **Móvil:** barra inferior de cinco pestañas en Tinta de Raíl; activa en lima con un marcador de 3×32px en el borde superior.
- **Marca:** "Kurama" en blanco y "Tracker" en lima, Lexend 700.

### Poster Tile (firma)
Cartel 2:3 de 10px con la portada a sangre y el color dominante de AniList como fondo mientras carga. Un degradado negro del 85% al transparente ocupa la mitad inferior para el título (13px 600, dos líneas) y la meta (11px, blanco al 75%). Badges arriba. Debajo, opcionalmente, una barra de progreso lima de 4px y la píldora "+1 ep".
- **Giro:** perspectiva 900px; sigue al puntero hasta ±11° (no en táctil) y, en hover o foco, sube 28px en Z y escala 1.04 (180ms de entrada, 500ms de vuelta, `cubic-bezier(0.16, 1, 0.3, 1)`).
- **Brillo especular:** degradado radial blanco en modo overlay que sigue al puntero, visible solo en hover.
- **Destacado:** giro permanente (-14° Y, 4° X) y Sombra Levantada, visible sin ratón.
- **Estantería:** con `animation-timeline: view(inline)`, los carteles entran girados -34° y salen a 34°, a 0.92 de escala y 60% de opacidad, planos en el tramo central.
- **Movimiento reducido:** solo escala 1.02, sin estantería, sin giro del destacado.

### Poster Row
Cabecera de fila más carril con scroll por cartel. Cuando el puntero está sobre una fila (solo dispositivos con hover), esa fila sube 4px y las demás bajan al 55% de opacidad.

### Profile Billboard
Panel de 18px con el banner del anime que estás viendo, desenfocado, ampliado 1.1 y oscurecido con dos degradados de tinta. Izquierda: avatar de 112px con el marco del nivel, nombre en Display, título y racha, "Nv. N" y barra lima de 10px. Derecha: panel de liga con PL en Headline, barra blanca al 80% hacia la siguiente liga y el botón principal. Pie con las cuatro cifras desde sm y crédito del fondo a 10px.

### Stats Strip
"Tu anime en cifras": cuatro cifras, barras de géneros en plata, barra segmentada de estados con leyenda y cifra por estado, e histograma de notas 1–10 en plata (barras vacías al 25%).

### Anime Frame (marcos de avatar por nivel)
`frontend/src/components/frames/AnimeFrame.tsx`. Cada marco es un motivo anime dibujado en SVG alrededor del avatar cuadrado redondeado (radio 22% del lado). Hay una capa trasera (aura, círculo, colas) y una delantera (borde, cortes, cristales). El orden de rango es fijo:
- **Estándar** (sin marco): borde blanco al 15%.
- **Bronce** (Nv. 10): viñeta de manga. Tinta gruesa, filo de cobre y trama de puntos en dos esquinas.
- **Plata** (Nv. 30): corte de katana. Acero degradado y dos tajos blancos que cruzan las esquinas con brillo intermitente.
- **Oro** (Nv. 50): aura de poder. Lenguas de fuego oro y naranja que parpadean por encima y a los lados.
- **Rubí** (Nv. 60): círculo mágico. Anillos con marcas y gemas que giran en sentidos opuestos.
- **Diamante** (Nv. 80): cristales facetados en las esquinas con destellos.
- **Croma** (Nv. 100): las nueve colas del zorro en abanico, balanceándose, con el tono girando.

Desde 64px se muestra la decoración completa. Por debajo (menú, rankings, grupo) solo el borde del marco, para que se lea a tamaño pequeño. Con movimiento reducido, todas las animaciones se detienen y el dibujo queda.

### Trophy Emblem (trofeos y misiones)
`frontend/src/components/frames/TrophyEmblem.tsx`. Es un escudo hexagonal de metal en el color del hito, con el nivel grabado en Lexend 800 sobre un hueco tinta. La ornamentación crece con el rango:
- 1 a 5 estrellas de rango.
- Alas de plumas desde el 3.er hito, con 3, 4 y luego 5 plumas.
- Una corona en el hito 100.

Si está desbloqueado, un destello cruza el metal. Si está bloqueado, el metal es gris pizarra con un candado. Al pasar el ratón el emblema gira en 3D (rotateY 22°, sombra desplazada). La vitrina destaca **Tu siguiente misión**: el emblema del próximo hito, su descripción, la recompensa con la vista previa del marco y una barra lima de progreso entre hitos.

## Do's and Don'ts

### Do:
- **Do** reservar el lima eléctrica para progreso, foco, selección y la acción principal, siempre con texto tinta encima.
- **Do** dejar que los carteles y banners aporten el color; las superficies son tinta-noche (ink-night, ink-surface, ink-raised).
- **Do** usar sombras con desplazamiento y desenfoque (`--shadow-tile`, `--shadow-lift`) y expresar el estado activo subiendo en Z o en Y.
- **Do** usar cifras tabulares en todo dato y Lexend como única familia.
- **Do** usar la paleta de estados validada en su orden fijo, siempre con etiqueta y cifra, y los colores de división solo en el icono de medalla.
- **Do** dar a cada efecto 3D su variante de movimiento reducido: solo escala.
- **Do** tratar los marcos de perfil (`FRAME_STYLES` en `frontend/src/lib/league.ts`) como semántica de producto: el marco corresponde al nivel desbloqueado.

### Don't:
- **Don't** usar cristal, `backdrop-blur` de interfaz ni halos de desplazamiento cero (`0 0 Npx` de color).
- **Don't** poner bordes de color ni fondos tintados en superficies y contenedores.
- **Don't** usar el lima como color decorativo, en texto largo o en más de una acción principal por vista.
- **Don't** volver al ámbar ni a la cuadrícula de tarjetas bento del sistema anterior.
- **Don't** tomar como referencia los archivos de la SPA heredada de Vite (`src/App.jsx`, `src/index.css`) ni los componentes sin uso `dashboard/ProfileHeroBento`, `AiringScheduleBento` y `StatsBentoGrid`.
- **Don't** añadir etiquetas superiores tipo "eyebrow" ni texto en mayúsculas espaciadas sobre los títulos.
