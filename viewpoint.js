////////////////////////////////////////////////////////////////////
//    Sýnidæmi í Tölvugrafík
//    Byggt á sýnisforriti í C fyrir OpenGL, höfundur óþekktur.
//
//     Bíll sem keyrir í hringi í umhverfi með húsum.  Hægt að
//    breyta sjónarhorni áhorfanda með því að slá á 1, 2, ..., 8.
//    Einnig hægt að breyta hæð áhorfanda með upp/niður örvum.
//    Leiðrétt útgáfa fyrir réttan snúning í MV.js
//
//    Hjálmtýr Hafsteinsson, september 2025
////////////////////////////////////////////////////////////////////
var canvas;
var gl;

// position of the track
var TRACK_RADIUS = 100.0;
var TRACK_INNER = 90.0;
var TRACK_OUTER = 110.0;
var TRACK_PTS = 100;

var BLUE = vec4(0.0, 0.0, 1.0, 1.0);
var RED = vec4(1.0, 0.0, 0.0, 1.0);
var GRAY = vec4(0.4, 0.4, 0.4, 1.0);
var YELLOW = vec4(1.0, 1.0, 0.0, 1.0);
var GREEN = vec4(0.0, 0.8, 0.0, 1.0);
var BROWN = vec4(0.55, 0.27, 0.07, 1.0);

var numCubeVertices  = 36;
var numTrackVertices  = 2*TRACK_PTS + 2;


// variables for moving car
var car1Direction = 0.0;
var car1Radius = TRACK_RADIUS;
var car2Direction = 180.0; // other way round
var car2Radius = TRACK_RADIUS - 8.0;

var height = 0.0;

// --- bílar (staðsetning/stefna sem uppfærist) ---
var car1Dir = 0.0;
var car1X = 0.0;
var car1Y = 0.0;

var car2Dir = 180.0;   // byrjar andstætt
var car2X = 0.0;
var car2Y = 0.0;

// current viewpoint
var view = 1;

// user walking (view 0)
var userPos = { x: 0, y: -50 };  // start near the track
var userAngle = 0;               // facing along +Y by default
var userDir = { x: 0, y: 1 };    // facing "north"
var keys = {};                   // for keyboard input


// --- flugvél ---
var planeT = 0.0;
var planeA = 60.0; // scale of lemniscate
var planeHeight = 40.0;

var colorLoc;
var mvLoc;
var pLoc;
var proj;

var cubeBuffer;
var trackBuffer;
var vPosition;

// the 36 vertices of the cube
var cVertices = [
    // front side:
    vec3( -0.5,  0.5,  0.5 ), vec3( -0.5, -0.5,  0.5 ), vec3(  0.5, -0.5,  0.5 ),
    vec3(  0.5, -0.5,  0.5 ), vec3(  0.5,  0.5,  0.5 ), vec3( -0.5,  0.5,  0.5 ),
    // right side:
    vec3(  0.5,  0.5,  0.5 ), vec3(  0.5, -0.5,  0.5 ), vec3(  0.5, -0.5, -0.5 ),
    vec3(  0.5, -0.5, -0.5 ), vec3(  0.5,  0.5, -0.5 ), vec3(  0.5,  0.5,  0.5 ),
    // bottom side:
    vec3(  0.5, -0.5,  0.5 ), vec3( -0.5, -0.5,  0.5 ), vec3( -0.5, -0.5, -0.5 ),
    vec3( -0.5, -0.5, -0.5 ), vec3(  0.5, -0.5, -0.5 ), vec3(  0.5, -0.5,  0.5 ),
    // top side:
    vec3(  0.5,  0.5, -0.5 ), vec3( -0.5,  0.5, -0.5 ), vec3( -0.5,  0.5,  0.5 ),
    vec3( -0.5,  0.5,  0.5 ), vec3(  0.5,  0.5,  0.5 ), vec3(  0.5,  0.5, -0.5 ),
    // back side:
    vec3( -0.5, -0.5, -0.5 ), vec3( -0.5,  0.5, -0.5 ), vec3(  0.5,  0.5, -0.5 ),
    vec3(  0.5,  0.5, -0.5 ), vec3(  0.5, -0.5, -0.5 ), vec3( -0.5, -0.5, -0.5 ),
    // left side:
    vec3( -0.5,  0.5, -0.5 ), vec3( -0.5, -0.5, -0.5 ), vec3( -0.5, -0.5,  0.5 ),
    vec3( -0.5, -0.5,  0.5 ), vec3( -0.5,  0.5,  0.5 ), vec3( -0.5,  0.5, -0.5 )
];

