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
var meshVAO;
//var meshData;

//FOR ROTATION TRANSFORMATION
var squareRotation = 0.0;
var lastSquareUpdateTime = 0;
var mvMatrixStack = [];

//FOR OBJ MESH
var unpacked = {};
unpacked.vertexPositions = [];
unpacked.vertexNormals = [];
unpacked.vertexTextures = [];
unpacked.hashIndices = [];
unpacked.vertexIndices = [];
unpacked.index = 0;



function initApplication() {
	canvas = document.getElementById("mainCanvas");
		
	try {
		gl = canvas.getContext("webgl");
		ext = gl.getExtension("OES_vertex_array_object");

		$.ajax({
			async: false,
			url: "https://raw.githubusercontent.com/SimonJinaphant/3DExperimentsJS/master/obj/nanosuit.obj",
			success: function(data){
				//console.log(data);
				loadMeshModel(data);
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

	gl.clearColor(0.0, 0.0, 0.0, 0.85);
	gl.clearDepth(1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);

	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

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
	
	ext.bindVertexArrayOES(meshVAO);
		//gl.useProgram(shaderProgram);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, textureHandler);

		mvPushMatrix();
			mvTranslate([0.0, -8.0, -24.0]);
			mvRotate(squareRotation, [0, 1, 0]);
			updateUniformMatrices();
			gl.drawElements(gl.TRIANGLES, unpacked.vertexIndices.length, gl.UNSIGNED_SHORT, 0);
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
	meshVAO = ext.createVertexArrayOES();
	ext.bindVertexArrayOES(meshVAO);

		//loadMeshModel(meshData);
		//console.log(unpacked.vertexPositions.length);

		//POSITION BUFFER
		var positionVBO = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, positionVBO);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(unpacked.vertexPositions), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(positionLocation);
		gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

		//NORMAL BUFFER
		var normalVBO = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, normalVBO);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(unpacked.vertexNormals), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(normalLocation);
		gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0);

		//TEXTURE BUFFER
		var textureVBO= gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, textureVBO);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(unpacked.vertexTextures), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(textureLocation);
		gl.vertexAttribPointer(textureLocation, 2, gl.FLOAT, false, 0, 0);

		//INDICES BUFFER
		var indicesEBO = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesEBO);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(unpacked.vertexIndices), gl.STATIC_DRAW);


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

function loadMeshModel(data){
	var vertexPositions = [];
	var vertexNormals = [];
	var vertexTextures = [];

	var lines = data.split('\n');

	var VERTEX_MATCH = /^v\s/;
	var NORMAL_MATCH = /^vn\s/;
	var TEXTURE_MATCH = /^vt\s/;
	var FACE_MATCH = /^f\s/;
	var WHITESPACE_MATCH = /\s+/;

	for(var i = 0; i < lines.length; i++){
		var line = lines[i].trim();
		var elements = line.split(WHITESPACE_MATCH);
		elements.shift(); //Deque the v, vn, or vt substring

		if(VERTEX_MATCH.test(line)){
			vertexPositions.push.apply(vertexPositions, elements);

		} else if (NORMAL_MATCH.test(line)){
			vertexNormals.push.apply(vertexNormals, elements);

		} else if (TEXTURE_MATCH.test(line)){
			vertexTextures.push.apply(vertexTextures, elements);

		} else if (FACE_MATCH.test(line)){
			//Time to link the data together

			for(var j = 0, elementLength = elements.length; j < elementLength; j++){

				if(elements[j] in unpacked.hashIndices){
					unpacked.vertexIndices.push(unpacked.hashIndices[elements[j]]);
				} else {
					var vertex = elements[j].split('/');
					// vertex[0] = vertex positions in obj, -1 to get 0 based index
					unpacked.vertexPositions.push(+vertexPositions[(vertex[0] - 1) * 3 + 0]);
					unpacked.vertexPositions.push(+vertexPositions[(vertex[0] - 1) * 3 + 1]);
					unpacked.vertexPositions.push(+vertexPositions[(vertex[0] - 1) * 3 + 2]);

					if(vertexTextures.length){
						unpacked.vertexTextures.push(+vertexTextures[(vertex[1] - 1) * 2 + 0]);
						unpacked.vertexTextures.push(+vertexTextures[(vertex[1] - 1) * 2 + 1]);
					}

					unpacked.vertexNormals.push(+vertexNormals[(vertex[2] - 1) * 3 + 0]);
					unpacked.vertexNormals.push(+vertexNormals[(vertex[2] - 1) * 3 + 1]);
					unpacked.vertexNormals.push(+vertexNormals[(vertex[2] - 1) * 3 + 2]);

					unpacked.hashIndices[elements[j]] = unpacked.index;
					unpacked.vertexIndices.push(unpacked.index);
					unpacked.index += 1;
				}
			}
		}
	}
}

