var canvas = null;		//A reference to our canvas element
var gl = null;			//A reference to the WebGL context
var ext = null;			//Handler for WebGL's Vertex Array Object extension

var viewMatrix;
var modelMatrix;

var positionLocation;
var textureLocation;

var shaderProgram;
var textureHandler;

var triangleVAO;

var squareRotation = 0.0;
var lastSquareUpdateTime = 0;
var mvMatrixStack = [];
var modelLocation;

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

	gl.clearColor(0.0, 0.0, 0.0, 0.85);
	gl.clearDepth(1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);

	//SET UP THE VARIOUS COORDINATE-SPACE MATRICES
	viewMatrix = makePerspective(45, canvas.width/canvas.height, 0.1, 100.0);
	modelMatrix = Matrix.I(4);
	multi(Matrix.Translation($V([0.0, 0.0, -6.4])).ensure4x4());

	initShaders();
	initBuffers();
	initTextures();

	//Our main loop
	setInterval(renderScene, 15);
}

function renderScene() {
	gl.viewport(0, 0, canvas.width, canvas.height);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	
	ext.bindVertexArrayOES(triangleVAO);
		//gl.useProgram(shaderProgram);
		mvPushMatrix();
		mvRotate(squareRotation, [1, 0, 1]);
		
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, textureHandler);
		updateModel();
		gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);

		mvPopMatrix();
	ext.bindVertexArrayOES(null);
	

	var currentTime = Date.now();
	if(lastSquareUpdateTime){
		var delta = currentTime - lastSquareUpdateTime;
		squareRotation += (30 * delta) / 1000.0;
	}
	lastSquareUpdateTime = currentTime;

	//console.log(squareRotation);

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
	textureLocation = gl.getAttribLocation(shaderProgram, "textureCoord");
	
	//SET THE UNIFORM VARIABLES
	gl.useProgram(shaderProgram);

		gl.uniform1i(gl.getUniformLocation(shaderProgram, "uSampler"), 0);

		var viewLocation = gl.getUniformLocation(shaderProgram, "view");
		gl.uniformMatrix4fv(viewLocation, false, new Float32Array(viewMatrix.flatten()));

		modelLocation = gl.getUniformLocation(shaderProgram, "model");
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
		console.error("Error in shader compilation: " + gl.getShaderInfoLog(shader));
		return null;
	}

	return shader;
}

function initTextures(){
	textureHandler = gl.createTexture();
	textureHandler.crossOrigin = "anonymous";
	textureHandler.image = new Image();
	textureHandler.image.crossOrigin = "anonymous";
	textureHandler.image.onload = function(){
		handleTexture(textureHandler);
	};
	textureHandler.image.src = "https://raw.githubusercontent.com/SimonJinaphant/3DExperimentsJS/master/img/stone.png";
}

function handleTexture(handler){
	gl.bindTexture(gl.TEXTURE_2D, handler);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, handler.image);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.generateMipmap(gl.TEXTURE_2D);

	gl.bindTexture(gl.TEXTURE_2D, null);

}

function initBuffers(){
	
	//VERTEX ARRAY OBJECT
	triangleVAO = ext.createVertexArrayOES();
	ext.bindVertexArrayOES(triangleVAO);

		var trianglePosition = [
  // Front face
  -1.0, -1.0,  1.0,
   1.0, -1.0,  1.0,
   1.0,  1.0,  1.0,
  -1.0,  1.0,  1.0,
  
  // Back face
  -1.0, -1.0, -1.0,
  -1.0,  1.0, -1.0,
   1.0,  1.0, -1.0,
   1.0, -1.0, -1.0,
  
  // Top face
  -1.0,  1.0, -1.0,
  -1.0,  1.0,  1.0,
   1.0,  1.0,  1.0,
   1.0,  1.0, -1.0,
  
  // Bottom face
  -1.0, -1.0, -1.0,
   1.0, -1.0, -1.0,
   1.0, -1.0,  1.0,
  -1.0, -1.0,  1.0,
  
  // Right face
   1.0, -1.0, -1.0,
   1.0,  1.0, -1.0,
   1.0,  1.0,  1.0,
   1.0, -1.0,  1.0,
  
  // Left face
  -1.0, -1.0, -1.0,
  -1.0, -1.0,  1.0,
  -1.0,  1.0,  1.0,
  -1.0,  1.0, -1.0

		];


		var triangleIndices = [
  0,  1,  2,      0,  2,  3,    // front
  4,  5,  6,      4,  6,  7,    // back
  8,  9,  10,     8,  10, 11,   // top
  12, 13, 14,     12, 14, 15,   // bottom
  16, 17, 18,     16, 18, 19,   // right
  20, 21, 22,     20, 22, 23    // left
		];

		var triangleTexture = [
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    // Back
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    // Top
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    // Bottom
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    // Right
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    // Left
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0
		];

		//POSITION BUFFER
		var triangleVBO = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, triangleVBO);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(trianglePosition), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(positionLocation);
		gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

		//COLOR BUFFER
		var triangleTextureVBO = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, triangleTextureVBO);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleTexture), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(textureLocation);
		gl.vertexAttribPointer(textureLocation, 2, gl.FLOAT, false, 0, 0);

		//INDICES BUFFER
		var triangleEBO = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleEBO);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(triangleIndices), gl.STATIC_DRAW);


	ext.bindVertexArrayOES(null);
}

function updateModel(){
	gl.uniformMatrix4fv(modelLocation, false, new Float32Array(modelMatrix.flatten()));
}

function multi(m){
	modelMatrix = modelMatrix.x(m);
}

function mvPushMatrix(m){
	if(m){
		mvMatrixStack.push(m.dup());
		modelMatrix = m.dup();
	} else {
		mvMatrixStack.push(modelMatrix.dup());
	}
}

function mvPopMatrix(){
	if(!mvMatrixStack.length){
		throw("Can't pop anymore");
	}
	modelMatrix = mvMatrixStack.pop();
	return modelMatrix;
}

function mvRotate(angle, v){
	var inRadians = angle * Math.PI / 180.0;
	var m = Matrix.Rotation(inRadians, $V([v[0], v[1], v[2]])).ensure4x4();
	multi(m);
}