"use strict";

var gl;
var vPosition, vColor, uTransform;
var vBuffer, cBuffer;

var angleA = -45;   // kubbur A byrjar til vinstri
var angleB = 0;
var active = "A";
var direction = +1;

// pivot hnit
var pivotA = [-0.05, 0.6];
var pivotB = [ 0.05, 0.6];

window.onload = function init() {
    var canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    // shaderar
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    vPosition = gl.getAttribLocation(program, "vPosition");
    vColor    = gl.getAttribLocation(program, "vColor");
    uTransform = gl.getUniformLocation(program, "transform");

    vBuffer = gl.createBuffer();
    cBuffer = gl.createBuffer();

    render();
};

// teiknar kubb
function drawCube(size, color, transform) {
    var s = size/2;
    var verts = [
        vec4(-s,-s,0,1),
        vec4( s,-s,0,1),
        vec4( s, s,0,1),
        vec4(-s, s,0,1)
    ];
    var cols = [color,color,color,color];

    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(verts), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(cols), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    gl.uniformMatrix4fv(uTransform, false, flatten(transform));
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
}

// teiknar lítinn ferning (pivot-punkt)
function drawSquare(x, y, size, color) {
    var s = size/2;
    var verts = [
        vec4(x-s, y-s, 0, 1),
        vec4(x+s, y-s, 0, 1),
        vec4(x+s, y+s, 0, 1),
        vec4(x-s, y+s, 0, 1)
    ];
    var cols = [color,color,color,color];

    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(verts), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(cols), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    gl.uniformMatrix4fv(uTransform, false, flatten(mat4()));
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    // --- Uppfæra horn ---
    if (active=="A") {
        angleA += direction*1.0;

        // A fer frá -45° upp í 0°
        if (direction==+1 && angleA >= 0) {
            angleA = 0;
            active = "B";
            direction = +1;   // B fer til hægri
        }
        // A fer frá 0° niður í -45°
        if (direction==-1 && angleA <= -45) {
            angleA = -45;
            direction = +1;
        }
    }
    else if (active=="B") {
        angleB += direction*1.0;

        // B fer frá 0° upp í 45°
        if (direction==+1 && angleB >= 45) {
            angleB = 45;
            direction = -1;
        }
        // B fer frá 45° niður í 0°
        if (direction==-1 && angleB <= 0) {
            angleB = 0;
            active = "A";
            direction = -1;   // A fer til vinstri
        }
    }

    // --- Teikna kubb A ---
    var tA = mat4();
    tA = mult(tA, translate(pivotA[0], pivotA[1], 0));
    tA = mult(tA, rotateZ(angleA));
    tA = mult(tA, translate(0, -0.3, 0));
    drawCube(0.1, vec4(0.2,0.6,0.9,1), tA);

    // --- Teikna kubb B ---
    var tB = mat4();
    tB = mult(tB, translate(pivotB[0], pivotB[1], 0));
    tB = mult(tB, rotateZ(angleB));
    tB = mult(tB, translate(0, -0.3, 0));
    drawCube(0.1, vec4(0.9,0.3,0.2,1), tB);

    // --- Teikna pivot-punkta ---
    drawSquare(pivotA[0], pivotA[1], 0.04, vec4(0,0,0,1));
    drawSquare(pivotB[0], pivotB[1], 0.04, vec4(0,0,0,1));

    requestAnimFrame(render);
}
