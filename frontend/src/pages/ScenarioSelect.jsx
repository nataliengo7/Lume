import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const MAP_W = 2400
const MAP_H = 1400

const PINS = [
  { id: 'coffee_shop',          emoji: '☕', label: 'Café',       sub: 'Sofia the Barista',        x: 310,  y: 220,  bg: '#fef9c3', accent: '#f59e0b' },
  { id: 'restaurant',           emoji: '🍽️', label: 'Restaurant', sub: 'Jack the Waiter',           x: 820,  y: 350,  bg: '#fefce8', accent: '#eab308' },
  { id: 'job_interview',        emoji: '💼', label: 'Office',     sub: 'Marco the HR Manager',      x: 1100, y: 150,  bg: '#dbeafe', accent: '#3b82f6' },
  { id: 'hotel_check_in',       emoji: '🏨', label: 'Hotel',      sub: 'Juan the Front Desk',       x: 1140, y: 440,  bg: '#ede9fe', accent: '#8b5cf6' },
  { id: 'airport',              emoji: '✈️', label: 'Airport',    sub: 'Annie the Agent',           x: 1960, y: 170,  bg: '#e0f2fe', accent: '#0ea5e9' },
  { id: 'grocery_store',        emoji: '🛒', label: 'Market',     sub: 'Lucas the Employee',        x: 200,  y: 710,  bg: '#fff7ed', accent: '#f97316' },
  { id: 'clothing_store',       emoji: '👗', label: 'Boutique',   sub: 'Marie the Stylist',         x: 660,  y: 910,  bg: '#fdf2f8', accent: '#ec4899' },
  { id: 'medical_consultation', emoji: '🏥', label: 'Hospital',   sub: 'Dr. Chen',                  x: 1830, y: 630,  bg: '#d1fae5', accent: '#10b981' },
  { id: 'subway',               emoji: '🚇', label: 'Metro',      sub: 'Kenji the Transit Worker',  x: 1310, y: 1090, bg: '#f5f3ff', accent: '#7c3aed' },
]

const LANGUAGES = [
  { value: 'Spanish', flag: '🇪🇸' },
  { value: 'French', flag: '🇫🇷' },
  { value: 'Mandarin', flag: '🇨🇳' },
  { value: 'Portuguese', flag: '🇧🇷' },
  { value: 'German', flag: '🇩🇪' },
]

const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced']

const TREES = [
  [100,450],[160,510],[420,430],[980,700],[1220,590],[610,610],[910,810],
  [1510,390],[1710,910],[2110,610],[220,210],[1410,610],[740,680],[1050,860],
  [1640,290],[300,950],[2000,480],[1380,360],[550,200],[1880,1000],
]

