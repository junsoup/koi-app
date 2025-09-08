import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'

export default function InstancedGLTF({
  path,
  transforms = [],                  // Array<[x,y,z, s, yaw, pitch, roll]>
  patchMaterial,                    // function(material) or undefined
  castShadow = false,
  receiveShadow = false,
}) {
  const { scene } = useGLTF(new URL('../assets/' + path, import.meta.url).href)
  const parts = useMemo(() => {
    const arr = []
    scene.traverse((o) => {
      if (o.isMesh && o.geometry) {
        arr.push({ geometry: o.geometry.clone(), material: o.material })
      }
    })
    return arr
  }, [scene])

  useLayoutEffect(() => {
    if (!patchMaterial) return
    for (const p of parts) { patchMaterial(p.material); p.material.needsUpdate = true }
  }, [parts, patchMaterial])

  const instRefs = useRef([])

  useEffect(() => {
    if (!parts.length || !transforms.length) return
    const dummy = new THREE.Object3D()
    for (let p = 0; p < parts.length; p++) {
      const inst = instRefs.current[p]
      if (!inst) continue
      if (inst.count !== transforms.length) inst.count = transforms.length

      for (let i = 0; i < transforms.length; i++) {
        const [x, y, z, s, yaw = 0, pitch = 0, roll = 0] = transforms[i]
        dummy.position.set(x, y, z)
        dummy.rotation.set(pitch, yaw, roll)
        dummy.scale.setScalar(s)
        dummy.updateMatrix()
        inst.setMatrixAt(i, dummy.matrix)
      }
      inst.instanceMatrix.needsUpdate = true
    }
  }, [parts, transforms])

  if (!parts.length || !transforms.length) return null

  return (
    <>
      {parts.map(({ geometry, material }, idx) => (
        <instancedMesh
          key={geometry.uuid ?? idx}
          ref={(el) => { instRefs.current[idx] = el }}
          args={[undefined, undefined, transforms.length]}
          castShadow={castShadow}
          receiveShadow={receiveShadow}
        >
          <primitive attach="geometry" object={geometry} />
          <primitive attach="material" object={material} />
        </instancedMesh>
      ))}
    </>
  )
}
