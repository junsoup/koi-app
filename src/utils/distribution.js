
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js'

/*
* This generates an array to put down lilypads.
* This is required cause this information needs to be shared to lilypad flowers,
* and grass and grass flowers.*/
export function makeLilyPadLayout() {
  const BOUNDS_RADIUS = 30
  const WATER_LEVEL = 0
  const VARIANCE = 5

  const SAMPLES = 2000

  const SEPARATION_PASSES = 1
  const NOISE_SCALE = 0.04
  const NOISE_CONTRAST = 2.0
  const noise = new SimplexNoise()
  const pads = []

  // 1) Disk uniform samples
  for (let i = 0; i < SAMPLES; i++) {
    const theta = Math.random() * Math.PI * 2
    const r = BOUNDS_RADIUS * Math.sqrt(Math.random())
    const x = Math.cos(theta) * r
    const z = Math.sin(theta) * r

    let n = 0.5 * (noise.noise(x * NOISE_SCALE, z * NOISE_SCALE) + 1.0)
    const k = NOISE_CONTRAST
    n = Math.pow(n, k) / (Math.pow(n, k) + Math.pow(1 - n, k))

    if (Math.random() > n) {
      const scale = Math.random() * Math.random() * 1.5 + 0.25
      pads.push({ x, z, scale, prob: n })
    }
  }

  // Separation
  for (let pass = 0; pass < SEPARATION_PASSES; pass++) {
    let moved = false
    for (let i = 0; i < pads.length; i++) {
      for (let j = i + 1; j < pads.length; j++) {
        const a = pads[i], b = pads[j]
        const dx = a.x - b.x
        const dz = a.z - b.z
        const d = Math.hypot(dx, dz)
        const minD = a.scale + b.scale
        if (d < minD && d > 1e-4) {
          const overlap = (minD - d) * 0.5
          const nx = dx / d, nz = dz / d
          a.x += nx * overlap
          a.z += nz * overlap
          b.x -= nx * overlap
          b.z -= nz * overlap
          moved = true
        }
      }
    }
    if (!moved) break
  }

  const out = new Array(pads.length)
  for (let i = 0; i < pads.length; i++) {
    const p = pads[i]
    const offset = Math.random() * VARIANCE - 0.5 * VARIANCE
    let y = WATER_LEVEL + offset;
    if (y > WATER_LEVEL) {
      y = 0
    } else {
      y -= 0.2;
    }
    out[i] = [p.x, y, p.z, p.scale, p.prob]
  }
  return out
}