// vertices of the track
var tVertices = [];


window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.7, 1.0, 0.7, 1.0 );
    
    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    createTrack();
    
    // VBO for the track
    trackBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, trackBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(tVertices), gl.STATIC_DRAW );

    // VBO for the cube
    cubeBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cubeBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(cVertices), gl.STATIC_DRAW );


    vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    colorLoc = gl.getUniformLocation( program, "fColor" );
    
    mvLoc = gl.getUniformLocation( program, "modelview" );

    // set projection
    pLoc = gl.getUniformLocation( program, "projection" );
    proj = perspective( 50.0, 1.0, 1.0, 800.0 );
    gl.uniformMatrix4fv(pLoc, false, flatten(proj));

    document.getElementById("Viewpoint").innerHTML = "1: Fjarlægt sjónarhorn";
    document.getElementById("Height").innerHTML = "Viðbótarhæð: "+ height;

    //hreyfa mús
    window.addEventListener("mousemove", function(e) {
    if (view === 0 && document.pointerLockElement === canvas) {
        userAngle -= e.movementX * -0.002; // horizontal mouse rotation
        userDir.x = Math.sin(userAngle);
        userDir.y = Math.cos(userAngle);
    }
});
canvas.onclick = () => canvas.requestPointerLock();


    // Event listener for keyboard
    window.addEventListener("keydown", function(e){

        // WASD control for view 0
        if (e.key === "w" || e.key === "W") keys["W"] = true;
        if (e.key === "a" || e.key === "A") keys["A"] = true;
        if (e.key === "s" || e.key === "S") keys["S"] = true;
        if (e.key === "d" || e.key === "D") keys["D"] = true;

        switch( e.keyCode ) {
            case 48:    // 0: person on ground
                view = 0;
                document.getElementById("Viewpoint").innerHTML = "0: Persóna";
                break;
            case 49:	// 1: distant and stationary viewpoint
                view = 1;
                document.getElementById("Viewpoint").innerHTML = "1: Fjarlægt sjónarhorn";
                break;
            case 50:	// 2: panning camera inside the track
                view = 2;
                document.getElementById("Viewpoint").innerHTML = "2: Horfa á bílinn innan úr hringnum";
                break;
            case 51:	// 3: panning camera inside the track
                view = 3;
                document.getElementById("Viewpoint").innerHTML = "3: Horfa á bílinn fyrir utan hringinn";
                break;
            case 52:	// 4: driver's point of view
                view = 4;
                document.getElementById("Viewpoint").innerHTML = "4: Sjónarhorn ökumanns";
                break;
            case 53:	// 5: drive around while looking at a house
                view = 5;
                document.getElementById("Viewpoint").innerHTML = "5: Horfa alltaf á eitt hús innan úr bílnum";
                break;
            case 54:	// 6: Above and behind the car
                view = 6;
                document.getElementById("Viewpoint").innerHTML = "6: Fyrir aftan og ofan bílinn";
                break;
            case 55:	// 7: from another car in front
                view = 7;
                document.getElementById("Viewpoint").innerHTML = "7: Horft aftur úr bíl fyrir framan";
                break;
            case 56:	// 8: from beside the car
                view = 8;
                document.getElementById("Viewpoint").innerHTML = "8: Til hliðar við bílinn";
                break;


            
            case 38:    // up arrow
                height += 2.0;
                document.getElementById("Height").innerHTML = "Viðbótarhæð: "+ height;
                break;
            case 39:    // right arrow  (uppi takkin minn er fucked svo ég er að bæta hægri ör svo ég get farið upp)
                height += 2.0;
                document.getElementById("Height").innerHTML = "Viðbótarhæð: "+ height;
                break;
            case 40:    // down arrow
                height -= 2.0;
                document.getElementById("Height").innerHTML = "Viðbótarhæð: "+ height;
                break;        

        }
    } );

    window.addEventListener("keyup", function(e){
        if (e.key === "w" || e.key === "W") keys["W"] = false;
        if (e.key === "a" || e.key === "A") keys["A"] = false;
        if (e.key === "s" || e.key === "S") keys["S"] = false;
        if (e.key === "d" || e.key === "D") keys["D"] = false;
    });

    
