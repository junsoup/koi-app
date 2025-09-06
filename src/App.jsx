import { Canvas } from '@react-three/fiber'
import { Stats } from '@react-three/drei';
import Pixelate from './components/Pixelate'
import FPSLimiter from './utils/FPSLimiter'
import Lights from './components/Lights'
import Scene from './Scene'
import ControlsOverlay from './utils/ControlsOverlay'
import CameraRig from './utils/CameraRig'
import MouseTracker from './utils/MouseTracker'
import { useCurrentView, usePixelScale, usePond, useTheme } from './store/usePond'

export default function App() {
  const view = useCurrentView()
  const pixelScale = usePixelScale()
  const nextView = usePond((s) => s.nextView)
  const theme = useTheme()

  return (
    <div className="relative w-screen h-screen">
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
        <Stats />
      </Canvas>

      <ControlsOverlay onToggleView={nextView} />
    </div>
  )
}

