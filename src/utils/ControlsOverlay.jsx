import { useState } from 'react'
import { Maximize2, Group, Palette } from 'lucide-react'
import { usePond } from '../store/usePond'

export default function ControlsOverlay() {
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

  const nextView = usePond((s) => s.nextView)
  const toggleTheme = usePond((s) => s.nextTheme)

  return (
    <>
      <div className="absolute top-2 right-2 flex gap-2 z-10">
        {/* Toggle view button (cube) */}
        <button
          onClick={nextView}
          className="w-8 h-8 bg-black/50 hover:bg-black/70 flex items-center justify-center rounded"
        >
          <Group className="w-4 h-4 text-white" />
        </button>


        {/* Theme toggle button */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 bg-black/50 hover:bg-black/70 flex items-center justify-center rounded"
        >
          <Palette className="w-4 h-4 text-white" />
        </button>

        {/* Fullscreen button */}
        <button
          onClick={toggleFullscreen}
          className="w-8 h-8 bg-black/50 hover:bg-black/80 flex items-center justify-center rounded"
        >
          <Maximize2 className="w-4 h-4 text-white" />
        </button>

      </div>

      {/* Watermark link */}
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
      >
        junsoup.com
      </a>
    </>
  )
}