// mouse movement to turn user (for view 0)
    var lastMouseX = null;
    canvas.addEventListener("mousemove", function(e){
        // try to use movementX if available, otherwise fallback
        var mx = e.movementX !== undefined ? e.movementX : (lastMouseX === null ? 0 : e.clientX - lastMouseX);
        lastMouseX = e.clientX;
        if (view === 0) {
            userDirAngle += mx * 0.15; // sensitivity
            var rad = radians(userDirAngle);
            userDir.x = Math.cos(rad);
            userDir.y = Math.sin(rad);
        }
    });

    render();
}


// create the vertices that form the car track
function createTrack() {

    var theta = 0.0;
    for( var i=0; i<=TRACK_PTS; i++ ) {
        var p1 = vec3(TRACK_OUTER*Math.cos(radians(theta)), TRACK_OUTER*Math.sin(radians(theta)), 0.0);
        var p2 = vec3(TRACK_INNER*Math.cos(radians(theta)), TRACK_INNER*Math.sin(radians(theta)), 0.0);
        tVertices.push( p1 );
        tVertices.push( p2 );
        theta += 360.0/TRACK_PTS;
    }
}


// draw a house in location (x, y) of size size

// Draw house with different types (0..3) for shape/color variety
function house( x, y, size, type, mv ) {
    gl.bindBuffer( gl.ARRAY_BUFFER, cubeBuffer );
    gl.vertexAttribPointer( vPosition, 3, gl.FLOAT, false, 0, 0 );

    // choose color and shape by type
    var color = RED;
    var hScale = 1.0;
    switch(type) {
        case 0:
            color = vec4(0.8, 0.2, 0.2, 1.0); hScale = 1.0; break; // classic
        case 1:
            color = vec4(0.2, 0.5, 0.9, 1.0); hScale = 1.4; break; // tall blue
        case 2:
            color = vec4(0.9, 0.8, 0.2, 1.0); hScale = 0.8; break; // wide yellow
        case 3:
            color = vec4(0.5, 0.3, 0.1, 1.0); hScale = 1.8; break; // brown tall
    }
    gl.uniform4fv( colorLoc, color );
    
    var mvHouse = mult( mv, translate( x, y, size*hScale/2.0 ) );
    mvHouse = mult( mvHouse, scalem( size, size*0.8, size*hScale ) );
    gl.uniformMatrix4fv(mvLoc, false, flatten(mvHouse));
    gl.drawArrays( gl.TRIANGLES, 0, numCubeVertices );

    // small roof as a thinner cube (different color)
    var roofColor = vec4(color[0]*0.9, color[1]*0.9, color[2]*0.9, 1.0);
    gl.uniform4fv( colorLoc, roofColor );
    var mvRoof = mult( mv, translate(x, y, size*hScale + 0.6) );
    mvRoof = mult( mvRoof, scalem(size*1.05, size*0.9, 0.6) );
    gl.uniformMatrix4fv(mvLoc, false, flatten(mvRoof));
    gl.drawArrays( gl.TRIANGLES, 0, numCubeVertices );
}

    
// ------------------ Flugvél ------------------
// einfalt flugvélalíkan úr kubbum; snýr með theta (í gráðum)
// draw plane (simple model built from 4 cubes)
function drawPlaneModel( mv ) {
    gl.bindBuffer( gl.ARRAY_BUFFER, cubeBuffer );
    gl.vertexAttribPointer( vPosition, 3, gl.FLOAT, false, 0, 0 );

    // fuselage
    gl.uniform4fv(colorLoc, YELLOW);
    var fus = mult(mv, scalem( 6.0, 1.5, 1.0 ));
    fus = mult(fus, translate(0.0, 0.0, 0.0));
    gl.uniformMatrix4fv(mvLoc, false, flatten(fus));
    gl.drawArrays( gl.TRIANGLES, 0, numCubeVertices );

    // left wing
    gl.uniform4fv(colorLoc, vec4(0.8, 0.2, 0.2, 1.0));
    var wingL = mult(mv, translate(-1.0, -3.5, 0.0));
    wingL = mult(wingL, scalem( 2.0, 6.0, 0.2 ));
    gl.uniformMatrix4fv(mvLoc, false, flatten(wingL));
    gl.drawArrays( gl.TRIANGLES, 0, numCubeVertices );

    // right wing
    var wingR = mult(mv, translate(-1.0, 3.5, 0.0));
    wingR = mult(wingR, scalem( 2.0, 6.0, 0.2 ));
    gl.uniformMatrix4fv(mvLoc, false, flatten(wingR));
    gl.drawArrays( gl.TRIANGLES, 0, numCubeVertices );

    // tail
    var tail = mult(mv, translate(3.0, 0.0, 0.8));
    tail = mult(tail, scalem( 1.0, 0.5, 1.6 ));
    gl.uniformMatrix4fv(mvLoc, false, flatten(tail));
    gl.drawArrays( gl.TRIANGLES, 0, numCubeVertices );
}

