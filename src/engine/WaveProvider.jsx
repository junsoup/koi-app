import { createContext, useContext, useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'

const WaveCtx = createContext(null)

export function makeVertexShader(uniforms) {
  return function vertexShader(material) {
    if (!material || material.userData?.__vertexPatched) return
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uniforms.uTime
      shader.uniforms.uAmp = uniforms.uAmp
      shader.uniforms.uFreq = uniforms.uFreq
      shader.uniforms.uSpeed = uniforms.uSpeed
      shader.uniforms.uMinY = uniforms.uMinY
      shader.uniforms.uMaxY = uniforms.uMaxY

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
           uniform float uTime; uniform float uAmp; uniform float uFreq;
           uniform float uSpeed; uniform float uMinY; uniform float uMaxY;

           float hash21(vec2 p){
             p = fract(p*vec2(123.34, 345.45));
             p += dot(p, p+34.345);
             return fract(p.x*p.y);
           }
           float noise2(vec2 p){
             vec2 i = floor(p), f = fract(p);
             float a = hash21(i);
             float b = hash21(i + vec2(1.0,0.0));
             float c = hash21(i + vec2(0.0,1.0));
             float d = hash21(i + vec2(1.0,1.0));
             vec2 u = f*f*(3.0-2.0*f);
             return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
           }
           float fbm(vec2 p){
             float v = 0.0;
             float a = 0.5;
             float f = 1.0;
             for (int i=0; i<4; i++){
               v += a * noise2(p * f);
               f *= 2.03;
               a *= 0.55;
             }
             return v;
           }`
      )

      shader.vertexShader = shader.vertexShader
        .replace('#include <worldpos_vertex>', '')
        .replace(
          '#include <project_vertex>',
          `
            vec4 mvPosition = vec4( transformed, 1.0 );
            #ifdef USE_INSTANCING
              mvPosition = instanceMatrix * mvPosition;
            #endif
            vec4 worldPosition = modelMatrix * mvPosition;

            float t = uTime * uSpeed;
            vec2  p = worldPosition.xz;

            float rot = 0.17 * t;
            mat2  R   = mat2(cos(rot), -sin(rot), sin(rot), cos(rot));
            vec2  pw  = R * p;

            vec2 warp;
            warp.x = fbm(pw * (uFreq*0.35) + vec2(1.7, 4.3) + t*0.12);
            warp.y = fbm(pw * (uFreq*0.55) + vec2(5.1, 2.2) - t*0.08);
            p += 0.35 * (warp - 0.5);

            float n = fbm(p * (uFreq*0.85) + vec2(0.0, 7.3) + t*0.25);
            float wave = (n * 2.0 - 1.0);

            float depth = clamp((worldPosition.y - uMinY) / (uMaxY - uMinY), 0.0, 1.0);
            worldPosition.y += wave * uAmp * depth;

            mvPosition = viewMatrix * worldPosition;
            gl_Position = projectionMatrix * mvPosition;
            `
        )

      material.userData.shader = shader
    }

    material.userData.__vertexPatched = true
    material.needsUpdate = true
  }
}

export function WaveProvider({ children, params }) {
  const uniforms = useRef({
    uTime:  { value: 0 },
    uAmp:   { value: params.amp  },
    uFreq:  { value: params.freq },
    uSpeed: { value: params.speed},
    uMinY:  { value: params.minY },
    uMaxY:  { value: params.maxY },
  }).current

  useEffect(() => {
    uniforms.uAmp.value   = params.amp
    uniforms.uFreq.value  = params.freq
    uniforms.uSpeed.value = params.speed
    uniforms.uMinY.value  = params.minY
    uniforms.uMaxY.value  = params.maxY
  }, [params, uniforms])

  const vertexShader = useMemo(() => makeVertexShader(uniforms), [uniforms])

  // keep animating time 
  useFrame((_, dt) => { uniforms.uTime.value += dt })

  const ctx = useMemo(() => ({ uniforms, vertexShader }), [uniforms, vertexShader])
  return <WaveCtx.Provider value={ctx}>{children}</WaveCtx.Provider>
}

export function useWave() {
  const v = useContext(WaveCtx)
  if (!v) throw new Error('useWave must be used inside <WaveProvider>')
  return v
}
