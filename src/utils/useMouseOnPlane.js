import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'

export function useMouseOnPlane(planeY = 0, clampRadius = null) {
  const { camera, gl } = useThree()
  const raycaster = useRef(new THREE.Raycaster()).current
  const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY)).current
  const point = useRef(new THREE.Vector3(0, planeY, 0)).current
  const has = useRef(false)

  useEffect(() => { plane.constant = -planeY }, [planeY])
  useEffect(() => {
    const canvas = gl.domElement
    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      const ndc = {
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
      }
      raycaster.setFromCamera(ndc, camera)
      const hit = new THREE.Vector3()
      if (raycaster.ray.intersectPlane(plane, hit)) {
        if (clampRadius != null) {
          const r = Math.hypot(hit.x, hit.z)
          if (r > clampRadius && r > 1e-6) {
            const k = clampRadius / r
            hit.x *= k; hit.z *= k
          }
        }
        point.copy(hit)
        has.current = true
      } else { has.current = false }
    }
    const onEnter = () => { has.current = true }
    const onLeave = () => { has.current = false }
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerenter', onEnter)
    canvas.addEventListener('pointerleave', onLeave)
    return () => {
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerenter', onEnter)
      canvas.removeEventListener('pointerleave', onLeave)
    }
  }, [camera, gl, plane, clampRadius])

  return { point, has }
}

