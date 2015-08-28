var canvas;
var gl;

function startGL() {
    canvas = document.getElementById("mainCanvas");

    initWebGL(canvas);      // Initialize the GL context
  
    // Only continue if WebGL is available and working
  
    if (gl) {
        gl.clearColor(0.7, 0.3, 0.5, 1.0);
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);

        setInterval(drawScene, 15);
    }
}

function initWebGL() {
    gl = null;
  
    try {
        gl = canvas.getContext("webgl");
    } catch(e) {}
  
  // If we don't have a GL context, give up now

    if (!gl) {
        alert("Unable to initialize WebGL. Your browser may not support it.");
    }
}

function drawScene() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

}