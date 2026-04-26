import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function LoginScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const justVerified = searchParams.get('verified') === '1'
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const endpoint = tab === 'signup' ? '/register' : '/login'
      const { data } = await axios.post(`${API}${endpoint}`, { email, password })
      localStorage.setItem('token', data.token)
      navigate('/select')
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (checkEmail) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#060e08' }}>
      <div className="text-center">
        <div className="text-5xl mb-4">📬</div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#4ade80' }}>Check your email</h2>
        <p style={{ color: '#4b7a5a' }}>We sent a verification link to <strong style={{ color: '#a7f3d0' }}>{email}</strong></p>
        <button onClick={() => setCheckEmail(false)} className="mt-6 text-xs" style={{ color: '#4b7a5a' }}>
          Back to login
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#060e08' }}>

      {/* Background glow blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)' }}/>
        <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(74,222,128,0.06) 0%, transparent 70%)' }}/>
      </div>

      <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>

        {/* Verified banner */}
        {justVerified && (
          <div className="mb-6 px-4 py-3 rounded-xl text-center text-sm" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}>
            ✅ Email verified! You can now log in.
          </div>
        )}

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🗺️</div>
          <h1 className="text-4xl font-bold" style={{ color: '#4ade80', textShadow: '0 0 24px rgba(74,222,128,0.4)' }}>
            LinguaScene
          </h1>
          <p className="mt-2" style={{ color: '#4b7a5a' }}>Learn languages through real-life conversations</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8" style={{ background: '#0a1409', border: '1px solid rgba(34,197,94,0.25)', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>

          {/* Tabs */}
          <div className="flex mb-6 rounded-xl overflow-hidden" style={{ background: '#060e08', border: '1px solid rgba(34,197,94,0.15)' }}>
            {['login', 'signup'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 py-2.5 text-sm font-bold transition-all capitalize"
                style={tab === t
                  ? { background: '#166534', color: '#bbf7d0', borderRadius: 10 }
                  : { color: '#4b7a5a' }
                }
              >
                {t === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Username field (signup only) */}
            {tab === 'signup' && (
              <div>
                <label className="block text-xs uppercase tracking-widest mb-1.5 font-bold" style={{ color: '#4b7a5a' }}>
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="your_username"
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                  style={{
                    background: '#060e08',
                    border: '1px solid rgba(34,197,94,0.2)',
                    color: '#e2ffe8',
                    caretColor: '#4ade80',
                  }}
                  onFocus={e => e.target.style.border = '1px solid rgba(74,222,128,0.6)'}
                  onBlur={e => e.target.style.border = '1px solid rgba(34,197,94,0.2)'}
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs uppercase tracking-widest mb-1.5 font-bold" style={{ color: '#4b7a5a' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                style={{
                  background: '#060e08',
                  border: '1px solid rgba(34,197,94,0.2)',
                  color: '#e2ffe8',
                  caretColor: '#4ade80',
                }}
                onFocus={e => e.target.style.border = '1px solid rgba(74,222,128,0.6)'}
                onBlur={e => e.target.style.border = '1px solid rgba(34,197,94,0.2)'}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs uppercase tracking-widest mb-1.5 font-bold" style={{ color: '#4b7a5a' }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all pr-12"
                  style={{
                    background: '#060e08',
                    border: '1px solid rgba(34,197,94,0.2)',
                    color: '#e2ffe8',
                    caretColor: '#4ade80',
                  }}
                  onFocus={e => e.target.style.border = '1px solid rgba(74,222,128,0.6)'}
                  onBlur={e => e.target.style.border = '1px solid rgba(34,197,94,0.2)'}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-lg"
                  style={{ color: '#4b7a5a', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Forgot password (login only) */}
            {tab === 'login' && (
              <div className="text-right">
                <button type="button" className="text-xs" style={{ color: '#4b7a5a', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Forgot password?
                </button>
              </div>
            )}

            {error && <p className="text-red-400 text-xs text-center">{error}</p>}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-base transition-all mt-2 disabled:opacity-50"
              style={{ background: '#166534', color: '#bbf7d0', border: '1px solid rgba(34,197,94,0.4)', boxShadow: '0 4px 0 #14532d' }}
              onMouseEnter={e => e.currentTarget.style.background = '#15803d'}
              onMouseLeave={e => e.currentTarget.style.background = '#166534'}
            >
              {loading ? '...' : tab === 'login' ? 'Log In →' : 'Create Account →'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px" style={{ background: 'rgba(34,197,94,0.15)' }}/>
              <span className="text-xs" style={{ color: '#2a4a32' }}>or</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(34,197,94,0.15)' }}/>
            </div>

            {/* Guest button */}
            <button
              type="button"
              onClick={() => navigate('/select')}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all"
              style={{ background: 'transparent', color: '#4b7a5a', border: '1px solid rgba(34,197,94,0.15)' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#4ade80'; e.currentTarget.style.border = '1px solid rgba(34,197,94,0.3)' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#4b7a5a'; e.currentTarget.style.border = '1px solid rgba(34,197,94,0.15)' }}
            >
              Continue as Guest
            </button>

          </form>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-xs" style={{ color: '#2a4a32' }}>
          By continuing you agree to our Terms of Service
        </p>

      </div>
    </div>
  )
}
