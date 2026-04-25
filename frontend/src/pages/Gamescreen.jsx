import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import useVoice from '../hooks/useVoice'
import useSpeech from '../hooks/useSpeech'

const MAX_TURNS = 8
const API = 'http://localhost:8000'

function parseTip(text) {
  const idx = text.indexOf('[💡')
  if (idx === -1) return { message: text, tip: null }
  return { message: text.slice(0, idx).trim(), tip: text.slice(idx) }
}

export default function GameScreen({ config, onScore }) {
  const [displayMsgs, setDisplayMsgs] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [turn, setTurn] = useState(0)
  const historyRef = useRef([])
  const endRef = useRef(null)
  const { speak } = useSpeech()
  const { listening, error: voiceError, start: startVoice, stop: stopVoice } = useVoice({
    onResult: (text) => setInput(text),
    language: config.language,
  })

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayMsgs])

  useEffect(() => {
    fetchOpening()
  }, [])

  async function callChat(message) {
    const { data } = await axios.post(`${API}/chat`, {
      scenario_id: config.scenario_id,
      language: config.language,
      difficulty: config.difficulty,
      history: historyRef.current,
      message,
    })
    return data.reply
  }

  async function fetchOpening() {
    setLoading(true)
    try {
      const reply = await callChat('__opening__')
      historyRef.current = [
        { role: 'user', content: '__opening__' },
        { role: 'assistant', content: reply },
      ]
      const { message, tip } = parseTip(reply)
      setDisplayMsgs([{ role: 'assistant', message, tip }])
      speak(message, config.language)
    } catch (err) {
      setDisplayMsgs([{ role: 'error', message: `Backend error: ${err.response?.data?.detail || err.message}. Is the backend running?` }])
    } finally {
      setLoading(false)
    }
  }

  async function sendMessage(userText) {
    if (!userText.trim() || loading) return
    setDisplayMsgs((prev) => [...prev, { role: 'user', message: userText }])
    setInput('')
    setLoading(true)
    try {
      const reply = await callChat(userText)
      historyRef.current = [
        ...historyRef.current,
        { role: 'user', content: userText },
        { role: 'assistant', content: reply },
      ]
      const { message, tip } = parseTip(reply)
      setDisplayMsgs((prev) => [...prev, { role: 'assistant', message, tip }])
      speak(message, config.language)
      const newTurn = turn + 1
      setTurn(newTurn)
      if (newTurn >= MAX_TURNS) {
        const { data: scoreData } = await axios.post(`${API}/score`, {
          scenario_id: config.scenario_id,
          language: config.language,
          difficulty: config.difficulty,
          history: historyRef.current,
        })
        onScore(scoreData)
      }
    } catch (err) {
      setDisplayMsgs((prev) => [
        ...prev,
        { role: 'error', message: `Error: ${err.response?.data?.detail || err.message}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  const scenarioLabel = config.scenario_id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col h-screen">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h2 className="font-semibold text-lg">{scenarioLabel}</h2>
          <p className="text-gray-500 text-sm">{config.language} · {config.difficulty}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">Turn {Math.min(turn, MAX_TURNS)} / {MAX_TURNS}</p>
          <div className="w-32 h-1.5 bg-gray-800 rounded-full mt-1.5">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-300"
              style={{ width: `${(turn / MAX_TURNS) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {displayMsgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'error' ? (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
                {m.message}
              </div>
            ) : (
              <div className="max-w-xs md:max-w-md">
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === 'user' ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-100'
                  }`}
                >
                  {m.message}
                </div>
                {m.tip && (
                  <div className="mt-1.5 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-300 text-xs leading-relaxed">
                    {m.tip}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-2xl px-4 py-3 text-gray-400 text-sm animate-pulse">
              ● ● ●
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="shrink-0">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(input) }} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your response..."
            disabled={loading}
            className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-violet-500"
          />
          <button
            type="button"
            onClick={listening ? stopVoice : startVoice}
            className={`px-4 py-3 rounded-xl text-lg transition-all ${
              listening ? 'bg-red-600 animate-pulse' : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            🎤
          </button>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-5 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-semibold disabled:opacity-40 transition-all"
          >
            →
          </button>
        </form>
        {voiceError && <p className="text-red-400 text-xs mt-2">{voiceError}</p>}
      </div>
    </div>
  )
}
