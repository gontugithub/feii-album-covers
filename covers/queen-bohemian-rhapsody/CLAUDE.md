# Queen — Bohemian Rhapsody · 3D cover (feii-album-covers)

Este archivo vive en `covers/queen-bohemian-rhapsody/CLAUDE.md`. Lanza `claude` desde la raíz del repo y lee también
`CONTRIBUTING.md` y `.cursor/rules/*` (00-project, 20-r3f-patterns, 30-shaders, 40-asset-pipeline, 50-performance).
Si algo de aquí contradice al repo, gana el repo.

## Frontera (CONTRIBUTING)
- Solo se toca `covers/queen-bohemian-rhapsody/**` + UN objeto en `covers/registry.json` (ordenado por slug, una línea por objeto).
- NUNCA: `src/App.jsx`, `src/gallery/`, `src/lib/`, `scripts/`, `public/` (raíz), `.github/`, `.gitignore`, `covers/_studio`, `covers/_template`, otras covers.
- Assets de la ruta en `covers/queen-bohemian-rhapsody/public/`, referenciados con `new URL('../public/x', import.meta.url).href`.
- Transcoder Basis ya vendorizado en `public/basis/`: NO copiarlo. Ruta compartida en `src/lib/ktx2.js` (`TRANSCODER_PATH`), medir con `src/lib/gpuBytes.js`.
- Si usas `extend`, clave única con prefijo del slug (o forma componente). `npm run lint` lo comprueba.
- Al desmontar: dispose de texturas/geometrías propias, quitar listeners y rAF, quitar la clase `route-queen-bohemian-rhapsody`.
- Antes de push: `npm run lint && npm run build`.

## Mapa de archivos (src/)
| Archivo | Qué hace |
| --- | --- |
| `Route.jsx` | Canvas, estado idle → «Entrar», overlay DOM (título, Entrar, Saltar/Repetir intro, Mirar libre, Escape, aria-live), cursor en hover, reduced-motion, BudgetProbe |
| `Tracklist.jsx` + `usePlaylist.js` + `player.js` | Panel derecho: pistas del álbum (iTunes Search API), fragmentos de 30 s de Apple Music en reproducción continua desde «Entrar» (orden `AUTOPLAY`, fundido cruzado), enlace a Spotify |
| `Scene.jsx` | Árbol R3F: portada → mundo (cielo, luces, estadio, Freddie, multitud); `USE_GLB` elige placeholders o GLB |
| `keys.js` | Primer plano desde abajo (`MATCH`, `SLEEVE_CENTER`, `SLEEVE_TILT`, `IDLE_CAMERA`), zoom y apertura (`FLIGHT_FROM`, `ZOOM_FOV`, `REVEAL_FOV`), keyframes del vuelo (`KEYS`), `PORTAL_FADE`, `WORLD_FROM` |
| `CameraRig.jsx` | Idle: `OrbitControls` sobre la funda → acercamiento a `MATCH` → zoom de FOV (match cut) → vuelo Catmull-Rom → recorrido con la rueda (o `FreeFly.jsx` con «Mirar libre»: WASD + ratón, Espacio/Shift); teclas dev (apagadas en libre) |
| `SunsetSky.jsx` | Skybox con shader propio (`uTime`, `uTod`, `uSunDir`): degradado, sol, nubes fbm, star trails. Nota: `docs/shader-note.md` |
| `sky.js` | `SKY_PERIOD` (envuelve uTime), `BEAT_HZ` (72 bpm), `sunDirection(tod)` compartida por cielo y luces |
| `SkyLights.jsx` | Sol direccional, ambiente y 2 focos violetas ligados a `tod` |
| `SpaceBackdrop.jsx` | Espacio del idle alrededor del disco: nebulosa (shader fbm), estrellas y polvo en `Points`; se funde con la portada |
| `CoverPortal.jsx` | Disco en su funda (portada delante/detrás + vinilo asomando): balanceo en idle, clic = entrar, se desvanece |
| `sleeveArt.js` | Imagen de la funda: portada oficial `public/cover.jpg` o la propia `public/sleeve.png` (`SLEEVE_ART`), cargada en KTX2 |
| `Crowd.jsx` | Multitud = 1 `InstancedMesh` (bote en vertex shader, `aPhase`) + móviles en 1 `Points`; posiciones con PRNG con semilla |
| `placeholders.js` | Geometría procedural con los nombres/medidas del futuro GLB |
| `stadiumGlb.js` | Camino GLTF + KTX2 + meshopt (inactivo hasta task3) |
| `RendererInfo.jsx` | `console.table` de renderer.info en portada / plano ancho / plano final |

