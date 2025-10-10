// VoxelEngine.js --------------------------------------------------------------
export class VoxelEngine {
 /**
  * Creates a new engine instance.
  */
 constructor() {
  this._groups = new Map()
  this._smallGroupCount = 0
 }

 /**
  * Registers a voxel group.
  * @param {Object} cfg
  */
 registerVoxelGroup({groupPrefix, voxelTypes, classNames, values}) {
  if (!groupPrefix) throw new Error('groupPrefix is required')
  const len = voxelTypes.length
  if (len !== classNames.length || len !== values.length)
   throw new Error('voxelTypes, classNames and values must have equal length')
  if (len < 5) {
   if (this._smallGroupCount >= 1)
    throw new Error('Only one voxel group may contain fewer than 5 variants')
   this._smallGroupCount = 1
  }
  this._groups.set(groupPrefix, {voxelTypes, classNames, values})
 }

 /**
  * Generates a fresh voxel data object for a given group.
  */
 generateVoxelData(groupPrefix) {
  const grp = this._groups.get(groupPrefix)
  if (!grp) throw new Error(`Group "${groupPrefix}" not found`)
  const data = {}
  grp.voxelTypes.forEach((t, i) => { data[t] = grp.values[i] })
  return data
 }

 /**
  * Retrieves CSS class for a voxel type.
  */
 getClassName(groupPrefix, voxelType) {
  const grp = this._groups.get(groupPrefix)
  if (!grp) return null
  const i = grp.voxelTypes.indexOf(voxelType)
  return i >= 0 ? grp.classNames[i] : null
 }

 _validateGroupExists(groupPrefix) {
  if (!this._groups.has(groupPrefix))
   console.warn(`Voxel group "${groupPrefix}" does not exist`)
 }
}

// VoxelMath.js --------------------------------------------------------------
export class VoxelMath {
 static rotate({dx, dy, dz}, rotX, rotY) {
  const cosX = Math.cos(rotX), sinX = Math.sin(rotX)
  const cosY = Math.cos(rotY), sinY = Math.sin(rotY)

  const rotYc = dy * cosX - dz * sinX
  const rotZc = dy * sinX + dz * cosX
  const rotXc = dx * cosY - rotZc * sinY
  const finalZ = dx * sinY + rotZc * cosY

  return {x: rotXc, y: rotYc, z: finalZ}
 }

 static createBoxCorners(x, y, z, size = 1) {
  return [
   {x, y, z},
   {x + size, y, z},
   {x + size, y + size, z},
   {x, y + size, z},
   {x, y, z + size},
   {x + size, y, z + size},
   {x + size, y + size, z + size},
   {x, y + size, z + size}
  ]
 }
}

// VoxelGeometry.js ---------------------------------------------------------
export const VOXEL_FACES = [
 [0,1,2,3], [4,5,6,7], [0,1,5,4],
 [2,3,7,6], [1,2,6,5], [0,3,7,4]
]

export const VOXEL_EDGES = [
 [0,1],[1,2],[2,3],[3,0],
 [4,5],[5,6],[6,7],[7,4],
 [0,4],[1,5],[2,6],[3,7]
]

export const ORTHO_OFFSETS = [
 [1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]
]

// VoxelCompression.js -------------------------------------------------------
export class VoxelCompression {
 static rleEncode(arr, emptyMarker = '~') {
  let result = ''
  let count = 0
  let cur = emptyMarker

  const flush = () => {
   result += (cur === emptyMarker && count > 1)
    ? `${emptyMarker}${count}`
    : cur.repeat(count)
  }

  arr.forEach(cell => {
   if (cell === cur) count++
   else {
    flush()
    cur = cell
    count = 1
   }
  })
  flush()
  return result
 }

 static rleDecode(str, emptyMarker = '~') {
  const out = []
  let i = 0
  while (i < str.length) {
   const ch = str[i]
   if (ch === emptyMarker) {
    i++
    const num = str.slice(i).match(/^\d+/)
    const cnt = num ? parseInt(num[0]) : 1
    i += num ? num[0].length : 0
    out.push(...Array(cnt).fill(emptyMarker))
   } else {
    out.push(ch)
    i++
   }
  }
  return out
 }
}

