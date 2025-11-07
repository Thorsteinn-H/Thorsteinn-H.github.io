// triis.js
// tetris nema bara 3 blokkir

var canvas = document.getElementById('gl-canvas');
var gl = WebGLUtils.setupWebGL(canvas);
if(!gl) alert("WebGL isn't available");

let camRadius = 50.0;
var movement = false;
var rotY = -45;  // Rotation around Y axis (horizontal rotation)
var camHeight = 12;  // Camera height (vertical position)
var zDist = -20.0;   // controls zoom distance
var origX;
var origY;

const CUBE_SCALE = 0.5;

let gameOver = false;

let renderId = null;
let tickId = null;

// Mouse orbit control
canvas.addEventListener("mousedown", function(e){
  movement = true;
  origX = e.clientX;
  origY = e.clientY;
  e.preventDefault();
});

canvas.addEventListener("mouseup", function(){
  movement = false;
});

canvas.addEventListener("mousemove", function(e){
  if (movement) {
    // Mouse X movement rotates around Y axis (horizontal rotation)
    rotY = (rotY + (e.clientX - origX)) % 360;
    
    // Mouse Y movement changes camera height
    camHeight = camHeight + (origY - e.clientY) * 0.1;
    
    // Limit height range
    camHeight = Math.max(-20, Math.min(20, camHeight));
    
    origX = e.clientX;
    origY = e.clientY;
  }
});

// Scroll to zoom
canvas.addEventListener("wheel", function(e) {
  e.preventDefault();
  zDist += e.deltaY * 0.05;
  if (zDist < 10) zDist = 10;
    if (zDist > 150) zDist = 150;
      }, 
{ 
  passive: false 
});

// Tónlist shit
const calmTrack = document.getElementById("bgm-calm");
const intenseTrack = document.getElementById("bgm-intense");
const musicBtn = document.getElementById("musicBtn");

let musicEnabled = false;
let intenseMode = false; 

function playTrack(track) {
  calmTrack.pause();
  intenseTrack.pause();

  track.currentTime = 0;
  track.volume = 0.4;
  track.play().catch(err => {
    console.warn("Autoplay blocked until user interaction.");
  });
}

function toggleMusic() {
  if (musicEnabled) {
    calmTrack.pause();
    intenseTrack.pause();
    musicBtn.textContent = "Tónlist (af)";
  } else {
    playTrack(intenseMode ? intenseTrack : calmTrack);
    musicBtn.textContent = "Tónlist (á)";
  }
  musicEnabled = !musicEnabled;
}

// Autoplay after first key press (if not already playing)
window.addEventListener("keydown", () => {
  if (!musicEnabled) toggleMusic();
}, { once: true });

// start music
window.addEventListener("keydown", () => {
  if (!musicEnabled) toggleMusic();
}, { once: true });


function activateEffect() {
  const effectCanvas = document.getElementById("effectCanvas");
  if (window.effectActive) return; // avoid double activation
  window.effectActive = true;

  effectCanvas.style.display = "block";

  
  if (typeof startEffect === "function") {
    startEffect(effectCanvas);
  } else {
    console.error("startEffect() not found in effects.js");
  }
}

// Shader program and other existing code remains the same...
var program = initShaders(gl, 'vertex-shader', 'fragment-shader');
gl.useProgram(program);

// locations
var vPosition = gl.getAttribLocation(program, 'vPosition');
var projLoc = gl.getUniformLocation(program, 'projection');
var mvLoc = gl.getUniformLocation(program, 'modelview');
var colorLoc = gl.getUniformLocation(program, 'fColor');

// Game grid setup
const GRID_W = 6;   // width (x)
const GRID_D = 6;   // depth (z)  
const GRID_H = 20;  // height (y)
const CELL = 0.5;   // cube spacing


// Clear the grid completely - Y IS HEIGHT
let grid = [];
for (let x = 0; x < GRID_W; x++) {
  grid[x] = [];
  for (let z = 0; z < GRID_D; z++) {  // z is depth
    grid[x][z] = new Array(GRID_H).fill(null);  // y is height
  }
}



