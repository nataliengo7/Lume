import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import useVoice from '../hooks/useVoice'
import useSpeech from '../hooks/useSpeech'
import ReactMarkdown from 'react-markdown'

const MAX_TURNS = 8
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const SCENE_META = {
  coffee_shop: {
    image: '/images/cafe.jpg',
    portraitEmoji: '👩‍💼', bgEmoji: '☕',
    bgGradient: 'linear-gradient(135deg, #431407 0%, #1c0e00 60%, #050a02 100%)',
    character: 'Sofia', role: 'Barista', setting: 'A busy café in the city center',
  },
  job_interview: {
    image: '/images/interview.webp',
    portraitEmoji: '👨‍💼', bgEmoji: '🏢',
    bgGradient: 'linear-gradient(135deg, #0c1a2e 0%, #071222 60%, #030a14 100%)',
    character: 'Marco', role: 'HR Manager', setting: 'A modern office meeting room',
  },
  medical_consultation: {
    image: '/images/doctors.jpg',
    portraitEmoji: '👨‍⚕️', bgEmoji: '🏥',
    bgGradient: 'linear-gradient(135deg, #042f2e 0%, #021e1d 60%, #010e0d 100%)',
    character: 'Dr. Chen', role: 'General Practitioner', setting: "A doctor's consultation room",
  },
  clothing_store: {
    portraitEmoji: '💃', bgEmoji: '👗',
    bgGradient: 'linear-gradient(135deg, #2d0a1f 0%, #1a0612 60%, #0a0208 100%)',
    character: 'Marie', role: 'Store Employee', setting: 'A chic boutique shop',
  },
  hotel_check_in: {
    portraitEmoji: '🤵', bgEmoji: '🏨',
    bgGradient: 'linear-gradient(135deg, #1e1333 0%, #110b1f 60%, #070412 100%)',
    character: 'Juan', role: 'Front Desk Worker', setting: 'A nice hotel lobby',
  },
  grocery_store: {
    portraitEmoji: '🧑‍🍳', bgEmoji: '🛒',
    bgGradient: 'linear-gradient(135deg, #2d1500 0%, #1a0c00 60%, #0a0500 100%)',
    character: 'Lucas', role: 'Store Employee', setting: 'A busy supermarket',
  },
  airport: {
    portraitEmoji: '👩‍✈️', bgEmoji: '✈️',
    bgGradient: 'linear-gradient(135deg, #0a2030 0%, #061522 60%, #020a14 100%)',
    character: 'Annie', role: 'Check-In Agent', setting: 'An international airport',
  },
  restaurant: {
    portraitEmoji: '🧑‍🍽️', bgEmoji: '🍽️',
    bgGradient: 'linear-gradient(135deg, #2d2000 0%, #1a1300 60%, #0a0800 100%)',
    character: 'Jack', role: 'Waiter', setting: 'A nice sit-down restaurant',
  },
  subway: {
    portraitEmoji: '🧑‍🔧', bgEmoji: '🚇',
    bgGradient: 'linear-gradient(135deg, #1a0d33 0%, #0f0820 60%, #060312 100%)',
    character: 'Kenji', role: 'Transit Worker', setting: 'A busy subway station',
  },
}

const LANGUAGE_FLAGS = {
  Spanish: '🇪🇸', French: '🇫🇷', Mandarin: '🇨🇳', Portuguese: '🇧🇷', German: '🇩🇪',
}

const XP_PER_TURN = 15
const XP_LEVELS = [0, 50, 120, 220, 350, 500, 680, 900]

function getLevelInfo(xp) {
  let level = 1
  for (let i = 1; i < XP_LEVELS.length; i++) {
    if (xp >= XP_LEVELS[i]) level = i + 1
    else break
  }
  const lo = XP_LEVELS[level - 1] ?? 0
  const hi = XP_LEVELS[level] ?? lo + 200
  return { level, pct: Math.min(((xp - lo) / (hi - lo)) * 100, 100), xpToNext: Math.max(hi - xp, 0) }
}

