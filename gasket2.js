  "use strict";

  var canvas;
  var gl;

  var points = [];

  var NumTimesToSubdivide = 4;

  window.onload = function init()
  {
      canvas = document.getElementById( "gl-canvas" );

      gl = WebGLUtils.setupWebGL( canvas );
      if ( !gl ) { alert( "WebGL isn't available" ); }

      var vertices = [
          vec2( -1,  1 ), //A
          vec2(  1,  1 ), //B
          vec2( -1, -1 ), //C
          vec2(  1, -1 )  //D
              // a--b
              // |  |
              // c--d
      ];

      divideSquare(vertices[0], vertices[1], vertices[2], vertices[3], NumTimesToSubdivide);

      gl.viewport( 0, 0, canvas.width, canvas.height );
      gl.clearColor( 0.9, 1.0, 1.0, 1.0 );

      var program = initShaders( gl, "vertex-shader", "fragment-shader" );
      gl.useProgram( program );

      var bufferId = gl.createBuffer();
      gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
      gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );

      var vPosition = gl.getAttribLocation( program, "vPosition" );
      gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 0, 0 );
      gl.enableVertexAttribArray( vPosition );

      render();
  };

function square(a, b, c, d) {
    // a--b
    // |  |
    // c--d
    points.push(a, b, c);
    points.push(b, d, c);
}

//https://www.jakob.at/html5/sierpinskicarpet.html 
function divideSquare(a, b, c, d, count) {
    if (count === 0) {
        square(a, b, c, d);
    } else {

        var grid = [];
        for (let i = 0; i <= 3; i++) {
            let left = mix(a, c, i/3);
            let right = mix(b, d, i/3);
            let row = [];
            for (let j = 0; j <= 3; j++) {
                row.push(mix(left, right, j/3));
            }
            grid.push(row);
        }

        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (i === 1 && j === 1) continue; // Sleppir miðju svo það er ekki bara einn stór kassi af rauðu
                divideSquare(grid[i][j], grid[i][j+1], grid[i+1][j], grid[i+1][j+1], count-1);
            }
        }
    }
}

  function render() {
      gl.clear( gl.COLOR_BUFFER_BIT );
      gl.drawArrays( gl.TRIANGLES, 0, points.length );
  }
