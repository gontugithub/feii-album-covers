// keys.js — keyframes del vuelo de cámara (los lee CameraRig.jsx).
//
// Ejes de la escena (mismos que tendrá el GLB de Blender en task3):
//   - metros; +Y arriba; Freddie en el origen con los pies en y = 0, mirando hacia -Z;
//   - la superficie del escenario es y = 0; el césped está en FLOOR_Y (scene.js);
//   - el sol está hacia +Z (contraluz cuando la cámara viene desde -Z).
//
// t en segundos (≈ 55,5 s; guion del GATE 4) · tod = time of day (0 atardecer, 1 noche).
// Los keys del vuelo se afinan con la tecla P (modo dev).
// La pose MATCH y la funda NO se afinan a mano: se calculan abajo (match cut).

/**
 * @typedef {{ t: number, pos: [number, number, number], look: [number, number, number], fov: number, tod: number }} CameraKey
 */

// ---------------------------------------------------------------------------------------------
// PASO portada → mundo (task5)
// Con la portada oficial (public/cover.jpg) ya no hay encaje exacto figura ↔ Freddie 3D: el primer
// plano del estadio se elige por encuadre. Cámara casi a ras del escenario (0,3 m), por detrás de
// Freddie (+Z, mirando a −Z) e inclinada hacia arriba: Freddie entero a contraluz y el cielo encima
// de la grada (con la cámara a 1,4 m y en horizontal solo se veía la grada).
// La funda está delante de esa cámara, perpendicular a su mirada (inclinada SLEEVE_TILT), así que
// el zoom de FOV la atraviesa de frente; durante el fundido el FOV se abre a REVEAL_FOV.
// ---------------------------------------------------------------------------------------------

/** Lado de la funda (m). */
export const SLEEVE_SIZE = 1.0;
/** Distancia cámara → funda en la pose MATCH; ≈ 2,9 lados, el encuadre relativo de covers/_studio. */
const MATCH_DIST = 2.9;

/** Hacia dónde mira la cámara MATCH en Z: −1 = desde detrás de Freddie (él mira a −Z). */
export const VIEW_DIR = -1;

/** Primer plano del estadio: posición y punto de mira (Freddie mide ~2 m; la grada tapa hasta ~17°). */
const LOW_POS = /** @type {[number, number, number]} */ ([-0.35, 0.3, 5.2]);
const LOW_LOOK = /** @type {[number, number, number]} */ ([0, 1.9, 0]);

const DIR = (() => {
  const d = LOW_LOOK.map((v, i) => v - LOW_POS[i]);
  const len = Math.hypot(...d);
  return d.map((v) => v / len);
})();

/** Inclinación de la funda (rad, sobre X) para quedar de cara a la cámara que mira hacia arriba. */
export const SLEEVE_TILT = Math.asin(DIR[1]);

/** Pose MATCH: de frente a la funda. Aquí termina el acercamiento y empieza el zoom. */
export const MATCH = { pos: LOW_POS, look: LOW_LOOK, fov: 35 };

/** Centro de la funda (CoverPortal) y objetivo de la órbita en idle. */
export const SLEEVE_CENTER = /** @type {[number, number, number]} */ (LOW_POS.map((c, i) => c + DIR[i] * MATCH_DIST));

/**
 * Cámara inicial en idle: tres cuartos (de lado y algo por encima) a MATCH_DIST de la funda, el
 * mismo ángulo que covers/_studio: delante de la funda y hacia la derecha de cámara (donde asoma el vinilo).
 */
const IDLE_DIR = [-5.4 * VIEW_DIR, 2.5, -6.4 * VIEW_DIR];
const IDLE_LEN = Math.hypot(...IDLE_DIR);
export const IDLE_CAMERA = /** @type {[number, number, number]} */ (
  SLEEVE_CENTER.map((c, i) => c + (IDLE_DIR[i] / IDLE_LEN) * MATCH_DIST)
);
/** Límites de la órbita en idle (m). */
export const ORBIT_DIST = [MATCH_DIST * 0.5, MATCH_DIST * 2];

/** Segundos del acercamiento desde donde dejaste la órbita hasta la pose MATCH. */
export const APPROACH = 1.2;

/**
 * 0 → FLIGHT_FROM, cámara quieta: zoom hacia la funda (MATCH.fov → ZOOM_FOV, la llena al atravesarla)
 * hasta PORTAL_FADE[0]; después el FOV se abre a REVEAL_FOV mientras la portada se funde.
 */
export const FLIGHT_FROM = 3.6;
export const ZOOM_FOV = 17;
export const REVEAL_FOV = 50;

/** Fundido portada → mundo dentro del zoom; el mundo se enciende al empezar el fundido. */
export const PORTAL_FADE = [1.6, 3.4];
export const WORLD_FROM = PORTAL_FADE[0];

