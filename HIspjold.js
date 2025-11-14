// HIspjold.js fyrir mynstur 5 5 9 3 í 4x1 spjaldi

var canvas;
var gl;

var numVertices = 24;  // 4 quads x 6 vertices

var program;

var pointsArray = [];
var texCoordsArray = [];

var texture;

var movement = false;
var spinX = 0;
var spinY = 0;
var origX;
var origY;

var zDist = 5.0;

var proLoc;
var mvLoc;

// Vertex positions fyrir 4x1 spjald
var vertices = [
    // Quad 1
    vec4(-2.0, -1.0, 0, 1), vec4(-1.0, -1.0, 0, 1), vec4(-1.0, 1.0, 0, 1),
    vec4(-1.0, 1.0, 0, 1),  vec4(-2.0, 1.0, 0, 1),  vec4(-2.0, -1.0, 0, 1),

    // Quad 2
    vec4(-1.0, -1.0, 0, 1), vec4(0.0, -1.0, 0, 1), vec4(0.0, 1.0, 0, 1),
    vec4(0.0, 1.0, 0, 1),   vec4(-1.0, 1.0, 0, 1),  vec4(-1.0, -1.0, 0, 1),

    // Quad 3
    vec4(0.0, -1.0, 0, 1),  vec4(1.0, -1.0, 0, 1),  vec4(1.0, 1.0, 0, 1),
    vec4(1.0, 1.0, 0, 1),   vec4(0.0, 1.0, 0, 1),   vec4(0.0, -1.0, 0, 1),

    // Quad 4
    vec4(1.0, -1.0, 0, 1),  vec4(2.0, -1.0, 0, 1),  vec4(2.0, 1.0, 0, 1),
    vec4(2.0, 1.0, 0, 1),   vec4(1.0, 1.0, 0, 1),   vec4(1.0, -1.0, 0, 1)
];

// TexCoords fyrir mynstrið 5 5 9 3 (4x1)
var texCoords = [
    // Quad 1 - 5
    vec2(1/3, 1/3), vec2(2/3, 1/3), vec2(2/3, 2/3),
    vec2(2/3, 2/3), vec2(1/3, 2/3), vec2(1/3, 1/3),

    // Quad 2 - 5
    vec2(1/3, 1/3), vec2(2/3, 1/3), vec2(2/3, 2/3),
    vec2(2/3, 2/3), vec2(1/3, 2/3), vec2(1/3, 1/3),

    // Quad 3 - 9
    vec2(2/3, 0.0), vec2(1.0, 0.0), vec2(1.0, 1/3),
    vec2(1.0, 1/3), vec2(2/3, 1/3), vec2(2/3, 0.0),

    // Quad 4 - 3
    vec2(2/3, 2/3), vec2(1.0, 2/3), vec2(1.0, 1.0),
    vec2(1.0, 1.0), vec2(2/3, 1.0), vec2(2/3, 2/3)
];

function configureTexture(image) {
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    // Fyrir NPOT PNG mynd, engin mipmap
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);
}

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) alert("WebGL isn't available");

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.9, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoords), gl.STATIC_DRAW);

    var vTexCoord = gl.getAttribLocation(program, "vTexCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    var image = document.getElementById("texImage");
    configureTexture(image);

    proLoc = gl.getUniformLocation(program, "projection");
    mvLoc = gl.getUniformLocation(program, "modelview");

    var proj = perspective(50.0, 1.0, 0.2, 100.0);
    gl.uniformMatrix4fv(proLoc, false, flatten(proj));

    canvas.addEventListener("mousedown", function(e){ movement = true; origX = e.clientX; origY = e.clientY; e.preventDefault(); });
    canvas.addEventListener("mouseup", function(e){ movement = false; });
    canvas.addEventListener("mousemove", function(e){
        if(movement){
            spinY = (spinY + (e.clientX - origX)) % 360;
            spinX = (spinX + (e.clientY - origY)) % 360;
            origX = e.clientX; origY = e.clientY;
        }
    });

    window.addEventListener("keydown", function(e){ if(e.keyCode === 38) zDist += 0.1; if(e.keyCode === 40) zDist -= 0.1; });
    window.addEventListener("wheel", function(e){ zDist += (e.deltaY > 0 ? 0.2 : -0.2); });

    render();
}

var render = function(){
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    var mv = lookAt(vec3(0.0, 0.0, zDist), vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0));
    mv = mult(mv, rotateX(spinX));
    mv = mult(mv, rotateY(spinY));
    gl.uniformMatrix4fv(mvLoc, false, flatten(mv));
    gl.drawArrays(gl.TRIANGLES, 0, numVertices);
    requestAnimFrame(render);
}
