---
name: KuramaTracker
description: Arena nocturna de anime donde el ámbar del zorro marca el progreso, la liga y los trofeos.
colors:
  kurama-amber: "#f59e0b"
  kurama-amber-light: "#fbbf24"
  kurama-amber-deep: "#d97706"
  kurama-amber-ember: "#b45309"
  kurama-amber-pale: "#fef3c7"
  ember-orange: "#f97316"
  anilist-blue: "#3db4f2"
  obsidian-night: "#0b1622"
  arena-panel: "#131f30"
  arena-popover: "#101a28"
  slate-raised: "#1f2b3d"
  slate-muted: "#1c2736"
  slate-line: "#253141"
  mist-text: "#94a3b8"
  snow-text: "#f8fafc"
  airing-emerald: "#10b981"
  danger-red: "#ef4444"
typography:
  display:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.25
  title:
    fontFamily: "Outfit, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.375
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  body-small:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "0.05em"
rounded:
  md: "12px"
  lg: "14px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  card: "14px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.kurama-amber}"
    textColor: "{colors.obsidian-night}"
    typography: "{typography.body-small}"
    rounded: "{rounded.md}"
    padding: "10px 24px"
  button-hero:
    backgroundColor: "{colors.kurama-amber}"
    textColor: "{colors.obsidian-night}"
    typography: "{typography.title}"
    rounded: "{rounded.xl}"
    padding: "16px 24px"
  button-icon:
    backgroundColor: "{colors.slate-muted}"
    textColor: "{colors.snow-text}"
    rounded: "{rounded.md}"
    padding: "8px"
  button-ghost:
    textColor: "{colors.mist-text}"
    typography: "{typography.body-small}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  input-search:
    backgroundColor: "{colors.obsidian-night}"
    textColor: "{colors.snow-text}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "10px 16px 10px 40px"
  card-bento:
    backgroundColor: "{colors.arena-panel}"
    textColor: "{colors.snow-text}"
    rounded: "{rounded.xl}"
    padding: "{spacing.card}"
  chip-amber:
    backgroundColor: "{colors.kurama-amber}"
    textColor: "{colors.obsidian-night}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
  nav-item:
    textColor: "{colors.mist-text}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  nav-item-active:
    textColor: "{colors.snow-text}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
---

# Design System: KuramaTracker

## Overview

**Creative North Star: "La Arena del Fuego de Zorro"**

KuramaTracker es una arena de noche. El fondo es un azul obsidiana casi negro, y sobre él arde el fuego del zorro: el ámbar Kurama. Ese fuego aparece donde hay competición, progreso o recompensa: el nivel, la posición en la liga, la barra de episodios, el botón que lanza el Quiz Diario. Lo demás se queda en la penumbra para que el fuego se vea.

Dentro de la arena, cada bloque de información es una **vitrina de trofeos**: una tarjeta de cristal esmerilado (bento card) con un borde de luz muy fino que se enciende al pasar el ratón. Los marcos del perfil (Bronce, Plata, Oro, Rubí, Diamante, Croma) y los trofeos se lucen como piezas de colección. El tono es de videojuego: las piezas crecen, rebotan y brillan al tocarlas.

La densidad es media-alta, pensada para escanear rápido en el móvil y en el escritorio por igual: rejillas bento, carteles de anime en 2:3, etiquetas pequeñas en mayúsculas y números grandes en Outfit.