// Model for a unit cube centered at origin (36 vertices)
var cubeVertices = [
// front
-0.5, 0.5, 0.5, -0.5,-0.5,0.5, 0.5,-0.5,0.5,
0.5,-0.5,0.5, 0.5,0.5,0.5, -0.5,0.5,0.5,
// right
0.5,0.5,0.5, 0.5,-0.5,0.5, 0.5,-0.5,-0.5,
0.5,-0.5,-0.5, 0.5,0.5,-0.5, 0.5,0.5,0.5,
// bottom
0.5,-0.5,0.5, -0.5,-0.5,0.5, -0.5,-0.5,-0.5,
-0.5,-0.5,-0.5, 0.5,-0.5,-0.5, 0.5,-0.5,0.5,
// top
0.5,0.5,-0.5, -0.5,0.5,-0.5, -0.5,0.5,0.5,
-0.5,0.5,0.5, 0.5,0.5,0.5, 0.5,0.5,-0.5,
// back
-0.5,-0.5,-0.5, -0.5,0.5,-0.5, 0.5,0.5,-0.5,
0.5,0.5,-0.5, 0.5,-0.5,-0.5, -0.5,-0.5,-0.5,
// left
-0.5,0.5,-0.5, -0.5,-0.5,-0.5, -0.5,-0.5,0.5,
-0.5,-0.5,0.5, -0.5,0.5,0.5, -0.5,0.5,-0.5
];

// make buffers
var cubeBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cubeVertices), gl.STATIC_DRAW);

gl.enableVertexAttribArray(vPosition);
gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);

gl.enable(gl.DEPTH_TEST);
gl.clearColor(0.0, 0.0, 0.0, 1.0);

// Rendering
// Update the drawCube function
function drawCube(baseMv, x, y, z, color) {
  let modelMv = mat4();
  modelMv = mult(modelMv, translate(x * CELL, y * CELL, z * CELL));
  modelMv = mult(modelMv, scalem(CUBE_SCALE, CUBE_SCALE, CUBE_SCALE)); // Scale down
  
  let fullMv = mult(baseMv, modelMv);
  gl.uniformMatrix4fv(mvLoc, false, flatten(fullMv));
  gl.uniform4fv(colorLoc, color);
  gl.drawArrays(gl.TRIANGLES, 0, 36);
}


let piece = null;
let fast = false;
let timer = 0;

function makePiece() {
  const shapes = [
    { cells: [[0, 0, 0], [1, 0, 0], [2, 0, 0]], name: "straight" },
    { cells: [[0, 0, 0], [1, 0, 0], [0, 1, 0]], name: "corner" },
    { cells: [[0, 0, 0], [1, 0, 0], [1, 1, 0]], name: "diagonal" }
  ];
  
  const shape = shapes[Math.floor(Math.random() * shapes.length)];
  
  return {
    pos: [0, GRID_H - 1, 0], //Spawn at 0,height,0 (center X, top Y, center Z)
    cells: shape.cells,
    color: [Math.random() * 0.8 + 0.2, Math.random() * 0.8 + 0.2, Math.random() * 0.8 + 0.2, 1.0],
    name: shape.name
  };
}

function spawn() {
  // Only spawn if no current piece exists
  if (!piece) {
    piece = makePiece();
    console.log("SPAWNED NEW PIECE:", piece.name, "at:", piece.pos);
  }
}

// Collision detection aligned with centered grid
function collides(cells, pos) {
  const halfW = Math.floor(GRID_W / 2);
  const halfD = Math.floor(GRID_D / 2);

  for (let [x, y, z] of cells) {
    const gx = pos[0] + x;
    const gy = pos[1] + y;
    const gz = pos[2] + z;

    // Convert centered world coords → grid indices
    const ix = gx + halfW;
    const iz = gz + halfD;
    const iy = gy;

    // Boundary checks
    if (ix < 0 || ix >= GRID_W || iz < 0 || iz >= GRID_D || iy < 0) {
      return true;
    }

    // Occupied cell check (only if within valid grid)
    if (iy < GRID_H && grid[ix] && grid[ix][iz] && grid[ix][iz][iy]) {
      return true;
    }
  }
  return false;
}