function StatBar({ label, value, color, textColor }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs uppercase tracking-widest" style={{ color: '#4b7a5a' }}>
        <span>{label}</span>
        <span className={textColor}>{Math.round(value)}</span>
      </div>
      <div className="h-1.5 w-full rounded-full" style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.12)' }}>
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${(value / 10) * 100}%` }}
        />
      </div>
    </div>
  )
}

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
  const [xp, setXp] = useState(0)
  const [collectedTips, setCollectedTips] = useState([])
  const [helpOpen, setHelpOpen] = useState(false)
  const [helpText, setHelpText] = useState('')
  const [helpLoading, setHelpLoading] = useState(false)
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
      if (tip) setCollectedTips([tip])
      speak(message, config.language)
    } catch (err) {
      setDisplayMsgs([{ role: 'error', message: `Error: ${err.response?.data?.detail || err.message}` }])
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
      if (tip) setCollectedTips((prev) => [...prev, tip])
      speak(message, config.language)
      const newTurn = turn + 1
      setTurn(newTurn)
      setXp((prev) => prev + XP_PER_TURN)
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

  async function getHelp() {
    const lastAI = [...displayMsgs].reverse().find((m) => m.role === 'assistant')
    if (!lastAI) return
    setHelpOpen(true)
    setHelpLoading(true)
    setHelpText('')
    try {
      const { data } = await axios.post(`${API}/help`, {
        message: lastAI.message,
        language: config.language,
      })
      setHelpText(data.help)
    } catch (err) {
      setHelpText(`Error: ${err.response?.data?.detail || err.message}`)
    } finally {
      setHelpLoading(false)
    }
  }

  const scenarioLabel = config.scenario_id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  const meta = SCENE_META[config.scenario_id] ?? {
    portraitEmoji: '💬', bgEmoji: '🌐',
    bgGradient: 'linear-gradient(135deg, #052e1e 0%, #031a11 60%, #010a07 100%)',
    character: 'Agent', role: 'Language Partner', setting: 'A conversation practice session',
  }

  const flag = LANGUAGE_FLAGS[config.language] ?? '🌐'
  const { level, pct: xpPct, xpToNext } = getLevelInfo(xp)

  const diffBase = { Beginner: 1, Intermediate: 4, Advanced: 6 }[config.difficulty] ?? 1
  const fluency       = Math.min(diffBase + turn * 1.1, 10)
  const pronunciation = Math.min(diffBase + turn * 0.7, 10)
  const vocab         = Math.min(diffBase + collectedTips.length * 1.5, 10)
  const grammar       = Math.min(diffBase + collectedTips.length * 1.0, 10)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#060e08', color: '#e2ffe8' }}>

      {/* ── LEFT SIDEBAR ── */}
      <div className="w-64 flex-shrink-0 flex flex-col gap-3 p-4" style={{ borderRight: '1px solid rgba(34,197,94,0.18)', background: '#080f0a' }}>

        {/* Player card */}
        <div className="rounded-2xl p-4" style={{ background: 'rgba(10,22,13,0.9)', border: '1px solid rgba(34,197,94,0.25)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-2xl" style={{ background: '#0a1409', border: '2px solid rgba(74,222,128,0.4)' }}>
              {flag}
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-widest uppercase" style={{ color: '#4ade80' }}>
                {config.language} Learner
              </h2>
              <p className="text-xs" style={{ color: '#4b7a5a' }}>{config.difficulty}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span style={{ color: '#4ade80' }} className="font-bold">Level {level}</span>
              <span className="text-[10px]" style={{ color: '#4b7a5a' }}>{xp} / {xp + xpToNext} XP</span>
            </div>
            <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${xpPct}%`, background: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,0.5)' }}
              />
            </div>
          </div>
        </div>

        {/* Attributes */}
        <div className="rounded-2xl p-4 flex-1 flex flex-col" style={{ background: 'rgba(10,22,13,0.9)', border: '1px solid rgba(34,197,94,0.25)' }}>
          <h3 className="text-[10px] tracking-[0.3em] uppercase mb-4 pb-2 font-bold" style={{ color: '#22c55e', borderBottom: '1px solid rgba(34,197,94,0.15)' }}>
            Attributes
          </h3>
          <div className="space-y-4">
            <StatBar label="Fluency"       value={fluency}       color="bg-orange-500"  textColor="text-orange-400" />
            <StatBar label="Vocabulary"    value={vocab}         color="bg-blue-500"    textColor="text-blue-400" />
            <StatBar label="Grammar"       value={grammar}       color="bg-emerald-500" textColor="text-emerald-400" />
            <StatBar label="Pronunciation" value={pronunciation} color="bg-violet-500"  textColor="text-violet-400" />
          </div>

          {/* Phrases learned */}
          <div className="mt-5 flex-1 flex flex-col min-h-0">
            <h3 className="text-[10px] tracking-[0.3em] uppercase mb-2 pb-2 font-bold" style={{ color: '#22c55e', borderBottom: '1px solid rgba(34,197,94,0.15)' }}>
              Phrases Learned
            </h3>
            <ul className="text-xs space-y-2 overflow-y-auto flex-1 italic">
              {collectedTips.length === 0 ? (
                <li style={{ color: '#2a4a32' }}>• Tips will appear here</li>
              ) : (
                collectedTips.map((t, i) => (
                  <li key={i} className="leading-snug" style={{ color: '#a3e635' }}>
                    • {t.replace(/\[💡 Language tip:\s*/i, '').replace(/\]$/, '').trim()}
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="mt-auto pt-3" style={{ borderTop: '1px solid rgba(34,197,94,0.1)' }}>
            <button
              onClick={() => window.location.reload()}
              className="w-full text-[9px] uppercase tracking-[0.2em] transition-colors"
              style={{ color: '#2a4a32' }}
              onMouseEnter={e => e.target.style.color = '#f87171'}
              onMouseLeave={e => e.target.style.color = '#2a4a32'}
            >
              Abandon Session
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN PANEL ── */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#070d09', borderLeft: '1px solid rgba(34,197,94,0.12)' }}>

        {/* Scene Panel */}
        <div
          className="relative flex-shrink-0 overflow-hidden"
          style={{ height: '38%', background: meta.bgGradient, borderBottom: '1px solid rgba(34,197,94,0.2)' }}
        >
          {meta.image && (
            <>
              <img src={meta.image} alt="scene" className="absolute inset-0 w-full h-full object-cover"/>
              <div className="absolute inset-0 bg-black/60"/>
            </>
          )}
          <div className="absolute inset-0 flex items-center justify-center text-[10rem] opacity-[0.06] select-none pointer-events-none">
            {meta.bgEmoji}
          </div>

          <div className="absolute top-4 left-4">
            <h2 className="font-bold text-base text-white drop-shadow">{scenarioLabel}</h2>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{meta.setting}</p>
          </div>

          <div className="absolute top-4 right-4 text-right">
            <p className="text-sm font-bold text-white">Turn {Math.min(turn, MAX_TURNS)} / {MAX_TURNS}</p>
            <div className="w-28 h-1.5 rounded-full mt-1.5 overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${(turn / MAX_TURNS) * 100}%`, background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.6)' }}
              />
            </div>
          </div>

          <div className="absolute bottom-4 right-4 flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-bold text-white drop-shadow">{meta.character}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{meta.role}</p>
            </div>
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-4xl"
              style={{ background: 'rgba(0,0,0,0.5)', border: '2px solid rgba(34,197,94,0.6)', boxShadow: '0 0 16px rgba(34,197,94,0.35)' }}
            >
              {meta.portraitEmoji}
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-h-0 px-6 py-4">

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
            {displayMsgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'error' ? (
                  <div className="rounded-2xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                    <ReactMarkdown>{m.message}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="max-w-xs md:max-w-lg">
                    <div
                      className="rounded-2xl px-4 py-3 text-sm leading-relaxed"
                      style={m.role === 'user'
                        ? { background: '#15803d', color: '#f0fdf4' }
                        : { background: '#0d1a0f', color: '#d1fae5', border: '1px solid rgba(34,197,94,0.2)' }
                      }
                    >
                      <ReactMarkdown>{m.message}</ReactMarkdown>
                    </div>
                    {m.tip && (
                      <div className="mt-1.5 px-3 py-2 rounded-xl text-xs leading-relaxed" style={{ background: 'rgba(163,230,53,0.08)', border: '1px solid rgba(163,230,53,0.25)', color: '#a3e635' }}>
                        {m.tip}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-3 text-sm animate-pulse" style={{ background: '#0d1a0f', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e' }}>
                  ● ● ●
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input row */}
          <div
            className="shrink-0 relative"
            style={{ background: 'rgba(5,12,7,0.98)', borderTop: '1px solid rgba(34,197,94,0.2)', margin: '0 -1.5rem -1rem', padding: '1.25rem 1.5rem' }}
          >
            {/* Help popup */}
            {helpOpen && (
              <div
                className="absolute bottom-full right-0 mb-3 w-80 rounded-2xl z-50"
                style={{ background: '#0a1409', border: '1px solid rgba(34,197,94,0.4)', boxShadow: '0 8px 30px rgba(34,197,94,0.15)' }}
              >
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(34,197,94,0.15)' }}>
                  <span className="text-xs tracking-widest uppercase font-bold" style={{ color: '#4ade80' }}>Translation Help</span>
                  <button onClick={() => setHelpOpen(false)} className="transition-colors text-sm" style={{ color: '#4b7a5a' }}>✕</button>
                </div>
                <div className="px-4 py-4 text-sm leading-relaxed min-h-[80px]" style={{ color: '#a7f3d0' }}>
                  {helpLoading
                    ? <span className="animate-pulse" style={{ color: '#2a4a32' }}>Translating...</span>
                    : <span className="whitespace-pre-wrap">{helpText}</span>
                  }
                </div>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); sendMessage(input) }} className="flex gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your response..."
                disabled={loading}
                className="flex-1 bg-transparent text-sm border-none outline-none"
                style={{ color: '#4ade80', caretColor: '#22c55e' }}
              />
              <button
                type="button"
                onClick={listening ? stopVoice : startVoice}
                className="px-3 py-2 rounded-xl text-base transition-all"
                style={listening
                  ? { background: '#dc2626', color: 'white' }
                  : { background: '#0d1a0f', border: '1px solid rgba(34,197,94,0.25)', color: '#e2ffe8' }
                }
              >
                🎤
              </button>
              <button
                type="button"
                onClick={getHelp}
                disabled={!displayMsgs.some(m => m.role === 'assistant')}
                className="text-[10px] tracking-widest uppercase px-4 py-2 rounded-xl transition-all font-bold disabled:opacity-30"
                style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}
              >
                Need Help
              </button>
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="text-[10px] tracking-widest uppercase px-5 py-2 rounded-xl transition-all font-bold disabled:opacity-40"
                style={{ background: '#166534', color: '#bbf7d0', border: '1px solid rgba(34,197,94,0.4)' }}
              >
                Send
              </button>
            </form>
            {voiceError && <p className="text-xs mt-2" style={{ color: '#f87171' }}>{voiceError}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
