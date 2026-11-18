// player.js — fragmentos oficiales de 30 s de Apple Music (iTunes Search API) en reproducción continua.
//
// No se aloja ningún audio ni se copian datos: al montar la ruta se pide la lista del álbum
// (títulos, duración y URL del fragmento; Apple sirve CORS) y se reproduce desde Apple.
// Reproducción automática: al «Entrar» arranca la lista AUTOPLAY (Live Aid primero) y sigue con el
// resto del álbum; entre fragmentos hay un fundido cruzado de CROSSFADE s con dos <audio>.
// Código propio (las covers no importan de otras covers); la idea es la de por-si-manana-no-estoy.

/** «Bohemian Rhapsody (The Original Soundtrack)», Queen, 2018, 22 pistas (catálogo de iTunes ES). */
const ALBUM_ID = 6781027361;
const LOOKUP = `https://itunes.apple.com/lookup?id=${ALBUM_ID}&entity=song&country=es`;

export const APPLE_URL = 'https://music.apple.com/es/album/bohemian-rhapsody-the-original-soundtrack/6781027361';
/** Búsqueda en Spotify (el álbum no tiene un enlace estable que podamos comprobar sin API). */
export const SPOTIFY_URL = 'https://open.spotify.com/search/Bohemian%20Rhapsody%20The%20Original%20Soundtrack%20Queen/albums';

/** Orden de arranque (números de pista del álbum); después, el resto en orden de álbum. */
const AUTOPLAY = [
  16, // Bohemian Rhapsody (Live Aid)
  2, // Somebody To Love
  20, // We Are The Champions (Live Aid)
  17, // Radio Ga Ga (Live Aid)
];

/** Segundos de fundido cruzado entre fragmentos. */
const CROSSFADE = 3;

/**
 * @typedef {{ n: number, title: string, seconds: number, preview: string | null }} Track
 */

/**
 * Pide la tracklist al catálogo de iTunes (en orden de álbum).
 *
 * @param {AbortSignal} signal
 * @returns {Promise<Track[]>}
 */
export async function fetchTracks(signal) {
  const response = await fetch(LOOKUP, { signal });
  if (!response.ok) throw new Error(`iTunes ${response.status}`);
  const data = await response.json();
  return data.results
    .filter((r) => r.wrapperType === 'track')
    .sort((a, b) => a.trackNumber - b.trackNumber)
    .map((r) => ({
      n: r.trackNumber,
      title: r.trackName,
      seconds: Math.round((r.trackTimeMillis ?? 0) / 1000),
      preview: r.previewUrl ?? null,
    }));
}

/**
 * Orden de reproducción: AUTOPLAY primero, luego el resto del álbum. Devuelve índices de `tracks`.
 *
 * @param {Track[]} tracks
 * @returns {number[]}
 */
export function playOrder(tracks) {
  const first = AUTOPLAY.map((n) => tracks.findIndex((t) => t.n === n)).filter((i) => i >= 0);
  const rest = tracks.map((_, i) => i).filter((i) => !first.includes(i));
  return [...first, ...rest].filter((i) => tracks[i].preview);
}

/**
 * Lista continua con dos <audio> para el fundido cruzado.
 *
 * @param {{ onChange: (index: number) => void, onProgress: (fraction: number) => void }} handlers
 *   `index` es el índice en `tracks` que suena (−1 = parado).
 */
export function createPlaylist({ onChange, onProgress }) {
  const decks = [new Audio(), new Audio()];
  decks.forEach((a) => {
    a.preload = 'none';
  });
  /** @type {Track[]} */
  let tracks = [];
  /** @type {number[]} */
  let order = [];
  let deck = 0; // el <audio> que suena
  let pos = -1; // posición en `order`
  let mixing = false;
  /** Fundidos en curso por <audio>. */
  const fades = [0, 0];

  const fade = (audio, target, ms, then) => {
    const k = decks.indexOf(audio);
    cancelAnimationFrame(fades[k]);
    const from = audio.volume;
    const start = performance.now();
    const step = (now) => {
      const f = Math.min((now - start) / ms, 1);
      audio.volume = from + (target - from) * f;
      if (f < 1) fades[k] = requestAnimationFrame(step);
      else then?.();
    };
    fades[k] = requestAnimationFrame(step);
  };

  const current = () => (pos >= 0 ? order[pos] : -1);

  /** Arranca la posición `p` de la lista en el otro <audio> y funde el que sonaba. */
  async function start(p) {
    if (!order.length) return;
    pos = ((p % order.length) + order.length) % order.length;
    const out = decks[deck];
    deck = 1 - deck;
    const next = decks[deck];
    const mine = pos;
    mixing = false;
    if (!out.paused) fade(out, 0, CROSSFADE * 1000, () => out.pause());
    next.src = tracks[order[pos]].preview;
    next.volume = 0;
    onChange(current());
    try {
      await next.play();
      if (pos === mine) fade(next, 1, out.paused ? 300 : CROSSFADE * 1000);
    } catch {
      if (pos === mine) stop(); // autoplay bloqueado o fragmento caído
    }
  }

  function stop() {
    pos = -1;
    mixing = false;
    onChange(-1);
    decks.forEach((a) => {
      if (!a.paused) fade(a, 0, 300, () => a.pause());
    });
  }

  // Cerca del final del fragmento, mezcla con el siguiente.
  const onTime = (event) => {
    const audio = event.currentTarget;
    if (audio !== decks[deck] || pos < 0 || !audio.duration) return;
    onProgress(audio.currentTime / audio.duration);
    if (!mixing && audio.duration - audio.currentTime <= CROSSFADE) {
      mixing = true;
      start(pos + 1);
    }
  };
  const onEnded = (event) => {
    if (event.currentTarget === decks[deck] && pos >= 0 && !mixing) start(pos + 1);
  };
  decks.forEach((a) => {
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('ended', onEnded);
  });

  return {
    /** @param {Track[]} list */
    setTracks(list) {
      tracks = list;
      order = playOrder(list);
    },
    get ready() {
      return order.length > 0;
    },
    /** Desde el principio de la lista (lo llama «Entrar», dentro del gesto del usuario). */
    playFromStart() {
      start(0);
    },
    /** Clic en una pista: si suena, para; si no, salta a ella y sigue la lista desde ahí. */
    toggle(index) {
      if (index === current()) stop();
      else {
        const p = order.indexOf(index);
        if (p >= 0) start(p);
      }
    },
    stop,
    /** Al salir de la ruta: corta el audio y suelta los fragmentos. */
    destroy() {
      fades.forEach((f) => cancelAnimationFrame(f));
      decks.forEach((a) => {
        a.removeEventListener('timeupdate', onTime);
        a.removeEventListener('ended', onEnded);
        a.pause();
        a.removeAttribute('src');
        a.load();
      });
    },
  };
}
