// SpaceBackdrop.jsx — espacio alrededor del disco en idle (antes había negro total).
//
// Tres capas, todas procedurales (sin texturas) y centradas en la funda (SLEEVE_CENTER):
// 1. Nebulosa: esfera grande por dentro (BackSide) con ruido fbm en la dirección de vista, en los
//    violetas y magentas del atardecer de la portada. Muy tenue: es profundidad, no protagonista.
// 2. Estrellas: Points en una cáscara lejana (80–260 m), tamaño con perspectiva y titileo propio.
// 3. Polvo: Points cerca de la funda (2–14 m) que giran despacio: al orbitar dan paralaje.
// Se funden con la portada (PORTAL_FADE) y se ocultan después: el estadio tiene su propio cielo.
// Dibujado DESPUÉS del telón negro de CoverPortal (renderOrder), así al entrar no se apagan de golpe.
// prefers-reduced-motion: sin titileo ni giro. Geometrías y materiales propios: dispose al desmontar.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BackSide, BufferAttribute, BufferGeometry, MathUtils, ShaderMaterial, SphereGeometry } from 'three';
import { PORTAL_FADE, SLEEVE_CENTER, portalOpacity } from './keys.js';

const STARS = 3600;
const DUST = 420;
const SEED = 7;

/** PRNG con semilla (mulberry32): el cielo es siempre el mismo. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Puntos en una cáscara esférica [r0, r1] alrededor de la funda, con tamaño, fase y tinte. */
function makePoints(count, r0, r1, seed) {
  const rand = rng(seed);
  const pos = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const phase = new Float32Array(count);
  const tint = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const u = rand() * 2 - 1;
    const th = rand() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const r = r0 + (r1 - r0) * Math.cbrt(rand());
    pos[i * 3] = s * Math.cos(th) * r;
    pos[i * 3 + 1] = u * r;
    pos[i * 3 + 2] = s * Math.sin(th) * r;
    size[i] = 0.6 + 2.4 * rand() ** 3; // pocas grandes, muchas pequeñas
    phase[i] = rand() * Math.PI * 2;
    const k = rand();
    // blanco azulado, blanco y algo cálido
    const c = k < 0.55 ? [0.82, 0.88, 1] : k < 0.85 ? [1, 1, 1] : [1, 0.82, 0.68];
    tint.set(c, i * 3);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('aSize', new BufferAttribute(size, 1));
  g.setAttribute('aPhase', new BufferAttribute(phase, 1));
  g.setAttribute('aTint', new BufferAttribute(tint, 3));
  return g;
}

const POINTS_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uScale;
  uniform float uTwinkle;
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aTint;
  varying vec3 vTint;
  varying float vGlow;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float tw = 1.0 - uTwinkle * 0.45 * (0.5 + 0.5 * sin(uTime * (0.8 + fract(aPhase) * 2.2) + aPhase * 7.0));
    vGlow = tw;
    vTint = aTint;
    gl_PointSize = clamp(aSize * uScale / -mv.z, 1.0, 6.0);
  }
`;

const POINTS_FRAG = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vTint;
  varying float vGlow;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float a = smoothstep(0.5, 0.0, d);
    a *= a;
    gl_FragColor = vec4(vTint * vGlow, a * uOpacity);
  }
`;

const NEBULA_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const NEBULA_FRAG = /* glsl */ `
  uniform float uOpacity;
  uniform float uTime;
  varying vec3 vDir;
  float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }
  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }
  void main() {
    vec3 d = normalize(vDir);
    vec3 drift = vec3(uTime * 0.004, 0.0, uTime * 0.003);
    float n = fbm(d * 2.6 + drift);
    float m = fbm(d * 5.0 - drift + 3.1);
    float cloud = smoothstep(0.36, 0.8, n) * (0.55 + 0.45 * m);
    // una franja más densa cruzando el cielo, como una vía láctea suave
    float band = exp(-pow(dot(d, normalize(vec3(0.35, 1.0, 0.2))) * 3.2, 2.0));
    cloud = cloud * (0.35 + 0.65 * band);
    vec3 violet = vec3(0.23, 0.09, 0.42);
    vec3 magenta = vec3(0.55, 0.13, 0.36);
    vec3 col = mix(violet, magenta, smoothstep(0.4, 0.8, m)) * cloud * 1.1;
    col += vec3(0.03, 0.02, 0.07) * band; // poso azul oscuro, para que no sea negro plano
    gl_FragColor = vec4(col, uOpacity);
  }
`;

/**
 * @param {object} props
 * @param {import('react').RefObject<{ t: number }>} props.progress Reloj de la intro (CameraRig).
 * @param {boolean} props.reduced prefers-reduced-motion.
 */
export default function SpaceBackdrop({ progress, reduced }) {
  const group = useRef(null);
  const nebula = useRef(null);
  const stars = useRef(null);
  const dust = useRef(null);
  const time = useRef(0);

  const res = useMemo(() => {
    const pointsMaterial = (scale, twinkle) =>
      new ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uScale: { value: scale }, uTwinkle: { value: twinkle }, uOpacity: { value: 1 } },
        vertexShader: POINTS_VERT,
        fragmentShader: POINTS_FRAG,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      });
    return {
      stars: makePoints(STARS, 80, 260, SEED),
      dust: makePoints(DUST, 2, 14, SEED + 1),
      nebula: new SphereGeometry(400, 48, 24),
      starsMat: pointsMaterial(260, 1),
      dustMat: pointsMaterial(9, 0),
      nebulaMat: new ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 } },
        vertexShader: NEBULA_VERT,
        fragmentShader: NEBULA_FRAG,
        side: BackSide,
        transparent: true,
        depthWrite: false,
      }),
    };
  }, []);
  useEffect(
    () => () => {
      [res.stars, res.dust, res.nebula, res.starsMat, res.dustMat, res.nebulaMat].forEach((r) => r.dispose());
    },
    [res],
  );

  useFrame((_, delta) => {
    if (!group.current) return;
    const [from, to] = PORTAL_FADE;
    const fade = MathUtils.clamp((progress.current.t - from) / (to - from), 0, 1);
    group.current.visible = fade < 1;
    if (fade >= 1) return;
    if (!reduced) time.current += Math.min(delta, 0.05);
    const t = time.current;
    const o = portalOpacity(progress.current.t);
    // Uniforms a través de los objetos montados (refs), no del useMemo: reglas de React.
    for (const obj of [nebula.current, stars.current, dust.current]) {
      if (!obj) continue;
      obj.material.uniforms.uOpacity.value = o;
      obj.material.uniforms.uTime.value = t; // con reduced, t no avanza: sin titileo
    }
    if (dust.current) dust.current.rotation.y = t * 0.02;
  });

  return (
    <group ref={group} position={SLEEVE_CENTER}>
      <mesh ref={nebula} geometry={res.nebula} material={res.nebulaMat} renderOrder={0} frustumCulled={false} />
      <points ref={stars} geometry={res.stars} material={res.starsMat} renderOrder={1} frustumCulled={false} />
      <points ref={dust} geometry={res.dust} material={res.dustMat} renderOrder={1} frustumCulled={false} />
    </group>
  );
}
