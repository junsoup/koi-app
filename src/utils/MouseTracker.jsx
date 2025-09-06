// src/utils/MouseTracker.jsx
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { useSetMouse } from '../store/usePond'

/** Tracks mouse over an infinite Y=planeY plane and clamps radius if provided. */
export default function MouseTracker({ planeY = 0, clampRadius = null }) {
  const { camera, gl } = useThree()
  const setMouse = useSetMouse()
  const raycaster = useRef(new THREE.Raycaster()).current
  const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY)).current
  const hit = useRef(new THREE.Vector3())

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
      if (raycaster.ray.intersectPlane(plane, hit.current)) {
        if (clampRadius != null) {
          const r = Math.hypot(hit.current.x, hit.current.z)
          if (r > clampRadius && r > 1e-6) {
            const k = clampRadius / r
            hit.current.x *= k
            hit.current.z *= k
          }
        }
        setMouse(true, hit.current)
      } else {
        setMouse(false)
      }
    }
    const onEnter = () => setMouse(true, hit.current)
    const onLeave = () => setMouse(false)

    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerenter', onEnter)
    canvas.addEventListener('pointerleave', onLeave)
    return () => {
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerenter', onEnter)
      canvas.removeEventListener('pointerleave', onLeave)
    }
  }, [camera, gl, plane, clampRadius, setMouse])

  return null
}
