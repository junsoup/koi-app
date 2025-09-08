// src/entities/Koi.jsx
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import React from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useWave } from '../engine/WaveProvider'
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js'
import { useMouseState } from '../store/usePond'

function quatFromDirNoRoll(dir, out) {
  const len2 = dir.lengthSq()
  if (len2 < 1e-12) return out
  const yaw = Math.atan2(dir.x, dir.z)
  const horiz = Math.hypot(dir.x, dir.z)
  let pitch = Math.atan2(dir.y, horiz)
  const EPS = 1e-3
  const MAX_PITCH = Math.PI * 0.1 - EPS
  if (pitch > MAX_PITCH) pitch = MAX_PITCH
  if (pitch < -MAX_PITCH) pitch = -MAX_PITCH
  out.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'))
  return out
}

function Koi({
  path = new URL('../assets/koi.glb', import.meta.url).href,
  count = 100,

  // Pond bounds
  pondRadius = 20,
  depth = [-4.5, 0],

  // Koi visuals
  scaleRange = [1, 3],
  bend = { amp: 0.04, freq: 6.0, speed: 1.8 },
}) {
  const { vertexShader } = useWave()
  const { scene } = useGLTF(path)

  const { point: mousePointArr, has: mouseHas } = useMouseState()
  const mousePoint = { x: mousePointArr[0], y: mousePointArr[1], z: mousePointArr[2] }

  const pos = useRef(new Float32Array(count * 3))
  const vel = useRef(new Float32Array(count * 3))
  const scl = useRef(new Float32Array(count))
  const initializedRef = useRef(false)

  // ---------- Mesh parts + LUT bake ----------
  const parts = useMemo(() => {
    const arr = []
    scene.traverse((o) => {
      if (o.isMesh && o.geometry) {
        const g = o.geometry.clone()
        const geom = g.index ? g.toNonIndexed() : g
        const d = geom.attributes.position.count
        const vId = new Float32Array(d)
        for (let i = 0; i < d; i++) vId[i] = i
        geom.setAttribute('vertexId', new THREE.BufferAttribute(vId, 1))
        geom.computeBoundingBox()
        arr.push({ geometry: geom, material: o.material, vertCount: d })
      }
    })
    return arr
  }, [scene])

  const phases = useMemo(() => {
    const arr = new Float32Array(count)
    for (let i = 0; i < count; i++) arr[i] = Math.random()
    return arr
  }, [count])

  const { offsets, scales } = useMemo(() => {
    const offs = new Float32Array(count * 3)
    const sca = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      offs[i * 3 + 0] = Math.random() * 1000.0
      offs[i * 3 + 1] = Math.random() * 1000.0
      offs[i * 3 + 2] = Math.random() * 1000.0
      sca[i] = THREE.MathUtils.lerp(0.85, 1.6, Math.random())
    }
    return { offsets: offs, scales: sca }
  }, [count])

  const luts = useMemo(() => {
    if (!parts.length) return []
    const simplex = new SimplexNoise()
    return parts.map(({ geometry, vertCount }) => {
      const bbox = geometry.boundingBox
      const min = bbox.min, size = new THREE.Vector3().subVectors(bbox.max, bbox.min)
      if (size.x === 0) size.x = 1e-6
      if (size.y === 0) size.y = 1e-6
      if (size.z === 0) size.z = 1e-6

      const W = vertCount
      const H = count
      const data = new Uint8Array(W * H * 2)
      const posAttr = geometry.getAttribute('position')

      const f1 = 2.75, f2 = 5.2

      for (let i = 0; i < H; i++) {
        const ox = offsets[i * 3 + 0], oy = offsets[i * 3 + 1], oz = offsets[i * 3 + 2]
        const s = scales[i]
        for (let v = 0; v < W; v++) {
          const px = posAttr.getX(v), py = posAttr.getY(v), pz = posAttr.getZ(v)
          const nx = ((px - min.x) / size.x) * s
          const ny = ((py - min.y) / size.y) * s
          const nz = ((pz - min.z) / size.z) * s
          const n1 = simplex.noise3d(nx * f1 + ox, ny * f1 + oy, nz * f1 + oz)
          const n2 = simplex.noise3d(nx * f2 + ox * 1.37 + 13.37, ny * f2 + oy * 0.83 + 7.77, nz * f2 + oz * 1.11 + 42.42)
          const u1 = Math.max(0, Math.min(255, Math.floor((n1 * 0.5 + 0.5) * 255)))
          const u2 = Math.max(0, Math.min(255, Math.floor((n2 * 0.5 + 0.5) * 255)))
          const base = (i * W + v) * 2
          data[base + 0] = u1
          data[base + 1] = u2
        }
      }

      const tex = new THREE.DataTexture(data, W, H, THREE.RGFormat, THREE.UnsignedByteType)
      tex.minFilter = THREE.NearestFilter
      tex.magFilter = THREE.NearestFilter
      tex.wrapS = THREE.ClampToEdgeWrapping
      tex.wrapT = THREE.ClampToEdgeWrapping
      tex.flipY = false
      tex.generateMipmaps = false
      tex.needsUpdate = true

      return { tex, width: W, height: H }
    })
  }, [parts, count, offsets, scales])

  const patchKoiMaterial = useMemo(() => {
    return (material, lutObj) => {
      if (material.userData?.__koiPatched) return
      vertexShader(material)

      material.onBeforeCompile = ((prev) => (shader) => {
        prev?.(shader)

        // uniforms
        shader.uniforms.uKoiAmp = { value: bend.amp ?? 0.08 }
        shader.uniforms.uKoiFreq = { value: bend.freq ?? 6.0 }
        shader.uniforms.uKoiSpeed = { value: bend.speed ?? 1.8 }
        shader.uniforms.uNoiseLUT = { value: lutObj?.tex ?? null }
        shader.uniforms.uLutSize = { value: new THREE.Vector2(lutObj?.width ?? 1, lutObj?.height ?? 1) }

        // small/gold controls
        const smallCutoff = (scaleRange[0] + scaleRange[1]) * 0.3
        shader.uniforms.uSmallCutoff = { value: smallCutoff }
        shader.uniforms.uGoldChance = { value: 0.02 }

        shader.vertexShader = `
attribute float aPhase;
attribute float vertexId;
attribute float instanceId;
attribute float aScale;
varying float vNoise1;
varying float vNoise2;
varying float vInstanceId;
varying float vScale;
` + shader.vertexShader

        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', `
#include <common>
uniform float uKoiAmp;
uniform float uKoiFreq;
uniform float uKoiSpeed;
uniform sampler2D uNoiseLUT;
uniform vec2 uLutSize;
          `)
          .replace('#include <begin_vertex>', `
#include <begin_vertex>
float _koiArg = transformed.z * uKoiFreq + uTime * uKoiSpeed + aPhase * 6.28318530718;
float _koiOffset = sin(_koiArg) * uKoiAmp;
transformed.x += _koiOffset;

vec2 lutUV = vec2((vertexId + 0.5) / uLutSize.x, (instanceId + 0.5) / uLutSize.y);
vec2 nz = texture2D(uNoiseLUT, lutUV).rg;
vNoise1 = nz.r;
vNoise2 = nz.g;
vInstanceId = instanceId;
vScale = aScale;
        `)

        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `
#include <common>
varying float vNoise1;
varying float vNoise2;
varying float vInstanceId;
varying float vScale;

uniform float uSmallCutoff;
uniform float uGoldChance;

vec3 koiOrange() { return vec3(1.0, 0.30, 0.20); }
vec3 koiWhite()  { return vec3(1.0, 1.0, 1.0); }
vec3 koiBlack()  { return vec3(0.08, 0.08, 0.08); }

vec3 koiRed()    { return vec3(1.00, 0.05, 0.05); }
vec3 koiGold()   { return vec3(1.00, 0.75, 0.20); }

float hash1(float n) { return fract(sin(n * 43758.5453123) * 43758.5453123); }
          `)
          .replace('#include <color_fragment>', `
vec3 baseColor = koiWhite();
if (vNoise1 > 0.6)  baseColor = koiOrange();
if (vNoise2 > 0.80) baseColor = koiBlack();

if (vScale < uSmallCutoff) {
  baseColor = koiRed();
} else {
  if (hash1(vInstanceId) < uGoldChance) {
    baseColor = koiGold();
  }
}

#ifdef USE_MAP
  vec4 sampledDiffuseColor = texture2D(map, vUv);
  diffuseColor *= sampledDiffuseColor;
#endif
diffuseColor.rgb *= baseColor;
        `)

        material.userData.shader = shader
      })(material.onBeforeCompile)

      material.userData.__koiPatched = true
      material.needsUpdate = true
    }
  }, [vertexShader, bend.amp, bend.freq, bend.speed, luts, scaleRange])

  const instRefs = useRef([])

  useEffect(() => {
    const phaseAttr = new THREE.InstancedBufferAttribute(phases.slice(), 1)
    const instanceIds = new Float32Array(count)
    for (let i = 0; i < count; i++) instanceIds[i] = i
    const instIdAttr = new THREE.InstancedBufferAttribute(instanceIds, 1)

    for (let k = 0; k < instRefs.current.length; k++) {
      const inst = instRefs.current[k]
      if (!inst) continue
      inst.geometry.setAttribute('aPhase', phaseAttr)
      inst.geometry.setAttribute('instanceId', instIdAttr)
      inst.geometry.attributes.aPhase.needsUpdate = true
      inst.geometry.attributes.instanceId.needsUpdate = true
      inst.count = count
    }
  }, [count, phases])

  // Boids
  const dummy = useMemo(() => new THREE.Object3D(), [])

  // -------- One-time initialization (no persistence) --------
  useEffect(() => {
    if (!parts.length || initializedRef.current) return

    const p = pos.current, v = vel.current
    const q = new THREE.Quaternion()
    const d = new THREE.Vector3()

    const INIT_MIN = 0.015
    const INIT_MAX = 0.045

    for (let i = 0; i < count; i++) {
      // position in pond
      const ang = Math.random() * Math.PI * 2
      const rad = Math.sqrt(Math.random()) * pondRadius * 0.85
      const x = Math.cos(ang) * rad
      const z = Math.sin(ang) * rad
      const y = THREE.MathUtils.lerp(depth[0], depth[1], 0.5) + (Math.random() - 0.5) * 0.05

      p[3 * i + 0] = x; p[3 * i + 1] = y; p[3 * i + 2] = z

      // tangent heading to avoid instant wall hits
      const tangentYaw = ang + (Math.random() < 0.5 ? 1 : -1) * Math.PI * 0.5
      const speed = THREE.MathUtils.lerp(INIT_MIN, INIT_MAX, Math.random())

      const dirX = Math.sin(tangentYaw)
      const dirY = 0.0
      const dirZ = Math.cos(tangentYaw)

      // velocity aligned to facing
      v[3 * i + 0] = dirX * speed
      v[3 * i + 1] = dirY * speed
      v[3 * i + 2] = dirZ * speed

      // skewed size distribution: more small fish
      const r = Math.random() ** 2.0
      scl.current[i] = THREE.MathUtils.lerp(scaleRange[0], scaleRange[1], r)
    }

    // write initial matrices
    for (let i = 0; i < count; i++) {
      const ix = 3 * i
      const x = p[ix + 0], y = p[ix + 1], z = p[ix + 2]
      const dir = new THREE.Vector3(vel.current[ix + 0], vel.current[ix + 1], vel.current[ix + 2])
      if (dir.lengthSq() < 1e-8) {
        const yaw = Math.random() * Math.PI * 2
        dir.set(Math.sin(yaw), 0, Math.cos(yaw))
      }
      quatFromDirNoRoll(dir, q)
      dummy.position.set(x, y, z)
      dummy.quaternion.copy(q)
      dummy.scale.setScalar(scl.current[i])
      dummy.updateMatrix()
      for (let pidx = 0; pidx < parts.length; pidx++) {
        const inst = instRefs.current[pidx]
        if (inst) inst.setMatrixAt(i, dummy.matrix)
      }
    }

    // per-instance scale attribute
    const aScaleArray = new Float32Array(count)
    for (let i = 0; i < count; i++) aScaleArray[i] = scl.current[i]
    const aScaleAttr = new THREE.InstancedBufferAttribute(aScaleArray, 1)
    for (let pidx = 0; pidx < parts.length; pidx++) {
      const inst = instRefs.current[pidx]
      if (!inst) continue
      inst.instanceMatrix.needsUpdate = true
      inst.count = count
      inst.geometry.setAttribute('aScale', aScaleAttr)
      inst.geometry.attributes.aScale.needsUpdate = true
    }

    initializedRef.current = true
  }, [parts, count, pondRadius, depth, scaleRange, dummy])

  // ---------- Boids update loop ----------
  useFrame((_, dt) => {
    if (!parts.length) return
    if (dt > 1) return

    const protectedRadius = 4
    const visibleRadius = 10
    const separationStrength = 3.0 * dt
    const alignmentStrength = 1.0 * dt
    const cohesionStrength = 0.7 * dt
    const foodStrength = 1000 * dt
    const maxSpeed = 4.0 * dt
    const minSpeed = 1.0 * dt
    const lerpForce = 0.08 * dt
    const turnFactor = 0.0125 * dt

    const depthMin = depth[0], depthMax = depth[1]
    const p = pos.current, v = vel.current

    // temps
    const sep = new THREE.Vector3()
    const ali = new THREE.Vector3()
    const coh = new THREE.Vector3()
    const avgPos = new THREE.Vector3()
    const toOther = new THREE.Vector3()
    const desired = new THREE.Vector3()
    const dir = new THREE.Vector3()
    const quat = new THREE.Quaternion()
    const inwardXZ = new THREE.Vector2()

    for (let i = 0; i < count; i++) {
      const ix = 3 * i
      const px = p[ix + 0], py = p[ix + 1], pz = p[ix + 2]
      const vx = v[ix + 0], vy = v[ix + 1], vz = v[ix + 2]

      sep.set(0, 0, 0); ali.set(0, 0, 0); coh.set(0, 0, 0); avgPos.set(0, 0, 0)
      let protectedCount = 0, visibleCount = 0

      // neighbor loop
      for (let j = 0; j < count; j++) {
        if (i === j) continue
        const jx = 3 * j
        const ox = p[jx + 0], oy = p[jx + 1], oz = p[jx + 2]
        toOther.set(px - ox, py - oy, pz - oz)
        const dist = toOther.length()
        if (dist < protectedRadius) {
          sep.add(toOther.divideScalar(dist || 1))
          protectedCount++
        } else if (dist < visibleRadius) {
          ali.add(new THREE.Vector3(v[3 * j + 0], v[3 * j + 1], v[3 * j + 2]))
          avgPos.addScalar(0)
          avgPos.x += ox; avgPos.y += oy; avgPos.z += oz
          visibleCount++
        }
      }

      if (protectedCount > 0) sep.multiplyScalar(separationStrength)
      if (visibleCount > 0) {
        ali.multiplyScalar(1 / visibleCount).multiplyScalar(alignmentStrength)
        avgPos.multiplyScalar(1 / visibleCount)
        coh.set(avgPos.x - px, avgPos.y - py, avgPos.z - pz).multiplyScalar(cohesionStrength)
      }

      // mouse force (tapered near the target)
      const foodForce = new THREE.Vector3()
      if (mouseHas) {
        const tx = mousePoint.x
        const ty = THREE.MathUtils.clamp(mousePoint.y, depthMin, depthMax)
        const tz = mousePoint.z
        const d = Math.max(0.01, Math.hypot(tx - px, ty - py, tz - pz))
        const cutoffNear = 1.0
        const cutoffFar = 3.0
        let strength = THREE.MathUtils.clamp((d - cutoffNear) / (cutoffFar - cutoffNear), 0, 1)
        if (strength > 0.0) {
          foodForce.set(tx - px, ty - py, tz - pz)
            .normalize()
            .multiplyScalar((foodStrength / d) * strength)
        }
      }

      desired.set(0, 0, 0).add(sep).add(ali).add(coh).add(foodForce)

      // boundary avoidance
      const rXZ = Math.hypot(px, pz)
      if (rXZ > 1e-6) {
        inwardXZ.set(-px / rXZ, -pz / rXZ)
        const strength = turnFactor / Math.max(pondRadius - rXZ, 0.001)
        v[ix + 0] += inwardXZ.x * strength
        v[ix + 2] += inwardXZ.y * strength
      }

      // vertical clamp
      v[ix + 1] += turnFactor / Math.max(py - depthMin, 0.001)
      v[ix + 1] -= turnFactor / Math.max(depthMax - py, 0.001)
      v[ix + 1] *= 0.9909

      // velocity lerp
      v[ix + 0] += (desired.x - vx) * lerpForce
      v[ix + 1] += (desired.y - vy) * lerpForce
      v[ix + 2] += (desired.z - vz) * lerpForce

      // speed clamp
      const spd = Math.hypot(v[ix + 0], v[ix + 1], v[ix + 2])
      if (spd > maxSpeed) {
        const k = maxSpeed / (spd || 1)
        v[ix + 0] *= k; v[ix + 1] *= k; v[ix + 2] *= k
      } else if (spd < minSpeed) {
        const k = (minSpeed / (spd || 1))
        v[ix + 0] *= k; v[ix + 1] *= k; v[ix + 2] *= k
      }

      // integrate
      p[ix + 0] = px + v[ix + 0]
      p[ix + 1] = py + v[ix + 1]
      p[ix + 2] = pz + v[ix + 2]
    }

    // write instance transforms
    for (let i = 0; i < count; i++) {
      const ix = 3 * i
      const px = p[ix + 0], py = p[ix + 1], pz = p[ix + 2]
      dir.set(v[ix + 0], v[ix + 1], v[ix + 2]).normalize()
      if (dir.lengthSq() > 0) quatFromDirNoRoll(dir, quat)
      else quat.identity()
      dummy.position.set(px, py, pz)
      dummy.quaternion.copy(quat)
      dummy.scale.setScalar(scl.current[i])
      dummy.updateMatrix()
      for (let k = 0; k < parts.length; k++) {
        const inst = instRefs.current[k]
        inst.setMatrixAt(i, dummy.matrix)
      }
    }
    for (let k = 0; k < parts.length; k++) {
      instRefs.current[k].instanceMatrix.needsUpdate = true
    }
  })

  // Patch materials once LUTs are ready
  useLayoutEffect(() => {
    if (!luts.length) return
    for (let idx = 0; idx < parts.length; idx++) {
      patchKoiMaterial(parts[idx].material, luts[idx])
      parts[idx].material.needsUpdate = true
    }
  }, [parts, luts, patchKoiMaterial])

  return (
    <>
      {parts.map(({ geometry, material }, idx) => (
        <instancedMesh
          key={geometry.uuid ?? idx}
          ref={(el) => { instRefs.current[idx] = el }}
          args={[undefined, undefined, count]}
          castShadow
          receiveShadow
        >
          <primitive attach="geometry" object={geometry} />
          <primitive attach="material" object={material} />
        </instancedMesh>
      ))}
    </>
  )
}

useGLTF.preload(new URL('../assets/koi.glb', import.meta.url).href)

export default React.memo(Koi)
