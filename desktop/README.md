# CreAPP Suite (desktop, macOS)

App Electron que levanta el motor del Creador de Contenidos (FastAPI, puerto 8000), sirve la UI de CreAPP (build estático, puerto 4599) y la muestra en una ventana. Build sin firmar, solo macOS.

## Requisitos (los chequea el preflight al abrir)

- Rutas `motorPath` y `creappPath` existentes
- Python 3.9+ (`python3`)
- Venv del motor en `<motorPath>/.venv` con `fastapi` instalable/importable
- `ffmpeg` y `ffprobe` en PATH (`brew install ffmpeg`)
- Node 20+
- `node_modules` de Remotion en `<motorPath>/src/remotion` (`npm install` ahí)
- UI de CreAPP compilada: correr `npm run build` en el repo CreAPP para que exista `dist/`

Si falta algo, el preflight lista cada dependencia con su comando de arreglo.

## Configuración

`~/.creapp-desktop/config.json` (se crea con defaults en el primer arranque). **Cada máquina debe ajustar sus propios paths.**

```json
{
  "motorPath": "~/Desktop/PROYECTOS DEV/Creador de Contenidos",
  "creappPath": "/ruta/al/creapp---fintech-innovation-hub",
  "motorPort": 8000,
  "uiPort": 4599
}
```

`~/` se expande al home. Valores inválidos o de tipo incorrecto se ignoran y se usa el default.

## Uso

```bash
npm --prefix desktop install
npm --prefix desktop start      # desarrollo
npm --prefix desktop test       # tests (node:test)
npm --prefix desktop run dist   # build sin firmar -> desktop/dist/mac-arm64/CreAPP Suite.app
```

(En Mac Intel la carpeta es `dist/mac`.) El ícono sale de `desktop/build/icon.png`. Al ser un build sin firmar, la primera vez abrir con clic derecho > Abrir.

## Verificación end-to-end manual (no automatizable sin pantalla)

A correr por Seba/Facu en una máquina real:

- [ ] (a) Falta una dependencia (ej. renombrar `.venv` o sacar ffmpeg del PATH): el preflight la lista con su fix.
- [ ] (b) Con todo presente: el motor arranca y se abre la UI de CreAPP.
- [ ] (c) Cerrar la app: `lsof -i:8000` no devuelve nada (sin motor huérfano).
- [ ] (d) Apagar el wifi: el indicador de conectividad pasa a rojo y aparece el toast "Se perdió la conexión".
- [ ] (e) Provocar un `git push` fallido: aparece un toast con "Reintentar" y al tocarlo reintenta la operación.
