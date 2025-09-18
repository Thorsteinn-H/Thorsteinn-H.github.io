/////////////////////////////////////////////////////////////////
//    Sýnidæmi í Tölvugrafík
//     Sýnir notkun á lyklaborðsatburðum til að hreyfa spaða
//
//    Hjálmtýr Hafsteinsson, september 2025
/////////////////////////////////////////////////////////////////

var canvas;
var gl;

// Ball 
var ball = {
    pos: vec2(0.0, 0.0),
    dX: Math.random()*0.1 - 0.05,
    dY: Math.random()*0.1 - 0.05,
    radius: 0.05,
    vertices: new Float32Array([-0.05, -0.05, 0.05, -0.05, 0.05, 0.05, -0.05, 0.05])
};

// Spadi
var paddle = {
    pos: vec2(0.0, -0.88),
    width: 0.2,
    height: 0.04,
    vertices: new Float32Array([
        -0.1, -0.02,
         0.1, -0.02,
         0.1,  0.02,
        -0.1,  0.02
    ])
};

// Svæði
var maxX = 1.0;
var maxY = 1.0;

var ballBuffer, paddleBuffer;
var program, locBox;
var vPosition;

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.8, 0.8, 0.8, 1.0);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    vPosition = gl.getAttribLocation(program, "vPosition");
    locBox = gl.getUniformLocation(program, "boxPos");

    // Ball buffer
    ballBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ballBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(ball.vertices), gl.DYNAMIC_DRAW);

    // Spadi buffer
    paddleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, paddleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(paddle.vertices), gl.DYNAMIC_DRAW);

    // Event listener for keyboard
    // 
        window.addEventListener("keydown", function(e) {
        var xmove = 0;
        switch (e.keyCode) {
            case 37: xmove = -0.04; break; // vinstri
            case 39: xmove = 0.04; break;  // hægri
            case 38: ball.dX *= 1.1; ball.dY *= 1.1; break; // upp
            case 40: ball.dX /= 1.1; ball.dY /= 1.1; break; // niður
        }
        paddle.pos[0] += xmove;

        // Spadi inni
        if (paddle.pos[0] + paddle.width/2 > maxX) paddle.pos[0] = maxX - paddle.width/2;
        if (paddle.pos[0] - paddle.width/2 < -maxX) paddle.pos[0] = -maxX + paddle.width/2;
    });

    render();
};

function render() {
    // Láta ferninginn skoppa af veggjunum
    if (Math.abs(ball.pos[0] + ball.dX) > maxX - ball.radius) ball.dX = -ball.dX;
    if (Math.abs(ball.pos[1] + ball.dY) > maxY - ball.radius) ball.dY = -ball.dY;

    // Skoppa af spaða
    var paddleTop = paddle.pos[1] + paddle.height / 2;
    var paddleBottom = paddle.pos[1] - paddle.height / 2;
    var paddleLeft = paddle.pos[0] - paddle.width / 2;
    var paddleRight = paddle.pos[0] + paddle.width / 2;

    var ballNextX = ball.pos[0] + ball.dX;
    var ballNextY = ball.pos[1] + ball.dY;

    if (
        ballNextY - ball.radius <= paddleTop &&
        ballNextY - ball.radius >= paddleBottom &&
        ballNextX >= paddleLeft &&
        ballNextX <= paddleRight &&
        ball.dY < 0
    ) {
        ball.dY = -ball.dY;
        var hitPos = (ballNextX - paddle.pos[0]) / (paddle.width / 2); 
        ball.dX += hitPos * 0.02;
    }

    // Uppfæra staðsetningu
    ball.pos[0] += ball.dX;
    ball.pos[1] += ball.dY;

    gl.clear(gl.COLOR_BUFFER_BIT);

    // Draw ball
    gl.bindBuffer(gl.ARRAY_BUFFER, ballBuffer);
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    gl.uniform2fv(locBox, flatten(ball.pos));
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

    // Draw Spaða
    gl.bindBuffer(gl.ARRAY_BUFFER, paddleBuffer);
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    gl.uniform2fv(locBox, flatten(paddle.pos));
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

    window.requestAnimFrame(render);
}
