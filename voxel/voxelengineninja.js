// VoxelRenderer.js
/**
 * VoxelRenderer – handles 3D rendering and visualization of voxel objects.
 * @class
 */
export class VoxelRenderer {
 /**
  * Creates a new renderer instance.
  * @param {HTMLElement} container – DOM element to render into.
  * @param {VoxelEngine} engine – voxel engine instance.
  */
 constructor(container, engine) {
  this.container = container;
  this.engine = engine;
  this._canvas = null;
  this._ctx = null;
  this._camera = {x: 0, y: 0, z: -10, rotX: 0, rotY: 0};
  this._scale = 20;
  this._init();
 }

 /**
  * Renders a voxel object to the canvas.
  * @param {string} objectId – ID of the voxel object to render.
  * @param {Object} [options] – rendering options.
  * @param {boolean} [options.wireframe=false] – render as wireframe.
  * @param {boolean} [options.showGrid=false] – show coordinate grid.
  */
 render(objectId, options = {}) {
  const obj = this.engine.getVoxelObject(objectId);
  if (!obj) {
   console.warn(`Cannot render: object "${objectId}" not found`);
   return;
  }

  this._clearCanvas();
  
  if (options.showGrid) this._renderGrid(obj.dimensions);
  
  const voxels = obj.getAllVoxels();
  const sortedVoxels = this._sortVoxelsByDepth(voxels);
  
  sortedVoxels.forEach(voxel => {
   this._renderVoxel(voxel, options.wireframe);
  });
 }

 /**
  * Updates camera position and rotation.
  * @param {Object} cfg
  * @param {number} [cfg.x] – camera X position.
  * @param {number} [cfg.y] – camera Y position.
  * @param {number} [cfg.z] – camera Z position.
  * @param {number} [cfg.rotX] – camera X rotation (radians).
  * @param {number} [cfg.rotY] – camera Y rotation (radians).
  */
 setCamera({x, y, z, rotX, rotY}) {
  if (x !== undefined) this._camera.x = x;
  if (y !== undefined) this._camera.y = y;
  if (z !== undefined) this._camera.z = z;
  if (rotX !== undefined) this._camera.rotX = rotX;
  if (rotY !== undefined) this._camera.rotY = rotY;
 }

 /**
  * Sets the rendering scale.
  * @param {number} scale – pixels per voxel unit.
  */
 setScale(scale) {
  if (scale > 0) this._scale = scale;
 }

 // Private rendering methods
 _init() {
  this._canvas = document.createElement('canvas');
  this._canvas.width = 800;
  this._canvas.height = 600;
  this._ctx = this._canvas.getContext('2d');
  this.container.appendChild(this._canvas);
 }

