var canvas = null;		//A reference to our canvas element
var gl = null;			//A reference to the WebGL context
var ext = null;			//Handler for WebGL's Vertex Array Object extension

var positionLocation;
var colorLocation;

var shaderProgram;
var triangleVAO;

function initApplication() {
	canvas = document.getElementById("mainCanvas");
		
	try {
		gl = canvas.getContext("webgl");
		ext = gl.getExtension("OES_vertex_array_object");
	}catch(e){
		console.error(e);
	}

	if (!gl) {
		console.error("Failed initialize WebGL. Your browser may not support it.");
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
	var vertexShader = loadShader("shader-vs");
	var fragmentShader = loadShader("shader-fs");

	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if(!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)){
		console.error("Unable to init shader program");
	}

	positionLocation = gl.getAttribLocation(shaderProgram, "position");
	colorLocation = gl.getAttribLocation(shaderProgram, "color");
}

function loadShader(shaderID) {
	var shaderScript, source, currentChild, shader;

	shaderScript = document.getElementById(shaderID);
	if(!shaderScript){
		console.error("Unable to locate shader from the provided shaderID");
		return null;
	}

	source = "";
	currentChild = shaderScript.firstChild;
	while(currentChild){
		if(currentChild.nodeType == currentChild.TEXT_NODE){
			source += currentChild.textContent;
		}
		currentChild = currentChild.nextSibling;
	}
	
	switch(shaderScript.type){
		case 'x-shader/x-vertex':
			shader = gl.createShader(gl.VERTEX_SHADER); break;
		case 'x-shader/x-fragment':
			shader = gl.createShader(gl.FRAGMENT_SHADER); break;
		default:
			console.error("Unknown shader type");
			return null;
	}

	gl.shaderSource(shader, source);
	gl.compileShader(shader);

	if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
		console.error("Error in shader compilation: " + gl.loadShaderInfoLog(shader));
		return null;
	}

	return shader;
}

function initBuffers(){
	
	//VERTEX ARRAY OBJECT
	triangleVAO = ext.createVertexArrayOES();
	ext.bindVertexArrayOES(triangleVAO);

		var trianglePosition = [
			0.5, 0.5, 0.0,		//Top right
			0.5, -0.5, 0.0,		//Bottom right
			-0.5, -0.5, 0.0,	//Bottom left
			-0.5, 0.5, 0.0		//Top left
		];

		var triangleColor = [
			1.0, 1.0, 1.0, 1.0,    // White
			1.0, 0.0, 0.0, 1.0,    // Red
			0.0, 1.0, 0.0, 1.0,    // Green
			0.0, 0.0, 1.0, 1.0     // Blue
		];

		var triangleIndices = [
			0, 1, 3,	//Top right triangle
			1, 2, 3		//Bottom left triangle
		];

		//POSITION BUFFER
		var triangleVBO = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, triangleVBO);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(trianglePosition), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(positionLocation);
		gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

		//COLOR BUFFER
		var triangleColorVBO = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, triangleColorVBO);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleColor), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(colorLocation);
		gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);

		//INDICES BUFFER
		var triangleEBO = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleEBO);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(triangleIndices), gl.STATIC_DRAW);


	ext.bindVertexArrayOES(null);
}
