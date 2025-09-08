import { useMemo } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import InstancedGLTF from '../engine/InstancedGLTF'
import { useWave } from '../engine/WaveProvider'
import { assetUrl } from '../utils/assetUrl'

/**
 * Props:
 *  pads: [x,y,z,padScale,prob][]
 */
export default function Grass({
  pads = [],
}) {
  const { vertexShader } = useWave()

  // Grass params
  const p = {
    seedProbThreshold: 0.9,
    seedChance: 0.95,
    maxBundles: 108,
    bundleMin: 40,
    bundleMax: 90,
    seedOffsetFactor: 2.2,
    bundleRadiusFactor: 1.6,
    bundleRadiusMin: 0.8,
    scaleFactor: 0.65,
    maxTotal: 6000,
  }
  // Grass Flower params
  const pc = {
    chance: 0.4,
    upFactor: 0.95,
    jitter: 0.08,
    scale: 0.1
  }

  // Estimate blade height
  const { scene: grassScene } = useGLTF(new URL('../assets/grass.glb', import.meta.url).href)
  const bladeHeight = useMemo(() => {
    let maxH = 1
    grassScene.traverse((o) => {
      if (o.isMesh && o.geometry) {
        o.geometry.computeBoundingBox?.()
        const bb = o.geometry.boundingBox
        if (bb) {
          const h = bb.max.y - bb.min.y
          if (h > maxH) maxH = h
        }
      }
    })
    return maxH
  }, [grassScene])

  // Build BOTH grass & cap transforms together from the same seed
  const { grassTransforms, capTransforms } = useMemo(() => {
    // choose bundle seeds near pads
    const seeds = []
    for (const [x, y, z, padScale, prob] of pads) {
      if (prob >= p.seedProbThreshold && Math.random() < p.seedChance) {
        const R = Math.max(padScale * p.seedOffsetFactor, p.bundleRadiusMin * 1.25)
        const t = Math.random() * Math.PI * 2
        const r = Math.sqrt(Math.random()) * R
        seeds.push([x + Math.cos(t) * r, y, z + Math.sin(t) * r, padScale - y])
        if (seeds.length >= p.maxBundles) break
      }
    }

    // expand each seed into a dense bundle
    const grass = []
    const capsOut = []
    const tmpEuler = new THREE.Euler()
    const up = new THREE.Vector3(0, 1, 0)

    let total = 0
    for (const [cx, cy, cz, padScale] of seeds) {
      const count = Math.floor(p.bundleMin + Math.random() * (p.bundleMax - p.bundleMin))
      const bundleR = Math.max(padScale * p.bundleRadiusFactor, p.bundleRadiusMin)

      for (let i = 0; i < count && total < p.maxTotal; i++) {
        // grass instance
        const t = Math.random() * Math.PI * 2
        const r = Math.sqrt(Math.random()) * bundleR
        const gx = cx + Math.cos(t) * r
        const gz = cz + Math.sin(t) * r
        const gy = cy + 0.02
        const s = p.scaleFactor * padScale * (0.9 + Math.random() * 0.6)
        const yaw = Math.random() * Math.PI * 2
        const pitch = (Math.random() - 0.5) * 0.35
        const roll = (Math.random() - 0.5) * 0.35
        grass.push([gx, gy, gz, s, yaw, pitch, roll])
        total++

        // cap on top of this blade
        if (Math.random() < pc.chance) {
          tmpEuler.set(pitch, yaw, roll)
          const upWorld = up.clone().applyEuler(tmpEuler)
          const tip = upWorld.clone().multiplyScalar(bladeHeight * s * pc.upFactor)
          const tt = Math.random() * Math.PI * 2
          const rr = Math.sqrt(Math.random()) * pc.jitter
          const jx = Math.cos(tt) * rr
          const jz = Math.sin(tt) * rr

          const fx = gx + tip.x + jx
          const fy = gy + tip.y
          const fz = gz + tip.z + jz
          const fs = s * pc.scale * (0.9 + Math.random() * 0.25)
          const fyaw = Math.random() * Math.PI * 2
          const fpitch = (Math.random() - 0.5) * 0.2
          const froll = (Math.random() - 0.5) * 0.2
          capsOut.push([fx, fy, fz, fs, fyaw, fpitch, froll])
        }
      }
    }

    return { grassTransforms: grass, capTransforms: capsOut }
  }, [
    pads,
    p.seedProbThreshold, p.seedChance, p.maxBundles, p.bundleMin, p.bundleMax,
    p.seedOffsetFactor, p.bundleRadiusFactor, p.bundleRadiusMin, p.scaleFactor, p.maxTotal,

    bladeHeight,
  ])

  if (!grassTransforms.length && !capTransforms.length) return null

  return (
    <>
      {/* Grass bundles */}
      {grassTransforms.length > 0 && (
        <InstancedGLTF
          path="grass.glb"
          transforms={grassTransforms}
          patchMaterial={vertexShader}
        />
      )}

      {/* Cap flowers placed on the tips of a subset of blades */}
      {capTransforms.length > 0 && (
        <InstancedGLTF
          path='flower_cap.glb'
          transforms={capTransforms}
          patchMaterial={vertexShader}
        />
      )}
    </>
  )
}

useGLTF.preload(new URL('../assets/grass.glb', import.meta.url).href)
useGLTF.preload(new URL('../assets/flower_cap.glb', import.meta.url).href)