 _clearCanvas() {
  this._ctx.fillStyle = '#000';
  this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);
 }

 _project3D(x, y, z) {
  // Simple 3D to 2D projection
  const dx = x - this._camera.x;
  const dy = y - this._camera.y;
  const dz = z - this._camera.z;
  
  // Apply rotation
  const cosX = Math.cos(this._camera.rotX);
  const sinX = Math.sin(this._camera.rotX);
  const cosY = Math.cos(this._camera.rotY);
  const sinY = Math.sin(this._camera.rotY);
  
  const rotY = dy * cosX - dz * sinX;
  const rotZ = dy * sinX + dz * cosX;
  const rotX = dx * cosY - rotZ * sinY;
  const finalZ = dx * sinY + rotZ * cosY;
  
  const perspective = 400 / (400 + finalZ);
  const screenX = this._canvas.width / 2 + rotX * this._scale * perspective;
  const screenY = this._canvas.height / 2 - rotY * this._scale * perspective;
  
  return {x: screenX, y: screenY, z: finalZ};
 }

 _sortVoxelsByDepth(voxels) {
  return voxels.map(v => ({
   ...v,
   projected: this._project3D(v.x, v.y, v.z)
  })).sort((a, b) => b.projected.z - a.projected.z);
 }

 _renderVoxel(voxel, wireframe = false) {
  const className = this.engine.getClassName(voxel.group, voxel.type);
  const color = this._getColorFromClass(className) || '#888';
  
  const corners = this._getVoxelCorners(voxel.x, voxel.y, voxel.z);
  const projectedCorners = corners.map(c => this._project3D(c.x, c.y, c.z));
  
  if (wireframe) {
   this._drawWireframeVoxel(projectedCorners, color);
  } else {
   this._drawSolidVoxel(projectedCorners, color);
  }
 }

 _getVoxelCorners(x, y, z) {
  return [
   {x, y, z}, {x+1, y, z}, {x+1, y+1, z}, {x, y+1, z},
   {x, y, z+1}, {x+1, y, z+1}, {x+1, y+1, z+1}, {x, y+1, z+1}
  ];
 }

 _drawSolidVoxel(corners, color) {
  this._ctx.fillStyle = color;
  this._ctx.strokeStyle = '#333';
  this._ctx.lineWidth = 1;
  
  // Draw visible faces (simplified)
  const faces = [
   [0,1,2,3], [4,5,6,7], [0,1,5,4], [2,3,7,6], [1,2,6,5], [0,3,7,4]
  ];
  
  faces.forEach(face => {
   this._ctx.beginPath();
   this._ctx.moveTo(corners[face[0]].x, corners[face[0]].y);
   face.forEach(i => this._ctx.lineTo(corners[i].x, corners[i].y));
   this._ctx.closePath();
   this._ctx.fill();
   this._ctx.stroke();
  });
 }

 _drawWireframeVoxel(corners, color) {
  this._ctx.strokeStyle = color;
  this._ctx.lineWidth = 1;
  
  const edges = [
   [0,1],[1,2],[2,3],[3,0], [4,5],[5,6],[6,7],[7,4], [0,4],[1,5],[2,6],[3,7]
  ];
  
  edges.forEach(([a, b]) => {
   this._ctx.beginPath();
   this._ctx.moveTo(corners[a].x, corners[a].y);
   this._ctx.lineTo(corners[b].x, corners[b].y);
   this._ctx.stroke();
  });
 }

 _renderGrid(dimensions) {
  this._ctx.strokeStyle = '#333';
  this._ctx.lineWidth = 0.5;
  
  for (let x = 0; x <= dimensions.width; x++) {
   for (let z = 0; z <= dimensions.depth; z++) {
    const start = this._project3D(x, 0, z);
    const end = this._project3D(x, dimensions.height, z);
    this._ctx.beginPath();
    this._ctx.moveTo(start.x, start.y);
    this._ctx.lineTo(end.x, end.y);
    this._ctx.stroke();
   }
  }
 }

 _getColorFromClass(className) {
  // Simple color mapping - could be enhanced with CSS parsing
  const colorMap = {
   'voxel-stone': '#888',
   'voxel-dirt': '#8B4513',
   'voxel-grass': '#228B22',
   'voxel-water': '#4169E1',
   'voxel-wood': '#DEB887'
  };
  return colorMap[className] || '#888';
 }
}

// VoxelLoader.js
/**
 * VoxelLoader – handles import/export of voxel objects in various formats.
 * @class
 */
export class VoxelLoader {
 /**
  * Creates a new loader instance.
  * @param {VoxelEngine} engine – voxel engine instance.
  */
 constructor(engine) {
  this.engine = engine;
 }

 /**
  * Exports a voxel object to JSON format.
  * @param {string} objectId – ID of the voxel object.
  * @returns {string} JSON representation of the voxel object.
  * @throws {Error} If object not found.
  */
 exportToJSON(objectId) {
  const obj = this.engine.getVoxelObject(objectId);
  if (!obj) throw new Error(`Object "${objectId}" not found`);
  
  const data = {
   version: '1.0',
   objectId: obj.objectId,
   dimensions: obj.dimensions,
   defaultGroup: obj.defaultGroup,
   voxels: obj.getAllVoxels(),
   timestamp: new Date().toISOString()
  };
  
  return JSON.stringify(data, null, 2);
 }

 /**
  * Imports a voxel object from JSON format.
  * @param {string} jsonData – JSON string to import.
  * @param {Object} [options] – import options.
  * @param {string} [options.newObjectId] – override object ID.
  * @param {boolean} [options.overwrite=false] – overwrite existing object.
  * @returns {VoxelObject} The imported voxel object.
  * @throws {Error} If JSON is invalid or object exists.
  */
 importFromJSON(jsonData, options = {}) {
  let data;
  try {
   data = JSON.parse(jsonData);
  } catch (err) {
   throw new Error(`Invalid JSON: ${err.message}`);
  }
  
  if (!data.version || !data.objectId || !data.dimensions)
   throw new Error('Invalid voxel object format');
  
  const objectId = options.newObjectId || data.objectId;
  
  if (this.engine.getVoxelObject(objectId) && !options.overwrite)
   throw new Error(`Object "${objectId}" already exists`);
  
  if (options.overwrite) this.engine.removeVoxelObject(objectId);
  
  const obj = this.engine.createVoxelObject({
   objectId,
   dimensions: data.dimensions,
   groupPrefix: data.defaultGroup,
   voxels: data.voxels || []
  });
  
  return obj;
 }