// --- Rotation helpers ---
function rotatePieceX(cells) {
  return cells.map(([x, y, z]) => [x, -z, y]);
}

function rotatePieceY(cells) {
  return cells.map(([x, y, z]) => [z, y, -x]);
}

function rotatePieceZ(cells) {
  return cells.map(([x, y, z]) => [-y, x, z]);
}


// Game over trigger
function triggerGameOver() {
  gameOver = true;
  document.getElementById("gameover").style.display = "block";

  // Cancel loops if running
  if (renderId !== null) {
    cancelAnimationFrame(renderId);
    renderId = null;
  }
  if (tickId !== null) {
    cancelAnimationFrame(tickId);
    tickId = null;
  }
}


function updateHeight() {
  let highest = 0;
  for (let y = GRID_H - 1; y >= 0; y--) {
    for (let x = 0; x < GRID_W; x++) {
      for (let z = 0; z < GRID_D; z++) {
        if (grid[x][z][y]) {
          highest = y + 1;
          document.getElementById("height").textContent = `Núverandi hæð: ${highest}`;
          
          // Game Over check
          if (highest >= 20 && !gameOver) {
            triggerGameOver();
          }
          return;
        }
      }
    }
  }
  document.getElementById("height").textContent = "Núverandi hæð: 0";
}


//Lock piece
function lockPiece() {
  const halfW = Math.floor(GRID_W / 2);
  const halfD = Math.floor(GRID_D / 2);

  for (let [x, y, z] of piece.cells) {
    const gx = piece.pos[0] + x;
    const gy = piece.pos[1] + y;
    const gz = piece.pos[2] + z;

    const ix = gx + halfW;
    const iz = gz + halfD;
    const iy = gy;

    if (
      ix >= 0 && ix < GRID_W &&
      iz >= 0 && iz < GRID_D &&
      iy >= 0 && iy < GRID_H
    ) {
      grid[ix][iz][iy] = piece.color;
    }
  }

  // Update score + height display
  clearLayers();
  updateHeight();
}


let score = 0;  //Change to 100 for suprise

// Clear full layers
function clearLayers() {
  let layersCleared = 0;
  
  for (let y = 0; y < GRID_H; y++) {
    let full = true;
    for (let x = 0; x < GRID_W; x++) {
      for (let z = 0; z < GRID_D; z++) {
        if (!grid[x][z][y]) full = false;
      }
    }

    if (full) {
      layersCleared++;

      // Shift layers down
      for (let yy = y; yy < GRID_H - 1; yy++) {
        for (let x = 0; x < GRID_W; x++) {
          for (let z = 0; z < GRID_D; z++) {
            grid[x][z][yy] = grid[x][z][yy + 1];
          }
        }
      }

      // Clear top layer
      for (let x = 0; x < GRID_W; x++) {
        for (let z = 0; z < GRID_D; z++) {
          grid[x][z][GRID_H - 1] = null;
        }
      }

      y--;
    }
  }

  // Update score
  if (layersCleared > 0) {
    score += layersCleared;
    document.getElementById("score").textContent = `Stig: ${score}`;
    
    if (score >= 100) {
      activateEffect();
    }
if (score >= 100 && !intenseMode) {
  intenseMode = true;
  if (musicEnabled) {
    calmTrack.volume = 0.3;
    const fade = setInterval(() => {
      calmTrack.volume = Math.max(0, calmTrack.volume - 0.02);
      if (calmTrack.volume <= 0.01) {
        clearInterval(fade);
        calmTrack.pause();
        playTrack(intenseTrack);
      }
    }, 150);
  }
  //Da ORB
  const orbCanvas = document.createElement("canvas");
  startEffect(orbCanvas);
}

  }
}

//  Grid Position Adjustment
let gridXOffset = -0.25;    
let gridYOffset = -0.3; 
let gridZOffset = -0.25;    