// draw car as simple body with color parameter
function drawCarGeneric( mv, color ) {

    gl.uniform4fv( colorLoc, color );
    gl.bindBuffer( gl.ARRAY_BUFFER, cubeBuffer );
    gl.vertexAttribPointer( vPosition, 3, gl.FLOAT, false, 0, 0 );

    // lower body
    var mvLower = mult( mv, scalem( 10.0, 3.0, 2.0 ) );
    mvLower = mult( mvLower, translate( 0.0, 0.0, 0.5 ) );
    gl.uniformMatrix4fv(mvLoc, false, flatten(mvLower));
    gl.drawArrays( gl.TRIANGLES, 0, numCubeVertices );

    // upper cabin
    var mvUpper = mult( mv, scalem( 4.0, 3.0, 2.0 ) );
    mvUpper = mult( mvUpper, translate( -0.2, 0.0, 1.5 ) );
    gl.uniformMatrix4fv(mvLoc, false, flatten(mvUpper));
    gl.drawArrays( gl.TRIANGLES, 0, numCubeVertices );
}

// draw the circular track and a few houses (i.e. red cubes)
function drawScenery( mv ) {

    // track
    gl.uniform4fv( colorLoc, GRAY );
    gl.bindBuffer( gl.ARRAY_BUFFER, trackBuffer );
    gl.vertexAttribPointer( vPosition, 3, gl.FLOAT, false, 0, 0 );
    gl.uniformMatrix4fv(mvLoc, false, flatten(mv));
    gl.drawArrays( gl.TRIANGLE_STRIP, 0, numTrackVertices );

    //Hús
    var houseSpecs = [
        {x:-20.0, y:50.0, size:5.0, t:0}, //Lengja
        {x:-25.0, y:50.0, size:5.0, t:0}, //Rauð húsin
        {x:-30.0, y:50.0, size:5.0, t:0},
        {x:-35.0, y:50.0, size:5.0, t:0},
        //
        {x:-20.0, y:75.0, size:8.0, t:0},
        {x:70.0, y:20.0, size:6.0, t:0}, 

        {x:0.0, y:70.0, size:10.0, t:1},  //Blá húsin
        {x:-30.0, y:-50.0, size:7.0, t:1},

        {x:10.0, y:-60.0, size:10.0, t:2}, //Gul húsin
        {x:20.0, y:-10.0, size:8.0, t:2},
        {x:-70.0, y:-30.0, size:6.0, t:2},

        {x:0.0, y:0.0, size:5.0, t:2}, //Miðja dvergahús

        {x:40.0, y:120.0, size:10.0, t:3}, //Brún húsin/skyscraper
        {x:40.0, y:120.0, size:10.0, t:3},
        {x:0.0, y:20.0, size:20.0, t:3},
        {x:-40.0, y:140.0, size:10.0, t:3}
    ];

    for (var i=0;i<houseSpecs.length;i++){
        var s = houseSpecs[i];
        house(s.x, s.y, s.size, s.t, mv);
    }

    // draw bridges 
    var bridgeAngles = [0.0, 180.0]; // degrees
    for (var i=0;i<bridgeAngles.length;i++){
        drawBridge( bridgeAngles[i], 18.0, 80.0, 8.0, mv );
    }
}

