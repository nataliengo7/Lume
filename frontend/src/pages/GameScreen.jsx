import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import useVoice from '../hooks/useVoice'
import useSpeech from '../hooks/useSpeech'
import ReactMarkdown from 'react-markdown'

const MAX_TURNS = 8
const API = 'http://localhost:8000'

const SCENE_META = {
  coffee_shop: {
    portraitEmoji: '👩‍💼',
    bgEmoji: '☕',
    bgGradient: 'linear-gradient(135deg, #431407 0%, #1c1917 60%, #030712 100%)',
    character: 'Sofia',
    role: 'Barista',
    setting: 'A busy café in the city center',
  },
  job_interview: {
    portraitEmoji: '👨‍💼',
    bgEmoji: '🏢',
    bgGradient: 'linear-gradient(135deg, #172554 0%, #0f172a 60%, #030712 100%)',
    character: 'Marco',
    role: 'HR Manager',
    setting: 'A modern office meeting room',
  },
  medical_consultation: {
    portraitEmoji: '👨‍⚕️',
    bgEmoji: '🏥',
    bgGradient: 'linear-gradient(135deg, #042f2e 0%, #111827 60%, #030712 100%)',
    character: 'Dr. Chen',
    role: 'General Practitioner',
    setting: "A doctor's consultation room",
  },
}