 /**
  * Exports voxel object to a compact binary-like format.
  * @param {string} objectId – ID of the voxel object.
  * @returns {string} Compact string representation.
  */
 exportToCompact(objectId) {
  const obj = this.engine.getVoxelObject(objectId);
  if (!obj) throw new Error(`Object "${objectId}" not found`);
  
  const {width, height, depth} = obj.dimensions;
  let result = `${width}x${height}x${depth}|`;
  
  const voxels = obj.getAllVoxels();
  const compressed = this._compressVoxelData(voxels, obj.dimensions);
  
  return result + compressed;
 }

 /**
  * Imports from compact format.
  * @param {string} compactData – compact string data.
  * @param {string} objectId – ID for the new object.
  * @param {string} defaultGroup – default voxel group.
  * @returns {VoxelObject} The imported voxel object.
  */
 importFromCompact(compactData, objectId, defaultGroup) {
  const [dimStr, voxelStr] = compactData.split('|');
  const [width, height, depth] = dimStr.split('x').map(Number);
  
  if (!width || !height || !depth)
   throw new Error('Invalid compact format: bad dimensions');
  
  const voxels = this._decompressVoxelData(voxelStr, {width, height, depth}, defaultGroup);
  
  return this.engine.createVoxelObject({
   objectId,
   dimensions: {width, height, depth},
   groupPrefix: defaultGroup,
   voxels
  });
 }

 // Private compression methods
 _compressVoxelData(voxels, dimensions) {
  const grid = new Array(dimensions.width * dimensions.height * dimensions.depth).fill('~');
  
  voxels.forEach(v => {
   const idx = v.x + v.y * dimensions.width + v.z * dimensions.width * dimensions.height;
   grid[idx] = v.type.charAt(0); // Use first character as shorthand
  });
  
  // Run-length encoding for empty spaces
  let result = '';
  let count = 0;
  let current = '~';
  
  grid.forEach(cell => {
   if (cell === current) {
    count++;
   } else {
    if (current === '~' && count > 1) {
     result += `~${count}`;
    } else {
     result += current.repeat(count);
    }
    current = cell;
    count = 1;
   }
  });
  
  if (current === '~' && count > 1) {
   result += `~${count}`;
  } else {
   result += current.repeat(count);
  }
  
  return result;
 }

 _decompressVoxelData(compressedStr, dimensions, defaultGroup) {
  const voxels = [];
  let pos = 0;
  let idx = 0;
  
  while (pos < compressedStr.length) {
   const char = compressedStr[pos];
   
   if (char === '~') {
    // Handle run-length encoded empty spaces
    pos++;
    let numStr = '';
    while (pos < compressedStr.length && /\d/.test(compressedStr[pos])) {
     numStr += compressedStr[pos++];
    }
    const count = numStr ? parseInt(numStr) : 1;
    idx += count;
   } else {
    // Regular voxel
    const x = idx % dimensions.width;
    const y = Math.floor(idx / dimensions.width) % dimensions.height;
    const z = Math.floor(idx / (dimensions.width * dimensions.height));
    
    // Map character back to voxel type (simplified)
    const typeMap = {'s': 'stone', 'd': 'dirt', 'g': 'grass', 'w': 'water', 't': 'wood'};
    const type = typeMap[char] || 'unknown';
    
    voxels.push({x, y, z, type, group: defaultGroup});
    idx++;
    pos++;
   }
  }
  
  return voxels;
 }
}

// VoxelUtils.js
/**
 * VoxelUtils – utility functions for voxel operations and algorithms.
 */
export class VoxelUtils {
 /**
  * Calculates the bounding box of voxels in an object.
  * @param {VoxelObject} voxelObject
  * @returns {Object} {min: {x,y,z}, max: {x,y,z}, size: {x,y,z}}
  */
 static getBoundingBox(voxelObject) {
  const voxels = voxelObject.getAllVoxels();
  if (voxels.length === 0) return null;
  
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  
  voxels.forEach(v => {
   minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
   minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
   minZ = Math.min(minZ, v.z); maxZ = Math.max(maxZ, v.z);
  });
  
  return {
   min: {x: minX, y: minY, z: minZ},
   max: {x: maxX, y: maxY, z: maxZ},
   size: {x: maxX - minX + 1, y: maxY - minY + 1, z: maxZ - minZ + 1}
  };
 }