function drawBridge(angleDegrees, width, length, height, mvBase) {
    var theta = radians(angleDegrees);
    var cx = TRACK_RADIUS * Math.cos(theta);
    var cy = TRACK_RADIUS * Math.sin(theta);
    var cz = 0.0; // base z,

    // Base transform
    var mv = mult(mvBase, translate(cx, cy, cz));
    mv = mult(mv, rotateZ(-angleDegrees));

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);

    // pillars staðsetning
    var pillarOffset = 3.0; 
    var leftPillarPos  = vec3(-length / 2 - pillarOffset, 0.0, height / 2);
    var rightPillarPos = vec3( length / 2 + pillarOffset, 0.0, height / 2);

    // Draw left pillar
    gl.uniform4fv(colorLoc, BROWN);
    var leftP = mult(mv, translate(leftPillarPos[0], leftPillarPos[1], leftPillarPos[2]));
    leftP = mult(leftP, scalem(6.0, width, height));
    gl.uniformMatrix4fv(mvLoc, false, flatten(leftP));
    gl.drawArrays(gl.TRIANGLES, 0, numCubeVertices);

    // Draw right pillar
    var rightP = mult(mv, translate(rightPillarPos[0], rightPillarPos[1], rightPillarPos[2]));
    rightP = mult(rightP, scalem(6.0, width, height));
    gl.uniformMatrix4fv(mvLoc, false, flatten(rightP));
    gl.drawArrays(gl.TRIANGLES, 0, numCubeVertices);

    // bridge
    var midX = (leftPillarPos[0] + rightPillarPos[0]) / 2.0;
    var midY = (leftPillarPos[1] + rightPillarPos[1]) / 2.0;
    var midZ = leftPillarPos[2] + height / 2; 

    var dx = rightPillarPos[0] - leftPillarPos[0];
    var dy = rightPillarPos[1] - leftPillarPos[1];

    // Length
    var bridgeLength = Math.sqrt(dx*dx + dy*dy);

    // Angle to rotate bridge in XY plane
    var angle = Math.atan2(dy, dx) * 180.0 / Math.PI;

    // Build deck
    var mvDeck = mult(mv, translate(midX, midY, midZ));
    mvDeck = mult(mvDeck, rotateZ(angle));
    mvDeck = mult(mvDeck, scalem(bridgeLength, width, 1.0)); // height=1

    gl.uniform4fv(colorLoc, vec4(0.5, 0.5, 0.5, 1.0)); // grey
    gl.uniformMatrix4fv(mvLoc, false, flatten(mvDeck));
    gl.drawArrays(gl.TRIANGLES, 0, numCubeVertices);
}



// eight/lemniscate param (figure-8). returns vec2
function lemniscatePos(t, a){
    // simple figure-eight: x = a * sin(t), y = a * sin(t)*cos(t)
    return { x: a * Math.sin(t), y: a * Math.sin(t)*Math.cos(t) };
}

// approximate derivative numerically for heading
function lemniscateTangent(t, a){
    var dt = 0.0001;
    var p1 = lemniscatePos(t, a);
    var p2 = lemniscatePos(t+dt, a);
    return { dx: p2.x - p1.x, dy: p2.y - p1.y };
}


