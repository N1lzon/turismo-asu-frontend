# Jahapa — Frontend

App móvil de turismo para Asunción, Paraguay. Permite explorar lugares turísticos, ver eventos, seguir rutas predeterminadas y crear rutas personalizadas.

## Stack

- React Native 0.81.5 + Expo ~54 (nueva arquitectura habilitada)
- React Navigation — bottom tabs + native stack
- `expo-location` — ubicación del usuario
- `react-native-maps` — mapa interactivo con marcadores
- `@react-native-async-storage/async-storage` — rutas del usuario y preferencias guardadas localmente
- `expo-localization` — detección del idioma del dispositivo
- `expo-updates` — recarga de la app al resetear ajustes

## Estructura del proyecto

```
turismo-asu-frontend/
├── App.js                    # Navegación principal (bottom tabs + stacks)
├── index.js                  # Entry point de Expo
├── config.js                 # BASE_URL del backend
├── app.json                  # Configuración de Expo
├── assets/                   # Íconos, logo y splash screen
├── i18n/
│   ├── index.js              # LanguageProvider + hook useTranslation
│   └── locales/
│       ├── es.js             # Español
│       ├── en.js             # Inglés
│       └── pt.js             # Portugués
├── theme/
│   └── index.js              # ThemeProvider + hook useTheme (claro/oscuro)
└── screens/
    ├── HomeScreen.js         # Lista de lugares/eventos/rutas con buscador y categorías
    ├── MapScreen.js          # Mapa con marcadores de lugares y eventos
    ├── MapSearchScreen.js    # Búsqueda de lugares desde el mapa
    ├── RouteEditorScreen.js  # Editor de rutas personalizadas (drag & drop, swipe)
    ├── PlaceDetailScreen.js  # Detalle de un lugar turístico
    ├── SearchScreen.js       # Búsqueda avanzada de lugares
    └── OptionsScreen.js      # Ajustes: idioma, tema, borrar datos, acerca de
```

## Pantallas

| Pantalla | Descripción |
|---|---|
| `HomeScreen` | Lista de lugares cercanos con buscador y filtro por categoría (Gastronomía, Lugares, Hospedaje, Rutas). En la pestaña Rutas muestra rutas predeterminadas y rutas del usuario |
| `SearchScreen` | Búsqueda avanzada de lugares por nombre |
| `MapScreen` | Mapa con marcadores de lugares y eventos, navegación a destino y visualización de rutas |
| `MapSearchScreen` | Búsqueda de lugares directamente desde el mapa |
| `RouteEditorScreen` | Editor de rutas personalizadas: añadir lugares, reordenar arrastrando, eliminar con swipe y guardar con nombre |
| `PlaceDetailScreen` | Detalle completo de un lugar turístico (fotos, horarios, contacto) |
| `OptionsScreen` | Ajustes de la app: idioma (ES/EN/PT), tema (claro/oscuro), borrar datos y sección "Acerca de" |

## Internacionalización

La app detecta automáticamente el idioma del dispositivo (español, inglés o portugués). El usuario puede cambiarlo desde Opciones. La preferencia se persiste con AsyncStorage.

## Temas

Soporta tema claro y oscuro. Por defecto sigue el tema del sistema; el usuario puede sobreescribirlo desde Opciones.

## Backend

El frontend consume una API REST hecha con FastAPI. Repositorio: `turismo-asu-backend`.

Endpoints principales:

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/places/nearby?lat=&lng=&radius=&category=` | Lugares cercanos ordenados por distancia |
| `GET` | `/places/search?q=` | Búsqueda por nombre (mín. 2 chars) |
| `GET` | `/places/{id}` | Detalle de un lugar |
| `GET` | `/routes/presets` | Lista de rutas predeterminadas |
| `GET` | `/routes/presets/{id}` | Detalle de una ruta con sus lugares en orden |
| `GET` | `/events` | Todos los eventos |
| `GET` | `/events/{id}` | Detalle de un evento |
| `POST` | `/events` | Crear un evento |
| `DELETE` | `/events/{id}` | Eliminar un evento |

Documentación interactiva disponible en `http://localhost:8000/docs` cuando el backend está corriendo.

## Requisitos

- Node.js 18+
- App **Expo Go** instalada en el celular

## Configuración

En `config.js`, ajustar la URL base del backend:

```js
// Con IP local (celular y PC en la misma red Wi-Fi):
export const BASE_URL = 'http://192.168.x.x:8000';

// Con túnel (recomendado — funciona sin importar la red):
export const BASE_URL = 'https://<subdominio>.loca.lt';
```

> El header `bypass-tunnel-reminder` se añade automáticamente en `apiFetch` para evitar la página de confirmación de localtunnel.

## Instalación y ejecución

### 1. Clonar e instalar dependencias

```bash
git clone <url-del-repo>
cd turismo-asu-frontend
npm install
```

### 2. Levantar el backend

En el directorio del backend:

```bash
uvicorn app.main:app --reload
```

### 3. Crear el túnel (opcional, recomendado para dispositivo físico)

```bash
npx localtunnel --port 8000
```

Copiar la URL que imprime y pegarla en `config.js`.

> El túnel es efímero — la URL cambia cada vez que se reinicia. Actualizar `config.js` cada vez que cambie.

### 4. Iniciar Expo

```bash
npx expo start
```

Escanear el QR con la app **Expo Go** desde el celular, o presionar `a` para abrir el emulador Android.
