var canvas;
var gl;

function startGL() {
    canvas = document.getElementById("mainCanvas");
    getWebGLContext(canvas);
  
    if (gl) {
        gl.clearColor(0.7, 0.3, 0.5, 1.0);
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);

        //Our main loop
        setInterval(renderScene, 15);
    }
}

function getWebGLContext() {
    gl = null;
  
    try {
        gl = canvas.getContext("webgl");
    } catch(e) {}

    if (!gl) {
        alert("Cannot initialize WebGL. Your browser may not support it.");
    }
}

function renderScene() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

}