function render()
{
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // update cars
    car1Direction += 2.5; // speed1
    car2Direction -= 3.0; // speed2

    if ( car1Direction > 360.0 ) car1Direction -= 360.0;
    if ( car2Direction < 0.0 ) car2Direction += 360.0;

    var car1Rad = radians(car1Direction);
    var car2Rad = radians(car2Direction);

    var car1X = car1Radius * Math.cos(car1Rad);
    var car1Y = car1Radius * Math.sin(car1Rad);
    var car2X = car2Radius * Math.cos(car2Rad);
    var car2Y = car2Radius * Math.sin(car2Rad);

    // update plane
    planeT += 0.02;
    if (planeT > Math.PI*2.0) planeT -= Math.PI*2.0;
    var pPos = lemniscatePos(planeT, planeA);
    var tan = lemniscateTangent(planeT, planeA);
    var planeAngle = Math.atan2(tan.dy, tan.dx) * 180.0/Math.PI;

    // update walking user if view 0 using keys
    if (view === 0) {
        var speed = 1.8;
        // forward/back relative to userDir
        if (keys["W"]) { userPos.x += userDir.x * speed; userPos.y += userDir.y * speed; }
        if (keys["S"]) { userPos.x -= userDir.x * speed; userPos.y -= userDir.y * speed; }
        // strafe left/right (no rotation)
        var leftX = -userDir.y;
        var leftY = userDir.x;
        if (keys["A"]) { userPos.x += leftX * speed; userPos.y += leftY * speed; }
        if (keys["D"]) { userPos.x -= leftX * speed; userPos.y -= leftY * speed; }
    }

    //  car, hjálparfall
    function carWorldMatrix(cx, cy, dirDegrees) {
        var m = mat4();
        m = mult(m, translate(cx, cy, 0.0));
        m = mult(m, rotateZ(dirDegrees + 90.0));
        return m;
    }

    var car1World = carWorldMatrix(car1X, car1Y, car1Direction);
    var car2World = carWorldMatrix(car2X, car2Y, car2Direction);

    var mv = mat4();
    switch( view ) {
        case 0:
            // walking user on ground: camera positioned at userPos + small height
            var eye = vec3(userPos.x, userPos.y, 2.0 + height);
            var lookAtPoint = vec3(userPos.x + userDir.x*10.0, userPos.y + userDir.y*10.0, 2.0 + height);
            mv = lookAt( eye, lookAtPoint, vec3(0.0, 0.0, 1.0) );

            drawScenery( mv );

            // draw both cars with consistent world matrices: focused car = car1 (blue), other = red
            drawCarGeneric( mult(mv, car1World), BLUE );
            drawCarGeneric( mult(mv, car2World), RED );

            // plane
            var mvPlane = mult( mv, translate( pPos.x, pPos.y, planeHeight ) );
            mvPlane = mult( mvPlane, rotateZ( planeAngle-180 ) );
            drawPlaneModel( mvPlane );
            break;

        case 1:
            mv = lookAt( vec3(250.0, 0.0, 100.0+height), vec3(0.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0) );
            drawScenery( mv );

            drawCarGeneric( mult(mv, car1World), BLUE );
            drawCarGeneric( mult(mv, car2World), RED );

            // plane
            var mvPlane1 = mult( mv, translate( pPos.x, pPos.y, planeHeight ) );
            mvPlane1 = mult( mvPlane1, rotateZ( planeAngle-180 ) );
            drawPlaneModel( mvPlane1 );
            break;

        case 2:
            mv = lookAt( vec3(75.0, 0.0, 5.0+height), vec3(car1X, car1Y, 0.0), vec3(0.0, 0.0, 1.0 ) );
            drawScenery( mv );

            drawCarGeneric( mult(mv, car1World), BLUE );
            drawCarGeneric( mult(mv, car2World), RED );

            var mvPlane2 = mult( mv, translate( pPos.x, pPos.y, planeHeight ) );
            mvPlane2 = mult( mvPlane2, rotateZ( planeAngle-180 ) );
            drawPlaneModel( mvPlane2 );
            break;

        case 3:
            mv = lookAt( vec3(125.0, 0.0, 5.0+height), vec3(car1X, car1Y, 0.0), vec3(0.0, 0.0, 1.0 ) );
            drawScenery( mv );

            drawCarGeneric( mult(mv, car1World), BLUE );
            drawCarGeneric( mult(mv, car2World), RED );

            mvPlane2 = mult( mv, translate( pPos.x, pPos.y, planeHeight ) );
            mvPlane2 = mult( mvPlane2, rotateZ( planeAngle-180 ) );
            drawPlaneModel( mvPlane2 );
            break;


        case 4: // driver's point of view (car1)
            {
                var rad = radians(car1Direction);
                // tangent forward vector for position parametrization
                var forward = { x: -Math.sin(rad), y: Math.cos(rad) };
                var back = { x: -forward.x, y: -forward.y };

                var eye = vec3(car1X + back.x*3.0, car1Y + back.y*3.0, 5.0 + height);
                var at  = vec3(car1X + forward.x*12.0, car1Y + forward.y*12.0, 2.0 + height);
                mv = lookAt( eye, at, vec3(0.0, 0.0, 1.0 ) );

                drawScenery( mv );

                drawCarGeneric( mult(mv, car1World), BLUE );
                drawCarGeneric( mult(mv, car2World), RED );

                var mvPlane4 = mult( mv, translate( pPos.x, pPos.y, planeHeight ) );
                mvPlane4 = mult( mvPlane4, rotateZ( planeAngle-180 ) );
                drawPlaneModel( mvPlane4 );
            }
            break;

        case 5:
            {
                // view 5: drive around while looking at a house (camera attached to car1 viewpoint)
                var rad5 = radians(car1Direction);
                var forward5 = { x: -Math.sin(rad5), y: Math.cos(rad5) };
                var eye5 = vec3(car1X + -forward5.x*3.0, car1Y + -forward5.y*3.0, 5.0+height);
                var at5 = vec3(40.0, 120.0, 0.0);
                mv = lookAt( eye5, at5, vec3(0.0,0.0,1.0) );

                drawScenery( mv );

                drawCarGeneric( mult(mv, car1World), BLUE );
                drawCarGeneric( mult(mv, car2World), RED );

                var mvPlane5 = mult( mv, translate( pPos.x, pPos.y, planeHeight ) );
                mvPlane5 = mult( mvPlane5, rotateZ( planeAngle-180 ) );
                drawPlaneModel( mvPlane5 );
            }
            break;

        case 6:
            {
                // behind and above the car1
                var rad6 = radians(car1Direction);
                var forward6 = { x: -Math.sin(rad6), y: Math.cos(rad6) };
                // camera placed behind & up relative to car1
                var eye6 = vec3(car1X - forward6.x*12.0, car1Y - forward6.y*12.0, 10.0 + height);
                var at6  = vec3(car1X, car1Y, 4.0);
                mv = lookAt( eye6, at6, vec3(0.0,0.0,1.0) );

                drawScenery( mv );
                drawCarGeneric( mult(mv, car1World), BLUE );
                drawCarGeneric( mult(mv, car2World), RED );

                var mvPlane6 = mult( mv, translate( pPos.x, pPos.y, planeHeight ) );
                mvPlane6 = mult( mvPlane6, rotateZ( planeAngle-180 ) );
                drawPlaneModel( mvPlane6 );
            }
            break;

        case 7:
            {
                // view 7: from another car in front
                var rad7 = radians(car1Direction);
                var forward7 = { x: -Math.sin(rad7), y: Math.cos(rad7) };
                var eye7 = vec3(car1X + forward7.x*25.0, car1Y + forward7.y*25.0, 8.0 + height);
                var at7  = vec3(car1X, car1Y, 2.0);
                mv = lookAt( eye7, at7, vec3(0.0,0.0,1.0) );

                drawScenery( mv );
                drawCarGeneric( mult(mv, car1World), BLUE );
                drawCarGeneric( mult(mv, car2World), RED );

                var mvPlane7 = mult( mv, translate( pPos.x, pPos.y, planeHeight ) );
                mvPlane7 = mult( mvPlane7, rotateZ( planeAngle-180 ) );
                drawPlaneModel( mvPlane7 );
            }
            break;

        case 8:
            {
                // view 8: beside the car
                var rad8 = radians(car1Direction);
                var forward8 = { x: -Math.sin(rad8), y: Math.cos(rad8) };
                // place camera to side (right) of car
                var right8 = { x: forward8.y, y: -forward8.x }; // perpendicular
                var eye8 = vec3(car1X + right8.x*12.0, car1Y + right8.y*12.0, 6.0 + height);
                var at8  = vec3(car1X, car1Y, 2.0);
                mv = lookAt( eye8, at8, vec3(0.0,0.0,1.0) );

                drawScenery( mv );
                drawCarGeneric( mult(mv, car1World), BLUE );
                drawCarGeneric( mult(mv, car2World), RED );

                var mvPlane8 = mult( mv, translate( pPos.x, pPos.y, planeHeight ) );
                mvPlane8 = mult( mvPlane8, rotateZ( planeAngle-180 ) );
                drawPlaneModel( mvPlane8 );
            }
            break;
    }
    
    requestAnimFrame( render );
}
