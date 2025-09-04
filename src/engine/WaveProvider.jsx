import { createContext, useContext, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'

const WaveCtx = createContext(null)

export function makeVertexShader(uniforms) {
  return function vertexShader(material) {
    if (!material || material.userData?.__vertexPatched) return
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms)

      // Inject small noise helpers
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
         uniform float uTime; uniform float uAmp; uniform float uFreq;
         uniform float uSpeed; uniform float uMinY; uniform float uMaxY;

         // ---- Tiny noise toolkit (value-noise FBM) ----
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
           vec2 u = f*f*(3.0-2.0*f);  // smoothstep
           return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
         }
         float fbm(vec2 p){
           float v = 0.0;
           float a = 0.5;       // gain
           float f = 1.0;       // lacunarity base
           for (int i=0; i<4; i++){
             v += a * noise2(p * f);
             f *= 2.03;         // incommensurate scale
             a *= 0.55;         // decay
           }
           return v;
         }
        `
      )

      // Replace your project block: use FBM + small domain warp
      shader.vertexShader = shader.vertexShader
        .replace('#include <worldpos_vertex>', '') // keep your custom world calc
        .replace(
          '#include <project_vertex>',
          `
          vec4 mvPosition = vec4( transformed, 1.0 );
          #ifdef USE_INSTANCING
            mvPosition = instanceMatrix * mvPosition;
          #endif
          vec4 worldPosition = modelMatrix * mvPosition;

          // ---------- ORGANIC WAVES (FBM + domain warp) ----------
          float t = uTime * uSpeed;
          vec2  p = worldPosition.xz;

          // Tiny, animated domain warp to de-regularize
          // Use two directions that slowly rotate over time
          float rot = 0.17 * t; // slow rotation
          mat2  R   = mat2(cos(rot), -sin(rot), sin(rot), cos(rot));
          vec2  pw  = R * p;

          // Two fbm fields for warp
          vec2 warp;
          warp.x = fbm(pw * (uFreq*0.35) + vec2(1.7, 4.3) + t*0.12);
          warp.y = fbm(pw * (uFreq*0.55) + vec2(5.1, 2.2) - t*0.08);
          p += 0.35 * (warp - 0.5);  // warp strength (0.2–0.5 is nice)

          // Main FBM wave (non-periodic)
          float n = fbm(p * (uFreq*0.85) + vec2(0.0, 7.3) + t*0.25);

          // Map fbm [0,1] -> [-1,1]
          float wave = (n * 2.0 - 1.0);

          // Depth falloff exactly like before
          float depth = clamp((worldPosition.y - uMinY) / (uMaxY - uMinY), 0.0, 1.0);
          worldPosition.y += wave * uAmp * depth;
          // -------------------------------------------------------

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
  const uniforms = useMemo(() => ({
    uTime:  { value: 0 },
    uAmp:   { value: params.amp  },
    uFreq:  { value: params.freq },
    uSpeed: { value: params.speed},
    uMinY:  { value: params.minY  },
    uMaxY:  { value: params.maxY  },
  }), [params])

  const vertexShader = useMemo(() => makeVertexShader(uniforms), [uniforms])
  useFrame((_, dt) => { uniforms.uTime.value += dt })

  const ctx = useMemo(() => ({ uniforms, vertexShader }), [uniforms, vertexShader])
  return <WaveCtx.Provider value={ctx}>{children}</WaveCtx.Provider>
}

export function useWave() {
  const v = useContext(WaveCtx)
  if (!v) throw new Error('useWave must be used inside <WaveProvider>')
  return v
}

