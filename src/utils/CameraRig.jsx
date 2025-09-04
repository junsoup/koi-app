// CameraRig.jsx
import { useEffect, useRef } from 'react'
import { CameraControls } from '@react-three/drei'

export default function CameraRig({ view }) {
  const controls = useRef(null)

  useEffect(() => {
    if (!controls.current || !view) return
    // smooth move + smooth ortho zoom
    controls.current.setLookAt(
      view.pos[0], view.pos[1], view.pos[2],  // camera position
      0, 0, 0,                                // target
      true                                    // smooth
    )
    controls.current.zoomTo(view.zoom, true)
  }, [view])

  // Disable user input; we only drive it programmatically
  return <CameraControls ref={controls} enabled={false} />
}

