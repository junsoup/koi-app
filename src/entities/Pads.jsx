import { useMemo } from 'react'
import InstancedGLTF from '../engine/InstancedGLTF'
import { useWave } from '../engine/WaveProvider'

export default function Pads({ pads = [] }) {
  const { vertexShader } = useWave()
  const transforms = useMemo(
    () => pads.map(([x, y, z, s]) => [x, y, z, s, Math.random() * Math.PI * 2, 0, 0]),
    [pads]
  )
  return <InstancedGLTF path="pad.glb" transforms={transforms} patchMaterial={vertexShader} />
}

