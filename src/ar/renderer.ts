import type { CurtainType } from '../data/products';
import { invert, squareToQuad, toColumnMajor, type Point } from './homography';

export interface CurtainParams {
  type: CurtainType;
  color: string;
  /** 0 = closed, 1 = open. */
  open: number;
  /** Tulle strength 0..1 (classic only). */
  tulle: number;
  /** Extra length below the window, in window heights. */
  drop: number;
  /** Curtain opacity over the photo; below 1 while the corners are being placed. Default 1. */
  alpha?: number;
}

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

// Everything is computed per pixel in "window space": u runs 0..1 across the window,
// v runs 0..1 from its top edge to its bottom edge. The inverse homography maps every
// photo pixel into that space, so the curtain follows the window's perspective exactly.
const FRAG = (deriv: boolean) => `
${deriv ? '#extension GL_OES_standard_derivatives : enable' : ''}
precision highp float;
uniform sampler2D uPhoto;
uniform sampler2D uFold;
uniform mat3 uHinv;
uniform vec2 uSize;
uniform vec3 uColor;
uniform vec3 uLight;   // room light around the window (level + tint), measured from the photo
uniform float uOpen;
uniform float uTulle;
uniform float uDrop;
uniform float uAspect;
uniform float uAlpha;  // < 1 while the corners are being placed
uniform int uType;

float cover(float d, float w) { return clamp(0.5 + d / max(w, 1e-5), 0.0, 1.0); }

// Mirrored repeat makes the fold photo tile without visible seams.
float fold(vec2 st) {
  float x = abs(fract(st.x * 0.5) * 2.0 - 1.0);
  return texture2D(uFold, vec2(x, clamp(st.y, 0.002, 0.998))).r;
}

vec3 toLin(vec3 c) { return pow(max(c, 0.0), vec3(2.2)); }
vec3 toSrgb(vec3 c) { return pow(max(c, 0.0), vec3(1.0 / 2.2)); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec3 screenBlend(vec3 a, vec3 b) { return 1.0 - (1.0 - a) * (1.0 - b); }

vec3 metal(float t) {
  vec3 c = mix(vec3(0.97, 0.87, 0.58), vec3(0.50, 0.37, 0.12), smoothstep(0.0, 1.0, t));
  return c + vec3(0.25, 0.2, 0.1) * exp(-pow((t - 0.28) * 9.0, 2.0));
}

// Fabric shading in linear light: soft diffuse folds, a velvet-like sheen on the ridges,
// light from the window glowing through thinner/lighter cloth, and a little grain.
vec3 fabric(float f, float shade, vec3 albedo, vec3 behind, float thin, vec2 px) {
  float diffuse = 0.18 + 0.95 * pow(f, 1.35);
  float sheen = pow(f, 7.0) * 0.32;
  vec3 lin = albedo * diffuse * shade * uLight
           + sheen * mix(albedo, vec3(1.0), 0.45) * uLight
           + behind * albedo * thin * (0.35 + 0.65 * f);
  lin *= 0.965 + 0.07 * hash(floor(px));
  return toSrgb(lin);
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uSize.y - gl_FragCoord.y);
  vec3 photo = texture2D(uPhoto, px / uSize).rgb;
  vec3 col = photo;
  vec3 photoLin = toLin(photo);

  vec3 q = uHinv * vec3(px, 1.0);
  vec2 w = q.xy / q.z;
  ${deriv ? 'vec2 fw = fwidth(w);' : 'vec2 fw = vec2(0.003);'}

  vec3 albedo = toLin(uColor);
  float lum = dot(uColor, vec3(0.2126, 0.7152, 0.0722));
  // Light cloth lets more daylight through than dark, dense cloth.
  float thin = 0.08 + 0.42 * lum * lum;
  float inWin = cover(min(w.x, 1.0 - w.x), fw.x) * cover(min(w.y, 1.0 - w.y), fw.y);
  vec3 behind = photoLin * inWin;

  if (uType == 2) {
    // ---------- Roller blind ----------
    float L = -0.03, R = 1.03;
    float top = -0.02;
    float bottom = mix(1.0, 0.06, uOpen);
    float cy = cover(min(w.y - top, bottom - w.y), fw.y);
    float cx = cover(min(w.x - L, R - w.x), fw.x);
    float weave = fold(vec2(w.x * 2.4, w.y * 0.15));
    float f = 0.82 + 0.12 * weave;
    float shade = mix(1.0, 0.84, smoothstep(bottom - 0.04, bottom, w.y)) * mix(1.03, 0.94, w.y);
    vec3 fab = fabric(f, shade, albedo, behind, thin + 0.15, px);
    col = mix(col, fab, cx * cy);
    float ct = -0.085, cb = -0.02;
    float cc = cover(min(w.y - ct, cb - w.y), fw.y) * cover(min(w.x - (L - 0.01), (R + 0.01) - w.x), fw.x);
    float t = (w.y - ct) / (cb - ct);
    vec3 cas = mix(vec3(0.97), vec3(0.72), t) * mix(vec3(1.0), uColor, 0.25) * clamp(uLight, 0.4, 1.15);
    col = mix(col, cas, cc);
    float bb = cover(min(w.y - (bottom - 0.012), (bottom + 0.008) - w.y), fw.y) * cx;
    col = mix(col, vec3(0.8) * mix(vec3(1.0), uColor, 0.35) * clamp(uLight, 0.4, 1.15), bb);
    gl_FragColor = vec4(mix(photo, clamp(col, 0.0, 1.0), uAlpha), 1.0);
    return;
  }

  float ext = 0.16;
  float L = -ext, R = 1.0 + ext;
  float rodY = -0.085;
  float rodH = 0.012 * uAspect + 0.008;
  float T = rodY + rodH * 0.4;
  float B = 1.0 + uDrop;
  float H = B - T;
  float vy = (w.y - T) / H;

  // ---------- Tulle ----------
  float tulleAmt = uType == 1 ? 0.9 : uTulle;
  if (tulleAmt > 0.001) {
    float u = (w.x - L) / (R - L);
    float f = fold(vec2(u * 0.82 * (1.0 + 0.12 * vy), vy));
    float hem = B + 0.012 * (fold(vec2(u * 0.82 * 1.12, 0.99)) - 0.5);
    float cov = cover(min(w.x - L, R - w.x), fw.x) * cover(min(w.y - T, hem - w.y), fw.y);
    vec3 tint = uType == 1 ? uColor : vec3(1.0);
    vec3 veil = tint * (0.28 + 0.72 * f) * tulleAmt * 0.8 * clamp(uLight, 0.35, 1.1);
    vec3 sheer = screenBlend(col, veil);
    // a sheer softens what is behind it
    sheer = mix(sheer, vec3(dot(sheer, vec3(0.333))), 0.12 * tulleAmt);
    col = mix(col, sheer, cov);
  }

  // ---------- Two curtain panels ----------
  if (uType == 0) {
    float pw = mix(0.5 + ext + 0.01, 0.11, uOpen);
    // panels hang slightly wider at the hem than at the rod
    float pwy = pw * (1.0 + 0.09 * smoothstep(0.0, 1.0, vy) * (0.5 + uOpen));
    // the more a panel is gathered, the denser its folds
    float k = 0.30 * (0.6 + 0.08 / max(pw, 0.11));

    float ul = (w.x - L) / pwy;
    float ur = (R - w.x) / pwy;
    float fl = fold(vec2(clamp(ul, 0.0, 1.0) * k, vy));
    float fr = fold(vec2(clamp(ur, 0.0, 1.0) * k + 0.37, vy));
    // wavy hem: ridges that come forward hang a little lower
    float hemL = B + 0.016 * (fold(vec2(clamp(ul, 0.0, 1.0) * k, 0.99)) - 0.55);
    float hemR = B + 0.016 * (fold(vec2(clamp(ur, 0.0, 1.0) * k + 0.37, 0.99)) - 0.55);

    // soft shadow on the wall beside each panel's inner edge
    float covY = cover(min(w.y - T, B - w.y), fw.y);
    float shL = (1.0 - smoothstep(0.0, 0.06, w.x - (L + pwy))) * step(L + pwy, w.x);
    float shR = (1.0 - smoothstep(0.0, 0.06, (R - pwy) - w.x)) * step(w.x, R - pwy);
    col *= 1.0 - 0.26 * max(shL, shR) * covY * (1.0 - inWin * 0.7);

    float gather = mix(0.72, 1.0, smoothstep(0.0, 0.05, vy)) * mix(1.05, 0.84, vy);
    float hemDark = mix(1.0, 0.82, smoothstep(0.975, 1.0, vy));
    float shadeL = gather * hemDark * mix(0.7, 1.0, smoothstep(0.0, 0.14, 1.0 - ul)) * mix(0.86, 1.0, smoothstep(0.0, 0.1, ul));
    float shadeR = gather * hemDark * mix(0.7, 1.0, smoothstep(0.0, 0.14, 1.0 - ur)) * mix(0.86, 1.0, smoothstep(0.0, 0.1, ur));

    vec3 fabL = fabric(fl, shadeL, albedo, behind, thin, px);
    vec3 fabR = fabric(fr, shadeR, albedo, behind, thin, px + 17.0);
    float cl = cover(min(w.x - L, (L + pwy) - w.x), fw.x) * cover(min(w.y - T, hemL - w.y), fw.y);
    float cr = cover(min(w.x - (R - pwy), R - w.x), fw.x) * cover(min(w.y - T, hemR - w.y), fw.y);
    col = mix(col, fabL, cl);
    col = mix(col, fabR, cr);
  }

  // ---------- Rod with finials ----------
  vec3 rodLight = clamp(uLight, 0.45, 1.15);
  float rl = L - 0.035, rr = R + 0.035;
  float rodCov = cover(min(w.x - rl, rr - w.x), fw.x) * cover(min(w.y - (rodY - rodH * 0.5), (rodY + rodH * 0.5) - w.y), fw.y);
  col = mix(col, metal((w.y - (rodY - rodH * 0.5)) / rodH) * rodLight, rodCov);
  float r = rodH * 0.95;
  vec2 dL = vec2((w.x - (rl - r * 0.6)) * uAspect, w.y - rodY);
  vec2 dR = vec2((w.x - (rr + r * 0.6)) * uAspect, w.y - rodY);
  float fwr = max(fw.y, fw.x * uAspect);
  col = mix(col, metal(0.5 + dL.y / (2.0 * r)) * rodLight, cover(r - length(dL), fwr));
  col = mix(col, metal(0.5 + dR.y / (2.0 * r)) * rodLight, cover(r - length(dR), fwr));

  gl_FragColor = vec4(mix(photo, clamp(col, 0.0, 1.0), uAlpha), 1.0);
}
`;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export class CurtainRenderer {
  readonly canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private prog: WebGLProgram;
  private photoTex: WebGLTexture;
  private foldTex: WebGLTexture;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private width = 1;
  private height = 1;
  /** Small linear-light copy of the photo used to measure the room light around the window. */
  private probe: { data: Float32Array; w: number; h: number } | null = null;
  private lightKey = '';
  private light: [number, number, number] = [1, 1, 1];

  /** Throws when WebGL is unavailable. */
  constructor(canvas: HTMLCanvasElement, fold: HTMLImageElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
    if (!gl) throw new Error('WebGL mavjud emas');
    this.gl = gl;
    const deriv = !!gl.getExtension('OES_standard_derivatives');

    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG(deriv)));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link');
    this.prog = prog;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    for (const n of ['uPhoto', 'uFold', 'uHinv', 'uSize', 'uColor', 'uLight', 'uOpen', 'uTulle', 'uDrop', 'uAspect', 'uAlpha', 'uType']) {
      this.u[n] = gl.getUniformLocation(prog, n);
    }
    this.photoTex = this.texture(0);
    this.foldTex = this.texture(1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fold);
    gl.uniform1i(this.u.uPhoto, 0);
    gl.uniform1i(this.u.uFold, 1);
  }

  private texture(unit: number) {
    const gl = this.gl;
    const t = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return t;
  }

  setPhoto(photo: HTMLCanvasElement) {
    const gl = this.gl;
    this.width = photo.width;
    this.height = photo.height;
    this.canvas.width = photo.width;
    this.canvas.height = photo.height;
    gl.viewport(0, 0, photo.width, photo.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.photoTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, photo);

    const pw = 96, ph = Math.max(8, Math.round((96 * photo.height) / photo.width));
    const c = document.createElement('canvas');
    c.width = pw;
    c.height = ph;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(photo, 0, 0, pw, ph);
    const d = ctx.getImageData(0, 0, pw, ph).data;
    const data = new Float32Array(pw * ph * 3);
    for (let i = 0; i < pw * ph; i++)
      for (let ch = 0; ch < 3; ch++) data[i * 3 + ch] = Math.pow(d[i * 4 + ch] / 255, 2.2);
    this.probe = { data, w: pw, h: ph };
    this.lightKey = '';
  }

  /**
   * Room light falling on the curtain: the average colour of the wall in a ring around the window,
   * turned into a brightness level and a mild colour tint. A dim, warm room gives a dimmer, warmer curtain.
   */
  private roomLight(corners: Point[]): [number, number, number] {
    const key = corners.map((c) => `${Math.round(c.x / 8)},${Math.round(c.y / 8)}`).join(';');
    if (key === this.lightKey || !this.probe) return this.light;
    this.lightKey = key;
    const { data, w, h } = this.probe;
    const M = squareToQuad(corners);
    const sx = w / this.width, sy = h / this.height;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i <= 16; i++) {
      const t = -0.2 + (1.4 * i) / 16;
      for (const [u, v] of [[t, -0.18], [t, 1.15], [-0.22, t], [1.22, t]]) {
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
    if (!n) return (this.light = [1, 1, 1]);
    r /= n;
    g /= n;
    b /= n;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const level = Math.max(0.32, Math.min(1.2, 0.35 + lum * 1.25));
    const tint = (c: number) => 1 + (Math.max(0.75, Math.min(1.3, c / Math.max(lum, 0.02))) - 1) * 0.55;
    this.light = [tint(r) * level, tint(g) * level, tint(b) * level];
    return this.light;
  }

  render(corners: Point[], p: CurtainParams) {
    const gl = this.gl;
    const H = squareToQuad(corners);
    gl.useProgram(this.prog);
    gl.uniformMatrix3fv(this.u.uHinv, false, toColumnMajor(invert(H)));
    gl.uniform2f(this.u.uSize, this.width, this.height);
    gl.uniform3fv(this.u.uColor, hexToRgb(p.color));
    gl.uniform1f(this.u.uOpen, p.open);
    gl.uniform1f(this.u.uTulle, p.tulle);
    gl.uniform1f(this.u.uDrop, p.drop);
    gl.uniform1f(this.u.uAlpha, p.alpha ?? 1);
    gl.uniform3fv(this.u.uLight, this.roomLight(corners));
    const wpx = (Math.hypot(corners[1].x - corners[0].x, corners[1].y - corners[0].y) + Math.hypot(corners[2].x - corners[3].x, corners[2].y - corners[3].y)) / 2;
    const hpx = (Math.hypot(corners[3].x - corners[0].x, corners[3].y - corners[0].y) + Math.hypot(corners[2].x - corners[1].x, corners[2].y - corners[1].y)) / 2;
    gl.uniform1f(this.u.uAspect, wpx / Math.max(hpx, 1));
    gl.uniform1i(this.u.uType, p.type === 'classic' ? 0 : p.type === 'tulle' ? 1 : 2);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.photoTex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.foldTex);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}

let foldImage: Promise<HTMLImageElement> | null = null;
/** Fabric fold texture, loaded once and cached. */
export function loadFold(): Promise<HTMLImageElement> {
  if (!foldImage) {
    foldImage = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        foldImage = null;
        reject(new Error('Tekstura yuklanmadi'));
      };
      img.src = 'images/folds.webp';
    });
  }
  return foldImage;
}
