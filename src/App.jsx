import { useState } from 'react'
import './App.css'
import MobileContainer from './components/MobileContainer'
import HomeChapters from './components/HomeChapters'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <MobileContainer>
        <HomeChapters />
      </MobileContainer>
    </>
  )
}

export default App