## Ejes de la escena (contrato con Blender)
Metros, +Y arriba. Freddie en el origen, pies en y = 0, mirando a −Z, cara a ~1,72 m; pose = la figura de `public/sleeve.png` vista por detrás (puño en alto en −X, micro delante en +X). Desde task5 no hay match cut exacto (portada oficial): el primer plano es `MATCH` en `keys.js`, a 0,3 m del escenario y mirando hacia arriba, con la funda inclinada `SLEEVE_TILT`. Superficie del escenario y = 0,
césped y = −1,6. Sol hacia −Z (delante de Freddie, sobre la grada que mira), ligeramente a −X: desde detrás (cámara MATCH en +Z) queda a contraluz y a la izquierda de cámara, como en la portada. El vuelo arranca POR DETRÁS (`VIEW_DIR = −1` en `keys.js`). Grada desde r = 24 m. Fans: +Z local apunta al escenario.

## Flujo de PRs (rama: `cover-queen-bohemian-rhapsody-task<N>-<tema>`, nunca push a main)
- task1: Route.jsx + registry + `public/thumbnail.svg` + `docs/renderer-info.md` (mesh/cámara/escena)
- task2: shader propio (`SunsetSky.jsx`) + `docs/shader-note.md`
- task3: KTX2 (ETC1S/UASTC) + `docs/ktx2-note.md` (bytes de archivo y GPU) + `docs/ai-3d-merge-log.md`
- task4: arreglo en otro slug + una review formal
- task5 (extra, petición propia): tracklist, portada oficial, título, recorrido con la rueda + «Mirar libre»
- Cada PR lleva la tabla **AI Review Log** (qué hizo la IA / qué verifiqué yo). Los PRs los abre el humano.

## Derechos (D8) — repo PÚBLICO con GitHub Pages
- NO publicar el vídeo de referencia (solo local en `reference/`, excluido en `.git/info/exclude`).
- **Portada oficial en la funda (task5): decisión de gontugithub (2026-11-18), en contra de la regla original** «no publicar
  la portada oficial». Sin permiso del titular: excepción educativa pendiente del profesor (fila 24 del merge log,
  `docs/ktx2-note.md`). Si no se aprueba: `SLEEVE_ART = 'own'` en `src/sleeveArt.js` vuelve a la funda propia.
- Arte propio / PD / licencia abierta. Registrar creador, fuente, licencia en `docs/ktx2-note.md`.
- Freddie = modelo de terceros «Freddie Mercury - T_Pose» de **Gerwerni** (Sketchfab,
  https://sketchfab.com/3d-models/freddie-mercury-t-pose-b89ee72767a54daa8c79768a5cdd2bbd, **CC-BY-4.0**), posado, diezmado y
  bakeado a un atlas (`docs/blender-note.md`). **Decisión de gontugithub (2026-11-17), en contra de la regla original**
  («maniquí estilizado, sin parecido facial»): es un Freddie reconocible, con cara y bigote. Registrada como ESCALATE en la
  fila 20 de `docs/ai-3d-merge-log.md`. La licencia CC-BY cubre la malla y sus texturas, no la imagen de la persona.
- Obligatorio con este modelo: atribución CC-BY **visible en la cover** (autor, enlace, licencia, «modificado») y registro en
  `docs/ktx2-note.md`. Sin image-to-3D ni generadores de IA para Freddie; no cambiarlo por otro modelo sin repetir el registro.
- Fans = maniquíes estilizados propios (sin cambios).

## Referencia visual
Vídeo de referencia (16,5 s) solo para el arranque: portada flotando en vacío → atraviesa → estadio al atardecer
(Freddie a contraluz). Desde el GATE 4 el vuelo sigue el guion de gontugithub (~55 s, `src/keys.js`): contrapicado por
detrás → hombro derecho → sobre el público hasta el fondo → vista de espectador → dron por la grada → dentro del escenario
→ detrás de él → sube sobre el estadio de noche con los móviles. Estética: fans maniquí estilizados, luces de móviles,
haces de luz (Freddie: ver D8).

## Presupuesto GPU
Tope del curso: ≤ 200 draw calls desktop, ≤ 80 móvil; techo propio en `src/budget.js` (`CEILING`) + `docs/renderer-info.md`.
Objetivo propio: ≤ 600k tris, ≤ 40 draw calls, ≤ 3 atlas 2048², GLB < 15 MB. Multitud = InstancedMesh (posiciones en JS).
Freddie 15–25k · estadio bakeado ≤ 20k · Stage+Mic ≤ 3k · Fan_LOD0 ~400 · Fan_LOD1 ~100.

## Dev tools en CameraRig (solo `npm run dev`)
La ruta arranca en idle (arrastrar orbita el disco); entra con clic en la funda o «Entrar». Después: Espacio pausa · ←/→ scrub · S salta al final · **P imprime keyframe** para pegar en `keys.js` (ignoradas con foco en un botón). Escape (también en build) salta la intro una vez empezada.

## Blender (Fase 3, vía MCP de Blender) — nombres de nodo exactos
`Freddie`, `Mic`, `Stage`, `Stadium`, `Fan_LOD0`, `Fan_LOD1`. Export GLB +Y, sin cámaras/luces, luego
`npx @gltf-transform/cli optimize in.glb out.glb --compress meshopt --texture-compress ktx2` (necesita `toktx`).
Cada paso generado por IA → fila en `docs/ai-3d-merge-log.md` (ACCEPT / REJECT / ESCALATE).
