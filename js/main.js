var canvas;			//A reference to our canvas element
var gl = null;		//A reference to the WebGL context

function initApplication() {
	canvas = document.getElementById("mainCanvas");
	
	try {
		gl = canvas.getContext("webgl");
	}catch(e){
		
	}

	if (!gl) {
		alert("Failed initialize WebGL. Your browser may not support it.");
		return;
	}

	gl.clearColor(0.7, 0.3, 0.5, 1.0);
	gl.clearDepth(1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);

	//Our main loop
	setInterval(renderScene, 15);
	
}

function renderScene() {
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}