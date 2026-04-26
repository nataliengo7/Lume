import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import LoginScreen from './pages/LoginScreen'
import ScenarioSelect from './pages/ScenarioSelect'
import GameScreen from './pages/GameScreen'
import ScoreScreen from './pages/ScoreScreen'
import VerifyScreen from './pages/VerifyScreen'

function RequireAuth({ children }) {
  return localStorage.getItem('token') ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950 text-white">
        <Routes>
          <Route path="/" element={<LoginScreen />} />
          <Route path="/select" element={<RequireAuth><ScenarioSelect /></RequireAuth>} />
          <Route path="/game" element={<RequireAuth><GameScreen /></RequireAuth>} />
          <Route path="/score" element={<RequireAuth><ScoreScreen /></RequireAuth>} />
          <Route path="/verify" element={<VerifyScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