// VoxelRenderer.js ---------------------------------------------------------
import {VoxelMath} from './VoxelMath.js'
import {VOXEL_FACES, VOXEL_EDGES} from './VoxelGeometry.js'
import {VoxelCompression} from './VoxelCompression.js'

export class VoxelRenderer {
 constructor(container, engine) {
  this.container = container
  this.engine = engine
  this._canvas = null
  this._ctx = null
  this._camera = {x:0, y:0, z:-10, rotX:0, rotY:0}
  this._scale = 20
  this._init()
 }

 // ----------------------------------------------------------------------
 // Public API
 // ----------------------------------------------------------------------
 render(objectId, options = {}) {
  const obj = this.engine.getVoxelObject(objectId)
  if (!obj) {
   console.warn(`Cannot render: object "${objectId}" not found`)
   return
  }
  this._clearCanvas()
  if (options.showGrid) this._renderGrid(obj.dimensions)

  const voxels = obj.getAllVoxels()
  const sorted = this._sortVoxelsByDepth(voxels)
  sorted.forEach(v => this._renderVoxel(v, options.wireframe))
 }

 setCamera(cfg) { Object.assign(this._camera, cfg) }

 setScale(scale) { this._scale = Math.max(1, scale || this._scale) }

 // ----------------------------------------------------------------------
 // Private helpers
 // ----------------------------------------------------------------------
 _init() {
  this._canvas = document.createElement('canvas')
  this._canvas.width = 800
  this._canvas.height = 600
  this._ctx = this._canvas.getContext('2d')
  this.container.appendChild(this._canvas)
 }

 _clearCanvas() {
  this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height)
 }

 _project3D(x, y, z) {
  const dx = x - this._camera.x
  const dy = y - this._camera.y
  const dz = z - this._camera.z
  const {x:rx, y:ry, z:rz} = VoxelMath.rotate({dx, dy, dz},
   this._camera.rotX, this._camera.rotY)

  const perspective = 400 / (400 + rz)
  const sx = this._canvas.width / 2 + rx * this._scale * perspective
  const sy = this._canvas.height / 2 - ry * this._scale * perspective
  return {x:sx, y:sy, z:rz}
 }

 _sortVoxelsByDepth(voxels) {
  return voxels.map(v => ({
   ...v,
   projected: this._project3D(v.x, v.y, v.z)
  })).sort((a, b) => b.projected.z - a.projected.z)
 }

 _renderVoxel(voxel, wireframe = false) {
  const className = this.engine.getClassName(voxel.group, voxel.type)
  const color = this._getColorFromClass(className) || '#888'

  const corners = VoxelMath.createBoxCorners(voxel.x, voxel.y, voxel.z)
  const proj = corners.map(c => this._project3D(c.x, c.y, c.z))

  if (wireframe) this._drawWireframeVoxel(proj, color)
  else this._drawSolidVoxel(proj, color)
 }

 _setCtxStyle({fill, stroke, lineWidth}) {
  if (fill !== undefined) this._ctx.fillStyle = fill
  if (stroke !== undefined) this._ctx.strokeStyle = stroke
  if (lineWidth !== undefined) this._ctx.lineWidth = lineWidth
 }

 _drawSolidVoxel(corners, color) {
  this._setCtxStyle({fill:color, stroke:'#333', lineWidth:1})
  VOXEL_FACES.forEach(face => {
   this._ctx.beginPath()
   this._ctx.moveTo(corners[face[0]].x, corners[face[0]].y)
   face.forEach(i => this._ctx.lineTo(corners[i].x, corners[i].y))
   this._ctx.closePath()
   this._ctx.fill()
   this._ctx.stroke()
  })
 }

 _drawWireframeVoxel(corners, color) {
  this._setCtxStyle({stroke:color, lineWidth:1})
  VOXEL_EDGES.forEach(([a, b]) => {
       this._ctx.beginPath()
   this._ctx.moveTo(corners[a].x, corners[a].y)
   this._ctx.lineTo(corners[b].x, corners[b].y)
   this._ctx.stroke()
  })
 }

 _renderGrid(dimensions) {
  this._setCtxStyle({stroke:'#333', lineWidth:0.5})
  const w = dimensions.width, h = dimensions.height, d = dimensions.depth
  // flatten nested loops into a single index loop (branchless)
  for (let i = 0, total = (w + 1) * (d + 1); i < total; i++) {
   const x = i % (w + 1)
   const z = Math.floor(i / (w + 1))
   const start = this._project3D(x, 0, z)
   const end   = this._project3D(x, h, z)
   this._ctx.beginPath()
   this._ctx.moveTo(start.x, start.y)
   this._ctx.lineTo(end.x, end.y)
   this._ctx.stroke()
  }
 }

 _getColorFromClass(className) {
  const map = {
   'voxel-stone': '#888',
   'voxel-dirt': '#8B4513',
   'voxel-grass': '#228B22',
   'voxel-water': '#4169E1',
   'voxel-wood': '#DEB887'
  }
  return map[className] || '#888'
 }
}

