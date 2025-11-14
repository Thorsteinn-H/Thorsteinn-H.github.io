/////////////////////////////////////////////////////////////////
//    Sýnidæmi í Tölvugrafík
//     Einföld útgáfa af mynsturvörpun.  Tvívítt spjald
//     skilgreint og varpað á það mynd sem er lesin inn.
//     Hægt að snúa spjaldinu og færa til.
//
//    Hjálmtýr Hafsteinsson, október 2025
/////////////////////////////////////////////////////////////////
var canvas;
var gl;

var numVertices  = 6;

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

var colorLoc;
var colorAdjust = vec3(1.0, 1.0, 1.0);
var activeKey = null;


//    4-------3  2
//    |     /  / |
//    |   /  /   |       
//    | /  /     |
//    5  0-------1
//
// Tveir þríhyrningar sem mynda spjald í z=0 planinu
var vertices = [
    vec4( -1.0, -1.0, 0.0, 1.0 ),      // neðri vinstri
    vec4(  1.0, -1.0, 0.0, 1.0 ),      // neðri hægri
    vec4(  1.0,  1.0, 0.0, 1.0 ),      // efri hægri
    vec4(  1.0,  1.0, 0.0, 1.0 ),
    vec4( -1.0,  1.0, 0.0, 1.0 ),
    vec4( -1.0, -1.0, 0.0, 1.0 )
];

// Mynsturhnit fyrir spjaldið
var texCoords = [
    vec2( 0.0, 0.0 ),
    vec2( 1.0, 0.0 ),
    vec2( 1.0, 1.0 ),
    vec2( 1.0, 1.0 ),
    vec2( 0.0, 1.0 ),
    vec2( 0.0, 0.0 )
];


function configureTexture( image ) {
    texture = gl.createTexture();
    gl.bindTexture( gl.TEXTURE_2D, texture );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image );
    gl.generateMipmap( gl.TEXTURE_2D );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR );
//    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
    
    gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);
}


window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.9, 1.0, 1.0, 1.0 );
    
    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW );
    
    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );
    
    var tBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, tBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(texCoords), gl.STATIC_DRAW );
    
    var vTexCoord = gl.getAttribLocation( program, "vTexCoord" );
    gl.vertexAttribPointer( vTexCoord, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vTexCoord );

    colorLoc = gl.getUniformLocation(program, "colorAdjust");
    gl.uniform3fv(colorLoc, flatten(colorAdjust));

    // Ná í mynstur úr html-skrá:
    var image = document.getElementById("texImage");
    configureTexture( image );


    proLoc = gl.getUniformLocation( program, "projection" );
    mvLoc = gl.getUniformLocation( program, "modelview" );

    var proj = perspective( 50.0, 1.0, 0.2, 100.0 );
    gl.uniformMatrix4fv(proLoc, false, flatten(proj));
    
    //Event listener for keyboard
    window.addEventListener("keydown", function(e){
    if (e.key === "r" || e.key === "g" || e.key === "b") {
        activeKey = e.key;
        }
    });

    window.addEventListener("keyup", function(e){
        activeKey = null;
        colorAdjust = vec3(1.0, 1.0, 1.0);
    });

    //event listeners for mouse
    canvas.addEventListener("mousedown", function(e){
        movement = true;
        origX = e.clientX;
        origY = e.clientY;
        e.preventDefault();         // Disable drag and drop
    } );

    canvas.addEventListener("mouseup", function(e){
        movement = false;
    } );

    canvas.addEventListener("mousemove", function(e){
        if(movement) {
    	    spinY = ( spinY + (e.clientX - origX) ) % 360;
            spinX = ( spinX + (origY - e.clientY) ) % 360;
            origX = e.clientX;
            origY = e.clientY;
        }
        if (activeKey) {
    var delta = (origY - e.clientY) * 0.005;
    if (activeKey === "r") colorAdjust[0] = Math.min(1.0, Math.max(0.0, colorAdjust[0] + delta));
    if (activeKey === "g") colorAdjust[1] = Math.min(1.0, Math.max(0.0, colorAdjust[1] + delta));
    if (activeKey === "b") colorAdjust[2] = Math.min(1.0, Math.max(0.0, colorAdjust[2] + delta));
    gl.uniform3fv(colorLoc, flatten(colorAdjust));
}

    } );
    
    // Event listener for keyboard
     window.addEventListener("keydown", function(e){
         switch( e.keyCode ) {
            case 38:	// upp ör
                zDist += 0.1;
                break;
            case 40:	// niður ör
                zDist -= 0.1;
                break;
         }
     }  );  

    // Event listener for mousewheel
     window.addEventListener("wheel", function(e){
         if( e.deltaY > 0.0 ) {
             zDist += 0.2;
         } else {
             zDist -= 0.2;
         }
     }  );  
       
    render();
 
}

var render = function(){
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // staðsetja áhorfanda og meðhöndla músarhreyfingu
    var mv = lookAt( vec3(0.0, 0.0, zDist), vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0) );
    mv = mult( mv, rotateX( spinX ) );
    mv = mult( mv, rotateY( spinY ) );
    
    gl.uniformMatrix4fv(mvLoc, false, flatten(mv));

    gl.drawArrays( gl.TRIANGLES, 0, numVertices );

    requestAnimFrame(render);
}
