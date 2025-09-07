import { useMemo } from 'react'
import InstancedGLTF from '../engine/InstancedGLTF'
import { useWave } from '../engine/WaveProvider'

export default function Flowers({ pads }) {
  const { vertexShader } = useWave()
  const transforms = useMemo(() => {
    const out = []
    const maxPerPad = 6
    for (const [x, y, z, padScale, prob] of pads) {
      if (y != 0) {
        continue
      }
      const R = padScale * 0.66
      let per = 0
      while (per < maxPerPad) {
        if (!(Math.random() > prob)) break
        const t = Math.random() * Math.PI * 2
        const r = Math.sqrt(Math.random()) * R
        const fx = x + Math.cos(t) * r
        const fz = z + Math.sin(t) * r
        const fy = y + 0.04
        const s = 0.8 * padScale * (0.7 + Math.random() * 0.3)
        const yaw = Math.random() * Math.PI * 2
        const pitch = (Math.random() - 0.5) * 0.35
        const roll = (Math.random() - 0.5) * 0.35
        out.push([fx, fy, fz, s, yaw, pitch, roll])
        per++
      }
    }
    return out
  }, [pads])
  return <InstancedGLTF path="flower.glb" transforms={transforms} patchMaterial={vertexShader} />
}

