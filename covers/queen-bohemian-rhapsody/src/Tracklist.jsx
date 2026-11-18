// Tracklist.jsx — panel derecho: pistas del álbum con fragmentos de 30 s y enlaces.
//
// El estado y el audio viven en usePlaylist (Route.jsx), porque «Entrar» arranca la reproducción
// continua. Clic en una pista: salta a ella y la lista sigue desde ahí; clic en la que suena: para.
// En pantallas estrechas el panel empieza plegado.

import { useState } from 'react';
import { APPLE_URL, SPOTIFY_URL } from './player.js';

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/**
 * @param {{ playlist: ReturnType<typeof import('./usePlaylist.js').default> }} props
 */
export default function Tracklist({ playlist }) {
  const { tracks, playing, bar, toggle } = playlist;
  const [open, setOpen] = useState(() => typeof window === 'undefined' || window.innerWidth > 860);
  const now = Array.isArray(tracks) && playing >= 0 ? tracks[playing] : null;

  return (
    <section className={open ? 'qbr__tracklist' : 'qbr__tracklist qbr__tracklist--closed'} aria-label="Tracklist">
      <button type="button" className="qbr__tracklist-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        Tracklist <span aria-hidden="true">{open ? '–' : '+'}</span>
      </button>
      {open ? (
        <>
          <p className="qbr__tracklist-meta">
            Banda sonora original · 2018 ·{' '}
            <a href={SPOTIFY_URL} target="_blank" rel="noreferrer">
              Escuchar en Spotify
            </a>
          </p>
          {tracks === null ? <p className="qbr__tracklist-note">Cargando…</p> : null}
          {tracks === 'error' ? (
            <p className="qbr__tracklist-note">
              No se pudo cargar la lista. Escúchalo en{' '}
              <a href={APPLE_URL} target="_blank" rel="noreferrer">
                Apple Music
              </a>
              .
            </p>
          ) : null}
          {Array.isArray(tracks) ? (
            <ol className="qbr__tracks">
              {tracks.map((t, i) => (
                <li key={t.n} className={playing === i ? 'is-playing' : undefined}>
                  <button type="button" disabled={!t.preview} aria-pressed={playing === i} onClick={() => toggle(i)}>
                    <span className="n">{playing === i ? '❚❚' : String(t.n).padStart(2, '0')}</span>
                    <span className="t">{t.title}</span>
                    <span className="d">{fmt(t.seconds)}</span>
                  </button>
                  {playing === i ? <span className="qbr__tracks-bar" ref={bar} aria-hidden="true" /> : null}
                </li>
              ))}
            </ol>
          ) : null}
          <p className="qbr__tracklist-note">
            {now ? `Sonando: ${now.title} · ` : 'Toca una canción para escuchar 30 s · '}
            fragmentos de{' '}
            <a href={APPLE_URL} target="_blank" rel="noreferrer">
              Apple Music
            </a>
          </p>
        </>
      ) : null}
    </section>
  );
}
