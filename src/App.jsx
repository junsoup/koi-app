import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import Pixelate from './components/Pixelate'
import FPSLimiter from './utils/FPSLimiter'
import Lights from './components/Lights'
import Scene from './Scene'
import ControlsOverlay from './utils/ControlsOverlay'
import CameraRig from './utils/CameraRig'
import { THEMES } from './theme'

export default function App() {
  const [themeName, setThemeName] = useState('forest')
  const theme = THEMES[themeName]

  const views = [
    { pos: [12, 9, 0], zoom: 50, pixelScale: 6 },
    { pos: [0, 15, 0], zoom: 28, pixelScale: 4 }
  ]
  const [viewIdx, setViewIdx] = useState(0)
  const currentView = views[viewIdx]

  const toggleView = () => setViewIdx(i => (i + 1) % views.length)
  const toggleTheme = () => setThemeName(n => (n === 'forest' ? 'sunset' : 'forest'))

  return (
    <div className="relative w-screen h-screen">
      <Canvas
        orthographic
        camera={{ zoom: views[0].zoom, position: views[0].pos, near: -100, far: 1000 }}
        frameloop="demand"
      >
        <color attach="background" args={[theme.background]} />
        <Lights ambient={theme.ambientLight} />
        <Scene theme={theme} />

        <CameraRig view={currentView} />

        <Pixelate scale={currentView.pixelScale} snap />
        <FPSLimiter fps={20} />
      </Canvas>

      <ControlsOverlay
        onToggleView={toggleView}
        onToggleTheme={toggleTheme}
      />

      <a
        href="https://junsoup.com"
        target="_blank"
        rel="noopener noreferrer"
        className="
    absolute bottom-2 left-1/2 -translate-x-1/2
    text-sm text-white/80
    bg-black/40 border border-white/30
    rounded-full px-3 
    backdrop-blur-sm
    hover:bg-black/60 hover:text-white
    transition
    pointer-events-auto
  "
      >junsoup.com</a>
    </div>
  )
}