export default function ScenarioSelect() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState(null)
  const [language, setLanguage] = useState('Spanish')
  const [difficulty, setDifficulty] = useState('Beginner')
  const [pins, setPins] = useState(PINS)
  const [generating, setGenerating] = useState(false)
  const [offset, setOffset] = useState({ x: -80, y: -60 })

  const isDragging = useRef(false)
  const hasDragged = useRef(false)
  const dragStart = useRef(null)

  function onMouseDown(e) {
    isDragging.current = true
    hasDragged.current = false
    dragStart.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    }
  }

  function onMouseMove(e) {
    if (!isDragging.current || !dragStart.current) return
    const dx = e.clientX - dragStart.current.clientX
    const dy = e.clientY - dragStart.current.clientY
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) hasDragged.current = true
    const mapEl = e.currentTarget
    setOffset({
      x: Math.min(0, Math.max(-(MAP_W - mapEl.clientWidth), dragStart.current.offsetX + dx)),
      y: Math.min(0, Math.max(-(MAP_H - mapEl.clientHeight), dragStart.current.offsetY + dy)),
    })
  }

  function onMouseUp() {
    isDragging.current = false
    dragStart.current = null
  }

  function handlePinClick(pinId) {
    if (hasDragged.current) return
    setSelected(pinId)
  }

  async function createScenario() {
    const prompt = window.prompt('Describe your scenario idea:')
    if (!prompt) return
    setGenerating(true)
    try {
      const res = await fetch(`${API}/generate_scenario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, language }),
      })
      const newScenario = await res.json()
      if (!res.ok) throw new Error(newScenario.detail || 'Unknown error')
      const newPin = {
        id: newScenario.id,
        emoji: '✨',
        label: newScenario.title,
        sub: newScenario.character,
        x: 700 + Math.random() * 600,
        y: 450 + Math.random() * 350,
        bg: '#f0fdf4',
        accent: '#22c55e',
      }
      setPins(prev => [...prev, newPin])
      setSelected(newScenario.id)
    } catch {
      alert('Failed to generate scenario')
    } finally {
      setGenerating(false)
    }
  }

  const selectedPin = pins.find(p => p.id === selected)

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#060e08' }}>

      {/* HEADER */}
      <div
        className="flex-shrink-0 text-center py-4 px-4 flex items-center justify-center gap-3"
        style={{ background: '#080f0a', borderBottom: '1px solid rgba(34,197,94,0.2)' }}
      >
        <h1 className="text-4xl font-bold" style={{ color: '#4ade80', textShadow: '0 0 20px rgba(74,222,128,0.4)' }}>
          🗺️ LinguaScene
        </h1>
        <span className="text-lg hidden sm:inline" style={{ color: '#2a4a32' }}>— explore the city!</span>
      </div>

      {/* MAP VIEWPORT */}
      <div
        className="flex-1 overflow-hidden relative select-none"
        style={{ cursor: isDragging.current ? 'grabbing' : 'grab' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* Map canvas */}
        <div
          style={{
            position: 'absolute',
            width: MAP_W,
            height: MAP_H,
            transform: `translate(${offset.x}px, ${offset.y}px)`,
            willChange: 'transform',
          }}
        >
          {/* Grass base */}
          <div style={{ position: 'absolute', inset: 0, background: '#bbf7d0' }} />

          {/* Horizontal roads */}
          {[120, 340, 560, 780, 1000, 1220].map(y => (
            <div key={y} style={{ position: 'absolute', left: 0, right: 0, top: y, height: 38, background: '#f1f5f9', borderTop: '2px dashed #94a3b8', borderBottom: '2px dashed #94a3b8' }} />
          ))}
          {/* Vertical roads */}
          {[160, 480, 800, 1120, 1440, 1760, 2080].map(x => (
            <div key={x} style={{ position: 'absolute', top: 0, bottom: 0, left: x, width: 38, background: '#f1f5f9', borderLeft: '2px dashed #94a3b8', borderRight: '2px dashed #94a3b8' }} />
          ))}

          {/* Districts */}
          <div style={{ position: 'absolute', left: 0, top: 0, width: 460, height: 320, background: '#fef9c3', borderRadius: '0 0 28px 0', border: '3px solid #fde68a', opacity: 0.9 }} />
          <div style={{ position: 'absolute', left: 840, top: 0, width: 440, height: 320, background: '#dbeafe', borderRadius: '0 0 28px 28px', border: '3px solid #93c5fd', opacity: 0.9 }} />
          <div style={{ position: 'absolute', left: 1760, top: 0, width: 640, height: 380, background: '#e0f2fe', borderRadius: '0 0 28px 0', border: '3px solid #7dd3fc', opacity: 0.9 }} />
          <div style={{ position: 'absolute', left: 660, top: 200, width: 320, height: 280, background: '#fefce8', borderRadius: 24, border: '3px solid #fde047', opacity: 0.9 }} />
          <div style={{ position: 'absolute', left: 980, top: 360, width: 320, height: 260, background: '#ede9fe', borderRadius: 24, border: '3px solid #c4b5fd', opacity: 0.9 }} />
          <div style={{ position: 'absolute', left: 0, top: 580, width: 440, height: 280, background: '#fff7ed', borderRadius: '0 28px 28px 0', border: '3px solid #fed7aa', opacity: 0.9 }} />
          <div style={{ position: 'absolute', left: 500, top: 780, width: 320, height: 280, background: '#fdf2f8', borderRadius: 24, border: '3px solid #fbcfe8', opacity: 0.9 }} />
          <div style={{ position: 'absolute', left: 1640, top: 500, width: 440, height: 340, background: '#d1fae5', borderRadius: 24, border: '3px solid #6ee7b7', opacity: 0.9 }} />
          <div style={{ position: 'absolute', left: 1080, top: 960, width: 480, height: 280, background: '#f5f3ff', borderRadius: 24, border: '3px solid #ddd6fe', opacity: 0.9 }} />

          {/* Park & river */}
          <div style={{ position: 'absolute', left: 490, top: 380, width: 460, height: 340, background: '#86efac', borderRadius: '50%', border: '3px solid #4ade80', opacity: 0.6 }} />
          <div style={{ position: 'absolute', left: 0, top: 350, width: 500, height: 50, background: '#7dd3fc', borderRadius: '0 30px 30px 0', opacity: 0.5 }} />
          <div style={{ position: 'absolute', left: 1280, top: 840, width: 460, height: 50, background: '#7dd3fc', borderRadius: 30, opacity: 0.5 }} />

          {/* Trees */}
          {TREES.map(([tx, ty], i) => (
            <span key={i} style={{ position: 'absolute', left: tx, top: ty, fontSize: 18, pointerEvents: 'none', userSelect: 'none' }}>🌳</span>
          ))}

          {/* Compass */}
          <div style={{ position: 'absolute', right: 48, bottom: 48, width: 52, height: 52, borderRadius: '50%', background: '#0a1409', border: '2px solid rgba(34,197,94,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, boxShadow: '0 0 12px rgba(34,197,94,0.2)', pointerEvents: 'none' }}>🧭</div>

          {/* PINS */}
          {pins.map(pin => {
            const isSelected = selected === pin.id
            return (
              <button
                key={pin.id}
                data-pin="true"
                onMouseDown={e => e.stopPropagation()}
                onClick={() => handlePinClick(pin.id)}
                style={{
                  position: 'absolute',
                  left: pin.x - 19,
                  top: pin.y - 52,
                  width: 38,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  cursor: 'pointer',
                  zIndex: isSelected ? 20 : 10,
                  transform: isSelected ? 'scale(1.25) translateY(-4px)' : 'scale(1)',
                  transition: 'transform 0.2s cubic-bezier(.34,1.56,.64,1)',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                }}
              >
                {/* Teardrop pin */}
                <div style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50% 50% 50% 0',
                  transform: 'rotate(-45deg)',
                  background: isSelected ? pin.accent : pin.bg,
                  border: `2px solid ${pin.accent}`,
                  boxShadow: isSelected
                    ? `0 0 0 3px ${pin.accent}44, 0 3px 10px ${pin.accent}66`
                    : '0 2px 6px rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <span style={{ transform: 'rotate(45deg)', fontSize: 15 }}>{pin.emoji}</span>
                </div>
                {/* Label */}
                <div style={{
                  background: '#0a1409',
                  border: `2px solid ${isSelected ? pin.accent : 'rgba(34,197,94,0.3)'}`,
                  borderRadius: 8,
                  padding: '2px 7px',
                  fontSize: 10,
                  fontWeight: 'bold',
                  color: isSelected ? pin.accent : '#e2ffe8',
                  whiteSpace: 'nowrap',
                  boxShadow: isSelected ? `0 0 8px ${pin.accent}66` : '0 2px 8px rgba(0,0,0,0.4)',
                }}>{pin.label}</div>
              </button>
            )
          })}
        </div>

        {/* Hint */}
        <div style={{ position: 'absolute', top: 10, left: 10, background: '#0a1409', borderRadius: 10, padding: '5px 12px', fontSize: 12, color: '#4b7a5a', border: '1px solid rgba(34,197,94,0.2)', pointerEvents: 'none' }}>
          👆 Drag to explore • Click a pin to select
        </div>
      </div>

      {/* BOTTOM PANEL */}
      <div
        className="flex-shrink-0 p-4"
        style={{ background: '#080f0a', borderTop: '1px solid rgba(34,197,94,0.2)' }}
      >
        <div className="max-w-4xl mx-auto">

          {selectedPin && (
            <div
              className="flex items-center gap-3 mb-3 p-3 rounded-xl"
              style={{ background: 'rgba(10,22,13,0.9)', border: `1px solid ${selectedPin.accent}55` }}
            >
              <span style={{ fontSize: 30 }}>{selectedPin.emoji}</span>
              <div className="flex-1">
                <h3 className="font-bold text-base" style={{ color: '#e2ffe8' }}>{selectedPin.label}</h3>
                <p className="text-sm" style={{ color: '#4b7a5a' }}>with {selectedPin.sub}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-lg px-2" style={{ color: '#2a4a32' }}>✕</button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: '#4b7a5a' }}>Language</p>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="w-full rounded-xl px-3 py-2 focus:outline-none"
                style={{ background: '#0a1409', border: '1px solid rgba(34,197,94,0.25)', color: '#e2ffe8' }}
              >
                {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.flag} {l.value}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: '#4b7a5a' }}>Difficulty</p>
              <div className="flex gap-2">
                {DIFFICULTIES.map(d => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
                    style={difficulty === d
                      ? { background: '#166534', color: '#bbf7d0', border: '1px solid rgba(34,197,94,0.5)' }
                      : { background: '#0a1409', color: '#4b7a5a', border: '1px solid rgba(34,197,94,0.15)' }
                    }
                  >{d}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/game', { state: { scenario_id: selected, language, difficulty } })}
              disabled={!selected}
              className="flex-1 py-3 rounded-xl font-bold text-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: '#166534', color: '#bbf7d0', border: '1px solid rgba(34,197,94,0.4)', boxShadow: '0 4px 0 #14532d' }}
            >
              {selected ? 'Start Scene! →' : 'Click a pin on the map ↑'}
            </button>
            <button
              onClick={createScenario}
              disabled={generating}
              className="px-4 py-3 rounded-xl font-bold transition-all whitespace-nowrap"
              style={{ background: '#0a1409', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}
            >
              {generating ? '⏳ Generating...' : '✨ Custom'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
