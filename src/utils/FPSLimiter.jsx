import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'

export default function FPSLimiter({ fps = 30 }) {
  const { invalidate } = useThree()
  const interval = 1000 / fps
  const timer = useRef()

  useEffect(() => {
    let last = performance.now()
    function loop() {
      const now = performance.now()
      if (now - last >= interval) {
        last = now
        invalidate()
      }
      timer.current = requestAnimationFrame(loop)
    }
    timer.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(timer.current)
  }, [interval, invalidate])

  return null
}
