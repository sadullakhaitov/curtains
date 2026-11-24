import{s as L,t as _,a as D}from"./homography-CZPP2D1A.js";const U=`
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`,S=n=>`
${n?"#extension GL_OES_standard_derivatives : enable":""}
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
uniform sampler2D uOcc; // things standing in front of the curtain (furniture, plants)
uniform sampler2D uTex; // photo texture of the real fabric (zebra blinds); alpha = opacity
uniform float uHasTex;
uniform float uTexAspect; // texture height / width
uniform float uHasOcc;
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
  ${n?"vec2 fw = fwidth(w);":"vec2 fw = vec2(0.003);"}

  vec3 albedo = toLin(uColor);
  float lum = dot(uColor, vec3(0.2126, 0.7152, 0.0722));
  // Light cloth lets more daylight through than dark, dense cloth.
  float thin = 0.08 + 0.42 * lum * lum;
  float inWin = cover(min(w.x, 1.0 - w.x), fw.x) * cover(min(w.y, 1.0 - w.y), fw.y);
  vec3 behind = photoLin * inWin;

  if (uType == 3) {
    // ---------- Zebra (day–night) blind from a real fabric photo ----------
    float L = -0.04, R = 1.04;
    float top = -0.012;
    float bottom = mix(1.03, 0.09, uOpen);
    float cx = cover(min(w.x - L, R - w.x), fw.x);
    float cy = cover(min(w.y - top, bottom - w.y), fw.y);
    // The photo spans the blind's width and repeats downwards; it is anchored to the bottom bar,
    // so the pattern rolls up with the fabric.
    float tileV = uTexAspect * (R - L) * max(uAspect, 0.05);
    float s = clamp((w.x - L) / (R - L), 0.002, 0.998);
    vec4 tex = texture2D(uTex, vec2(s, fract((w.y - bottom) / tileV + 64.0)));
    vec3 alb = toLin(tex.rgb * uColor);
    // Day–night: sheer bands let more daylight through by day, the layers close up by night.
    float sheerA = mix(0.42, 0.94, uTulle);
    float a = mix(sheerA, 1.0, smoothstep(0.62, 0.95, tex.a));
    float shade = mix(1.02, 0.92, clamp(w.y, 0.0, 1.0)) * mix(1.0, 0.86, smoothstep(bottom - 0.03, bottom, w.y));
    vec3 lit = alb * mix(vec3(1.0), uLight, 0.8) * shade + behind * alb * (1.0 - a) * 0.9;
    lit *= 0.975 + 0.05 * hash(floor(px));
    vec3 fab = toSrgb(lit);
    col = mix(col, mix(col, fab, a), cx * cy * uHasTex);

    // weighted bottom bar
    float bb = cover(min(w.y - (bottom - 0.004), (bottom + 0.016) - w.y), fw.y) * cx;
    float bt = clamp((w.y - (bottom - 0.004)) / 0.02, 0.0, 1.0);
    col = mix(col, mix(vec3(0.93), vec3(0.66), bt) * clamp(uLight, 0.45, 1.15), bb);

    // cassette wrapped in the same fabric, with rounded shading and white end caps
    float ct = -0.085, cb = top + 0.004;
    float ccov = cover(min(w.y - ct, cb - w.y), fw.y) * cover(min(w.x - (L - 0.012), (R + 0.012) - w.x), fw.x);
    float ctt = clamp((w.y - ct) / (cb - ct), 0.0, 1.0);
    vec4 ctex = texture2D(uTex, vec2(s, 0.08 + ctt * 0.25));
    float round_ = 0.62 + 0.45 * sin(3.14159 * (0.15 + 0.8 * ctt));
    vec3 cas = toSrgb(toLin(ctex.rgb * uColor) * round_ * mix(vec3(1.0), uLight, 0.8)) + vec3(0.12) * exp(-pow((ctt - 0.25) * 7.0, 2.0));
    col = mix(col, cas, ccov * uHasTex);
    float cap = ccov * (1.0 - cover(min(w.x - (L + 0.004), (R - 0.004) - w.x), fw.x));
    col = mix(col, mix(vec3(0.96), vec3(0.78), ctt) * clamp(uLight, 0.45, 1.15), cap);

    // bead chain on the right
    float chx = (w.x - (R + 0.02)) * uAspect;
    float chain = step(ct, w.y) * step(w.y, bottom + 0.22);
    float bead = 0.5 + 0.5 * cos(w.y * 260.0);
    float chCov = cover(0.0045 * (0.6 + 0.4 * bead) - abs(chx), fw.x * uAspect) * chain;
    col = mix(col, mix(vec3(0.55), vec3(0.95), bead) * clamp(uLight, 0.45, 1.15), chCov);

    float occ3 = uHasOcc > 0.5 ? smoothstep(0.35, 0.65, texture2D(uOcc, px / uSize).r) : 0.0;
    col = mix(col, photo, occ3);
    gl_FragColor = vec4(mix(photo, clamp(col, 0.0, 1.0), uAlpha), 1.0);
    return;
  }

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
    float occ = uHasOcc > 0.5 ? smoothstep(0.35, 0.65, texture2D(uOcc, px / uSize).r) : 0.0;
    col = mix(col, photo, occ);
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

  float occ = uHasOcc > 0.5 ? smoothstep(0.35, 0.65, texture2D(uOcc, px / uSize).r) : 0.0;
    col = mix(col, photo, occ);
    gl_FragColor = vec4(mix(photo, clamp(col, 0.0, 1.0), uAlpha), 1.0);
}
`;function N(n){const o=parseInt(n.replace("#",""),16);return[(o>>16&255)/255,(o>>8&255)/255,(o&255)/255]}class M{constructor(o,e){this.hasOcc=!1,this.texSrc=null,this.texAspect=1,this.u={},this.width=1,this.height=1,this.probe=null,this.lightKey="",this.light=[1,1,1],this.canvas=o;const t=o.getContext("webgl",{antialias:!1,premultipliedAlpha:!1,preserveDrawingBuffer:!1});if(!t)throw new Error("WebGL mavjud emas");this.gl=t;const i=!!t.getExtension("OES_standard_derivatives"),l=(a,s)=>{const h=t.createShader(a);if(t.shaderSource(h,s),t.compileShader(h),!t.getShaderParameter(h,t.COMPILE_STATUS))throw new Error(t.getShaderInfoLog(h)||"shader");return h},r=t.createProgram();if(t.attachShader(r,l(t.VERTEX_SHADER,U)),t.attachShader(r,l(t.FRAGMENT_SHADER,S(i))),t.linkProgram(r),!t.getProgramParameter(r,t.LINK_STATUS))throw new Error(t.getProgramInfoLog(r)||"link");this.prog=r,t.useProgram(r);const c=t.createBuffer();t.bindBuffer(t.ARRAY_BUFFER,c),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),t.STATIC_DRAW);const f=t.getAttribLocation(r,"aPos");t.enableVertexAttribArray(f),t.vertexAttribPointer(f,2,t.FLOAT,!1,0,0);for(const a of["uPhoto","uFold","uHinv","uSize","uColor","uLight","uOpen","uTulle","uDrop","uAspect","uAlpha","uType","uOcc","uHasOcc","uTex","uHasTex","uTexAspect"])this.u[a]=t.getUniformLocation(r,a);this.photoTex=this.texture(0),this.foldTex=this.texture(1),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,t.RGBA,t.UNSIGNED_BYTE,e),this.occTex=this.texture(2),t.texImage2D(t.TEXTURE_2D,0,t.LUMINANCE,1,1,0,t.LUMINANCE,t.UNSIGNED_BYTE,new Uint8Array([0])),this.fabTex=this.texture(3),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,1,1,0,t.RGBA,t.UNSIGNED_BYTE,new Uint8Array([200,200,200,255])),t.uniform1i(this.u.uPhoto,0),t.uniform1i(this.u.uFold,1),t.uniform1i(this.u.uOcc,2),t.uniform1i(this.u.uTex,3)}texture(o){const e=this.gl,t=e.createTexture();return e.activeTexture(e.TEXTURE0+o),e.bindTexture(e.TEXTURE_2D,t),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),t}setPhoto(o){const e=this.gl;this.width=o.width,this.height=o.height,this.canvas.width=o.width,this.canvas.height=o.height,e.viewport(0,0,o.width,o.height),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,this.photoTex),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,o);const t=96,i=Math.max(8,Math.round(96*o.height/o.width)),l=document.createElement("canvas");l.width=t,l.height=i;const r=l.getContext("2d",{willReadFrequently:!0});r.drawImage(o,0,0,t,i);const c=r.getImageData(0,0,t,i).data,f=new Float32Array(t*i*3);for(let a=0;a<t*i;a++)for(let s=0;s<3;s++)f[a*3+s]=Math.pow(c[a*4+s]/255,2.2);this.probe={data:f,w:t,h:i},this.lightKey=""}setFabricTexture(o){if(o===this.texSrc||(this.texSrc=o,!o))return;const e=this.gl;this.texAspect=o.naturalHeight/o.naturalWidth,e.activeTexture(e.TEXTURE3),e.bindTexture(e.TEXTURE_2D,this.fabTex),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,o)}setOcclusion(o,e=!1){const t=this.gl;if(this.hasOcc=!!o,!o)return;const{w:i,h:l,data:r}=o;if(e){t.activeTexture(t.TEXTURE2),t.bindTexture(t.TEXTURE_2D,this.occTex),t.pixelStorei(t.UNPACK_ALIGNMENT,1),t.texImage2D(t.TEXTURE_2D,0,t.LUMINANCE,i,l,0,t.LUMINANCE,t.UNSIGNED_BYTE,r),t.pixelStorei(t.UNPACK_ALIGNMENT,4);return}let c=new Float32Array(i*l);for(let a=0;a<c.length;a++)c[a]=r[a]?255:0;for(let a=0;a<2;a++){const s=new Float32Array(c.length);for(let h=0;h<l;h++)for(let x=0;x<i;x++){let v=0,p=0;for(let d=-1;d<=1;d++)for(let u=-1;u<=1;u++){const m=x+u,w=h+d;m>=0&&w>=0&&m<i&&w<l&&(v+=c[w*i+m],p++)}s[h*i+x]=v/p}c=s}const f=new Uint8Array(c.length);for(let a=0;a<c.length;a++)f[a]=c[a];t.activeTexture(t.TEXTURE2),t.bindTexture(t.TEXTURE_2D,this.occTex),t.pixelStorei(t.UNPACK_ALIGNMENT,1),t.texImage2D(t.TEXTURE_2D,0,t.LUMINANCE,i,l,0,t.LUMINANCE,t.UNSIGNED_BYTE,f),t.pixelStorei(t.UNPACK_ALIGNMENT,4)}roomLight(o){const e=o.map(u=>`${Math.round(u.x/8)},${Math.round(u.y/8)}`).join(";");if(e===this.lightKey||!this.probe)return this.light;this.lightKey=e;const{data:t,w:i,h:l}=this.probe,r=L(o),c=i/this.width,f=l/this.height;let a=0,s=0,h=0,x=0;for(let u=0;u<=16;u++){const m=-.2+1.4*u/16;for(const[w,g]of[[m,-.18],[m,1.15],[-.22,m],[1.22,m]]){const A=r[6]*w+r[7]*g+1,y=Math.round((r[0]*w+r[1]*g+r[2])/A*c),b=Math.round((r[3]*w+r[4]*g+r[5])/A*f);if(y<0||b<0||y>=i||b>=l)continue;const E=(b*i+y)*3;a+=t[E],s+=t[E+1],h+=t[E+2],x++}}if(!x)return this.light=[1,1,1];a/=x,s/=x,h/=x;const v=.2126*a+.7152*s+.0722*h,p=Math.max(.32,Math.min(1.2,.35+v*1.25)),d=u=>1+(Math.max(.75,Math.min(1.3,u/Math.max(v,.02)))-1)*.55;return this.light=[d(a)*p,d(s)*p,d(h)*p],this.light}render(o,e){var c;const t=this.gl,i=L(o);t.useProgram(this.prog),t.uniformMatrix3fv(this.u.uHinv,!1,_(D(i))),t.uniform2f(this.u.uSize,this.width,this.height),t.uniform3fv(this.u.uColor,N(e.color)),t.uniform1f(this.u.uOpen,e.open),t.uniform1f(this.u.uTulle,e.tulle),t.uniform1f(this.u.uDrop,e.drop),t.uniform1f(this.u.uAlpha,(c=e.alpha)!=null?c:1),t.uniform1f(this.u.uHasOcc,this.hasOcc?1:0),t.uniform1f(this.u.uHasTex,this.texSrc?1:0),t.uniform1f(this.u.uTexAspect,this.texAspect),t.uniform3fv(this.u.uLight,this.roomLight(o));const l=(Math.hypot(o[1].x-o[0].x,o[1].y-o[0].y)+Math.hypot(o[2].x-o[3].x,o[2].y-o[3].y))/2,r=(Math.hypot(o[3].x-o[0].x,o[3].y-o[0].y)+Math.hypot(o[2].x-o[1].x,o[2].y-o[1].y))/2;t.uniform1f(this.u.uAspect,l/Math.max(r,1)),t.uniform1i(this.u.uType,e.type==="classic"?0:e.type==="tulle"?1:e.type==="zebra"?3:2),t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,this.photoTex),t.activeTexture(t.TEXTURE1),t.bindTexture(t.TEXTURE_2D,this.foldTex),t.activeTexture(t.TEXTURE2),t.bindTexture(t.TEXTURE_2D,this.occTex),t.activeTexture(t.TEXTURE3),t.bindTexture(t.TEXTURE_2D,this.fabTex),t.drawArrays(t.TRIANGLES,0,3)}}const R=new Map;function C(n){let o=R.get(n);return o||(o=new Promise((e,t)=>{const i=new Image;i.onload=()=>e(i),i.onerror=()=>{R.delete(n),t(new Error("texture"))},i.src=n}),R.set(n,o)),o}let T=null;function X(){return T||(T=new Promise((n,o)=>{const e=new Image;e.onload=()=>n(e),e.onerror=()=>{T=null,o(new Error("Tekstura yuklanmadi"))},e.src="images/folds.webp"})),T}export{M as CurtainRenderer,X as loadFold,C as loadTexture};
