// usePlaylist.js — estado de la tracklist para Route.jsx (que arranca la música al «Entrar») y
// Tracklist.jsx (que la pinta). La lista se pide al montar; el audio se libera al desmontar.

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPlaylist, fetchTracks } from './player.js';

/**
 * @returns {{
 *   tracks: import('./player.js').Track[] | null | 'error',
 *   playing: number,
 *   bar: import('react').RefObject<HTMLElement | null>,
 *   playFromStart: () => void,
 *   toggle: (index: number) => void,
 * }}
 */
export default function usePlaylist() {
  const [tracks, setTracks] = useState(/** @type {import('./player.js').Track[] | null | 'error'} */ (null));
  const [playing, setPlaying] = useState(-1);
  const bar = useRef(/** @type {HTMLElement | null} */ (null));
  const playlist = useRef(/** @type {ReturnType<typeof createPlaylist> | null} */ (null));
  // «Entrar» antes de que llegue la lista: arranca en cuanto llegue (el navegador puede bloquearlo).
  const pending = useRef(false);

  useEffect(() => {
    const aborter = new AbortController();
    const p = createPlaylist({
      onChange: setPlaying,
      onProgress: (f) => {
        if (bar.current) bar.current.style.transform = `scaleX(${f})`;
      },
    });
    playlist.current = p;
    fetchTracks(aborter.signal)
      .then((list) => {
        p.setTracks(list);
        setTracks(list);
        if (pending.current) {
          pending.current = false;
          p.playFromStart();
        }
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setTracks('error');
      });
    return () => {
      aborter.abort();
      p.destroy();
      playlist.current = null;
    };
  }, []);

  const playFromStart = useCallback(() => {
    const p = playlist.current;
    if (p?.ready) p.playFromStart();
    else pending.current = true;
  }, []);

  const toggle = useCallback((index) => playlist.current?.toggle(index), []);

  return { tracks, playing, bar, playFromStart, toggle };
}
