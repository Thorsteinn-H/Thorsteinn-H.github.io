// frogger.js
// Fríða verður í friði


// ---------- Config ----------
const CANVAS_SIZE = 512;
const NUM_LANES = 5;        
const CARS_PER_LANE = 2;    
const MAX_TICKS = 10;       

const ROAD_HEIGHT = 0.6;    
const SIDEWALK_HEIGHT = (1 - ROAD_HEIGHT) / 2;

const FROG_SIZE = 0.06;     
const FROG_STEP_X = 0.12;
const FROG_STEP_Y = (ROAD_HEIGHT / NUM_LANES) * 1.0;

// ---------- GL / Shaders ----------
let canvas, gl, program;
let aPositionLoc, uColorLoc, uTransformLoc;

window.onload = function init() {
  canvas = document.getElementById("gl-canvas");
  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) { alert("WebGL isn't available"); return; }

  gl.viewport(0,0,canvas.width,canvas.height);
  gl.clearColor(0.95,1.0,1.0,1.0);

  program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);

  aPositionLoc = gl.getAttribLocation(program, "vPosition");
  uColorLoc = gl.getUniformLocation(program, "uColor");
  uTransformLoc = gl.getUniformLocation(program, "uTransform");

  // Create a buffer for generic rectangle / triangle verts
  createBuffers();

  // Setup game objects
  resetGame();

  // Keyboard
  window.addEventListener("keydown", handleKey);

  // Start loop
  lastTime = performance.now();
  requestAnimationFrame(loop);
};

// ---------- Buffers ----------
let rectBuffer = null;
let triBuffer = null;
function createBuffers(){
  const rectVerts = new Float32Array([
    -0.5, -0.5,
     0.5, -0.5,
    -0.5,  0.5,
    -0.5,  0.5,
     0.5, -0.5,
     0.5,  0.5
  ]);
  rectBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, rectBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, rectVerts, gl.STATIC_DRAW);

  // triangle pointing up, centered at origin
  const triVerts = new Float32Array([
    0.0,  0.6,
   -0.5, -0.4,
    0.5, -0.4
  ]);
  triBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, triBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, triVerts, gl.STATIC_DRAW);
}

// ---------- Game state ----------
let lanes = [];   // each lane: {yCenter, speed, dir, cars: [ {x, w, h, color} ] }
let frog = {};    // {x,y,dirUp}
let score = 0;
let ticks = 0;
let gameOver = false;
let lastTime = 0;

function resetGame(){
  score = 0;
  ticks = 0;
  gameOver = false;
  updateHUD();

  // Setup lanes
  lanes = [];
  const roadTop = 1 - SIDEWALK_HEIGHT;
  const roadBottom = -1 + SIDEWALK_HEIGHT;
  const laneHeight = (roadTop - roadBottom) / NUM_LANES;

  for(let i=0;i<NUM_LANES;i++){
    const laneMid = roadTop - (i + 0.5) * laneHeight;
    const baseSpeed = 0.3 + 0.12 * i; 
    const dir = (i % 2 === 0) ? 1 : -1; 
    const lane = { y: laneMid, speed: baseSpeed * dir, cars: [] };

    for(let c=0;c<CARS_PER_LANE;c++){
      const x = -1.5 + Math.random() * 3.0 + c * 0.8;
      const w = 0.24 + Math.random() * 0.18;
      const h = laneHeight * 0.65;
      const color = randomCarColor();
      lane.cars.push({x,w,h,color});
    }
    lanes.push(lane);
  }

  frog.x = 0;
  frog.y = -1 + SIDEWALK_HEIGHT / 2;
  frog.dirUp = true; 
}

// ---------- Utilities ----------
function randomCarColor(){
  const palette = [
    [0.85,0.18,0.18,1.0], // rauður
    [0.18,0.5,0.85,1.0],  // blár
    [0.18,0.8,0.2,1.0],   // grænn
    [0.9,0.6,0.1,1.0],    // appelsínu
    [0.6,0.18,0.85,1.0]   // fjólublár
  ];
  return palette[Math.floor(Math.random()*palette.length)]; //Gefur random lit því af hverju ekki
}

function makeTransform(tx,ty, sx,sy, rotateRad=0){
  const c = Math.cos(rotateRad), s = Math.sin(rotateRad);
  // scale * rotation, and translation
  return new Float32Array([
    sx * c, sy * -s, 0.0,
    sx * s, sy *  c, 0.0,
    tx,     ty,     1.0
  ]);
}

// Collision check hlutur
function checkCollision(fx, fy, carX, carY, halfW, halfH){
  const frogHalf = FROG_SIZE;
  if (Math.abs(fx - carX) <= (frogHalf + halfW) &&
      Math.abs(fy - carY) <= (frogHalf + halfH)) return true;
  return false;
}

// ---------- Input ----------
function handleKey(e){
  if (gameOver) {
    // press R to restart
    if (e.key === 'r' || e.key === 'R') {
      resetGame();
    }
    return;
  }
  switch(e.keyCode){
    case 37: // left
      frog.x = Math.max(-1 + FROG_SIZE, frog.x - FROG_STEP_X);
      break;
    case 39: // right
      frog.x = Math.min(1 - FROG_SIZE, frog.x + FROG_STEP_X);
      break;
    case 38: // up
      frog.y = Math.min(1 - FROG_SIZE, frog.y + FROG_STEP_Y);
      frog.dirUp = true;
      break;
    case 40: // down
      frog.y = Math.max(-1 + FROG_SIZE, frog.y - FROG_STEP_Y);
      frog.dirUp = false;
      break;
  }
}

