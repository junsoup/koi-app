import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useWave } from '../engine/WaveProvider'


function deriveTones(colorLike, { darkMul = 0.55, lightMul = 1.15 } = {}) {
  const base = new THREE.Color().set(colorLike) // robust to string/number/Color
  const dark = base.clone().multiplyScalar(darkMul)
  const light = base.clone().multiplyScalar(lightMul)
  return { base, dark, light }
}


export default function WaterPlane({
  size,
  y,
  water,
  levels = 4,
  opacity = .6
}) {
  const { vertexShader } = useWave()
  const subDivisions = Math.trunc(size / 2)

  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: '#ffffff',      // base not used; we override rgb in the shader
      transparent: true,
      opacity,
      roughness: 0.0,
      metalness: 0.0,
    })

    vertexShader(m)

    m.onBeforeCompile = ((prev) => (shader) => {
      prev?.(shader)

      // Initialize uniforms from the *current* theme on first compile.
      const { dark, light } = deriveTones(water)

      shader.uniforms.uWaterDark = { value: dark }
      shader.uniforms.uWaterLight = { value: light }
      shader.uniforms.uLevels = { value: levels }
      shader.uniforms.uOpacity = { value: opacity }

      // expose for later updates
      m.userData.shader = shader

      // export displacement & depth
      shader.vertexShader =
        `
        varying float vDisp;
        varying float vDepth;
        ` + shader.vertexShader

      shader.vertexShader = shader.vertexShader.replace(
        'worldPosition.y += wave * uAmp * depth;',
        `
        float _disp = wave * uAmp * depth;
        vDisp  = _disp;
        vDepth = depth;
        worldPosition.y += _disp;
        `
      )
      // color quantization using uniforms
      shader.fragmentShader =
        `
        varying float vDisp; varying float vDepth;
        uniform float uAmp;
        uniform vec3  uWaterDark;
        uniform vec3  uWaterLight;
        uniform float uLevels;
        uniform float uOpacity;
        ` + shader.fragmentShader

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <tonemapping_fragment>',
        `
        float denom = max(1e-5, uAmp * max(1e-5, vDepth));
        float waveLocal = clamp(vDisp / denom, -1.0, 1.0);
        float local01   = 0.5 * (waveLocal + 1.0);

        float L = max(2.0, uLevels);
        float q = floor(local01 * L) / (L - 1.0);
        q = clamp(q, 0.0, 1.0);

        gl_FragColor.rgb = mix(uWaterDark, uWaterLight, q);
        gl_FragColor.a   = uOpacity;

        #include <tonemapping_fragment>
        `
      )
    })(m.onBeforeCompile)

    return m
    // material creation does NOT depend on water; we update via uniforms below
  }, [vertexShader, levels, opacity])  // (keep `water` out to avoid re-creating)

  // Live updates when theme/params change (after first compile)
  useEffect(() => {
    const apply = () => {
      const shader = material?.userData?.shader
      if (!shader) return false
      const { dark, light } = deriveTones(water)
      shader.uniforms.uWaterDark.value.copy(dark)
      shader.uniforms.uWaterLight.value.copy(light)
      shader.uniforms.uLevels.value = levels
      shader.uniforms.uOpacity.value = opacity
      return true
    }

    // try now; if shader not ready yet, retry on next frame once
    if (!apply()) {
      const id = requestAnimationFrame(apply)
      return () => cancelAnimationFrame(id)
    }
  }, [material, water, levels, opacity])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
      <planeGeometry args={[size, size, subDivisions, subDivisions]} />
      <primitive attach="material" object={material} />
    </mesh>
  )
}
