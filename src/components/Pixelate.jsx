import * as THREE from 'three'
import { useMemo, useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useFBO } from '@react-three/drei'

/**
 * Pixelates the entire scene by rendering into a low-res FBO,
 * then upscaling with nearest-neighbor on a full-screen quad.
 */
export default function Pixelate({ scale = 8, snap = true }) {
  const { gl, scene, camera, size } = useThree()

  // Resolve scale per axis
  const sx = typeof scale === 'number' ? scale : (scale?.x ?? 8)
  const sy = typeof scale === 'number' ? scale : (scale?.y ?? 8)

  // Low-res target
  const target = useFBO(
    Math.max(1, Math.floor(size.width / sx)),
    Math.max(1, Math.floor(size.height / sy)),
    { samples: 0, depthBuffer: true }
  )
  // for aliasing
  target.texture.generateMipmaps = false
  target.texture.minFilter = THREE.LinearFilter // not used on upscaling
  target.texture.magFilter = THREE.NearestFilter

  // Screen-space quad scene + ortho camera
  const quadScene = useMemo(() => new THREE.Scene(), [])
  const quadCam = useMemo(() => {
    const c = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    c.position.z = 1
    return c
  }, [])

  // Shader: simple blit with texel snapping
  const material = useRef()
  const quad = useRef()
  useEffect(() => {
    const geo = new THREE.PlaneGeometry(2, 2)
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: target.texture },
        texSize: { value: new THREE.Vector2(target.width, target.height) },
        doSnap: { value: snap ? 1 : 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D tDiffuse;
        uniform vec2 texSize;
        uniform int doSnap;

        void main() {
          vec2 uv = vUv;
          if (doSnap == 1) {
            vec2 texel = 1.0 / texSize;
            uv = (floor(uv / texel) + 0.5) * texel;
          }
          gl_FragColor = texture2D(tDiffuse, uv);
        }
      `,
      depthWrite: false,
      depthTest: false
    })
    material.current = mat
    const m = new THREE.Mesh(geo, mat)
    quad.current = m
    quadScene.add(m)
    return () => {
      quadScene.remove(m)
      geo.dispose()
      mat.dispose()
    }
  }, [quadScene, target.width, target.height, snap, target.texture])

  // Keep uniforms in sync on resize
  useEffect(() => {
    if (!material.current) return
    material.current.uniforms.texSize.value.set(
      Math.max(1, Math.floor(size.width / sx)),
      Math.max(1, Math.floor(size.height / sy))
    )
  }, [size.width, size.height, sx, sy])

  // Resize the FBO when canvas size changes
  useEffect(() => {
    const w = Math.max(1, Math.floor(size.width / sx))
    const h = Math.max(1, Math.floor(size.height / sy))
    if (target.width !== w || target.height !== h) target.setSize(w, h)
  }, [size.width, size.height, sx, sy, target])

  // Postprocess render
  useFrame(() => {
    // 1) Render the main scene to the low-res target
    const prevTarget = gl.getRenderTarget()
    gl.setRenderTarget(target)
    gl.clear()
    gl.render(scene, camera)

    // 2) Blit to default framebuffer with nearest upscaling
    gl.setRenderTarget(null)
    gl.clear()
    gl.render(quadScene, quadCam)

    // restore
    gl.setRenderTarget(prevTarget)
  }, 1) // run after the default render
  return null
}