function drawGrid(mv) {
  const previousBuffer = gl.getParameter(gl.ARRAY_BUFFER_BINDING);
  
  // Blue floor
  const floorVerts = [
    vec3(-GRID_W / 2 * CELL + gridXOffset, gridYOffset, -GRID_D / 2 * CELL + gridZOffset),
    vec3(GRID_W / 2 * CELL + gridXOffset, gridYOffset, -GRID_D / 2 * CELL + gridZOffset),
    vec3(GRID_W / 2 * CELL + gridXOffset, gridYOffset, GRID_D / 2 * CELL + gridZOffset),
    vec3(-GRID_W / 2 * CELL + gridXOffset, gridYOffset, GRID_D / 2 * CELL + gridZOffset)
  ];

  const floorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, floorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(floorVerts), gl.STATIC_DRAW);
  gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);

  gl.uniform4fv(colorLoc, [0.0, 0.0, 1.0, 0.3]);
  gl.uniformMatrix4fv(mvLoc, false, flatten(mv));
  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

  // outer edges of the grid
  gl.uniform4fv(colorLoc, [0.3, 0.3, 0.3, 1.0]);
  
  let lines = [];

  const halfW = (GRID_W / 2) * CELL;
  const halfD = (GRID_D / 2) * CELL;
  const height = GRID_H * CELL;

  // Floor edges 
  lines.push(vec3(-halfW + gridXOffset, gridYOffset, -halfD + gridZOffset), vec3(halfW + gridXOffset, gridYOffset, -halfD + gridZOffset));
  lines.push(vec3(halfW + gridXOffset, gridYOffset, -halfD + gridZOffset), vec3(halfW + gridXOffset, gridYOffset, halfD + gridZOffset));
  lines.push(vec3(halfW + gridXOffset, gridYOffset, halfD + gridZOffset), vec3(-halfW + gridXOffset, gridYOffset, halfD + gridZOffset));
  lines.push(vec3(-halfW + gridXOffset, gridYOffset, halfD + gridZOffset), vec3(-halfW + gridXOffset, gridYOffset, -halfD + gridZOffset));
  
  // Vertical corners 
  lines.push(vec3(-halfW + gridXOffset, gridYOffset, -halfD + gridZOffset), vec3(-halfW + gridXOffset, height, -halfD + gridZOffset));
  lines.push(vec3(halfW + gridXOffset, gridYOffset, -halfD + gridZOffset), vec3(halfW + gridXOffset, height, -halfD + gridZOffset));
  lines.push(vec3(halfW + gridXOffset, gridYOffset, halfD + gridZOffset), vec3(halfW + gridXOffset, height, halfD + gridZOffset));
  lines.push(vec3(-halfW + gridXOffset, gridYOffset, halfD + gridZOffset), vec3(-halfW + gridXOffset, height, halfD + gridZOffset));
  
  // Top square 
  lines.push(vec3(-halfW + gridXOffset, height, -halfD + gridZOffset), vec3(halfW + gridXOffset, height, -halfD + gridZOffset));
  lines.push(vec3(halfW + gridXOffset, height, -halfD + gridZOffset), vec3(halfW + gridXOffset, height, halfD + gridZOffset));
  lines.push(vec3(halfW + gridXOffset, height, halfD + gridZOffset), vec3(-halfW + gridXOffset, height, halfD + gridZOffset));
  lines.push(vec3(-halfW + gridXOffset, height, halfD + gridZOffset), vec3(-halfW + gridXOffset, height, -halfD + gridZOffset));

  // --- Draw grid lines ---
  let gridBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, gridBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(lines), gl.STATIC_DRAW);
  gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
  gl.uniformMatrix4fv(mvLoc, false, flatten(mv));
  gl.drawArrays(gl.LINES, 0, lines.length);

  // --- Draw landing preview (ghost piece) ---
  if (piece) {
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    
    let ghostPos = [...piece.pos];
    // Find where the piece would land
    while (!collides(piece.cells, [ghostPos[0], ghostPos[1] - 1, ghostPos[2]])) {
      ghostPos[1]--;
    }
    
    // Draw ghost piece (semi-transparent)
    gl.uniform4fv(colorLoc, [0.7, 0.7, 0.7, 0.2]);
    for (let [px, py, pz] of piece.cells) {
      let ghostMV = mat4();
      ghostMV = mult(mv, translate(
        (ghostPos[0] + px) * CELL, 
        (ghostPos[1] + py) * CELL, 
        (ghostPos[2] + pz) * CELL
      ));
      ghostMV = mult(ghostMV, scalem(CUBE_SCALE, CUBE_SCALE, CUBE_SCALE));
      gl.uniformMatrix4fv(mvLoc, false, flatten(ghostMV));
      gl.drawArrays(gl.TRIANGLES, 0, 36);
    }
  }

  // Restore the original buffer binding for cube drawing
  gl.bindBuffer(gl.ARRAY_BUFFER, previousBuffer);
  gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
}


