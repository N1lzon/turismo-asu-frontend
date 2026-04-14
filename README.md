# Turismo Asunción — Frontend

App móvil de turismo para Asunción, Paraguay. Permite explorar lugares turísticos, ver eventos y seguir rutas predeterminadas.

## Stack

- React Native + Expo (Expo Go)
- React Navigation (bottom tabs + native stack)
- `expo-location` — ubicación del usuario
- `react-native-maps` — mapa interactivo
- `@react-native-async-storage/async-storage` — rutas guardadas localmente

## Pantallas

| Pantalla | Descripción |
|---|---|
| `HomeScreen` | Lista de lugares con buscador |
| `MapScreen` | Mapa con marcadores de lugares y eventos |
| `PlaceDetailScreen` | Detalle de un lugar turístico |
| `SearchScreen` | Búsqueda avanzada |
| `OptionsScreen` | Opciones y rutas del usuario |

## Backend

El frontend consume una API REST hecha con FastAPI. Repositorio: `turismo-asu-backend`.

Endpoints principales:
- `GET /places/nearby?lat=&lng=&radius=2000&category=`
- `GET /places/search?q=`
- `GET /places/{id}`
- `GET /routes/presets`
- `GET /events`

## Requisitos

- Node.js
- Expo CLI (`npm install -g expo-cli`)
- App **Expo Go** instalada en el celular
- `localtunnel` para exponer el backend (`npm install -g localtunnel`)

## Configuración

En `config.js`, ajustar la URL base del backend:

```js
// Con túnel (recomendado para dispositivo físico):
export const BASE_URL = 'https://<tu-subdominio>.loca.lt';

// Con IP local (celular y PC en la misma red):
export const BASE_URL = 'http://192.168.x.x:8000';
```

## Instalación y ejecución

### 1. Clonar el repositorio

```bash
git clone <url-del-repo>
cd turismo-asu-frontend
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Levantar el backend con túnel

En el directorio del backend:

```bash
uvicorn app.main:app --reload
```

En otra terminal:

```bash
npx localtunnel --port 8000 --subdomain cyan-points-watch
```

### 4. Iniciar el frontend

```bash
npx expo start --tunnel
```

Escanear el QR con la app **Expo Go** desde el celular.

> El celular y la PC deben estar en la misma red WiFi si se usa IP local en lugar de túnel.
