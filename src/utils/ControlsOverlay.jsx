import { useState } from 'react'
import { Maximize2, Group, Palette } from 'lucide-react'  // icons

export default function ControlsOverlay({ onToggleView, onToggleTheme }) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  return (
    <div className="absolute top-2 right-2 flex gap-2 z-10">
      {/* Toggle view button (cube) */}
      <button
        onClick={onToggleView}
        className="w-8 h-8 bg-black/50 hover:bg-black/70 flex items-center justify-center rounded"
      >
        <Group className="w-4 h-4 text-white" />
      </button>

      {/* Fullscreen button */}
      <button
        onClick={toggleFullscreen}
        className="w-8 h-8 bg-black/50 hover:bg-black/80 flex items-center justify-center rounded"
      >
        <Maximize2 className="w-4 h-4 text-white" />
      </button>

      {/* Theme toggle button */}
      {/*
      <button
        onClick={onToggleTheme}
        className="w-8 h-8 bg-black/50 hover:bg-white/20 flex items-center justify-center rounded text-xs font-bold text-white"
      >
       <Palette className="w-4 h-4 text-white" />
      </button>
      */}
    </div>
  )
}