// Clear the grid
function resetGrid() {
  grid = [];
  for (let x = 0; x < GRID_W; x++) {
    grid[x] = [];
    for (let z = 0; z < GRID_D; z++) {
      grid[x][z] = new Array(GRID_H).fill(null);
    }
  }
}


// Reset routine
function resetGame() {

    const orbCanvas = document.getElementById("effectCanvas");
    if (orbCanvas) {
        orbCanvas.remove(); 
    }

  // Hide overlay & flags
  document.getElementById("gameover").style.display = "none";
  gameOver = false;

  // Reset data
  resetGrid();
  score = 0;
  document.getElementById("score").textContent = `Stig: ${score}`;
  document.getElementById("height").textContent = "Núverandi hæð: 0";
  piece = null;
  fast = false;
  timer = 0;

  // (re)start loops if not already running
  spawn();
  if (renderId === null) render();
  if (tickId === null) tick();
}


function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  let proj = perspective(45.0, canvas.width / canvas.height, 0.1, 1000.0);

  let eye = vec3(0.0, camHeight, zDist);
  let at = vec3(0.0, 0.0, 0.0);
  let up = vec3(0.0, 1.0, 0.0);

  let mv = lookAt(eye, at, up);
  mv = mult(mv, rotateY(rotY)); // Camera rotation
  
  gl.uniformMatrix4fv(projLoc, false, flatten(proj));
  gl.uniformMatrix4fv(mvLoc, false, flatten(mv));

  // Draw grid
  drawGrid(mv);

  // Use cube buffer for all cube drawing
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
  gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);

  // Draw direction indicators
  // X-axis indicator (Blue)
  gl.uniform4fv(colorLoc, [0.0, 0.0, 1.0, 0.7]); // Blue
  let xIndicatorMV = mat4();
  xIndicatorMV = mult(mv, translate(2, 0, 0)); // X-axis
  xIndicatorMV = mult(xIndicatorMV, scalem(0.2, 0.2, 0.2)); 
  gl.uniformMatrix4fv(mvLoc, false, flatten(xIndicatorMV));
  gl.drawArrays(gl.TRIANGLES, 0, 36);

  // Z-axis indicator (Red)
  gl.uniform4fv(colorLoc, [1.0, 0.0, 0.0, 0.7]); // Red
  let zIndicatorMV = mat4();
  zIndicatorMV = mult(mv, translate(0, 0, 2)); //  Z-axis
  zIndicatorMV = mult(zIndicatorMV, scalem(0.2, 0.2, 0.2)); 
  gl.uniformMatrix4fv(mvLoc, false, flatten(zIndicatorMV));
  gl.drawArrays(gl.TRIANGLES, 0, 36);

  // Draw locked grid cubes (apply centering offset)
  const halfW = Math.floor(GRID_W / 2);
  const halfD = Math.floor(GRID_D / 2);

  for (let x = 0; x < GRID_W; x++) {
    for (let z = 0; z < GRID_D; z++) {
      for (let y = 0; y < GRID_H; y++) {
        if (grid[x][z][y]) {
          // Convert grid index back to centered world coordinates
          const wx = x - halfW;
          const wz = z - halfD;
          drawCube(mv, wx, y, wz, grid[x][z][y]);
        }
      }
    }
  }
  // Draw current falling piece
  if (piece) {
    for (let [px, py, pz] of piece.cells) {
      drawCube(mv, piece.pos[0] + px, piece.pos[1] + py, piece.pos[2] + pz, piece.color);
    }
  }
  

  renderId = requestAnimationFrame(render);
}


