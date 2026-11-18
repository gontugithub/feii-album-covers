// covers/queen-bohemian-rhapsody/src/Route.jsx — endpoint completo de la ruta (D26).
//
// Homenaje 3D a Queen — Bohemian Rhapsody: la cámara atraviesa una portada propia,
// vuela por un estadio al atardecer con Freddie (maniquí estilizado) y la multitud,
// y al terminar entrega navegación libre. Esta ruta es dueña de su <Canvas>, cámara y DOM.
//
// Arranque en idle: el disco en su funda flota en el vacío y se puede orbitar arrastrando.
// La intro solo empieza con un clic (no un arrastre) sobre el disco o con el botón DOM
// «Entrar» (teclado, foco visible). Cursor pointer al pasar sobre la funda (clase en .qbr,
// sin tocar estilos globales).
// DOM (accesible): título, «Entrar», «Saltar intro» / «Repetir intro» (Escape también
// salta una vez empezada), aviso aria-live. prefers-reduced-motion → sin balanceo y,
// al entrar, nunca reproduce el vuelo: va directo a la pose final y congela el cielo.
// Al desmontar: quita la clase de alcance y el listener; R3F libera el renderer y
// cada componente libera sus geometrías/texturas propias.

import { Suspense, useCallback, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import BudgetProbe from '../../../src/lib/BudgetProbe.jsx';
import { withinCeiling } from '../../../src/lib/budget.js';
import usePrefersReducedMotion from '../../../src/lib/usePrefersReducedMotion.js';
import { CEILING } from './budget.js';
import { IDLE_CAMERA } from './keys.js';
import Scene from './Scene.jsx';
import Tracklist from './Tracklist.jsx';
import usePlaylist from './usePlaylist.js';
import './route.css';

const SCOPE = 'route-queen-bohemian-rhapsody';
// Arranca en la vista de tres cuartos del idle; al entrar, CameraRig la lleva a la pose de t = 0.
const CAMERA = { fov: 35, near: 0.1, far: 1500, position: IDLE_CAMERA };
const DPR = [1, 1.5];
const TUTORIAL_KEY = 'qbr-freefly-tutorial';

export default function Route() {
  const reduced = usePrefersReducedMotion();
  const [run, setRun] = useState(0);
  const [started, setStarted] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [done, setDone] = useState(false);
  const [free, setFree] = useState(false);
  const playlist = usePlaylist();
  // Mini tutorial del vuelo libre: la primera vez que se entra (se recuerda en este navegador).
  const [tutorial, setTutorial] = useState(false);
  const { playFromStart } = playlist;
  const [budget, setBudget] = useState(null);
  const [showBudget] = useState(
    () => import.meta.env.DEV || new URLSearchParams(window.location.search).has('budget'),
  );
  const skip = started && (skipped || reduced);

  useEffect(() => {
    document.documentElement.classList.add(SCOPE);
    return () => document.documentElement.classList.remove(SCOPE);
  }, []);

  // Escape salta la intro (además del botón), solo una vez empezada: en idle no hace nada.
  useEffect(() => {
    if (!started) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setSkipped(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [started]);

  const onDone = useCallback(() => setDone(true), []);
  // Entrar (clic en la funda o en el botón) arranca también la música: es el gesto que el navegador exige.
  const onEnter = useCallback(() => {
    setStarted(true);
    playFromStart();
  }, [playFromStart]);
  const onHoverPortal = useCallback((value) => setHovered(value), []);
  const onSkip = () => {
    setStarted(true);
    playFromStart();
    setSkipped(true);
  };
  const onToggleFree = () => {
    if (!free) {
      let seen = false;
      try {
        seen = window.localStorage.getItem(TUTORIAL_KEY) === '1';
      } catch {
        // sin almacenamiento: se enseña siempre
      }
      setTutorial(!seen);
    } else setTutorial(false);
    setFree(!free);
  };
  const onTutorialDone = () => {
    try {
      window.localStorage.setItem(TUTORIAL_KEY, '1');
    } catch {
      // sin almacenamiento: no pasa nada
    }
    setTutorial(false);
  };
  const onReplay = () => {
    setDone(false);
    setFree(false);
    setSkipped(false);
    setRun((n) => n + 1);
  };

  const verdict = withinCeiling(budget, CEILING);

  return (
    <div className={hovered && !started ? 'qbr qbr--hover' : 'qbr'}>
      <Canvas className="qbr__canvas" dpr={DPR} camera={CAMERA} gl={{ antialias: true, powerPreference: 'high-performance' }}>
        <Suspense fallback={null}>
          <Scene
            run={run}
            started={started}
            onEnter={onEnter}
            onHoverPortal={onHoverPortal}
            skip={skip}
            free={free}
            reduced={reduced}
            done={done}
            onDone={onDone}
          />
        </Suspense>
        <BudgetProbe onSample={setBudget} />
      </Canvas>

      <Tracklist playlist={playlist} />

      <header className="qbr__title">
        <h1>Bohemian Rhapsody</h1>
        <p>Queen · homenaje 3D (fan art no oficial)</p>
      </header>

      {/* CC-BY-4.0 (D8 en CLAUDE.md, docs/ktx2-note.md): autor, fuente, licencia y "modificado".
          Arriba a la derecha: abajo a la izquierda lo tapan los botones de la galería. */}
      <p className="qbr__credit">
        Freddie:{' '}
        <a href="https://sketchfab.com/3d-models/freddie-mercury-t-pose-b89ee72767a54daa8c79768a5cdd2bbd" target="_blank" rel="noreferrer">
          «Freddie Mercury - T_Pose»
        </a>{' '}
        de Gerwerni (Sketchfab),{' '}
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
          CC BY 4.0
        </a>
        , modificado (pose, diezmado, bake).
      </p>

      <div className="qbr__controls">
        {!started ? (
          <>
            <button type="button" className="qbr__enter" onClick={onEnter}>
              Entrar
            </button>
            {reduced ? (
              <p>Movimiento reducido: al entrar se omite el vuelo.</p>
            ) : (
              <button type="button" onClick={onSkip}>
                Saltar intro
              </button>
            )}
          </>
        ) : null}
        {!started ? <p>Arrastra para girar el disco · clic en la portada para entrar</p> : null}
        {started && reduced ? <p>Movimiento reducido: intro omitida.</p> : null}
        {started && !reduced && !done ? (
          <button type="button" onClick={() => setSkipped(true)}>
            Saltar intro
          </button>
        ) : null}
        {done ? (
          <button type="button" aria-pressed={free} onClick={onToggleFree}>
            {free ? 'Volver al recorrido' : 'Mirar libre'}
          </button>
        ) : null}
        {started && !reduced && done ? (
          <button type="button" onClick={onReplay}>
            Repetir intro
          </button>
        ) : null}
        {done && !free ? <p>Rueda o desliza: abajo avanza, arriba deshace el recorrido</p> : null}
        {done && free ? <p>W A S D moverte · ratón mirar · Espacio subir · Shift bajar · Esc soltar el ratón</p> : null}
      </div>

      {free && tutorial ? (
        <div className="qbr__tutorial" role="dialog" aria-labelledby="qbr-tutorial-title">
          <h2 id="qbr-tutorial-title">Vuela por el estadio</h2>
          <ul>
            <li>
              <kbd>Clic</kbd> en la escena para capturar el ratón; muévelo para mirar. <kbd>Esc</kbd> lo suelta.
            </li>
            <li>
              <kbd>W</kbd> avanzas hacia donde miras (mira arriba y subes) · <kbd>S</kbd> atrás
            </li>
            <li>
              <kbd>A</kbd> <kbd>D</kbd> de lado · <kbd>Espacio</kbd> subir · <kbd>Shift</kbd> bajar
            </li>
            <li>«Volver al recorrido» te devuelve a la ruta del dron.</li>
          </ul>
          <button type="button" onClick={onTutorialDone}>
            Entendido
          </button>
        </div>
      ) : null}

      <p className="qbr__sr" aria-live="polite">
        {done ? (free ? 'Navegación libre activa.' : 'Intro terminada. Usa la rueda para recorrer el estadio.') : ''}
      </p>

      {showBudget && budget ? (
        <pre className={verdict === false ? 'qbr__budget qbr__budget--over' : 'qbr__budget'} aria-label="renderer.info">
          {`calls ${budget.calls} · triangles ${budget.triangles}\ngeometries ${budget.geometries} · textures ${budget.textures}`}
          {verdict === false ? '\nover ceiling' : ''}
        </pre>
      ) : null}
    </div>
  );
}