// VoxelLoader.js ------------------------------------------------------------
export class VoxelLoader {
 constructor(engine) { this.engine = engine }

 exportToJSON(objectId) {
  const obj = this.engine.getVoxelObject(objectId)
  if (!obj) throw new Error(`Object "${objectId}" not found`)
  const data = {
   version: '1.0',
   objectId: obj.objectId,
   dimensions: obj.dimensions,
   defaultGroup: obj.defaultGroup,
   voxels: obj.getAllVoxels(),
   timestamp: new Date().toISOString()
  }
  return JSON.stringify(data, null, 2)
 }

 importFromJSON(jsonData, options = {}) {
  let data
  try { data = JSON.parse(jsonData) }
  catch (e) { throw new Error(`Invalid JSON: ${e.message}`) }

  if (!data.version || !data.objectId || !data.dimensions)
   throw new Error('Invalid voxel object format')

  const objectId = options.newObjectId || data.objectId
  if (this.engine.getVoxelObject(objectId) && !options.overwrite)
   throw new Error(`Object "${objectId}" already exists`)

  if (options.overwrite) this.engine.removeVoxelObject(objectId)

  return this.engine.createVoxelObject({
   objectId,
   dimensions: data.dimensions,
   groupPrefix: data.defaultGroup,
   voxels: data.voxels || []
  })
 }

 exportToCompact(objectId) {
  const obj = this.engine.getVoxelObject(objectId)
  if (!obj) throw new Error(`Object "${objectId}" not found`)

  const {width, height, depth} = obj.dimensions
  const header = `${width}x${height}x${depth}|`
  const voxels = obj.getAllVoxels()
  const compressed = VoxelCompression._compressVoxelData(
   voxels,
   obj.dimensions
  )
  return header + compressed
 }

 importFromCompact(compactData, objectId, defaultGroup) {
  const [dimStr, voxelStr] = compactData.split('|')
  const [w, h, d] = dimStr.split('x').map(Number)
  if (!w || !h || !d) throw new Error('Invalid compact format: bad dimensions')

  const voxels = VoxelCompression._decompressVoxelData(
   voxelStr,
   {width: w, height: h, depth: d},
   defaultGroup
  )

  return this.engine.createVoxelObject({
   objectId,
   dimensions: {width: w, height: h, depth: d},
   groupPrefix: defaultGroup,
   voxels
  })
 }

 // ----------------------------------------------------------------------
 // Private compression helpers (branchless where possible)
 // ----------------------------------------------------------------------
 static _compressVoxelData(voxels, dimensions) {
  const size = dimensions.width * dimensions.height * dimensions.depth
  const grid = new Array(size).fill('~')
  voxels.forEach(v => {
   const idx = v.x + v.y * dimensions.width + v.z * dimensions.width * dimensions.height
   grid[idx] = v.type.charAt(0) // first char as shorthand
  })
  return VoxelCompression.rleEncode(grid, '~')
 }

