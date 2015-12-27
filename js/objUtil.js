function loadMeshModel(data, unpacked){
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