/**
 * Opacidad de la portada (y de lo que se funde con ella) en el instante t: 1 → 0 dentro de PORTAL_FADE,
 * con caída rápida al principio. Con un fundido lineal, la funda ampliada (rosas y naranjas claros que
 * llenan la pantalla) quedaba a media opacidad sobre el estadio y lo dejaba pálido hasta acabar el fundido.
 *
 * @param {number} t
 */
export function portalOpacity(t) {
  const f = Math.min(Math.max((t - PORTAL_FADE[0]) / (PORTAL_FADE[1] - PORTAL_FADE[0]), 0), 1);
  return (1 - f) ** 2.5;
}

/**
 * Vuelo (desde FLIGHT_FROM), guion de gontugithub en el GATE 4 (sustituye a los planos del vídeo de 16,5 s):
 * 1. Revelado lateral por detrás, en contrapicado (se ve el cielo como en la portada) y paso por su costado.
 * 2. Sobre su hombro derecho (+X: Freddie mira a −Z) hacia el público; vuela sobre la multitud hasta el
 *    fondo del estadio y se gira: el escenario visto desde la grada, como un espectador.
 * 3. Dron por la ladera de la grada (círculo alrededor del centro z = −22), mirando siempre a Freddie.
 * 4. Entra bajo el techo del escenario (tarima y = 0, focos a 7,3 m), lo encuadra y se queda detrás de él.
 * 5. Sale por delante y sube sobre la grada del fondo: Freddie en el escenario y la multitud con los móviles (tod = 1).
 * Medidas del GLB: grada r = 24…59 m desde (0, −22); tarima x ±7, z −2…9,6; muro de fondo en z ≈ 9,6.
 *
 * @type {CameraKey[]}
 */
export const KEYS = [
  { t: FLIGHT_FROM, pos: MATCH.pos, look: MATCH.look, fov: REVEAL_FOV, tod: 0 }, // portada → Freddie desde abajo, con cielo
  // 1 · por detrás, a contraluz y desde abajo (cielo como en la portada)
  { t: 6.5, pos: [3.2, 0.7, 4.5], look: [0, 2.2, -3], fov: 50, tod: 0 }, // revelado lateral en contrapicado
  { t: 9.5, pos: [2.6, 1.0, 2.8], look: [0, 2.0, -1.5], fov: 46, tod: 0.03 }, // por su costado
  { t: 12.5, pos: [0.75, 1.95, 0.9], look: [0, 1.2, -14], fov: 50, tod: 0.08 }, // sobre su hombro derecho → público
  // 2 · sobre la multitud hasta el fondo y vuelta al escenario
  { t: 14.5, pos: [0.4, 2.8, -5], look: [0, 0.4, -26], fov: 52, tod: 0.15 }, // sale del escenario
  { t: 16.8, pos: [0, 3.6, -20], look: [0, 1.5, -46], fov: 52, tod: 0.22 }, // sobre las cabezas
  { t: 19.0, pos: [-2.5, 4.2, -38], look: [-16, 3, -40], fov: 46, tod: 0.28 }, // fondo del campo, girando
  { t: 21.5, pos: [0, 3.0, -49], look: [0, 2.2, 0], fov: 28, tod: 0.33 }, // desde la grada: perspectiva de espectador
  { t: 24.0, pos: [5, 4.5, -48], look: [0, 2.0, 0], fov: 28, tod: 0.37 }, // pausa, empieza a subir
  // 3 · dron por la ladera de la grada (r ≈ 28–32 desde z = −22), siempre mirando a Freddie
  { t: 27.5, pos: [18, 9, -45], look: [0, 1.6, 0], fov: 28, tod: 0.42 },
  { t: 31.0, pos: [29, 8.5, -26], look: [0, 1.6, 0], fov: 30, tod: 0.47 },
  { t: 34.5, pos: [22, 6.5, -9], look: [0, 1.6, 0], fov: 34, tod: 0.52 },
  // 4 · entra en el escenario, lo encuadra y se queda detrás
  { t: 37.5, pos: [10.5, 3.6, -1.5], look: [0, 1.7, 0], fov: 42, tod: 0.6 }, // borde de la tarima
  { t: 40.5, pos: [3.2, 1.9, 1.4], look: [0, 1.7, 0], fov: 40, tod: 0.7 }, // dentro, bajo los focos
  { t: 43.5, pos: [0.7, 2.0, 3.4], look: [0, 1.3, -12], fov: 50, tod: 0.8 }, // detrás de él, al público
  // 5 · sale por delante bajo el techo (el muro del fondo, z ≈ 9,6, tapa la subida por detrás) y sube
  { t: 47.0, pos: [2.5, 5.5, -6], look: [0, 1.6, 0], fov: 50, tod: 0.88 },
  { t: 51.5, pos: [5, 15, -30], look: [0, 2, -4], fov: 40, tod: 0.95 },
  { t: 55.5, pos: [6, 22, -48], look: [0, 2, -8], fov: 34, tod: 1 }, // plano final: escenario y móviles
];

/** Duración total de la intro, en segundos. */
export const INTRO_END = KEYS[KEYS.length - 1].t;