**Key Characteristics:**
- Solo modo oscuro: obsidiana (#0b1622) de base, paneles azul pizarra translúcidos.
- El ámbar Kurama es la identidad: texto activo, glows, degradados de progreso, CTA.
- El azul AniList es el acento secundario: información y contenido que viene de AniList.
- Cristal esmerilado (`backdrop-blur`) con bordes blancos al 8–15 % de opacidad.
- Movimiento enérgico: escala al hover, rebote con muelle en la navegación, pulsos de brillo.

## Colors

Una noche azul obsidiana iluminada por una sola llama ámbar, con un toque de azul AniList como segunda voz.

### Primary
- **Ámbar Kurama** (kurama-amber): el fuego del zorro. Estado activo de la navegación, nivel (Nv.), porcentajes de progreso, chips destacados, botón principal, anillo de foco y color de selección de texto.
- **Ámbar Claro** (kurama-amber-light): extremo luminoso de los degradados y de las estrellas de puntuación.
- **Ámbar Profundo** (kurama-amber-deep) y **Brasa** (kurama-amber-ember): el extremo oscuro de los degradados con volumen (indicadores 3D, botones en relieve).
- **Ámbar Pálido** (kurama-amber-pale): texto sobre selección ámbar; nunca como fondo grande.
- **Naranja Brasa** (ember-orange): solo como extremo final del degradado del CTA heroico (ámbar → ámbar → naranja).

### Secondary
- **Azul AniList** (anilist-blue): acento de información. Etiquetas de "siguiente episodio", datos sincronizados con AniList y el extremo frío de los degradados de cabecera (ámbar → pizarra → azul).

### Tertiary
- **Esmeralda en Emisión** (airing-emerald): exclusivo del chip "En emisión" sobre los carteles.
- **Rojo Peligro** (danger-red): acciones destructivas y errores.

### Neutral
- **Obsidiana Nocturna** (obsidian-night): fondo de la app, texto sobre ámbar y fondo de los campos de texto.
- **Panel de Arena** (arena-panel): superficie de las bento cards (al 80 % con desenfoque) y de la barra lateral (al 60 %).
- **Popover de Arena** (arena-popover): menús y capas flotantes.
- **Pizarra Elevada** (slate-raised) y **Pizarra Apagada** (slate-muted): superficies secundarias, botones de icono y pistas de las barras de progreso.
- **Línea de Pizarra** (slate-line): borde por defecto. En el cristal se usa el blanco al 6–15 % en su lugar.
- **Texto Niebla** (mist-text): texto secundario, iconos inactivos, metadatos.
- **Texto Nieve** (snow-text): texto principal y títulos.

### Named Rules
**La Regla del Fuego de Zorro.** El ámbar es la firma de la marca y puede aparecer con libertad (texto, glow, degradado, borde), pero siempre debe *significar algo*: progreso, estado activo, recompensa o acción. Nunca se usa como fondo de relleno de un panel entero.

**La Regla de las Dos Voces.** Ámbar = lo tuyo (tu nivel, tu liga, tus acciones). Azul AniList = lo que viene de AniList (datos del catálogo, emisiones). No se intercambian.

## Typography

**Display Font:** Outfit (con system-ui, sans-serif)
**Body Font:** Inter (con system-ui, sans-serif)

**Character:** Outfit, geométrica y en peso extrabold (800), pone la voz de marcador deportivo: nombres, niveles, títulos de sección. Inter, neutra y legible a tamaños pequeños, lleva toda la información densa.

### Hierarchy
- **Display** (800, 1.875rem, 1.2, tracking -0.025em): cifras y titulares de héroe del perfil y la arena.
- **Headline** (800, 1.5rem, 1.25): títulos de página y de sección.
- **Title** (700–800, 1rem a 1.25rem, 1.375): títulos de tarjeta, nombre del anime (limitado a 2 líneas), marca "Kurama**Tracker**".
- **Body** (400–500, 0.875rem, 1.5): texto general y navegación.
- **Body Small** (500–600, 0.75rem, 1.4): el tamaño más usado. Metadatos, botones compactos, campos de texto.
- **Label** (700–800, 10–11px, tracking 0.05em, MAYÚSCULAS): chips, insignias, subtítulos de marca ("ANIME & LEAGUE").

### Named Rules
**La Regla del Marcador.** Todo número que mida progreso o competición (Nv., PL, porcentaje, puesto) va en Outfit extrabold, y si es del usuario, en ámbar.

## Layout

- **Escritorio (≥ 768px):** barra lateral fija de 256px a la izquierda. El contenido principal ocupa el resto, centrado con un máximo de 1280px y 32px de margen lateral.
- **Móvil (< 768px):** cabecera fija de 64px arriba (logo + nivel + ajustes) y barra de pestañas inferior de 5 columnas y 64px. El contenido lleva 16px de margen lateral y 112px de margen inferior para no quedar bajo la barra. Se respetan las zonas seguras (`safe-area-inset`) en modo PWA instalada.
- **Rejillas bento:** composición en tarjetas de tamaños variados para el panel principal. Las rejillas de carteles van de 2 columnas (móvil) a 3, 4 y 6 (escritorio), con 16px de separación.
- **Ritmo:** 4 / 8 / 14 / 16 / 24 / 32px. El relleno interno estándar de una tarjeta es de 14px.
- **Breakpoints:** sm 640px, md 768px (cambio de navegación), lg 1024px, contenedor máximo 1400px.

## Elevation & Depth

La profundidad viene de capas de cristal, no de sombras de material. Hay tres niveles: el fondo obsidiana, las superficies translúcidas con desenfoque (barra lateral, cabecera, tab bar, bento cards) y las capas flotantes (modales, popovers). Las sombras neutras (`shadow-xl`) solo separan el cristal del fondo. La sombra con carácter es el **glow ámbar**, que funciona como luz y no como elevación.

### Shadow Vocabulary
- **Sombra de Vitrina** (`shadow-xl` de Tailwind): bajo cada bento card.
- **Glow de Indicador** (`0 0 10px #f59e0b`): la línea activa de la barra de pestañas móvil.
- **Glow de Recompensa** (`0 0 20px rgba(245,158,11,0.35–0.4)`): indicadores en relieve, insignias y logros.
- **Glow Heroico** (`0 0 30px rgba(245,158,11,0.45)`): el CTA principal de la Arena / Quiz.
- **Sombra de Etiqueta** (`0 8px 25px rgba(0,0,0,0.35)`): elementos flotantes sobre imagen.

### Named Rules
**La Regla de la Luz, no la Altura.** Para destacar algo, se enciende (glow ámbar, borde más luminoso) en vez de levantarlo con una sombra negra más grande.

## Shapes

Formas redondeadas y amables, de interfaz de juego. El radio base del sistema es de 14px (`--radius: 0.875rem`).
- **12px:** el radio más usado. Botones, campos de texto, elementos de navegación, contenedores pequeños.
- **14px / 10px:** radios derivados del token (`lg` y `sm` del sistema).
- **16px:** bento cards, CTA heroico, tarjetas de anime.
- **Píldora (9999px):** chips, insignias, pistas y rellenos de las barras de progreso, puntos de notificación.
- **Bordes:** 1px de blanco translúcido (6–15 %) sobre el cristal. Los estados activos usan ámbar al 30–40 %.
- **Avatares:** cuadrados redondeados (12px) con el anillo del marco desbloqueado (2–3px), nunca círculos.
- **Carteles:** siempre en proporción 2:3, con un degradado de obsidiana desde abajo para que el texto se lea.

## Components

### Buttons
Enérgicos y táctiles: responden al hover y a la pulsación.
- **Shape:** 12px (16px en el CTA heroico).
- **Primary:** ámbar sólido con texto obsidiana, extrabold 0.75rem, relleno 10px × 24px.
- **Hero CTA:** degradado ámbar → ámbar → naranja, Outfit extrabold 0.875rem, relleno 16px × 24px y glow heroico. Al hover crece a 1.05 y gana brillo; al pulsar se encoge a 0.95.
- **Icon:** blanco al 7 % (al 15 % en hover), o la variante ámbar al 20 % con borde ámbar al 40 % para la acción destacada.
- **Ghost:** solo texto niebla que pasa a blanco en hover.

### Chips
- **Ámbar:** píldora ámbar sólido con texto obsidiana en etiqueta extrabold mayúscula (contadores, "NUEVO").
- **Cristal sobre imagen:** obsidiana al 75–80 % con desenfoque y borde blanco al 15 % (formato, puntuación con estrella ámbar).
- **En emisión:** esmeralda al 90 % con un icono que pulsa.
- **Info AniList:** azul al 20 % con borde azul al 40 % y texto azul claro.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** panel de arena al 80 % con `backdrop-blur-xl`.
- **Shadow Strategy:** Sombra de Vitrina (ver Elevation & Depth).
- **Border:** blanco al 8 %, que pasa al 15 % en hover (300ms).
- **Internal Padding:** 14px (tarjeta de anime) a 24px (bento grande).

### Inputs / Fields
- **Style:** fondo obsidiana al 80–90 %, borde blanco al 10–15 %, radio de 12px y texto 0.75–0.875rem. El buscador lleva el icono dentro a la izquierda (40px de relleno).
- **Focus:** el borde pasa a ámbar Kurama, sin contorno extra.
- **Placeholder:** texto niebla.

### Navigation
- **Barra lateral (escritorio):** elementos de 12px de radio con texto niebla. En hover, fondo blanco al 4 % y texto blanco. El estado activo lleva una píldora con degradado ámbar (20 % → 10 % → transparente) y borde ámbar al 30 %, que se desliza entre elementos con un muelle (stiffness 380, damping 30). El icono activo es ámbar y crece a 1.1 al hover.
- **Tab bar (móvil):** 5 pestañas con icono y etiqueta de 11px. La activa pasa a ámbar y lleva encima una línea de 2px con glow ámbar que se desliza con muelle.
- **Pie de usuario:** avatar con el anillo del marco, nombre, y "Nv. X • Título" en ámbar.

### Anime Card (componente propio)
Cartel 2:3 con zoom lento (1.05 en 500ms) al hover, degradado obsidiana desde abajo, chips de cristal arriba, título en Outfit bold que se vuelve ámbar al hover, y una barra de progreso tipo píldora (pista obsidiana con relleno en degradado ámbar → ámbar claro).

### Profile Frame (componente propio)
Anillo de 3px alrededor del avatar según el marco desbloqueado: Estándar (blanco al 15 %), Bronce (ámbar oscuro), Plata (pizarra clara), Oro (ámbar claro), Rubí (rosa), Diamante (cian) y Croma. El marco lo decide siempre `src/lib/league.ts`.

## Do's and Don'ts

### Do:
- **Do** usar el ámbar Kurama (#f59e0b) en todo lo que sea del usuario o accionable: nivel, PL, progreso, estado activo, CTA.
- **Do** construir los bloques como bento cards de cristal: radio de 16px, panel al 80 % con desenfoque y borde blanco al 8 % que sube al 15 % en hover.
- **Do** dar respuesta física a lo que se toca: escala de 1.05 al hover y de 0.95 al pulsar en CTA, y muelles en los indicadores que se deslizan.
- **Do** escribir cifras y títulos en Outfit extrabold, y la información densa en Inter de 0.75–0.875rem.
- **Do** mantener el azul AniList (#3db4f2) para datos que vienen de AniList.
- **Do** respetar las zonas seguras (`pt-safe` / `pb-safe`) en cualquier barra fija.

### Don't:
- **Don't** introducir un tema claro: la app es solo oscura (`class="dark"` fija).
- **Don't** usar el ámbar como fondo plano de paneles grandes; su sitio es la luz, el texto, los bordes y los degradados con sentido.
- **Don't** usar sombras negras grandes para destacar algo; mejor un glow ámbar o un borde más luminoso.
- **Don't** usar avatares circulares; son cuadrados redondeados con el anillo del marco.
- **Don't** calcular niveles ni marcos en un componente; la fuente única es `src/lib/league.ts`.
- **Don't** tomar como referencia los estilos de la SPA antigua (`src/index.css`, `src/App.jsx`); el sistema vigente es Tailwind + `src/app/globals.css`.
