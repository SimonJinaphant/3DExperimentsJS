//IMPORTANT OPENGL REFERENCES
var canvas = null;		//A reference to our canvas element
var gl = null;			//A reference to the WebGL context
var ext = null;			//Handler for WebGL's Vertex Array Object extension

//MATRICES DATA
var viewMatrix;
var modelMatrix;
var normalMatrix;

//VERTEX ATTRIBUTE LOCATIONS
var positionLocation;
var textureLocation;
var normalLocation;

//UNIFORM LOCATIONS
var modelLocation;
var normalMatrixLocation;

//GL OBJECT HANDLERS
var shaderProgram;
var textureHandler;
var cubeVAO;

//FOR ROTATION TRANSFORMATION
var squareRotation = 0.0;
var lastSquareUpdateTime = 0;
var mvMatrixStack = [];

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
	normalMatrix = modelMatrix;

	initShaders();
	initBuffers();
	initTextures();

	gl.enable(gl.CULL_FACE);
	gl.cullFace(gl.BACK);

	//Our main loop
	setInterval(renderScene, 15);
}

function renderScene() {
	gl.viewport(0, 0, canvas.width, canvas.height);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	ext.bindVertexArrayOES(cubeVAO);
		//gl.useProgram(shaderProgram);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, textureHandler);
		
		mvPushMatrix();
			mvTranslate([-1.7, 0.0, -4.4]);
			mvRotate(squareRotation, [1, 0, 1]);
			updateUniformMatrices();
			gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
		mvPopMatrix();

		mvPushMatrix();
			mvTranslate([0.4, 0.3, -2.4]);
			mvRotate(squareRotation, [0, 1, 1]);
			updateUniformMatrices();
			gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
		mvPopMatrix();

	ext.bindVertexArrayOES(null);
	

	var currentTime = Date.now();
	if(lastSquareUpdateTime){
		squareRotation += (30 * (currentTime - lastSquareUpdateTime)) / 1000.0;
	}
	lastSquareUpdateTime = currentTime;
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

	//DETERMINE THE ATTRIBUTE LOCATIONS FOR THE VERTEX 
	positionLocation = gl.getAttribLocation(shaderProgram, "position");
	textureLocation = gl.getAttribLocation(shaderProgram, "textureCoord");
	normalLocation = gl.getAttribLocation(shaderProgram, "normal");
	
	//DETERMINE THE UNIFORM VARIABLE LOCATIONS
	gl.useProgram(shaderProgram);

		gl.uniform1i(gl.getUniformLocation(shaderProgram, "uSampler"), 0);

		//THE VIEW MATRIX CAN BE SET ONCE SINCE THE CAMERA ISN'T MOVING
		var viewLocation = gl.getUniformLocation(shaderProgram, "view");
		gl.uniformMatrix4fv(viewLocation, false, new Float32Array(viewMatrix.flatten()));

		//DETERMINE THE LOCATION, BUT DON'T UPDATE/SEND DATA TO THEM YET
		modelLocation = gl.getUniformLocation(shaderProgram, "model");
		normalMatrixLocation = gl.getUniformLocation(shaderProgram, "normalM");
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
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.generateMipmap(gl.TEXTURE_2D);

	gl.bindTexture(gl.TEXTURE_2D, null);

}

