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
uniform float uOpen;
uniform float uTulle;
uniform float uDrop;
uniform float uAspect;
uniform int uType;

float cover(float d, float w) { return clamp(0.5 + d / max(w, 1e-5), 0.0, 1.0); }

// Mirrored repeat makes the fold photo tile without visible seams.
float fold(vec2 st) {
  float x = abs(fract(st.x * 0.5) * 2.0 - 1.0);
  return texture2D(uFold, vec2(x, clamp(st.y, 0.002, 0.998))).r;
}

vec3 screenBlend(vec3 a, vec3 b) { return 1.0 - (1.0 - a) * (1.0 - b); }

vec3 metal(float t) {
  vec3 c = mix(vec3(0.97, 0.87, 0.58), vec3(0.50, 0.37, 0.12), smoothstep(0.0, 1.0, t));
  return c + vec3(0.25, 0.2, 0.1) * exp(-pow((t - 0.28) * 9.0, 2.0));
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uSize.y - gl_FragCoord.y);
  vec3 col = texture2D(uPhoto, px / uSize).rgb;

  vec3 q = uHinv * vec3(px, 1.0);
  vec2 w = q.xy / q.z;
  ${deriv ? 'vec2 fw = fwidth(w);' : 'vec2 fw = vec2(0.003);'}

  // Light coming through the window glass, used for a soft back-lit look.
  float inWin = cover(min(w.x, 1.0 - w.x), fw.x) * cover(min(w.y, 1.0 - w.y), fw.y);

  if (uType == 2) {
    // ---------- Roller blind ----------
    float L = -0.03, R = 1.03;
    float top = -0.02;
    float bottom = mix(1.0, 0.06, uOpen);
    float inX = min(w.x - L, R - w.x);
    float cy = cover(min(w.y - top, bottom - w.y), fw.y);
    float cx = cover(inX, fw.x);
    float weave = fold(vec2(w.x * 2.4, w.y * 0.15));
    vec3 fab = uColor * (0.86 + 0.14 * weave);
    fab = mix(fab, fab * 0.82, smoothstep(bottom - 0.035, bottom, w.y));
    fab += uColor * 0.10 * inWin;
    col = mix(col, fab, cx * cy);
    // cassette
    float ct = -0.085, cb = -0.02;
    float cc = cover(min(w.y - ct, cb - w.y), fw.y) * cover(min(w.x - (L - 0.01), (R + 0.01) - w.x), fw.x);
    float t = (w.y - ct) / (cb - ct);
    vec3 cas = mix(vec3(0.97), vec3(0.74), t) * mix(vec3(1.0), uColor, 0.25);
    col = mix(col, cas, cc);
    // bottom bar
    float bb = cover(min(w.y - (bottom - 0.012), (bottom + 0.008) - w.y), fw.y) * cx;
    col = mix(col, vec3(0.82, 0.82, 0.84) * mix(vec3(1.0), uColor, 0.35), bb);
    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
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
  float covY = cover(min(w.y - T, B - w.y), fw.y);

  // ---------- Tulle ----------
  float tulleAmt = uType == 1 ? 0.9 : uTulle;
  if (tulleAmt > 0.001) {
    float cov = cover(min(w.x - L, R - w.x), fw.x) * covY;
    float f = fold(vec2((w.x - L) * 0.62, vy));
    vec3 tint = uType == 1 ? uColor : vec3(1.0);
    vec3 sheer = screenBlend(col, tint * (0.30 + 0.70 * f) * tulleAmt * 0.82);
    sheer = mix(sheer, sheer * (0.9 + 0.1 * f), 0.5);
    col = mix(col, sheer, cov);
  }

  // ---------- Two curtain panels ----------
  if (uType == 0) {
    float pw = mix(0.5 + ext + 0.01, 0.11, uOpen);
    float dl = min(w.x - L, (L + pw) - w.x);
    float dr = min(w.x - (R - pw), R - w.x);

    // soft shadow cast on the wall next to each panel's inner edge
    float shL = (1.0 - smoothstep(0.0, 0.06, (w.x - (L + pw)))) * step(L + pw, w.x);
    float shR = (1.0 - smoothstep(0.0, 0.06, ((R - pw) - w.x))) * step(w.x, R - pw);
    col *= 1.0 - 0.28 * max(shL, shR) * covY * (1.0 - inWin * 0.6);

    float foldsPerPanel = 0.30;
    // left
    float ul = clamp((w.x - L) / pw, 0.0, 1.0);
    float fl = fold(vec2(ul * foldsPerPanel * (0.6 + 0.4 / max(pw, 0.11) * 0.2), vy));
    float shadeL = 0.70 + 0.30 * smoothstep(0.0, 0.14, 1.0 - ul);
    // right
    float ur = clamp((R - w.x) / pw, 0.0, 1.0);
    float fr = fold(vec2(ur * foldsPerPanel * (0.6 + 0.4 / max(pw, 0.11) * 0.2) + 0.37, vy));
    float shadeR = 0.70 + 0.30 * smoothstep(0.0, 0.14, 1.0 - ur);

    // gathered shadow under the rod + gentle top-to-bottom light falloff
    float top = mix(0.78, 1.0, smoothstep(0.0, 0.05, vy)) * mix(1.06, 0.86, vy);
    float hem = mix(1.0, 0.8, smoothstep(0.985, 1.0, vy));
    vec3 back = uColor * 0.16 * inWin;

    vec3 fabL = uColor * (0.22 + 0.88 * fl) * shadeL * top * hem + back;
    vec3 fabR = uColor * (0.22 + 0.88 * fr) * shadeR * top * hem + back;
    col = mix(col, fabL, cover(dl, fw.x) * covY);
    col = mix(col, fabR, cover(dr, fw.x) * covY);
  }

  // ---------- Rod with finials ----------
  float rl = L - 0.035, rr = R + 0.035;
  float rodCov = cover(min(w.x - rl, rr - w.x), fw.x) * cover(min(w.y - (rodY - rodH * 0.5), (rodY + rodH * 0.5) - w.y), fw.y);
  col = mix(col, metal((w.y - (rodY - rodH * 0.5)) / rodH), rodCov);
  float r = rodH * 0.95;
  vec2 dL = vec2((w.x - (rl - r * 0.6)) * uAspect, w.y - rodY);
  vec2 dR = vec2((w.x - (rr + r * 0.6)) * uAspect, w.y - rodY);
  float fwr = max(fw.y, fw.x * uAspect);
  float finL = cover(r - length(dL), fwr);
  float finR = cover(r - length(dR), fwr);
  col = mix(col, metal(0.5 + dL.y / (2.0 * r)), finL);
  col = mix(col, metal(0.5 + dR.y / (2.0 * r)), finR);

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
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

    for (const n of ['uPhoto', 'uFold', 'uHinv', 'uSize', 'uColor', 'uOpen', 'uTulle', 'uDrop', 'uAspect', 'uType']) {
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
