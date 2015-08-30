var canvas;			//A reference to our canvas element
var gl = null;		//A reference to the WebGL context
var positionLocation;
var shaderProgram;
var triangleVBO;
var triangleVAO;
var ext;

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

	initShaders();
	initBuffers();

	//Our main loop
	setInterval(renderScene, 15);
	
}

function renderScene() {
	gl.viewport(0, 0, canvas.width, canvas.height);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	ext.bindVertexArrayOES(triangleVAO);
	
	gl.useProgram(shaderProgram);
	gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
	ext.bindVertexArrayOES(null);
}

function initShaders(){
	var vertexShader = getShader(gl, "shader-vs");
	var fragmentShader = getShader(gl, "shader-fs");

	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if(!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)){
		alert("Unable to init shader program");
	}

	positionLocation = gl.getAttribLocation(shaderProgram, "position");
}

function getShader (gl, id) {
	var shaderScript, source, currentChild, shader;

	shaderScript = document.getElementById(id);
	if(!shaderScript){ return null; }

	source = "";
	currentChild = shaderScript.firstChild;
	while(currentChild){
		if(currentChild.nodeType == currentChild.TEXT_NODE){
			source += currentChild.textContent;
		}
		currentChild = currentChild.nextSibling;
	}
	
	if(shaderScript.type == 'x-shader/x-vertex'){
		shader = gl.createShader(gl.VERTEX_SHADER);
	} else if(shaderScript.type == "x-shader/x-fragment"){
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	} else {
		return null;
	}

	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
		alert("Error in shader compilation: " + gl.getShaderInfoLog(shader));
		return null;
	}

	return shader;
}

function initBuffers(){
	ext = gl.getExtension("OES_vertex_array_object");
	triangleVAO = ext.createVertexArrayOES();
	ext.bindVertexArrayOES(triangleVAO);

	triangleVBO = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, triangleVBO);

	var triangleVertices = [
		0.5, 0.5, 0,
		0.5, -0.5, 0,
		-0.5, -0.5, 0,
		-0.5, 0.5, 0
	];

	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.STATIC_DRAW);

	triangleEBO = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleEBO);
	var indices = [0,1,3,1,2,3];
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

	gl.enableVertexAttribArray(positionLocation);
	gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

	ext.bindVertexArrayOES(null);
}