function initBuffers(){
	
	//VERTEX ARRAY OBJECT
	cubeVAO = ext.createVertexArrayOES();
	ext.bindVertexArrayOES(cubeVAO);

		var positionData = [
			// Front face
			-0.5, -0.5,  0.5,
			0.5, -0.5,  0.5,
			0.5,  0.5,  0.5,
			-0.5,  0.5,  0.5,

			// Back face
			-0.5, -0.5, -0.5,
			-0.5,  0.5, -0.5,
			0.5,  0.5, -0.5,
			0.5, -0.5, -0.5,

			// Top face
			-0.5,  0.5, -0.5,
			-0.5,  0.5,  0.5,
			0.5,  0.5,  0.5,
			0.5,  0.5, -0.5,

			// Bottom face
			-0.5, -0.5, -0.5,
			0.5, -0.5, -0.5,
			0.5, -0.5,  0.5,
			-0.5, -0.5,  0.5,

			// Right face
			0.5, -0.5, -0.5,
			0.5,  0.5, -0.5,
			0.5,  0.5,  0.5,
			0.5, -0.5,  0.5,

			// Left face
			-0.5, -0.5, -0.5,
			-0.5, -0.5,  0.5,
			-0.5,  0.5,  0.5,
			-0.5,  0.5, -0.5
		];

		var normalData = [
			// Front
			0.0,  0.0,  1.0,
			0.0,  0.0,  1.0,
			0.0,  0.0,  1.0,
			0.0,  0.0,  1.0,

			// Back
			0.0,  0.0, -1.0,
			0.0,  0.0, -1.0,
			0.0,  0.0, -1.0,
			0.0,  0.0, -1.0,

			// Top
			0.0,  1.0,  0.0,
			0.0,  1.0,  0.0,
			0.0,  1.0,  0.0,
			0.0,  1.0,  0.0,

			// Bottom
			0.0, -1.0,  0.0,
			0.0, -1.0,  0.0,
			0.0, -1.0,  0.0,
			0.0, -1.0,  0.0,

			// Right
			1.0,  0.0,  0.0,
			1.0,  0.0,  0.0,
			1.0,  0.0,  0.0,
			1.0,  0.0,  0.0,

			// Left
			-1.0,  0.0,  0.0,
			-1.0,  0.0,  0.0,
			-1.0,  0.0,  0.0,
			-1.0,  0.0,  0.0
		];

		var indicesData = [
			0,  1,  2,      0,  2,  3,    // front
			4,  5,  6,      4,  6,  7,    // back
			8,  9,  10,     8,  10, 11,   // top
			12, 13, 14,     12, 14, 15,   // bottom
			16, 17, 18,     16, 18, 19,   // right
			20, 21, 22,     20, 22, 23    // left
		];

		var textureData = [
			0.0, 0.0,
			1.0, 0.0,
			1.0, 1.0,
			0.0, 1.0,
			// Back
			0.0, 0.0,
			1.0, 0.0,
			1.0, 1.0,
			0.0, 1.0,
			// Top
			0.0, 0.0,
			1.0, 0.0,
			1.0, 1.0,
			0.0, 1.0,
			// Bottom
			0.0, 0.0,
			1.0, 0.0,
			1.0, 1.0,
			0.0, 1.0,
			// Right
			0.0, 0.0,
			1.0, 0.0,
			1.0, 1.0,
			0.0, 1.0,
			// Left
			0.0, 0.0,
			1.0, 0.0,
			1.0, 1.0,
			0.0, 1.0
		];

		//POSITION BUFFER
		var positionVBO = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, positionVBO);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positionData), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(positionLocation);
		gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

		//NORMAL BUFFER
		var normalVBO = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, normalVBO);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalData), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(normalLocation);
		gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);

		//TEXTURE BUFFER
		var textureVBO= gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, textureVBO);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureData), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(textureLocation);
		gl.vertexAttribPointer(textureLocation, 2, gl.FLOAT, false, 0, 0);

		//INDICES BUFFER
		var indicesEBO = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesEBO);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indicesData), gl.STATIC_DRAW);


	ext.bindVertexArrayOES(null);
}

function updateUniformMatrices(){
	//THESE TWO UNIFORM MATRICES MUST BE UPDATED PERIODICALLY
	gl.uniformMatrix4fv(modelLocation, false, new Float32Array(modelMatrix.flatten()));
	normalMatrix = modelMatrix.inverse().transpose();
	gl.uniformMatrix4fv(normalMatrixLocation, false, new Float32Array(normalMatrix.flatten()));
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
	multi(Matrix.Rotation(inRadians, $V([v[0], v[1], v[2]])).ensure4x4());
}

function mvTranslate(v){
	multi(Matrix.Translation($V([v[0], v[1], v[2]])).ensure4x4());
}