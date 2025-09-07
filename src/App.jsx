// src/App.jsx
import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import Pixelate from './components/Pixelate'
import FPSLimiter from './utils/FPSLimiter'
import Lights from './components/Lights'
import Scene from './Scene'
import CameraRig from './utils/CameraRig'
import MouseTracker from './utils/MouseTracker'
import { useCurrentView, usePixelScale, usePond, useTheme } from './store/usePond'


export default function KoiPond({ headless = false, className = 'relative w-screen h-screen' }) {
  const view = useCurrentView()
  const pixelScale = usePixelScale()
  const nextView = usePond((s) => s.nextView)
  const theme = useTheme()

  // Only create a lazy import when NOT headless (prevents the chunk from loading at all)
  let ControlsOverlayLazy = null
  if (!headless) {
    ControlsOverlayLazy = React.lazy(() => import('./utils/ControlsOverlay'))
  }

  return (
    <div className={className}>
      <Canvas
        orthographic
        camera={{ zoom: view.zoom, position: view.pos, near: -100, far: 1000 }}
        frameloop="demand"
      >
        <color attach="background" args={[theme.background]} />
        <Lights ambient={theme.ambientLight} />
        <Scene theme={theme} />

        <CameraRig view={view} />
        <Pixelate scale={pixelScale} snap />
        <FPSLimiter fps={25} />
        <MouseTracker planeY={-2} clampRadius={50} />
      </Canvas>

      {!headless && ControlsOverlayLazy && (
        <Suspense fallback={null}>
          <ControlsOverlayLazy onToggleView={nextView} />
        </Suspense>
      )}
    </div>
  )
}

