import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { squareToQuad, type Point } from './homography';
import type { CurtainParams } from './renderer';

/**
 * Photoreal 3D curtains (three.js).
 *
 * 1. Camera: from the four window corners we recover the phone's focal length (when perspective
 *    allows) and the window's pose, so 3D geometry lines up with the photo exactly.
 * 2. Window space: metres, origin at the window's top-left, x → right, y → down, z → into the wall.
 *    The wall is z = 0; curtains hang in front of it (negative z).
 * 3. Cloth: real pleated meshes. The fabric length per pleat is kept constant, so a gathered
 *    curtain gets deeper, tighter folds; folds flare slightly towards a wavy hem.
 * 4. Light: the photo itself is the environment map (room colours), plus a soft key light that casts
 *    shadows on the wall, plus daylight glowing through the cloth where the window is behind it.
 * 5. Compositing: photo → 3D curtains → photo again where furniture stands in front (occlusion mask)
 *    or where the curtain is faded out while corners are being placed.
 */

export type Finish = 'velvet' | 'satin' | 'matte';
export interface Curtain3DParams extends CurtainParams {
  finish?: Finish;
}

const WW = 1.3; // assumed window width in metres (only the scale of pleats depends on it)

function weaveTexture(fine: boolean) {
  const n = 256;
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(n, n);
  let seed = fine ? 7 : 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const period = fine ? 4 : 3;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const warp = Math.sin((x / period) * Math.PI) * 0.5 + 0.5;
      const weft = Math.sin((y / period) * Math.PI) * 0.5 + 0.5;
      const v = fine ? 0.35 + 0.65 * Math.max(warp, weft) : 0.86 + 0.08 * (warp * weft) + 0.06 * rnd();
      const i = (y * n + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.round(v * 255);
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = fine ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Builds an (nx × ny) grid mesh from a position function and a uv function. */
function cloth(nx: number, ny: number, pos: (u: number, v: number) => [number, number, number], uv: (u: number, v: number) => [number, number]) {
  const g = new THREE.BufferGeometry();
  const P = new Float32Array((nx + 1) * (ny + 1) * 3);
  const U = new Float32Array((nx + 1) * (ny + 1) * 2);
  let k = 0, m = 0;
  for (let j = 0; j <= ny; j++)
    for (let i = 0; i <= nx; i++) {
      const u = i / nx, v = j / ny;
      const p = pos(u, v);
      P[k++] = p[0];
      P[k++] = p[1];
      P[k++] = p[2];
      const t = uv(u, v);
      U[m++] = t[0];
      U[m++] = t[1];
    }
  const idx: number[] = [];
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  g.setIndex(idx);
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(U, 2));
  g.computeVertexNormals();
  return g;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export class Curtain3D {
  readonly canvas: HTMLCanvasElement;
  private r: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.Camera();
  private world = new THREE.Group();
  private ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private bgScene = new THREE.Scene();
  private ovScene = new THREE.Scene();
  private ovMat: THREE.ShaderMaterial;
  private photoTex: THREE.Texture | null = null;
  private occTex: THREE.DataTexture | null = null;
  private fabTex: THREE.Texture | null = null;
  private fabAspect = 1;
  private envRT: THREE.WebGLRenderTarget | null = null;
  private pmrem: THREE.PMREMGenerator;
  private hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1);
  private key = new THREE.DirectionalLight(0xffffff, 1.5);
  private weave = weaveTexture(false);
  private mesh = weaveTexture(true);
  private parts = new THREE.Group();
  private shadowWall: THREE.Mesh | null = null;
  private buildKey = '';
  private width = 1;
  private height = 1;
  private probe: { data: Float32Array; w: number; h: number } | null = null;
  private translucent: { uniforms: Record<string, THREE.IUniform> }[] = [];

  /** Throws when WebGL2 is unavailable (caller falls back to the 2D renderer). */
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
    this.r.setPixelRatio(1);
    this.r.outputColorSpace = THREE.SRGBColorSpace;
    this.r.toneMapping = THREE.NeutralToneMapping;
    this.r.toneMappingExposure = 1;
    this.r.shadowMap.enabled = true;
    this.r.shadowMap.type = THREE.PCFShadowMap;
    this.r.autoClear = false;
    this.pmrem = new THREE.PMREMGenerator(this.r);

    this.world.matrixAutoUpdate = false;
    this.scene.add(this.world);
    this.scene.add(this.hemi);
    this.world.add(this.parts);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.01;
    this.key.shadow.radius = 5;
    this.world.add(this.key);
    this.world.add(this.key.target);

    const quad = new THREE.PlaneGeometry(2, 2);
    const shader = (overlay: boolean) =>
      new THREE.ShaderMaterial({
        uniforms: { uPhoto: { value: null }, uOcc: { value: null }, uHasOcc: { value: 0 }, uAlpha: { value: 1 } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: `
          uniform sampler2D uPhoto; uniform sampler2D uOcc; uniform float uHasOcc; uniform float uAlpha;
          varying vec2 vUv;
          void main() {
            vec4 c = texture2D(uPhoto, vUv);
            float a = 1.0;
            ${overlay ? 'float o = uHasOcc > 0.5 ? smoothstep(0.35, 0.65, texture2D(uOcc, vec2(vUv.x, 1.0 - vUv.y)).r) : 0.0; a = max(o, 1.0 - uAlpha);' : ''}
            gl_FragColor = vec4(c.rgb, a);
            #include <colorspace_fragment>
          }`,
        transparent: overlay,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      });
    const bgMat = shader(false);
    this.ovMat = shader(true);
    this.bgScene.add(new THREE.Mesh(quad, bgMat));
    this.ovScene.add(new THREE.Mesh(quad, this.ovMat));
  }

  setPhoto(photo: HTMLCanvasElement) {
    this.width = photo.width;
    this.height = photo.height;
    this.r.setSize(photo.width, photo.height, false);
    this.photoTex?.dispose();
    const tex = new THREE.CanvasTexture(photo);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    this.photoTex = tex;
    for (const s of [this.bgScene, this.ovScene]) ((s.children[0] as THREE.Mesh).material as THREE.ShaderMaterial).uniforms.uPhoto.value = tex;
    for (const t of this.translucent) t.uniforms.uPhoto.value = tex;

    // Environment light from the photo itself (blurred): curtains pick up the room's colours.
    const e = document.createElement('canvas');
    e.width = 256;
    e.height = 128;
    const ctx = e.getContext('2d')!;
    ctx.filter = 'blur(8px)';
    ctx.drawImage(photo, -16, -16, 288, 160);
    const envTex = new THREE.CanvasTexture(e);
    envTex.mapping = THREE.EquirectangularReflectionMapping;
    envTex.colorSpace = THREE.SRGBColorSpace;
    this.envRT?.dispose();
    this.envRT = this.pmrem.fromEquirectangular(envTex);
    envTex.dispose();
    this.scene.environment = this.envRT.texture;

    // Small linear copy for measuring the light on the wall around the window.
    const pw = 96, ph = Math.max(8, Math.round((96 * photo.height) / photo.width));
    const c = document.createElement('canvas');
    c.width = pw;
    c.height = ph;
    const pc = c.getContext('2d', { willReadFrequently: true })!;
    pc.drawImage(photo, 0, 0, pw, ph);
    const d = pc.getImageData(0, 0, pw, ph).data;
    const data = new Float32Array(pw * ph * 3);
    for (let i = 0; i < pw * ph; i++) for (let k = 0; k < 3; k++) data[i * 3 + k] = Math.pow(d[i * 4 + k] / 255, 2.2);
    this.probe = { data, w: pw, h: ph };
    this.buildKey = '';
  }

  setOcclusion(mask: { data: Uint8Array; w: number; h: number } | null, soft = false) {
    this.occTex?.dispose();
    this.occTex = null;
    if (mask) {
      let data = mask.data;
      if (!soft) data = Uint8Array.from(mask.data, (v) => (v ? 255 : 0));
      const t = new THREE.DataTexture(data, mask.w, mask.h, THREE.RedFormat, THREE.UnsignedByteType);
      t.magFilter = t.minFilter = THREE.LinearFilter;
      t.needsUpdate = true;
      this.occTex = t;
    }
    this.ovMat.uniforms.uOcc.value = this.occTex;
    this.ovMat.uniforms.uHasOcc.value = this.occTex ? 1 : 0;
  }

  setFabricTexture(img: HTMLImageElement | null) {
    if (this.fabTex && img && this.fabTex.image === img) return;
    this.fabTex?.dispose();
    this.fabTex = null;
    if (img) {
      const t = new THREE.Texture(img);
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = THREE.ClampToEdgeWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 4;
      t.needsUpdate = true;
      this.fabTex = t;
      this.fabAspect = img.naturalHeight / img.naturalWidth;
    }
    this.buildKey = '';
  }

  /** Window pose from the four corners: [R|t] in OpenCV camera space, focal length, window height in metres. */
  private pose(corners: Point[]) {
    const w = this.width, h = this.height, cx = w / 2, cy = h / 2, S = Math.max(w, h);
    const H = squareToQuad(corners);
    const col = (i: number) => [H[i] - cx * H[6 + i], H[3 + i] - cy * H[6 + i], H[6 + i]];
    const a = col(0), b = col(1), c = col(2);
    let f = 0.78 * S; // typical phone main camera (≈26 mm equivalent)
    const den = a[2] * b[2];
    if (Math.abs(den) > 1e-12) {
      const f2 = -(a[0] * b[0] + a[1] * b[1]) / den;
      if (f2 > 0) {
        const ff = Math.sqrt(f2);
        if (ff > 0.55 * S && ff < 2.2 * S) f = ff;
      }
    }
    const m1 = new THREE.Vector3(a[0] / f, a[1] / f, a[2]);
    const m2 = new THREE.Vector3(b[0] / f, b[1] / f, b[2]);
    const m3 = new THREE.Vector3(c[0] / f, c[1] / f, c[2]);
    const n1 = m1.length(), n2 = m2.length();
    const hw = Math.min(4, Math.max(0.25, (WW * n2) / n1));
    let lam = n1 / WW;
    if (m3.z / lam < 0) lam = -lam;
    const r1 = m1.clone().divideScalar(lam * WW).normalize();
    let r2 = m2.clone().divideScalar(lam * hw).normalize();
    r2 = r2.sub(r1.clone().multiplyScalar(r1.dot(r2))).normalize();
    const r3 = new THREE.Vector3().crossVectors(r1, r2);
    const t = m3.clone().divideScalar(lam);
    return { f, hw, r1, r2, r3, t };
  }

  private roomLight(corners: Point[]) {
    if (!this.probe) return { level: 1, color: new THREE.Color(1, 1, 1) };
    const { data, w, h } = this.probe;
    const M = squareToQuad(corners);
    const sx = w / this.width, sy = h / this.height;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i <= 16; i++) {
      const tt = -0.2 + (1.4 * i) / 16;
      for (const [u, v] of [[tt, -0.18], [tt, 1.15], [-0.22, tt], [1.22, tt]]) {
        const z = M[6] * u + M[7] * v + 1;
        const x = Math.round(((M[0] * u + M[1] * v + M[2]) / z) * sx);
        const y = Math.round(((M[3] * u + M[4] * v + M[5]) / z) * sy);
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const j = (y * w + x) * 3;
        r += data[j];
        g += data[j + 1];
        b += data[j + 2];
        n++;
      }
    }
    if (!n) return { level: 1, color: new THREE.Color(1, 1, 1) };
    r /= n;
    g /= n;
    b /= n;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const tint = (x: number) => 1 + (Math.max(0.75, Math.min(1.3, x / Math.max(lum, 0.02))) - 1) * 0.6;
    return { level: Math.max(0.3, Math.min(1.25, 0.3 + lum * 1.3)), color: new THREE.Color(tint(r), tint(g), tint(b)) };
  }

  /** Adds daylight glowing through the cloth where the window is behind it. */
  private translucency(mat: THREE.MeshPhysicalMaterial, thin: number, hw: number, zebraSheer: number | null = null) {
    const holder = { uniforms: {} as Record<string, THREE.IUniform> };
    mat.onBeforeCompile = (sh) => {
      if (zebraSheer !== null) {
        // zebra: the photo's alpha marks opaque vs sheer bands; the day–night setting opens the sheer ones
        sh.uniforms.uSheer = { value: zebraSheer };
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform float uSheer;')
          .replace(
            '#include <map_fragment>',
            `#include <map_fragment>
             #ifdef USE_MAP
               diffuseColor.a = opacity * mix(uSheer, 1.0, smoothstep(0.62, 0.95, sampledDiffuseColor.a));
             #endif`,
          );
      }
      sh.uniforms.uPhoto = { value: this.photoTex };
      sh.uniforms.uRes = { value: new THREE.Vector2(this.width, this.height) };
      sh.uniforms.uThin = { value: thin };
      sh.uniforms.uWin = { value: new THREE.Vector2(WW, hw) };
      holder.uniforms = sh.uniforms;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vWin;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWin = position.xy;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform sampler2D uPhoto; uniform vec2 uRes; uniform float uThin; uniform vec2 uWin; varying vec2 vWin;')
        .replace(
          '#include <opaque_fragment>',
          `float inWin = smoothstep(-0.02, 0.02, vWin.x) * smoothstep(-0.02, 0.02, uWin.x - vWin.x) * smoothstep(-0.02, 0.02, vWin.y) * smoothstep(-0.02, 0.02, uWin.y - vWin.y);
           vec3 behind = texture2D(uPhoto, gl_FragCoord.xy / uRes).rgb;
           outgoingLight += diffuseColor.rgb * behind * inWin * uThin;
           #include <opaque_fragment>`,
        );
    };
    mat.customProgramCacheKey = () => `translucent-${thin.toFixed(2)}-${zebraSheer !== null}`;
    this.translucent.push(holder);
  }

  private clearParts() {
    for (const o of [...this.parts.children]) {
      this.parts.remove(o);
      o.traverse((x) => {
        const m = x as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((q) => q.dispose());
        else mat?.dispose();
      });
    }
    this.translucent = [];
  }

  private build(p: Curtain3DParams, hw: number) {
    this.clearParts();
    const color = new THREE.Color(p.color);
    const lum = 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b; // linear
    const metal = new THREE.MeshStandardMaterial({ color: 0xc9a043, metalness: 1, roughness: 0.32, envMapIntensity: 1.4 });
    const add = (m: THREE.Object3D, cast = true) => {
      m.traverse((x) => {
        x.frustumCulled = false;
        (x as THREE.Mesh).castShadow = cast;
      });
      this.parts.add(m);
    };

    if (p.type === 'roller' || p.type === 'zebra') {
      const xL = -0.03 * WW, xR = 1.03 * WW;
      const yT = -0.012, yB = Math.max(yT + 0.05, hw * (1.03 - 0.94 * p.open));
      const z = -0.04;
      const zebra = p.type === 'zebra' && !!this.fabTex;
      const tileH = this.fabAspect * (xR - xL);
      // fabric under tension: faint ripples that catch the light, strongest near the sides
      const ripple = (u: number, v: number) => 0.0018 * Math.sin(v * 70 + u * 3) * (0.3 + 0.7 * Math.abs(u - 0.5) * 2);
      const geo = cloth(
        60,
        60,
        (u, v) => [xL + u * (xR - xL), yT + v * (yB - yT), z + ripple(u, v)],
        (u, v) => (zebra ? [u, ((yB - yT) * (1 - v)) / tileH] : [(u * (xR - xL)) / 0.25, ((1 - v) * (yB - yT)) / 0.25]),
      );
      const mat = new THREE.MeshPhysicalMaterial({
        color: zebra ? color : color,
        map: zebra ? this.fabTex : this.weave,
        roughness: 0.78,
        sheen: 0.25,
        sheenRoughness: 0.6,
        side: THREE.DoubleSide,
        transparent: zebra,
      });
      this.translucency(mat, zebra ? 0.55 : 0.12 + 0.4 * lum, hw, zebra ? 0.36 : null);
      const blind = new THREE.Mesh(geo, mat);
      add(blind);
      if (zebra) {
        // The back layer of a zebra blind: by day its sheer bands line up with the front ones and light
        // comes through; by night it slides half a band so every sheer stripe is backed by an opaque one.
        const band = 1 / 8; // the photo holds 4 opaque + 4 sheer bands
        const shift = band * p.tulle;
        const back = cloth(
          60,
          30,
          (u, v) => [xL + u * (xR - xL), yT + v * (yB - yT), z + 0.012 + ripple(u, v) * 0.5],
          (u, v) => [u, ((yB - yT) * (1 - v)) / tileH + shift],
        );
        const bmat = new THREE.MeshPhysicalMaterial({ color: color.clone().multiplyScalar(0.92), map: this.fabTex, roughness: 0.8, side: THREE.DoubleSide, transparent: true });
        this.translucency(bmat, 0.55, hw, 0.36);
        const bm = new THREE.Mesh(back, bmat);
        bm.renderOrder = -1;
        add(bm);
      }

      // cassette (fabric-wrapped tube), end caps, bottom bar, bead chain
      const casMat = new THREE.MeshPhysicalMaterial({ color, map: zebra ? this.fabTex : this.weave, roughness: 0.6, sheen: 0.2 });
      const cas = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, xR - xL + 0.03, 40), casMat);
      cas.rotation.z = Math.PI / 2;
      cas.position.set((xL + xR) / 2, yT - 0.03, z - 0.004);
      add(cas);
      const capMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.35 });
      for (const x of [xL - 0.02, xR + 0.02]) {
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.037, 0.012, 32), capMat);
        cap.rotation.z = Math.PI / 2;
        cap.position.set(x, yT - 0.03, z - 0.004);
        add(cap);
      }
      const barMat = new THREE.MeshStandardMaterial({ color: 0xdedede, metalness: 0.6, roughness: 0.35 });
      const bar = new THREE.Mesh(new THREE.BoxGeometry(xR - xL, 0.018, 0.012), barMat);
      bar.position.set((xL + xR) / 2, yB + 0.007, z);
      add(bar);
      const beads = Math.round((yB + 0.25 - yT) / 0.0065);
      const chain = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0028, 8, 6), new THREE.MeshStandardMaterial({ color: 0xe8e8e8, metalness: 0.7, roughness: 0.3 }), beads);
      const mm = new THREE.Matrix4();
      for (let i = 0; i < beads; i++) chain.setMatrixAt(i, mm.makeTranslation(xR + 0.022, yT + i * 0.0065, z - 0.01));
      add(chain);
      return;
    }

    // ---------- classic panels and/or tulle on a rod ----------
    const ext = 0.16 * WW;
    const L = -ext, R = WW + ext;
    const rodY = -0.07, rodZ = -0.11;
    const yT = rodY + 0.03;
    const bottom = hw * (1 + p.drop);
    const len = bottom - yT;

    // rod, brackets, finials
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, R - L + 0.12, 24), metal);
    rod.rotation.z = Math.PI / 2;
    rod.position.set((L + R) / 2, rodY, rodZ);
    add(rod);
    for (const x of [L - 0.03, R + 0.03]) {
      const fin = new THREE.Mesh(new THREE.SphereGeometry(0.022, 24, 16), metal);
      fin.position.set(x + (x < 0 ? -0.04 : 0.04), rodY, rodZ);
      add(fin);
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, -rodZ, 12), metal);
      br.rotation.x = Math.PI / 2;
      br.position.set(x + (x < 0 ? 0.04 : -0.04), rodY, rodZ / 2);
      add(br);
    }

    const finishes: Record<Finish, { sheen: number; rough: number; sheenRough: number }> = {
      velvet: { sheen: 1, rough: 0.92, sheenRough: 0.42 },
      satin: { sheen: 0.35, rough: 0.5, sheenRough: 0.3 },
      matte: { sheen: 0.18, rough: 0.95, sheenRough: 0.7 },
    };

    // Tulle: full width, fine pleats, see-through, slightly behind the panels.
    const tulleAmt = p.type === 'tulle' ? 0.9 : p.tulle;
    if (tulleAmt > 0.02) {
      const width = R - L;
      const s = 0.1, fabric = width * 2.2, nP = Math.max(6, Math.round(fabric / s)), lam = width / nP;
      const depth = Math.min(0.06, Math.sqrt(Math.max(0, (s / 2) ** 2 - (lam / 2) ** 2)));
      const z0 = rodZ + 0.035;
      const geo = cloth(
        nP * 8,
        50,
        (u, v) => {
          const ph = 2 * Math.PI * nP * u + 0.6 * Math.sin(u * 11.3);
          const amp = depth * (0.8 + 0.2 * smooth(0, 0.06, v));
          const y = yT + v * len + 0.008 * Math.cos(ph) * smooth(0.95, 1, v);
          return [L + u * width, y, z0 - amp * (0.5 + 0.5 * Math.cos(ph))];
        },
        (u, v) => [(u * fabric) / 0.06, (v * len) / 0.06],
      );
      const tint = p.type === 'tulle' ? color : new THREE.Color(1, 1, 1);
      const mat = new THREE.MeshPhysicalMaterial({
        color: tint,
        alphaMap: this.mesh,
        transparent: true,
        opacity: 0.25 + 0.55 * tulleAmt,
        roughness: 0.95,
        sheen: 0.3,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      this.translucency(mat, 0.9, hw);
      const tulle = new THREE.Mesh(geo, mat);
      tulle.renderOrder = 1;
      add(tulle, false);
    }

    if (p.type !== 'classic') return;
    const f = finishes[p.finish ?? 'matte'];
    const pwClosed = (R - L) / 2 + 0.01 * WW;
    const pw = pwClosed + (0.11 * WW - pwClosed) * p.open;
    const s = 0.13; // fabric per pleat
    const fabric = pwClosed * 1.9;
    const nP = Math.max(3, Math.round(fabric / s));
    const fabricMat = () => {
      const m = new THREE.MeshPhysicalMaterial({
        color,
        map: this.weave,
        roughness: f.rough,
        sheen: f.sheen,
        sheenRoughness: f.sheenRough,
        sheenColor: color.clone().lerp(new THREE.Color(1, 1, 1), 0.35),
        side: THREE.DoubleSide,
      });
      this.translucency(m, 0.08 + 0.35 * lum, hw);
      return m;
    };
    for (const dir of [1, -1]) {
      const seed = dir > 0 ? 0.3 : 1.7;
      const geo = cloth(
        nP * 12,
        90,
        (u, v) => {
          const flare = 1 + 0.08 * v * (0.4 + p.open);
          const width = pw * flare;
          const lam = width / nP;
          // accordion depth from constant fabric per pleat; a little irregularity so it looks sewn, not generated
          const depth = Math.min(0.09, Math.sqrt(Math.max(0, (s / 2) ** 2 - (lam / 2) ** 2)));
          // Folds drift a little sideways as they fall, and their depth varies: real cloth, not an accordion.
          const drift = 0.35 * v * Math.sin(2 * Math.PI * 0.9 * u + seed * 2);
          const ph = 2 * Math.PI * nP * u + seed + 0.6 * Math.sin(2 * Math.PI * 1.3 * u + seed * 3) + drift;
          const irregular = 0.7 + 0.3 * Math.sin(2 * Math.PI * (nP / 2.7) * u + seed * 5) * Math.cos(2 * Math.PI * (nP / 4.1) * u + seed);
          const amp = depth * irregular * (0.65 + 0.35 * smooth(0, 0.08, v)) * (1 + 0.2 * v);
          // a softer, rounder profile than a pure cosine, plus one or two big gentle swells
          const c = Math.cos(ph);
          const profile = 0.5 + 0.5 * Math.sign(c) * Math.pow(Math.abs(c), 0.8);
          const swell = 0.018 * Math.sin(2 * Math.PI * 1.6 * u + seed * 4) * (0.4 + 0.6 * v);
          const x = dir > 0 ? L + u * width : R - u * width;
          const y = yT + v * len + 0.01 * c * smooth(0.94, 1, v);
          return [x, y, rodZ + 0.005 - amp * profile - swell];
        },
        (u, v) => [(u * fabric) / 0.3, (v * len) / 0.3],
      );
      add(new THREE.Mesh(geo, fabricMat()));
      // rings over each pleat crest
      const ringMat = metal;
      for (let k = 0; k <= nP; k++) {
        const u = Math.min(1, Math.max(0, (k * 2 * Math.PI - seed) / (2 * Math.PI * nP)));
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.0028, 8, 20), ringMat);
        ring.position.set(dir > 0 ? L + u * pw : R - u * pw, rodY, rodZ);
        add(ring);
      }
    }
  }

  render(corners: Point[], p: Curtain3DParams) {
    const { f, hw, r1, r2, r3, t } = this.pose(corners);
    this.frame(f, hw, r1, r2, r3, t, p, this.roomLight(corners));
  }

  private frame(
    f: number,
    hw: number,
    r1: THREE.Vector3,
    r2: THREE.Vector3,
    r3: THREE.Vector3,
    t: THREE.Vector3,
    p: Curtain3DParams,
    room: { level: number; color: THREE.Color },
  ) {
    const w = this.width, h = this.height;
    const near = 0.05, far = 60;
    this.camera.projectionMatrix.set(
      (2 * f) / w, 0, 1 - (2 * (w / 2)) / w, 0,
      0, (2 * f) / h, (2 * (h / 2)) / h - 1, 0,
      0, 0, -(far + near) / (far - near), (-2 * far * near) / (far - near),
      0, 0, -1, 0,
    );
    this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
    // window space → OpenCV camera → three.js camera (flip y and z)
    this.world.matrix.set(
      r1.x, r2.x, r3.x, t.x,
      -r1.y, -r2.y, -r3.y, -t.y,
      -r1.z, -r2.z, -r3.z, -t.z,
      0, 0, 0, 1,
    );
    this.world.matrixWorldNeedsUpdate = true;

    const key = [p.type, p.color, p.open.toFixed(3), p.tulle.toFixed(3), p.drop.toFixed(3), hw.toFixed(2), p.finish, !!this.fabTex].join('|');
    if (key !== this.buildKey) {
      this.build(p, hw);
      this.buildKey = key;
      if (!this.studio) this.ensureShadowWall(hw);
    }
    for (const tr of this.translucent) if (tr.uniforms.uRes) (tr.uniforms.uRes.value as THREE.Vector2).set(w, h);

    const camPos = new THREE.Vector3(
      -(r1.x * t.x + r1.y * t.y + r1.z * t.z),
      -(r2.x * t.x + r2.y * t.y + r2.z * t.z),
      -(r3.x * t.x + r3.y * t.y + r3.z * t.z),
    );
    this.key.position.copy(camPos).add(new THREE.Vector3(-0.6, -1.4, 0));
    this.key.target.position.set(WW / 2, hw / 2, 0);
    const sc = this.key.shadow.camera;
    sc.left = -WW;
    sc.right = WW;
    sc.top = hw + 0.6;
    sc.bottom = -hw - 0.6;
    sc.near = 0.1;
    sc.far = camPos.length() + 6;
    sc.updateProjectionMatrix();
    this.key.intensity = 1.5 * room.level;
    this.key.color.copy(room.color);
    this.hemi.intensity = 0.7 * room.level;
    this.hemi.color.copy(room.color);
    this.hemi.groundColor.copy(room.color).multiplyScalar(0.55);
    this.scene.environmentIntensity = 0.55 * room.level;

    this.ovMat.uniforms.uAlpha.value = p.alpha ?? 1;
    this.r.clear();
    if (this.studio) {
      this.r.render(this.scene, this.camera);
      return;
    }
    this.r.render(this.bgScene, this.ortho);
    this.r.render(this.scene, this.camera);
    this.r.render(this.ovScene, this.ortho);
  }

  // ---------------- showroom: a virtual room to turn the curtain around ----------------
  private studio: THREE.Group | null = null;
  private studioHw = 1.5;

  /** Switches this renderer to a virtual room (product page), sized to the canvas' CSS box. */
  setStudio(cssW: number, cssH: number) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.width = Math.round(cssW * dpr);
    this.height = Math.round(cssH * dpr);
    this.r.setSize(this.width, this.height, false);
    this.r.setClearColor(0xe9e3d8, 1);
    if (this.studio) return;
    const hw = this.studioHw;
    const g = new THREE.Group();
    // wall with the window opening
    const wallShape = new THREE.Shape();
    wallShape.moveTo(-4, -3);
    wallShape.lineTo(WW + 4, -3);
    wallShape.lineTo(WW + 4, hw + 0.95);
    wallShape.lineTo(-4, hw + 0.95);
    wallShape.lineTo(-4, -3);
    const hole = new THREE.Path();
    hole.moveTo(0, 0);
    hole.lineTo(0, hw);
    hole.lineTo(WW, hw);
    hole.lineTo(WW, 0);
    hole.lineTo(0, 0);
    wallShape.holes.push(hole);
    const wall = new THREE.Mesh(new THREE.ShapeGeometry(wallShape), new THREE.MeshStandardMaterial({ color: 0xece5d9, roughness: 0.95, side: THREE.DoubleSide }));
    wall.receiveShadow = true;
    g.add(wall);
    // daylight outside: a soft sky gradient behind the glass
    const sky = document.createElement('canvas');
    sky.width = 4;
    sky.height = 128;
    const sc = sky.getContext('2d')!;
    const grad = sc.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, '#cfe3f5');
    grad.addColorStop(0.65, '#f4f8fb');
    grad.addColorStop(1, '#e6efe2');
    sc.fillStyle = grad;
    sc.fillRect(0, 0, 4, 128);
    const skyTex = new THREE.CanvasTexture(sky);
    skyTex.colorSpace = THREE.SRGBColorSpace;
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(WW, hw), new THREE.MeshBasicMaterial({ map: skyTex, toneMapped: false }));
    glass.position.set(WW / 2, hw / 2, 0.08);
    glass.rotation.x = Math.PI; // our y points down
    g.add(glass);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.4 });
    const bar = (w: number, h: number, x: number, y: number, z = 0.05, d = 0.06) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), frameMat);
      m.position.set(x, y, z);
      m.castShadow = m.receiveShadow = true;
      g.add(m);
    };
    bar(WW + 0.1, 0.06, WW / 2, -0.02);
    bar(WW + 0.1, 0.06, WW / 2, hw + 0.02);
    bar(0.06, hw, -0.02, hw / 2);
    bar(0.06, hw, WW + 0.02, hw / 2);
    bar(0.04, hw, WW / 2, hw / 2, 0.06, 0.04);
    bar(WW + 0.22, 0.035, WW / 2, hw + 0.06, -0.03, 0.18); // sill
    // floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), new THREE.MeshStandardMaterial({ color: 0xb08a63, roughness: 0.7 }));
    floor.rotation.x = Math.PI / 2;
    floor.position.set(WW / 2, hw + 0.95, -2.5);
    floor.receiveShadow = true;
    g.add(floor);
    this.world.add(g);
    this.studio = g;
    this.scene.environment = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    // gentle daylight "behind the cloth"
    const white = new THREE.DataTexture(new Uint8Array([235, 242, 250, 255]), 1, 1);
    white.colorSpace = THREE.SRGBColorSpace;
    white.needsUpdate = true;
    this.photoTex = white;
    this.buildKey = '';
  }

  /** Renders the showroom from an orbit angle (radians) around the window. */
  renderStudio(yaw: number, pitch: number, p: Curtain3DParams) {
    const hw = this.studioHw;
    const c = new THREE.Vector3(WW / 2, hw * 0.62, 0);
    const d = 3.4;
    const cam = new THREE.Vector3(
      c.x + d * Math.sin(yaw) * Math.cos(pitch),
      c.y - d * Math.sin(pitch),
      c.z - d * Math.cos(yaw) * Math.cos(pitch),
    );
    const fwd = c.clone().sub(cam).normalize();
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), fwd).normalize();
    const down = new THREE.Vector3().crossVectors(fwd, right).normalize();
    // rows of R are the camera axes; frame() wants its columns
    const r1 = new THREE.Vector3(right.x, down.x, fwd.x);
    const r2 = new THREE.Vector3(right.y, down.y, fwd.y);
    const r3 = new THREE.Vector3(right.z, down.z, fwd.z);
    const t = new THREE.Vector3(-right.dot(cam), -down.dot(cam), -fwd.dot(cam));
    this.frame(0.95 * this.height, hw, r1, r2, r3, t, p, { level: 1, color: new THREE.Color(1, 0.98, 0.95) });
  }

  /** An invisible wall around the window that only shows the curtains' soft shadows. */
  private ensureShadowWall(hw: number) {
    if (this.shadowWall) {
      this.world.remove(this.shadowWall);
      this.shadowWall.geometry.dispose();
    }
    const s = new THREE.Shape();
    s.moveTo(-0.9, -0.6);
    s.lineTo(WW + 0.9, -0.6);
    s.lineTo(WW + 0.9, hw * 1.8);
    s.lineTo(-0.9, hw * 1.8);
    s.lineTo(-0.9, -0.6);
    const hole = new THREE.Path();
    hole.moveTo(0, 0);
    hole.lineTo(0, hw);
    hole.lineTo(WW, hw);
    hole.lineTo(WW, 0);
    hole.lineTo(0, 0);
    s.holes.push(hole);
    const wall = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.ShadowMaterial({ opacity: 0.3, side: THREE.DoubleSide }));
    wall.receiveShadow = true;
    wall.frustumCulled = false;
    this.shadowWall = wall;
    this.world.add(wall);
  }
}
