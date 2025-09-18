////////////////////////////////////////////////////////////////////
//    Sýnidæmi í Tölvugrafík
//     Sýnir hvernig hægt er að láta punkta "rigna niður" strigann
//     Sendum yfir slembipunkta sem þekja allann strigann.  Látum
//     svo hnútalitarann breyta y-hnitum þeirra í takt við
//     tíma-breytu.
//
//    Hjálmtýr Hafsteinsson, september 2025
////////////////////////////////////////////////////////////////////
var gl;
var points = [];

var numPoints = 10000;

window.onload = function init()
{
    var canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    // Búa til slembipunkta á striganum
    for ( var i = 0; i < numPoints; i++ ) {
        pt = vec2( 2.0*Math.random() - 1.0, 2.0*Math.random() - 1.0 );
        points.push( pt );
    }
    
    //
    //  Configure WebGL
    //
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
    
    //  Load shaders and initialize attribute buffers
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    // Load the data into the GPU
    var bufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );

    // Associate shader variables with our data buffer
    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    locTime = gl.getUniformLocation( program, "time" );

    iniTime = Date.now();
    
    render();
};


function render() {
    gl.clear( gl.COLOR_BUFFER_BIT );

    var msek = Date.now() - iniTime;
    gl.uniform1f( locTime, msek );
    
    gl.drawArrays( gl.POINTS, 0, numPoints );

    window.requestAnimFrame(render);
}
