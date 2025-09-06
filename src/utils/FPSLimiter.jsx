// src/utils/FPSLimiter.jsx
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'

export default function FPSLimiter({ fps = 30 }) {
  const invalidate = useThree((s) => s.invalidate)

  useEffect(() => {
    const interval = Math.max(1, Math.floor(1000 / fps))
    const id = setInterval(() => invalidate(), interval)
    return () => clearInterval(id)
  }, [invalidate, fps])

  return null
}

