/////////////////////////////////////////////////////////////////
//    Sýnidæmi í Tölvugrafík
//     Teikna nálgun á hring sem TRIANGLE_FAN
//
//    Bætt við slider til að velja fjölda punkta
/////////////////////////////////////////////////////////////////
var canvas;
var gl;

var numCirclePoints = 20;   // upphafsgildi
var radius = 0.5;
var center = vec2(0, 0);

var points = [];
var vBuffer;

window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }
    
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );

    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // tengja slider
    document.getElementById("slider").oninput = function(event) {
        numCirclePoints = parseInt(event.target.value);
        render();
    };

    render();
}

// Býr til punktana fyrir hringinn
function createCirclePoints( cent, rad, k )
{
    var pts = [];
    pts.push( center );
    
    var dAngle = 2*Math.PI/k;
    for( var i=k; i>=0; i-- ) {
        var a = i*dAngle;
        var p = vec2( rad*Math.sin(a) + cent[0], rad*Math.cos(a) + cent[1] );
        pts.push(p);
    }
    return pts;
}

function render() {
    points = createCirclePoints( center, radius, numCirclePoints );

    // uppfærum gögn í GPU
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    gl.clear( gl.COLOR_BUFFER_BIT );
    gl.drawArrays( gl.TRIANGLE_FAN, 0, numCirclePoints+2 );
}
