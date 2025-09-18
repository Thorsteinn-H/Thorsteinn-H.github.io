/////////////////////////////////////////////////////////////////
//    Sýnidæmi í Tölvugrafík
//     Teikna nálgun á hring sem TRIANGLE_FAN
//
//    Hjálmtýr Hafsteinsson, ágúst 2025
/////////////////////////////////////////////////////////////////

var canvas;
var gl;

var numCirclePoints = 20;       
var radius = 0.5;
var center = vec2(0, 0);
var points = [];

var locTime;
var iniTime;

window.onload = function init() {
    canvas = document.getElementById( "gl-canvas" );
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }
    
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );

    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    // Búa til hringinn
    createCirclePoints( center, radius, numCirclePoints );

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);
    
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    // Ná í uniform location fyrir time
    locTime = gl.getUniformLocation(program, "time");
    iniTime = Date.now();

    render();
}

// Búa til punkta á hring
function createCirclePoints( cent, rad, k )
{
    points = [];
    points.push( center );
    
    var dAngle = 2*Math.PI/k;
    for( var i=k; i>=0; i-- ) {
        var a = i*dAngle;
        var p = vec2( rad*Math.sin(a) + cent[0], rad*Math.cos(a) + cent[1] );
        points.push(p);
    }
}

function render() {
    gl.clear( gl.COLOR_BUFFER_BIT );
    
    var msek = Date.now() - iniTime;
    gl.uniform1f( locTime, msek );

    gl.drawArrays( gl.TRIANGLE_FAN, 0, numCirclePoints+2 );

    window.requestAnimFrame(render);
}
