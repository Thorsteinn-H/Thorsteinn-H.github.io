/////////////////////////////////////////////////////////////////
//    Sýnidæmi í Tölvugrafík
//    Teiknar lítinn þríhyrning þar sem notandinn smellir
//
//    Grunnur: clickpoints -> útvíkkað í TRIANGLES
//    HH/uppfærsla 2025
/////////////////////////////////////////////////////////////////
var canvas;
var gl;

// Hámarksfjöldi þríhyrninga (smella)
var maxNumTriangles = 200;
var index = 0;
var maxNumVertices = 3 * maxNumTriangles;

window.onload = function init() {

    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.95, 1.0, 1.0, 1.0);

    //
    //  Load shaders and initialize attribute buffers
    //
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 8*maxNumVertices, gl.DYNAMIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    canvas.addEventListener("mousedown", function (e) {

        gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);

        // Skjástð í NDC [-1,1]x[-1,1]
        var cx = 2 * e.offsetX / canvas.width - 1;
        var cy = 2 * (canvas.height - e.offsetY) / canvas.height - 1;

        // Stærð þríhyrnings
        var pix = 5; 
        var dx = (2 * pix) / canvas.width;  
        var dy = (2 * pix) / canvas.height;  

        // Þríhyrningur með miðju í (cx, cy):
        // toppur upp, tvær neðri hliðar
        var p0 = vec2(cx,      cy + dy);  // toppur
        var p1 = vec2(cx - dx, cy - dy);  // vinstri
        var p2 = vec2(cx + dx, cy - dy);  // hægri

        if (index + 3 > maxNumVertices) {
            index = 0;
        }

        // Add new point behind the others
        gl.bufferSubData(gl.ARRAY_BUFFER, 8 * index, flatten(p0));
        gl.bufferSubData(gl.ARRAY_BUFFER, 8 * (index + 1), flatten(p1));
        gl.bufferSubData(gl.ARRAY_BUFFER, 8 * (index + 2), flatten(p2));
        index += 3;
    } );

    render();
};

function render() {

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, index);

    window.requestAnimFrame(render);
}