 static _decompressVoxelData(compressedStr, dimensions, defaultGroup) {
  const flat = VoxelCompression.rleDecode(compressedStr, '~')
  const voxels = []
  const typeMap = {s:'stone', d:'dirt', g:'grass', w:'water', t:'wood'}

  flat.forEach((ch, idx) => {
   if (ch === '~') return
   const x = idx % dimensions.width
   const y = Math.floor(idx / dimensions.width) % dimensions.height
   const z = Math.floor(idx / (dimensions.width * dimensions.height))
   voxels.push({
    x, y, z,
    type: typeMap[ch] || 'unknown',
    group: defaultGroup
   })
  })
  return voxels
 }
}

// VoxelUtils.js ------------------------------------------------------------
export class VoxelUtils {
 static getBoundingBox(voxelObject) {
  const voxels = voxelObject.getAllVoxels()
  if (!voxels.length) return null
  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
  voxels.forEach(v => {
   minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x)
   minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y)
   minZ = Math.min(minZ, v.z); maxZ = Math.max(maxZ, v.z)
  })
  return {
   min: {x:minX, y:minY, z:minZ},
   max: {x:maxX, y:maxY, z:maxZ},
   size: {x:maxX-minX+1, y:maxY-minY+1, z:maxZ-minZ+1}
  }
 }

 static getAdjacentVoxels(voxelObject, x, y, z, includeDiagonal = false) {
  const offsets = includeDiagonal
   ? [[-1,-1,-1],[-1,-1,0],[-1,-1,1],[-1,0,-1],[-1,0,0],[-1,0,1],[-1,1,-1],[-1,1,0],[-1,1,1],
      [0,-1,-1],[0,-1,0],[0,-1,1],[0,0,-1],[0,0,1],[0,1,-1],[0,1,0],[0,1,1],
      [1,-1,-1],[1,-1,0],[1,-1,1],[1,0,-1],[1,0,0],[1,0,1],[1,1,-1],[1,1,0],[1,1,1]]
   : ORTHO_OFFSETS

  const adj = []
  offsets.forEach(([dx, dy, dz]) => {
   const voxel = voxelObject.getVoxel(x+dx, y+dy, z+dz)
   if (voxel) adj.push({x:x+dx, y:y+dy, z:z+dz, ...voxel})
  })
  return adj
 }

 static floodFill(voxelObject, startX, startY, startZ, newType, newGroup) {
  const start = voxelObject.getVoxel(startX, startY, startZ)
  if (!start) return 0
  const targetType = start.type, targetGroup = start.group
  const fillGroup = newGroup || targetGroup
  if (targetType === newType && targetGroup === fillGroup) return 0

  const stack = [{x:startX, y:startY, z:startZ}]
  const visited = new Set()
  let count = 0

  while (stack.length) {
   const {x, y, z} = stack.pop()
   const key = `${x},${y},${z}`
   if (visited.has(key)) continue
   visited.add(key)

   const voxel = voxelObject.getVoxel(x, y, z)
   if (!voxel || voxel.type !== targetType || voxel.group !== targetGroup) continue

   voxelObject.setVoxel({x, y, z, type:newType, group:fillGroup, data:voxel.data})
   count++

   ORTHO_OFFSETS.forEach(([dx, dy, dz]) => stack.push({x:x+dx, y:y+dy, z:z+dz}))
  }
  return count
 }

 static cloneVoxelObject(engine, sourceObjectId, newObjectId, offset = {x:0, y:0, z:0}) {
  const src = engine.getVoxelObject(sourceObjectId)
  if (!src) throw new Error(`Source object "${sourceObjectId}" not found`)

  const copy = engine.createVoxelObject({
   objectId:newObjectId,
   dimensions:src.dimensions,
   groupPrefix:src.default
   groupPrefix:src.defaultGroup
  })

  src.getAllVoxels().forEach(v => {
   const nx = v.x + offset.x
   const ny = v.y + offset.y
   const nz = v.z + offset.z
   if (
    nx >= 0 && nx < copy.dimensions.width &&
    ny >= 0 && ny < copy.dimensions.height &&
    nz >= 0 && nz < copy.dimensions.depth
   ) {
    copy.setVoxel({
     x:nx, y:ny, z:nz,
     type:v.type, group:v.group, data:v.data
    })
   }
  })
  return copy
 }
}

