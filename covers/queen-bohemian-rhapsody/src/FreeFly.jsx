// FreeFly.jsx — «Mirar libre»: vuelo con teclado y ratón (como volar en un juego de bloques).
//
// - Ratón: clic en el lienzo captura el puntero (pointer lock) y mover el ratón gira la vista;
//   sin captura, arrastrar también gira. Esc suelta el puntero (lo hace el navegador).
// - W / S: adelante / atrás HACIA DONDE MIRAS (incluida la altura: mirar arriba y W = subir).
// - A / D: de lado. Espacio / Shift: subir / bajar en vertical.
// - Flechas: equivalentes a WASD (teclados sin WASD cómodo).
// La cámara arranca en la pose que tenía la ruta. Sin colisiones; solo límites del estadio.
// Sin asignaciones en useFrame: vectores en refs. Listeners fuera al desmontar.

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Euler, MathUtils, Vector3 } from 'three';

/** Velocidad de vuelo (m/s) y sensibilidad del ratón (rad/px). */
const SPEED = 9;
const LOOK = 0.0022;
/** Límites: suelo del césped, techo y radio desde el centro del estadio (0, −22). */
const MIN_Y = -1.6;
const MAX_Y = 45;
const MAX_R = 70;
const CENTER_Z = -22;

const KEYS = {
  KeyW: 'fwd',
  ArrowUp: 'fwd',
  KeyS: 'back',
  ArrowDown: 'back',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  Space: 'up',
  ShiftLeft: 'down',
  ShiftRight: 'down',
};

export default function FreeFly() {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const held = useRef(/** @type {Record<string, boolean>} */ ({}));
  const look = useRef(new Euler(0, 0, 0, 'YXZ'));
  const tmp = useRef({ fwd: new Vector3(), right: new Vector3(), move: new Vector3(), up: new Vector3(0, 1, 0) });

  useEffect(() => {
    look.current.setFromQuaternion(camera.quaternion, 'YXZ');
    look.current.z = 0;
    const el = gl.domElement;
    // El botón «Mirar libre» queda con el foco: Espacio lo volvería a pulsar.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();

    const turn = (dx, dy) => {
      const e = look.current;
      e.y -= dx * LOOK;
      e.x = MathUtils.clamp(e.x - dy * LOOK, -Math.PI / 2 + 0.05, Math.PI / 2 - 0.05);
      camera.quaternion.setFromEuler(e);
    };
    let dragging = false;
    const onDown = () => {
      dragging = true;
      if (document.pointerLockElement !== el) el.requestPointerLock?.()?.catch?.(() => {});
    };
    const onUp = () => {
      dragging = false;
    };
    const onMove = (event) => {
      if (document.pointerLockElement === el || dragging) turn(event.movementX, event.movementY);
    };
    const onKey = (down) => (event) => {
      const action = KEYS[event.code];
      if (!action) return;
      if (event.target instanceof Element && event.target.closest('input, textarea, select')) return;
      held.current[action] = down;
      event.preventDefault(); // Espacio y flechas no deben hacer scroll ni pulsar botones
    };
    const onKeyDown = onKey(true);
    const onKeyUp = onKey(false);
    const onBlur = () => {
      held.current = {};
    };

    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      if (document.pointerLockElement === el) document.exitPointerLock();
      held.current = {};
    };
  }, [camera, gl]);

  useFrame((_, delta) => {
    const h = held.current;
    const { fwd, right, move, up } = tmp.current;
    camera.getWorldDirection(fwd); // hacia donde miras, con su altura
    right.crossVectors(fwd, up).normalize();
    move.set(0, 0, 0);
    if (h.fwd) move.add(fwd);
    if (h.back) move.sub(fwd);
    if (h.right) move.add(right);
    if (h.left) move.sub(right);
    if (h.up) move.y += 1;
    if (h.down) move.y -= 1;
    if (move.lengthSq() === 0) return;
    move.normalize().multiplyScalar(SPEED * Math.min(delta, 0.05));
    const p = camera.position.add(move);
    p.y = MathUtils.clamp(p.y, MIN_Y, MAX_Y);
    const dz = p.z - CENTER_Z;
    const r = Math.hypot(p.x, dz);
    if (r > MAX_R) {
      p.x *= MAX_R / r;
      p.z = CENTER_Z + dz * (MAX_R / r);
    }
  });

  return null;
}