const LANGUAGE_FLAGS = {
  Spanish: '🇪🇸',
  French: '🇫🇷',
  Mandarin: '🇨🇳',
  Portuguese: '🇧🇷',
  German: '🇩🇪',
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
      <div className="flex justify-between text-xs uppercase tracking-widest text-gray-400">
        <span>{label}</span>
        <span className={textColor}>{Math.round(value)}</span>
      </div>
      <div className="h-1 w-full rounded-full" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(139,92,246,0.1)' }}>
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
    portraitEmoji: '💬',
    bgEmoji: '🌐',
    bgGradient: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 60%, #030712 100%)',
    character: 'Agent',
    role: 'Language Partner',
    setting: 'A conversation practice session',
  }

  const flag = LANGUAGE_FLAGS[config.language] ?? '🌐'
  const { level, pct: xpPct, xpToNext } = getLevelInfo(xp)

  const diffBase = { Beginner: 1, Intermediate: 4, Advanced: 6 }[config.difficulty] ?? 1
  const fluency = Math.min(diffBase + turn * 1.1, 10)
  const pronunciation = Math.min(diffBase + turn * 0.7, 10)
  const vocab = Math.min(diffBase + collectedTips.length * 1.5, 10)
  const grammar = Math.min(diffBase + collectedTips.length * 1.0, 10)

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">

      {/* ── LEFT SIDEBAR ── */}
      <div className="w-64 flex-shrink-0 flex flex-col gap-4 p-4 border-r border-violet-900/30">

        {/* Player card */}
        <div className="rounded-lg p-4" style={{ background: 'rgba(15,10,25,0.6)', border: '1px solid rgba(139,92,246,0.2)', backdropFilter: 'blur(10px)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-2xl bg-gray-900 border border-violet-700">
              {flag}
            </div>
            <div>
              <h2 className="text-violet-400 text-sm font-semibold tracking-widest uppercase">
                {config.language} Learner
              </h2>
              <p className="text-gray-500 text-xs italic">{config.difficulty}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs" style={{ fontVariant: 'small-caps', letterSpacing: '0.05em' }}>
              <span className="text-violet-400">Level {level}</span>
              <span className="text-gray-500 text-[10px]">{xp} / {xp + xpToNext} XP</span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(139,92,246,0.1)' }}>
              <div
                className="h-full bg-violet-700 rounded-full transition-all duration-700"
                style={{ width: `${xpPct}%`, boxShadow: '0 0 6px rgba(139,92,246,0.5)' }}
              />
            </div>
          </div>
        </div>

        {/* Attributes */}
        <div className="rounded-lg p-4 flex-1 flex flex-col" style={{ background: 'rgba(15,10,25,0.6)', border: '1px solid rgba(139,92,246,0.2)', backdropFilter: 'blur(10px)' }}>
          <h3 className="text-[10px] text-violet-500 tracking-[0.3em] uppercase mb-5 border-b border-violet-900/30 pb-2">
            Attributes
          </h3>
          <div className="space-y-5">
            <StatBar label="Fluency"      value={fluency}      color="bg-orange-600/60"  textColor="text-orange-400" />
            <StatBar label="Vocabulary"   value={vocab}        color="bg-blue-600/60"    textColor="text-blue-400" />
            <StatBar label="Grammar"      value={grammar}      color="bg-green-600/60"   textColor="text-green-400" />
            <StatBar label="Pronunciation" value={pronunciation} color="bg-violet-600/60" textColor="text-violet-400" />
          </div>

          {/* Phrases learned */}
          <div className="mt-6 flex-1 flex flex-col min-h-0">
            <h3 className="text-[10px] text-violet-500 tracking-[0.3em] uppercase mb-3 border-b border-violet-900/30 pb-2">
              Phrases Learned
            </h3>
            <ul className="text-xs space-y-2 text-gray-500 italic overflow-y-auto flex-1">
              {collectedTips.length === 0 ? (
                <li>• Tips will appear here</li>
              ) : (
                collectedTips.map((t, i) => (
                  <li key={i} className="text-yellow-600/70 leading-snug">• {t.replace(/\[💡 Language tip:\s*/i, '').replace(/\]$/, '').trim()}</li>
                ))
              )}
            </ul>
          </div>

          <div className="mt-auto pt-3 border-t border-violet-900/20">
            <button
              onClick={() => window.location.reload()}
              className="w-full text-[9px] text-gray-600 hover:text-red-500 transition-colors uppercase tracking-[0.2em]"
            >
              Abandon Session
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN PANEL ── */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'rgb(17,24,39)', border: '1px solid rgba(109,40,217,0.25)', boxShadow: '0 0 40px rgba(88,28,135,0.15)' }}>

        {/* Scene Panel — picture at top */}
        <div
          className="relative flex-shrink-0 overflow-hidden border-b border-violet-900/30"
          style={{ height: '40%', background: meta.bgGradient }}
        >
          {/* Faded background emoji */}
          <div className="absolute inset-0 flex items-center justify-center text-[10rem] opacity-[0.07] select-none pointer-events-none">
            {meta.bgEmoji}
          </div>

          {/* Top-left: scenario title */}
          <div className="absolute top-4 left-4">
            <h2 className="font-semibold text-base text-white drop-shadow">{scenarioLabel}</h2>
            <p className="text-gray-400 text-xs mt-0.5">{meta.setting}</p>
          </div>

          {/* Top-right: turn counter */}
          <div className="absolute top-4 right-4 text-right">
            <p className="text-sm text-gray-400">Turn {Math.min(turn, MAX_TURNS)} / {MAX_TURNS}</p>
            <div className="w-28 h-1.5 rounded-full mt-1.5 overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)' }}>
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-300"
                style={{ width: `${(turn / MAX_TURNS) * 100}%` }}
              />
            </div>
          </div>

          {/* Bottom-right: character portrait */}
          <div className="absolute bottom-4 right-4 flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-white drop-shadow">{meta.character}</p>
              <p className="text-xs text-gray-400">{meta.role}</p>
            </div>
            <div
              className="w-16 h-16 rounded-full bg-gray-900/80 flex items-center justify-center text-4xl"
              style={{ border: '2px solid rgba(139,92,246,0.6)', boxShadow: '0 0 12px rgba(139,92,246,0.4)' }}
            >
              {meta.portraitEmoji}
            </div>
          </div>
        </div>

        {/* Chat Area — chatbox below */}
        <div className="flex-1 flex flex-col min-h-0 px-6 py-4">

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
            {displayMsgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'error' ? (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
                    <ReactMarkdown>{m.message}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="max-w-xs md:max-w-lg">
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        m.role === 'user' ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-100'
                      }`}
                    >
                      <ReactMarkdown>{m.message}</ReactMarkdown>
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

          {/* Input row */}
          <div className="shrink-0 relative" style={{ background: 'rgba(5,3,15,0.9)', borderTop: '1px solid rgba(139,92,246,0.2)', margin: '0 -1.5rem -1rem', padding: '1.25rem 1.5rem' }}>

            {/* Help popup */}
            {helpOpen && (
              <div className="absolute bottom-full right-0 mb-3 w-80 rounded-xl z-50" style={{ background: 'rgba(10,8,20,0.97)', border: '1px solid rgba(139,92,246,0.4)', boxShadow: '0 0 30px rgba(88,28,135,0.4)' }}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-violet-900/30">
                  <span className="text-xs text-violet-400 tracking-widest uppercase">Translation Help</span>
                  <button onClick={() => setHelpOpen(false)} className="text-gray-500 hover:text-white transition-colors text-sm">✕</button>
                </div>
                <div className="px-4 py-4 text-sm text-gray-300 leading-relaxed min-h-[80px]">
                  {helpLoading
                    ? <span className="text-gray-500 animate-pulse">Translating...</span>
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
                className="flex-1 bg-transparent text-green-400 placeholder-gray-700 text-sm border-none outline-none"
              />
              <button
                type="button"
                onClick={listening ? stopVoice : startVoice}
                className={`px-3 py-2 rounded-lg text-base transition-all ${
                  listening ? 'bg-red-600 animate-pulse' : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                🎤
              </button>
              <button
                type="button"
                onClick={getHelp}
                disabled={!displayMsgs.some(m => m.role === 'assistant')}
                className="text-[10px] tracking-widest uppercase px-4 py-2 bg-emerald-900/50 hover:bg-emerald-800 text-emerald-300 rounded transition-all border border-emerald-700/40 disabled:opacity-30"
              >
                Need Help
              </button>
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="text-[10px] tracking-widest uppercase px-5 py-2 bg-violet-900 hover:bg-violet-700 text-white rounded transition-all disabled:opacity-40"
              >
                Send
              </button>
            </form>
            {voiceError && <p className="text-red-400 text-xs mt-2">{voiceError}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
