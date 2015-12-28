//IMPORTANT OPENGL REFERENCES
var canvas = null;		//A reference to our canvas element
var gl = null;			//A reference to the WebGL context
var ext = null;			//Handler for WebGL's Vertex Array Object extension

//MATRICES DATA
var viewMatrix;
var modelMatrix;
var normalMatrix;

//GL OBJECT HANDLERS
var shaderProgram;
var skyboxHandler;

//FOR ROTATION TRANSFORMATION
var squareRotation = 0.0;
var lastSquareUpdateTime = 0;
var mvMatrixStack = [];

//FOR OBJ MESH
var unpackedData = {};
	unpackedData.vertexPositions = [];
	unpackedData.vertexNormals = [];
	unpackedData.vertexTextures = [];
	unpackedData.hashIndices = [];
	unpackedData.vertexIndices = [];
	unpackedData.index = 0;

var EntityModel = function () {
	this.meshVAO = null;
	this.textureHandler = null;

	this.positionLocation = null;
	this.textureLocation = null;
	this.normalLocation = null;
	
	this.indicesCount = null;

	this.modelLocation = null;
	this.normalMatrixLocation = null;
};

var cube = new EntityModel();

function initApplication() {
	canvas = document.getElementById("mainCanvas");
		
	try {
		gl = canvas.getContext("webgl");
		ext = gl.getExtension("OES_vertex_array_object");

		$.ajax({
			async: false,
			url: "https://raw.githubusercontent.com/SimonJinaphant/3DExperimentsJS/master/obj/cube.obj",
			success: function(data){
				//LOAD THE OBJ FILE AND PARSE THE DATA
				loadMeshModel(data, unpackedData);
			},
			dataType: 'text'
        });

	}catch(e){
		console.error(e);
	}

	if (!gl) {
		console.error("Failed initialize WebGL. Your browser may not support it.");
		return;
	}

	gl.clearColor(1.0, 1.0, 1.0, 1.0);
	gl.clearDepth(1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);

	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	//SET UP THE VARIOUS COORDINATE-SPACE MATRICES
	viewMatrix = makePerspective(45, canvas.width/canvas.height, 0.1, 100.0);
	modelMatrix = Matrix.I(4);
	normalMatrix = modelMatrix;

	initShaders(cube);
	initBuffers(cube, unpackedData);
	initTextures(cube);

	loadSkybox();

	//Our main loop

	setInterval(renderScene, 15);
}

function renderScene() {
	gl.viewport(0, 0, canvas.width, canvas.height);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	ext.bindVertexArrayOES(cube.meshVAO);
		//gl.useProgram(shaderProgram);
		

		mvPushMatrix();
			gl.enable(gl.CULL_FACE);
			gl.cullFace(gl.BACK);

			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, cube.textureHandler);

			mvTranslate([0.0, 0.0, -8.0]);
			mvRotate(squareRotation, [1, 1, 0]);
			mvScale([1.2, 2.0, 1]);
		
			updateUniformMatrices(cube);
			gl.drawElements(gl.TRIANGLES, cube.indicesCount, gl.UNSIGNED_SHORT, 0);
		mvPopMatrix();
		
		mvPushMatrix();
			gl.disable(gl.CULL_FACE);
			gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxHandler);
			mvTranslate([0.0, 0.0, -5.0]);
			mvScale([5, 5, 5]);
		
			updateUniformMatrices(cube);
			gl.drawElements(gl.TRIANGLES, cube.indicesCount, gl.UNSIGNED_SHORT, 0);
		mvPopMatrix();

	ext.bindVertexArrayOES(null);

	var currentTime = Date.now();
	if(lastSquareUpdateTime){
		squareRotation += (30 * (currentTime - lastSquareUpdateTime)) / 1000.0;
	}
	lastSquareUpdateTime = currentTime;
}

