import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { THEME } from '../theme'

export default function Lights({ debug = false }) {
  const dir = useRef()

  useEffect(() => {
    if (!debug || !dir.current) return
    const helper = new THREE.DirectionalLightHelper(dir.current, 2)
    dir.current.parent.add(helper)
    return () => helper.parent?.remove(helper)
  }, [debug])

  return (
    <>
      <ambientLight intensity={7.5} color={THEME.ambientLight} />
      </>
  )
}