 /**
  * Finds voxels adjacent to a given position.
  * @param {VoxelObject} voxelObject
  * @param {number} x
  * @param {number} y
  * @param {number} z
  * @param {boolean} [includeDiagonal=false] – include diagonal neighbors.
  * @returns {Array} Array of adjacent voxel data.
  */
 static getAdjacentVoxels(voxelObject, x, y, z, includeDiagonal = false) {
  const adjacent = [];
  const offsets = includeDiagonal ? 
   [[-1,-1,-1],[-1,-1,0],[-1,-1,1],[-1,0,-1],[-1,0,0],[-1,0,1],[-1,1,-1],[-1,1,0],[-1,1,1],
    [0,-1,-1],[0,-1,0],[0,-1,1],[0,0,-1],[0,0,1],[0,1,-1],[0,1,0],[0,1,1],
    [1,-1,-1],[1,-1,0],[1,-1,1],[1,0,-1],[1,0,0],[1,0,1],[1,1,-1],[1,1,0],[1,1,1]] :
   [[-1,0,0],[1,0,0],[0,-1,0],[0,1,0],[0,0,-1],[0,0,1]];
  
  offsets.forEach(([dx, dy, dz]) => {
   const voxel = voxelObject.getVoxel(x + dx, y + dy, z + dz);
   if (voxel) adjacent.push({x: x + dx, y: y + dy, z: z + dz, ...voxel});
  });
  
  return adjacent;
 }

 /**
  * Performs flood fill starting from a position.
  * @param {VoxelObject} voxelObject
  * @param {number} startX
  * @param {number} startY
  * @param {number} startZ
  * @param {string} newType
  * @param {string} [newGroup]
  * @returns {number} Number of voxels filled.
  */
 static floodFill(voxelObject, startX, startY, startZ, newType, newGroup) {
  const startVoxel = voxelObject.getVoxel(startX, startY, startZ);
  if (!startVoxel) return 0;
  
  const targetType = startVoxel.type;
  const targetGroup = startVoxel.group;
  const fillGroup = newGroup || targetGroup;
  
  if (targetType === newType && targetGroup === fillGroup) return 0;
  
  const stack = [{x: startX, y: startY, z: startZ}];
  const visited = new Set();
  let count = 0;
  
  while (stack.length > 0) {
   const {x, y, z} = stack.pop();
   const key = `${x},${y},${z}`;
   
   if (visited.has(key)) continue;
   visited.add(key);
   
   const voxel = voxelObject.getVoxel(x, y, z);
   if (!voxel || voxel.type !== targetType || voxel.group !== targetGroup) continue;
   
   voxelObject.setVoxel({x, y, z, type: newType, group: fillGroup, data: voxel.data});
   count++;
   
   // Add neighbors to stack
   [[0,0,1],[0,0,-1],[0,1,0],[0,-1,0],[1,0,0],[-1,0,0]].forEach(([dx,dy,dz]) => {
    stack.push({x: x + dx, y: y + dy, z: z + dz});
   });
  }
  
  return count;
 }

 /**
  * Creates a copy of a voxel object.
  * @param {VoxelEngine} engine
  * @param {string} sourceObjectId
  * @param {string} newObjectId
  * @param {Object} [offset] – {x,y,z} offset for the copy.
  * @returns {VoxelObject} The copied object.
  */
 static cloneVoxelObject(engine, sourceObjectId, newObjectId, offset = {x:0, y:0, z:0}) {
  const source = engine.getVoxelObject(sourceObjectId);
  if (!source) throw new Error(`Source object "${sourceObjectId}" not found`);
  
  const copy = engine.createVoxelObject({
   objectId: newObjectId,
   dimensions: source.dimensions,
   groupPrefix: source.defaultGroup
  });
  
  source.getAllVoxels().forEach(voxel => {
   const newX = voxel.x + offset.x;
   const newY = voxel.y + offset.y;
   const newZ = voxel.z + offset.z;
   
   if (newX >= 0 && newX < copy.dimensions.width &&
       newY >= 0 && newY < copy.dimensions.height &&
       newZ >= 0 && newZ < copy.dimensions.depth) {
    copy.setVoxel({
     x: newX, y: newY, z: newZ,
     type: voxel.type, group: voxel.group, data: voxel.data
    });
   }
  });
  
  return copy;
 }
}
