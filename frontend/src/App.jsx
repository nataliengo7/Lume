import { useState } from 'react'
import LoginScreen from './pages/LoginScreen'
import ScenarioSelect from './pages/ScenarioSelect'
import GameScreen from './pages/GameScreen'
import ScoreScreen from './pages/ScoreScreen'

export default function App() {
  const [screen, setScreen] = useState('login')
  const [config, setConfig] = useState(null)
  const [scoreData, setScoreData] = useState(null)

  function handleStart(cfg) {
    setConfig(cfg)
    setScoreData(null)
    setScreen('game')
  }

  function handleScore(data) {
    setScoreData(data)
    setScreen('score')
  }

  function handleRestart() {
    setConfig(null)
    setScoreData(null)
    setScreen('select')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {screen === 'login'  && <LoginScreen onLogin={() => setScreen('select')} />}
      {screen === 'select' && <ScenarioSelect onStart={handleStart} />}
      {screen === 'game'   && <GameScreen config={config} onScore={handleScore} />}
      {screen === 'score'  && <ScoreScreen scoreData={scoreData} onRestart={handleRestart} />}
    </div>
  )
}