function initShaders(entity){
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
	entity.positionLocation = gl.getAttribLocation(shaderProgram, "position");
	entity.textureLocation = gl.getAttribLocation(shaderProgram, "textureCoord");
	entity.normalLocation = gl.getAttribLocation(shaderProgram, "normal");
	
	//DETERMINE THE UNIFORM VARIABLE LOCATIONS
	gl.useProgram(shaderProgram);

		gl.uniform1i(gl.getUniformLocation(shaderProgram, "uSampler"), 0);

		//THE VIEW MATRIX CAN BE SET ONCE AND LEFT ALONE SINCE THE CAMERA ISN'T MOVING
		var viewLocation = gl.getUniformLocation(shaderProgram, "view");
		gl.uniformMatrix4fv(viewLocation, false, new Float32Array(viewMatrix.flatten()));

		//DETERMINE THE LOCATION, BUT DON'T UPDATE/SEND DATA TO THEM YET
		entity.modelLocation = gl.getUniformLocation(shaderProgram, "model");
		entity.normalMatrixLocation = gl.getUniformLocation(shaderProgram, "normalM");
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

function initTextures(entity){
	entity.textureHandler = gl.createTexture();
	entity.textureHandler.image = new Image();
	entity.textureHandler.image.crossOrigin = "anonymous";
	entity.textureHandler.image.onload = function(){
		handleTexture(entity.textureHandler);
	};
	entity.textureHandler.image.src = "https://raw.githubusercontent.com/SimonJinaphant/3DExperimentsJS/master/img/stone.png";
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

function initBuffers(entity, objFileData){
	
	//VERTEX ARRAY OBJECT
	entity.meshVAO = ext.createVertexArrayOES();
	ext.bindVertexArrayOES(entity.meshVAO);
	
		//POSITION BUFFER
		var positionVBO = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, positionVBO);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(objFileData.vertexPositions), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(entity.positionLocation);
		gl.vertexAttribPointer(entity.positionLocation, 3, gl.FLOAT, false, 0, 0);

		//NORMAL BUFFER
		var normalVBO = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, normalVBO);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(objFileData.vertexNormals), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(entity.normalLocation);
		gl.vertexAttribPointer(entity.normalLocation, 3, gl.FLOAT, false, 0, 0);

		//TEXTURE BUFFER
		var textureVBO = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, textureVBO);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(objFileData.vertexTextures), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(entity.textureLocation);
		gl.vertexAttribPointer(entity.textureLocation, 2, gl.FLOAT, false, 0, 0);

		//INDICES BUFFER
		var indicesEBO = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesEBO);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(objFileData.vertexIndices), gl.STATIC_DRAW);
		entity.indicesCount = objFileData.vertexIndices.length;

	ext.bindVertexArrayOES(null);
}

function updateUniformMatrices(entity){
	//THESE TWO UNIFORM MATRICES MUST BE UPDATED PERIODICALLY
	gl.uniformMatrix4fv(entity.modelLocation, false, new Float32Array(modelMatrix.flatten()));
	normalMatrix = modelMatrix.inverse().transpose();
	gl.uniformMatrix4fv(entity.normalMatrixLocation, false, new Float32Array(normalMatrix.flatten()));
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

function mvScale(v){
	multi(Matrix.Diagonal([v[0], v[1], v[2], 1]).ensure4x4());
}

function loadSkybox(){
	skyboxHandler = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxHandler);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

	var faces = [["https://raw.githubusercontent.com/SimonJinaphant/3DExperimentsJS/master/img/skybox/peaks_ft.png", gl.TEXTURE_CUBE_MAP_POSITIVE_X],
				 ["https://raw.githubusercontent.com/SimonJinaphant/3DExperimentsJS/master/img/skybox/peaks_bk.png", gl.TEXTURE_CUBE_MAP_NEGATIVE_X],
				 ["https://raw.githubusercontent.com/SimonJinaphant/3DExperimentsJS/master/img/skybox/peaks_up.png", gl.TEXTURE_CUBE_MAP_POSITIVE_Y],
				 ["https://raw.githubusercontent.com/SimonJinaphant/3DExperimentsJS/master/img/skybox/peaks_dn.png", gl.TEXTURE_CUBE_MAP_NEGATIVE_Y],
				 ["https://raw.githubusercontent.com/SimonJinaphant/3DExperimentsJS/master/img/skybox/peaks_lt.png", gl.TEXTURE_CUBE_MAP_POSITIVE_Z],
				 ["https://raw.githubusercontent.com/SimonJinaphant/3DExperimentsJS/master/img/skybox/peaks_rt.png", gl.TEXTURE_CUBE_MAP_NEGATIVE_Z]
	];

	for(var i = 0; i < faces.length; i++){
		var face = faces[i][1];
		var image = new Image();
		image.crossOrigin = "anonymous";
		image.onload = function(skyboxHandler, face, image){
			return function(){
				gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxHandler);
				gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
				gl.texImage2D(face, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
			}
		} (skyboxHandler, face, image);
		image.src = faces[i][0];
	}

	gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);

}