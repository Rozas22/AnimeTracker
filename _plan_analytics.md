# Analytics Panel + Sinopsis en Español

## Enfoque técnico

### 1. Panel de Análisis (`case 'analytics'`)
Calculado **100% en el cliente** a partir del array `completedAnime` (ya disponible).

**No se necesitan nuevos campos de GraphQL** para los géneros y estudios — sí los necesitaremos. Añadiremos `genres` y `studios { nodes { name } }` a la query `fetchUserAnimeList`.

**Métricas que se mostrarán:**
- **Top 5 Géneros** — frecuencia de cada género en toda la lista
- **Top 5 Estudios** — frecuencia de cada estudio en toda la lista  
- **Distribución por formato** — TV / Movie / OVA / ONA / Special
- **Distribución por puntuación** — histograma de scores
- **Progreso actual** — animes Viendo vs Completados vs Planeando

Las barras de progreso y gráficos serán **CSS puro** (sin librerías externas), con animación de entrada y colores del sistema de diseño existente.

### 2. Sinopsis en Español (lazy, sin ralentizar la carga)
**Estrategia**: La descripción solo se carga cuando el usuario abre el modal (ya es así). La **traducción** se solicita en ese momento, **no antes**.

**Backend** — nuevo endpoint `POST /api/translate`:
- Recibe `{ text: "..." }`
- Usa la API gratuita de MyMemory (`api.mymemory.translated.net`) — sin clave de API necesaria, sin instalar librerías nuevas, funciona con `fetch` nativo de Node
- Devuelve `{ translated: "..." }`
- Cachea la respuesta en un `Map` en memoria del servidor para no repetir traducciones

**Frontend** — en `fetchAnimeDetails`, tras cargar el `description`:
- Llama a `POST /api/translate` con la descripción cruda
- Muestra un mini spinner solo dentro del bloque de sinopsis mientras traduce
- Reemplaza la descripción con la traducida cuando llega
- Si falla la traducción, muestra la original en inglés sin errores visibles

### 3. Añadir `genres` y `studios` a la query del usuario
Modificar `fetchUserAnimeList` para pedir:
```graphql
genres
studios(isMain: true) {
  nodes { name }
}
```

## Archivos a modificar

### `frontend/src/App.jsx`
- `import`: añadir `BarChart2, TrendingUp, Award` de lucide-react
- Estado: `const [translatedDescription, setTranslatedDescription] = useState(null)` + `const [translatingDesc, setTranslatingDesc] = useState(false)`
- `fetchUserAnimeList`: añadir `genres` y `studios` al query
- `fetchAnimeDetails`: tras `setSelectedAnime(media)`, llamar a `translateDescription(media.description)`
- Nueva función `translateDescription(text)` que llama a `POST /api/translate`
- `renderContent`: añadir `case 'analytics'` con el panel completo
- Sidebar + Bottom Nav: añadir botón de Análisis (icono `BarChart2`)
- Modal sinopsis: usar `translatedDescription` si está disponible, sino `selectedAnime.description`

### `frontend/src/index.css`
- `.analytics-card`, `.stat-bar`, `.stat-bar-fill`, `.analytics-grid` — estilos para el panel
- Animación `@keyframes growBar` para la entrada de las barras

### `backend/index.js`
- Añadir `const translateCache = new Map()` al inicio
- Nuevo endpoint `POST /api/translate` — sin autenticación (la descripción es pública)
