import { useMemo } from 'react'
import React from 'react'
import { WaveProvider } from './engine/WaveProvider'
import WaterPlane from './components/WaterPlane'
import Pads from './entities/Pads'
import Flowers from './entities/Flowers'
import Grass from './entities/Grass'
import Koi from './entities/Koi'
import { makeLilyPadLayout } from './utils/distribution'

function Scene({ theme }) {
  const pads = useMemo(() => makeLilyPadLayout(), [])
  return (
    <WaveProvider params={{ amp: 1.1, freq: 0.2, speed: 0.2, minY: -20, maxY: 0 }}>
      <WaterPlane size={100} y={-0.1} water={theme.water} />
      <Pads pads={pads} />
      <Flowers pads={pads} />
      <Grass
        pads={pads}
      />
      <Koi count={20} area={20} depth={[-2.5, -0.4]} />
    </WaveProvider>
  )
}

export default React.memo(Scene)
