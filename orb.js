
function startEffect(canvas) {
// spinny_orb.js

// --- Utility functions ---
function ok(t) { return { ok: true, data: t }; }
function err(e) { return { ok: false, error: e }; }

// --- WebGL Shader Setup ---
function source2shader(gl, type, source) {
  const shader = gl.createShader(type === "v" ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);
  if (!shader) return err();
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    return err();
  }
  return ok(shader);
}

function shaders2program(gl, v, f) {
  const program = gl.createProgram();
  gl.attachShader(program, v);
  gl.attachShader(program, f);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    return err();
  }
  return ok(program);
}

function sources2program(gl, vs, fs) {
  const v = source2shader(gl, "v", vs);
  const f = source2shader(gl, "f", fs);
  if (!v.ok || !f.ok) return err();
  return shaders2program(gl, v.data, f.data);
}

// --- Geometry Helpers ---
function getDatatypeSize(gl, datatype) {
  return {
    [gl.BYTE]: 1, [gl.SHORT]: 2, [gl.UNSIGNED_BYTE]: 1, [gl.UNSIGNED_SHORT]: 2,
    [gl.FLOAT]: 4, [gl.HALF_FLOAT]: 2, [gl.INT]: 4, [gl.UNSIGNED_INT]: 4,
    [gl.INT_2_10_10_10_REV]: 4, [gl.UNSIGNED_INT_2_10_10_10_REV]: 4
  }[datatype];
}

function createBufferWithLayout(gl, layout, data) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  const layoutEntries = Object.entries(layout);
  let stride = 0;
  const offsets = new Map();
  for (const [name, attrs] of layoutEntries) {
    offsets.set(name, stride);
    stride += attrs.size * getDatatypeSize(gl, attrs.type);
  }
  const arraybuf = new ArrayBuffer(stride * data.length);
  const rawdata = new DataView(arraybuf);
  let i = 0;
  for (const d of data) {
    for (const [name, attrs] of layoutEntries) {
      for (let j = 0; j < attrs.size; j++) {
        const val = d[name][j];
        const pos = i * stride + offsets.get(name) + j * getDatatypeSize(gl, attrs.type);
        if (attrs.type === gl.FLOAT) rawdata.setFloat32(pos, val, true);
        else if (attrs.type === gl.UNSIGNED_SHORT) rawdata.setUint16(pos, val, true);
      }
    }
    i++;
  }
  gl.bufferData(gl.ARRAY_BUFFER, rawdata, gl.STATIC_DRAW);
  return {
    buffer,
    setLayout(prog) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      for (const [name, attrs] of layoutEntries) {
        const loc = gl.getAttribLocation(prog, name);
        gl.vertexAttribPointer(loc, attrs.size, attrs.type, false, stride, offsets.get(name));
        gl.enableVertexAttribArray(loc);
      }
    }
  };
}

// --- Parametric Shapes ---
function parametric2D(x, y, attr, getPoint) {
  const data = [];
  for (let j = 0; j < y; j++) {
    for (let i = 0; i < x; i++) {
      const a = getPoint(i, j);
      const b = getPoint(i + 1, j);
      const c = getPoint(i, j + 1);
      const d = getPoint(i + 1, j + 1);
      data.push({ [attr]: a }, { [attr]: c }, { [attr]: b }, { [attr]: c }, { [attr]: d }, { [attr]: b });
    }
  }
  return data;
}

function uvSphere(x, y, rad, attr) {
  return parametric2D(x, y, attr, (i, j) => {
    const a = ((i + x) % x) / x * Math.PI * 2;
    const b = ((j + y) % y) / y * Math.PI - Math.PI / 2;
    return [Math.cos(a) * Math.cos(b) * rad, Math.sin(b) * rad, Math.sin(a) * Math.cos(b) * rad];
  });
}

function ring(x, rad, height, attr) {
  return parametric2D(x, 1, attr, (i, j) => {
    const a = ((i + x) % x) / x * Math.PI * 2;
    return [Math.cos(a) * rad, j === 1 ? height / 2 : -height / 2, Math.sin(a) * rad];
  });
}

function torus(x, y, R, r, attr) {
  return parametric2D(x, y, attr, (i, j) => {
    const a = ((i + x) % x) / x * Math.PI * 2;
    const b = ((j + y) % y) / y * Math.PI * 2;
    const px = Math.cos(a) * (R + Math.cos(b) * r);
    const py = Math.sin(b) * r;
    const pz = Math.sin(a) * (R + Math.cos(b) * r);
    return [px, py, pz];
  });
}

