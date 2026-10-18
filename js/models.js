// GLB-Modelle laden (Umgebung, KI-Figuren). ES-Modul, nutzt das globale THREE über js/vendor/three-shim.js.
// Klassischer Code wartet mit Models.ready(cb) darauf.
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { MeshoptDecoder } from './vendor/meshopt_decoder.module.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { RGBELoader } from './vendor/RGBELoader.js';

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const cache = {}, done = {};

function load(url) {
  if (!cache[url]) cache[url] = new Promise((ok, fail) => loader.load(url, (g) => {
    g.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    done[url] = g.scene; ok(g.scene);
  }, undefined, (e) => { done[url] = false; fail(e); }));
  return cache[url];
}

// Synchron: fertig geladenes Modell (oder null = noch nicht / false = fehlt).
function cached(url) { return url in done ? done[url] : null; }

// Klon mit Höhe h; ist er breiter als foot, wird er auf foot verkleinert. Boden y = 0, mittig.
function fit(src, h, foot) {
  const T = window.THREE, o = src.clone(true);
  const box = new T.Box3().setFromObject(o), dim = box.getSize(new T.Vector3()), c = box.getCenter(new T.Vector3());
  const s = Math.min(h / (dim.y || 1), foot ? foot / Math.max(dim.x, dim.z, 1e-6) : Infinity), g = new T.Group();
  o.position.set(-c.x, -box.min.y, -c.z); g.add(o); g.scale.setScalar(s);
  return g;
}

// Klon in Wunschgröße: höchste Ausdehnung = size (Meter), Boden auf y = 0, mittig.
async function get(url, size, opts) {
  const T = window.THREE, src = await load(url), o = src.clone(true);
  const box = new T.Box3().setFromObject(o), dim = box.getSize(new T.Vector3()), c = box.getCenter(new T.Vector3());
  const by = opts && opts.by === 'height' ? dim.y : Math.max(dim.x, dim.y, dim.z);
  const s = size / (by || 1), g = new T.Group();
  o.position.set(-c.x, -box.min.y, -c.z); g.add(o); g.scale.setScalar(s);
  return g;
}

// Weiche Studio-Umgebung, damit metallische PBR-Texturen (KI-Figuren) nicht schwarz wirken.
const envs = new WeakMap();
function envMap(renderer) {
  if (!envs.has(renderer)) { const T = window.THREE, pm = new T.PMREMGenerator(renderer); envs.set(renderer, pm.fromScene(new RoomEnvironment(), 0.04).texture); pm.dispose(); }
  return envs.get(renderer);
}

// HDRI (Poly Haven, CC0) als Umgebungslicht: Promise auf die vorgefilterte Env-Map
// pro Renderer cachen: eine Env-Map ist an den WebGL-Kontext gebunden, ein neues Brett braucht eine eigene
const hdrs = new WeakMap();
function hdr(renderer, url) {
  if (!hdrs.has(renderer)) hdrs.set(renderer, {});
  const c = hdrs.get(renderer);
  if (!c[url]) c[url] = new Promise((ok, fail) => new RGBELoader().load(url, (t) => {
    const T = window.THREE, pm = new T.PMREMGenerator(renderer); t.mapping = T.EquirectangularReflectionMapping;
    const env = pm.fromEquirectangular(t).texture; pm.dispose(); t.dispose(); ok(env);
  }, undefined, fail));
  return c[url];
}

const Models = { load, get, cached, fit, envMap, hdr, base: 'models/' };
const waiting = window.__modelsWaiting || [];
window.Models = Object.assign(Models, { ready: (cb) => cb(Models) });
waiting.forEach((cb) => cb(Models));
