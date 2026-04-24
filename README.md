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
| `HomeScreen` | Lista de lugares cercanos con buscador y filtro por categoría |
| `MapScreen` | Mapa con marcadores de lugares y eventos, y navegación integrada |
| `PlaceDetailScreen` | Detalle de un lugar turístico (fotos, horarios, contacto) |
| `OptionsScreen` | Rutas predeterminadas y rutas del usuario (guardadas localmente) |

## Backend

El frontend consume una API REST hecha con FastAPI. Repositorio: `turismo-asu-backend`.

Endpoints principales:

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/places/nearby?lat=&lng=&radius=&category=` | Lugares cercanos ordenados por distancia |
| `GET` | `/places/search?q=` | Búsqueda por nombre |
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
// Con túnel (recomendado — funciona sin importar la red):
export const BASE_URL = 'https://<subdominio>.loca.lt';

// Con IP local (celular y PC en la misma red Wi-Fi):
export const BASE_URL = 'http://192.168.x.x:8000';
```

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

Escanear el QR con la app **Expo Go** desde el celular.

## Estructura del proyecto

```
turismo-asu-frontend/
├── App.js                    # Navegación principal (bottom tabs + stack)
├── index.js                  # Entry point de Expo
├── config.js                 # BASE_URL del backend (no commiteado)
├── app.json                  # Configuración de Expo
├── assets/                   # Íconos y splash screen
└── screens/
    ├── HomeScreen.js         # Lista de lugares con buscador y categorías
    ├── MapScreen.js          # Mapa con marcadores de lugares y eventos
    ├── MapSearchScreen.js    # Búsqueda de lugares desde el mapa
    ├── PlaceDetailScreen.js  # Detalle de un lugar turístico
    ├── SearchScreen.js       # Búsqueda avanzada
    └── OptionsScreen.js      # Rutas predeterminadas y rutas del usuario
```

## Errores comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `Network request failed` | URL incorrecta en `config.js` o backend caído | Verificar URL y que el backend responda en `http://localhost:8000` |
| Lista de lugares vacía | Túnel expiró o cambió | Recrear túnel y actualizar `config.js` |
| Mapa en blanco | Problema con `react-native-maps` en emulador | Usar dispositivo físico o habilitar GPU en el emulador |
| `Unable to resolve module` | `node_modules` incompleto | Borrar `node_modules` y correr `npm install` de nuevo |
| QR no escaneable desde otra red | Expo server no accesible | Usar `npx expo start --tunnel` |
