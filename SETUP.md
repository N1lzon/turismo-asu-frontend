# SETUP — turismo-asu-frontend

Este archivo está escrito para ser leído por Claude Code y ejecutado automáticamente.
Cuando el usuario diga "configura el proyecto", "levanta el frontend" o similar, leer este archivo y ejecutar cada paso en orden.

## Prerequisitos — verificar antes de empezar

```bash
node --version    # necesita 18+
npm --version
```

También verificar si Expo CLI está disponible globalmente (no es estrictamente necesario, `npx expo` funciona igual):

```bash
npx expo --version
```

Reportar qué falta antes de continuar.

## Paso 1 — Clonar el repo (si no existe el directorio)

```bash
git clone <repo-url> turismo-asu-frontend
cd turismo-asu-frontend
```

Si el directorio ya existe, omitir este paso.

## Paso 2 — Instalar dependencias

```bash
npm install
```

## Paso 3 — Configurar la URL del backend (config.js)

El frontend conecta al backend vía `config.js`. Este archivo **no está en .gitignore** pero su valor debe actualizarse según el entorno.

### Opción A — Dispositivo físico/emulador en la misma red Wi-Fi

Obtener la IP local de la PC donde corre el backend:

```bash
# Linux/macOS
ip route get 1 | awk '{print $7; exit}'
# o
hostname -I | awk '{print $1}'
```

Editar `config.js`:

```js
export const BASE_URL = 'http://<IP_LOCAL>:8000';
// Ejemplo: 'http://192.168.1.42:8000'
```

### Opción B — Túnel con localtunnel (recomendado para demo/tesis)

Esta es la configuración usada en el proyecto original. Permite que el dispositivo móvil acceda al backend sin importar la red.

**Paso B.1** — Verificar que el backend esté corriendo en `http://localhost:8000` (ver SETUP.md del backend).

**Paso B.2** — Instalar localtunnel si no está disponible:

```bash
npm install -g localtunnel
```

**Paso B.3** — Crear el túnel para el puerto 8000:

```bash
lt --port 8000
```

Esto imprime una URL del tipo `https://xxxx-yyyy.loca.lt`. Copiarla.

**Paso B.4** — Editar `config.js` con la URL obtenida:

```js
export const BASE_URL = 'https://xxxx-yyyy.loca.lt';
```

> **Nota importante sobre localtunnel:** al acceder por primera vez a la URL del túnel desde un navegador, pide confirmar una "splash page" (ingresando la IP pública del cliente). Esto **no afecta** las llamadas desde la app móvil; la app funciona directamente.

> **Nota:** el túnel de localtunnel es efímero — la URL cambia cada vez que se crea un nuevo túnel. Actualizar `config.js` cada vez que cambie.

## Paso 4 — Iniciar Expo

```bash
npx expo start
```

Opciones útiles:
- `npx expo start --android` — abre directamente en emulador Android
- `npx expo start --tunnel` — si el dispositivo físico no puede acceder al servidor Expo por la red local (útil en redes restringidas)

Escanear el QR con la app **Expo Go** en el dispositivo físico, o presionar `a` para abrir el emulador Android.

## Paso 5 — Verificar que funciona

Abrir la app en el dispositivo. En la pantalla "Inicio":
- Debe cargarse la lista de lugares cercanos (categoría "Gastronomía" por defecto)
- Si aparece "Error: ..." o la lista está vacía, verificar:
  1. Que el backend esté corriendo
  2. Que `config.js` tenga la URL correcta
  3. Que el túnel siga activo (los túneles de localtunnel expiran si no hay actividad)

En la pantalla "Mapa":
- Debe pedirse permiso de ubicación
- Deben aparecer marcadores naranjas sobre el mapa

## Estructura del proyecto

```
App.js              — navegación con bottom tabs (Inicio, Mapa, Opciones)
config.js           — BASE_URL del backend (único archivo a editar por entorno)
index.js            — entry point de Expo
screens/
  HomeScreen.js     — lista de lugares/eventos con categorías
  MapScreen.js      — mapa con marcadores y búsqueda
  OptionsScreen.js  — pantalla de opciones (placeholder)
assets/             — íconos y splash screen
```

## Errores comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `Network request failed` | `config.js` tiene IP/URL incorrecta o el backend no corre | Verificar URL y que el backend responda en `http://localhost:8000` |
| `Error: ...` en lista vacía | Túnel de localtunnel expiró o cambió | Recrear túnel y actualizar `config.js` |
| Mapa no carga (pantalla en blanco) | Problema con `react-native-maps` en emulador | Usar dispositivo físico o habilitar GPU en el emulador |
| `Unable to resolve module` al iniciar | `node_modules` incompleto | Borrar `node_modules` y correr `npm install` de nuevo |
| QR no escaneable desde otra red | Expo server no accesible | Usar `npx expo start --tunnel` |

## Dependencias clave

- `expo ~54` — framework base
- `react-native 0.81.5` — nueva arquitectura habilitada (`newArchEnabled: true` en app.json)
- `react-native-maps 1.20.1` — mapas con Google Maps (Android) / Apple Maps (iOS)
- `expo-location ~19` — ubicación GPS del dispositivo
- `@react-navigation/native` + `@react-navigation/bottom-tabs` — navegación por pestañas
- `react-native-safe-area-context` + `react-native-screens` — soporte de áreas seguras y pantallas nativas
