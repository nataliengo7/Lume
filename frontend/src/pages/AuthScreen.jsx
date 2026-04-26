import { useState } from 'react'
import axios from 'axios'

const API = 'http://localhost:8000'

export default function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await axios.post(`${API}/${mode}`, { email, password })
      onAuth(data.token)
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{ background: 'rgba(15,10,25,0.8)', border: '1px solid rgba(139,92,246,0.3)' }}
      >
        <h1 className="text-2xl font-bold text-violet-400 mb-1 tracking-wide">Lume</h1>
        <p className="text-gray-500 text-sm mb-8">Language learning through conversation</p>

        <div className="flex gap-2 mb-6">
          {['login', 'register'].map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm capitalize transition-all ${
                mode === m ? 'bg-violet-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-violet-500 transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-violet-500 transition-colors"
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-violet-700 hover:bg-violet-600 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
          >
            {loading ? '...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}