// Controls
window.addEventListener('keydown', function (e) {
    if (!piece) return;
    
    let newPos = [...piece.pos];
    let newCells = piece.cells.map(c => [...c]);
    
    switch (e.key) {
        case 'ArrowLeft': //left ArrowLeft
            newPos[0]--;
            if (collides(piece.cells, newPos)) newPos[0]++; // Undo if collision
            break;
        case 'ArrowRight': //right ArrowRight
            newPos[0]++;
            if (collides(piece.cells, newPos)) newPos[0]--; // Undo if collision
            break;
        case 'ArrowUp':   //up ArrowUp
            newPos[2]--;
            if (collides(piece.cells, newPos)) newPos[2]++; // Undo if collision
            break;
        case 'ArrowDown': //down ArrowDown
            newPos[2]++;
            if (collides(piece.cells, newPos)) newPos[2]--; // Undo if collision
            break;
////////////////////////////////örvar takkar fokked svo set aðra möguleika

        case 'j': //left ArrowLeft
            newPos[0]--;
            if (collides(piece.cells, newPos)) newPos[0]++; // Undo if collision
            break;
        case 'l': //right ArrowRight
            newPos[0]++;
            if (collides(piece.cells, newPos)) newPos[0]--; // Undo if collision
            break;
        case 'i':   //up ArrowUp
            newPos[2]--;
            if (collides(piece.cells, newPos)) newPos[2]++; // Undo if collision
            break;
        case 'k': //down ArrowDown
            newPos[2]++;
            if (collides(piece.cells, newPos)) newPos[2]--; // Undo if collision
            break;



        case 'a': newCells = rotatePieceX(newCells); break;
        case 'z': newCells = rotatePieceX(rotatePieceX(rotatePieceX(newCells))); break;
        case 's': newCells = rotatePieceY(newCells); break;
        case 'x': newCells = rotatePieceY(rotatePieceY(rotatePieceY(newCells))); break;
        case 'd': newCells = rotatePieceZ(newCells); break;
        case 'c': newCells = rotatePieceZ(rotatePieceZ(rotatePieceZ(newCells))); break;
        case ' ':
            e.preventDefault(); 
            fast = true;
            break;    
          }   
    
    // For rotations, check if valid
    if (e.key === 'a' || e.key === 'z' || e.key === 's' || e.key === 'x' || e.key === 'd' || e.key === 'c') {
        if (!collides(newCells, piece.pos)) {
            piece.cells = newCells;
        }
    } else if (!collides(piece.cells, newPos)) {
        piece.pos = newPos;
    }
});

window.addEventListener('keyup', function (e) {
    if (e.key === ' ') {
        e.preventDefault(); // prevent any stray scroll again
        fast = false;
    }
});

// Ef game over sýna reset takka
document.addEventListener("DOMContentLoaded", function () {
  const btn = document.getElementById("resetBtn");
  if (btn) {
    btn.addEventListener("click", resetGame);
  } else {
    setTimeout(() => {
      const btnLater = document.getElementById("resetBtn");
      if (btnLater) btnLater.addEventListener("click", resetGame);
    }, 300);
  }
});

// Game loop
timer = 0;
let animationId;
function tick() {
  timer++;
  if (timer > (fast ? 2 : 30)) {
    timer = 0;
    if (piece) {    
      let newPos = [piece.pos[0], piece.pos[1] - 1, piece.pos[2]];
      if (!collides(piece.cells, newPos)) {
        piece.pos = newPos;
      } else {
        lockPiece();
        piece = null;
        spawn();
      }
    }
  }

  tickId = requestAnimationFrame(tick);
}


spawn();
render();
tick();