// --- Math Utilities ---
const normalize = v => { const len = Math.hypot(...v); return v.map(e => e / len); };
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const dot3 = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const scale3 = (v,s)=>v.map(e=>e*s);
const add3 = (a,b)=>a.map((e,i)=>e+b[i]);
function rodrigues(v,k,theta){
  k=normalize(k);
  return add3(add3(scale3(v,Math.cos(theta)),scale3(cross(k,v),Math.sin(theta))),scale3(k,dot3(k,v)*(1-Math.cos(theta))));
}
function rotate(axis,angle){
  return [...rodrigues([1,0,0],axis,angle),0,...rodrigues([0,1,0],axis,angle),0,...rodrigues([0,0,1],axis,angle),0,0,0,0,1];
}
function mulMat4(a,b){
  const o=new Array(16);
  for(let i=0;i<4;i++)for(let j=0;j<4;j++)o[i*4+j]=a[i*4+0]*b[0*4+j]+a[i*4+1]*b[1*4+j]+a[i*4+2]*b[2*4+j]+a[i*4+3]*b[3*4+j];
  return o;
}
function ortho(l,r,t,b,n,f){
  return [2/(r-l),0,0,-(r+l)/(r-l),0,2/(t-b),0,-(t+b)/(t-b),0,0,-2/(f-n),-(f+n)/(f-n),0,0,0,1];
}

// --- WebGL Object Wrapper ---
function object(gl, mesh, uniforms, transform) {
  const buffer = createBufferWithLayout(gl, { in_pos: { type: gl.FLOAT, size: 3 } }, mesh);
  return {
    mesh, uniforms, buffer, transform,
    draw(prog, globalTransform) {
      buffer.setLayout(prog);
      gl.uniformMatrix4fv(gl.getUniformLocation(prog, "mvp"), false, mulMat4(globalTransform, this.transform));
      for (const [k,v] of Object.entries(this.uniforms)) {
        const loc = gl.getUniformLocation(prog, k);
        gl[`uniform${v.length}fv`](loc, v);
      }
      gl.drawArrays(gl.TRIANGLES, 0, mesh.length);
    }
  };
}

// --- Scene Setup ---
//const canvas = document.createElement("canvas");
//document.body.appendChild(canvas);
document.body.style.margin = "0";
const gl = canvas.getContext("webgl2");
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
}
resize();
window.addEventListener("resize", resize);

const identity = () => rotate([1, 0, 0], 0);

function makeRing(gl, radius) {
  const center = object(gl, ring(32, radius, 0.4, "in_pos"), { color: [0, 0, 0, 1], depthOffset: [0] }, identity());
  const edge1 = object(gl, torus(32, 32, radius, 0.02, "in_pos"), { color: [1, 1, 1, 1], depthOffset: [0] }, identity());
  const edge2 = object(gl, torus(32, 32, radius, 0.02, "in_pos"), { color: [1, 1, 1, 1], depthOffset: [0] }, identity());
  return {
    center, edge1, edge2,
    draw(gl, globalTransform) { [this.center, this.edge1, this.edge2].forEach(o => o.draw(gl, globalTransform)); },
    setTransform(trans) { this.center.transform = this.edge1.transform = this.edge2.transform = trans; }
  };
}

const sphere = object(gl, uvSphere(32, 32, 1.2, "in_pos"), { color: [1, 1, 1, 1], depthOffset: [0] }, identity());
const rings = [];
for (let i = 0; i < 18; i++) rings.push(makeRing(gl, 2 + i * 0.07));

const prog = sources2program(gl,
`#version 300 es
precision highp float;
in vec3 in_pos;
out vec4 pos;
uniform mat4 mvp;
void main() {
  vec4 postemp = mvp * vec4(in_pos, 1.0);
  gl_Position = postemp;
  pos = postemp * 0.5 + 0.5;
}`,
`#version 300 es
precision highp float;
in vec4 pos;
out vec4 col;
uniform vec4 color;
uniform float depthOffset;
void main() {
  col = color;
}`
).data;

gl.enable(gl.DEPTH_TEST);
gl.useProgram(prog);

// --- Animation Loop ---
function loop(ms) {
  const t = ms / 1000;
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  const aspect = canvas.height / canvas.width;
  const globalTrans = ortho(-5 / aspect, 5 / aspect, 5, -5, -5, 5);
  rings.forEach((r, i) => {
    r.setTransform(mulMat4(rotate([1, 1, 1], t * i * 0.1), rotate([0, 0, 1], Math.PI * 0.25)));
    r.draw(prog, globalTrans);
  });
  sphere.draw(prog, globalTrans);
  requestAnimationFrame(loop);
}
loop();

}