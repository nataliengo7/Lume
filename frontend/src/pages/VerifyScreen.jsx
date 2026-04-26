import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function VerifyScreen() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('verifying')
  const navigate = useNavigate()

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus('invalid')
      return
    }
    axios.get(`${API}/verify?token=${token}`)
      .then(() => {
        setStatus('success')
        setTimeout(() => navigate('/'), 3000)
      })
      .catch(() => setStatus('invalid'))
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#060e08' }}>
      <div className="text-center">
        {status === 'verifying' && <>
          <div className="text-5xl mb-4">⏳</div>
          <p style={{ color: '#4b7a5a' }}>Verifying your email...</p>
        </>}
        {status === 'success' && <>
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#4ade80' }}>Email verified!</h2>
          <p style={{ color: '#4b7a5a' }}>Redirecting you to login...</p>
        </>}
        {status === 'invalid' && <>
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#f87171' }}>Invalid link</h2>
          <p style={{ color: '#4b7a5a' }}>This verification link is invalid or has already been used.</p>
          <button onClick={() => navigate('/')} className="mt-4 px-6 py-2 rounded-xl" style={{ background: '#166534', color: '#bbf7d0' }}>
            Back to Login
          </button>
        </>}
      </div>
    </div>
  )
}