// ---------- HUD ----------
function updateHUD(){
  document.getElementById("score").innerText = `Stig: ${score}`;
  const ticksDiv = document.getElementById("ticks");
  ticksDiv.innerHTML = '';
  for(let i=0;i<ticks;i++){
    const span = document.createElement("span");
    span.style.display = "inline-block";
    span.style.width = "18px";
    span.style.height = "6px";
    span.style.marginRight = "4px";
    span.style.background = "#333";
    ticksDiv.appendChild(span);
  }
}

// ---------- Game loop ----------
function loop(now){
  const dt = (now - lastTime) / 1000.0; // seconds
  lastTime = now;
  update(dt);
  render();
  if (!gameOver) requestAnimationFrame(loop);
}

//Uppfæra bílana til að hreyfa
function update(dt){
  const wrapX = 1.6;
  lanes.forEach(lane => {
    lane.cars.forEach(car => {
      car.x += lane.speed * dt;
      if (car.x > wrapX) car.x = -wrapX;
      if (car.x < -wrapX) car.x = wrapX;
    });
  });

 
  const roadTop = 1 - SIDEWALK_HEIGHT;
  const roadBottom = -1 + SIDEWALK_HEIGHT;
  if (frog.y < roadTop && frog.y > roadBottom) {
    for (let i=0;i<lanes.length;i++){
      const lane = lanes[i];
      const laneCenter = lane.y;
      const laneHeight = (roadTop - roadBottom) / NUM_LANES;
      const halfH = laneHeight * 0.5 * 0.65; 
      lane.cars.forEach(car => {
        if (checkCollision(frog.x, frog.y, car.x, laneCenter, car.w*0.5, halfH)) {
          frog.x = 0;
          frog.y = -1 + SIDEWALK_HEIGHT / 2;
          frog.dirUp = true;
        }
      });
    }
  } else {
    const topSideY = 1 - SIDEWALK_HEIGHT / 2;
    const bottomSideY = -1 + SIDEWALK_HEIGHT / 2;
    if (Math.abs(frog.y - topSideY) < 0.02 && frog.dirUp) {
      score++;
      ticks++;
      updateHUD();
      frog.dirUp = true; 
  
      frog.x = 0;
      frog.y = -1 + SIDEWALK_HEIGHT / 2;
      if (ticks >= MAX_TICKS) {
        gameOver = true;
        showGameOver();
      }
    } 
  }
}

function showGameOver(){
  setTimeout(()=> alert(`Leik lokið! Þú náðir ${score} stigum.\nÝttu R til að endurræsa.`), 50);
}

// ---------- Rendering ----------
function clearScreen(){
  gl.clear(gl.COLOR_BUFFER_BIT);
}

function render(){
  clearScreen();

  drawBackground();
  drawLaneSeparators();
  drawCars();
  drawFrog();
}

function drawBackground(){
  const sidewalkTopY = 1 - SIDEWALK_HEIGHT/2;
  const sidewalkBottomY = -1 + SIDEWALK_HEIGHT/2;
  const roadCenterY = 0;
  const roadHalfHeight = ROAD_HEIGHT / 2;

  drawRect(0, sidewalkTopY, 2.0, SIDEWALK_HEIGHT, [0.9,0.9,0.95,1.0]);
  drawRect(0, sidewalkBottomY, 2.0, SIDEWALK_HEIGHT, [0.9,0.9,0.95,1.0]);
  drawRect(0, roadCenterY, 2.0, ROAD_HEIGHT, [0.2,0.2,0.2,1.0]);
}

function drawLaneSeparators(){
  const roadTop = 1 - SIDEWALK_HEIGHT;
  const roadBottom = -1 + SIDEWALK_HEIGHT;
  const laneHeight = (roadTop - roadBottom) / NUM_LANES;
  for(let i=1;i<NUM_LANES;i++){
    const y = roadTop - i * laneHeight;
    drawRect(0, y, 2.0, 0.006, [1.0,1.0,1.0,0.12]);
  }
}

function drawCars(){
  lanes.forEach(lane => {
    lane.cars.forEach(car => {
      drawRect(car.x, lane.y, car.w, car.h, car.color);
    });
  });
}

function drawFrog(){
  const color = [0.1, 0.8, 0.2, 1.0]; // grænn
  const rotate = frog.dirUp ? 0 : Math.PI;
  const sx = FROG_SIZE * 1.2;
  const sy = FROG_SIZE * 1.2;
  drawTriangle(frog.x, frog.y, sx, sy, rotate, color);
}

// ---------- draw helpers ----------
function drawRect(cx, cy, w, h, color){
  gl.bindBuffer(gl.ARRAY_BUFFER, rectBuffer);
  gl.vertexAttribPointer(aPositionLoc, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPositionLoc);
  gl.uniform4fv(uColorLoc, color);
  const m = makeTransform(cx, cy, w, h, 0.0);
  gl.uniformMatrix3fv(uTransformLoc, false, m);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function drawTriangle(cx, cy, sx, sy, rot, color){
  gl.bindBuffer(gl.ARRAY_BUFFER, triBuffer);
  gl.vertexAttribPointer(aPositionLoc, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPositionLoc);
  gl.uniform4fv(uColorLoc, color);
  const m = makeTransform(cx, cy, sx, sy, rot);
  gl.uniformMatrix3fv(uTransformLoc, false, m);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}



