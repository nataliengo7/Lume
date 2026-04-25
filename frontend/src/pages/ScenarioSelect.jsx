import { useState } from 'react'

const SCENARIOS = [
  {
    id: 'coffee_shop',
    title: 'Café Order',
    description: 'Order coffee and a pastry, get the wifi password',
    emoji: '☕',
    character: 'Sofia the barista',
  },
  {
    id: 'job_interview',
    title: 'Job Interview',
    description: 'Introduce yourself and discuss your experience',
    emoji: '💼',
    character: 'Marco the HR manager',
  },
  {
    id: 'medical_consultation',
    title: "Doctor's Appointment",
    description: 'Describe your symptoms and understand the diagnosis',
    emoji: '🏥',
    character: 'Dr. Chen',
  },
  {
   id: 'clothing_store',
    title: 'Shopping for Clothes',
    description: 'Find an outfit for a special occasion and complete a purchase',
    emoji: '👗',
    character: 'Marie the store employee',
  },
   {
    id: 'hotel_check_in',
    title: 'Hotel Check-In',
    description: 'Check in to your room and ask about amenities and local spots',
    emoji: '🏨',
    character: 'Juan the front desk worker',
  },
  {
    id: 'grocery_store',
    title: 'Grocery Shopping',
    description: 'Find items on your list and check out at the register',
    emoji: '🛒',
    character: 'Lucas the store employee',
  },
  {
    id: 'airport',
    title: 'Airport Check-In',
    description: 'Check in for your flight and find your gate',
    emoji: '✈️',
    character: 'Annie the check-in agent',
  },
  {
    id: 'restaurant',
    title: 'Restaurant Dinner',
    description: 'Order food and drinks and handle the bill',
    emoji: '🍽️',
    character: 'Jack the waiter',
  },
  {
    id: 'subway',
    title: 'Subway Navigation',
    description: 'Buy a ticket and find the right train to your destination',
    emoji: '🚇',
    character: 'Kenji the transit worker',
  },
]

const LANGUAGES = [
  { value: 'Spanish', flag: '🇪🇸' },
  { value: 'French', flag: '🇫🇷' },
  { value: 'Mandarin', flag: '🇨🇳' },
  { value: 'Portuguese', flag: '🇧🇷' },
  { value: 'German', flag: '🇩🇪' },
]

const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced']

export default function ScenarioSelect({ onStart }) {
  const [selected, setSelected] = useState(null)
  const [language, setLanguage] = useState('Spanish')
  const [difficulty, setDifficulty] = useState('Beginner')

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent mb-3">
          LinguaScene
        </h1>
        <p className="text-gray-400 text-lg">Language learning through immersive real-life scenarios</p>
      </div>

      <p className="text-sm text-gray-500 uppercase tracking-widest mb-4">Choose a scenario</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelected(s.id)}
            className={`rounded-xl border text-left transition-all overflow-hidden ${
              selected === s.id
                ? 'border-violet-500 bg-violet-500/10'
                : 'border-gray-700 bg-gray-900 hover:border-gray-600'
            }`}
          >
            <div className="flex items-center justify-center h-28 bg-gray-800 text-5xl">
              {s.emoji}
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-lg mb-1">{s.title}</h3>
              <p className="text-gray-400 text-sm mb-2">{s.description}</p>
              <p className="text-gray-600 text-xs">with {s.character}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div>
          <p className="text-sm text-gray-500 uppercase tracking-widest mb-2">Language</p>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500"
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.flag} {l.value}
              </option>
            ))}
          </select>
        </div>
        <div>
          <p className="text-sm text-gray-500 uppercase tracking-widest mb-2">Difficulty</p>
          <div className="flex gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                  difficulty === d
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-900 border border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={() => onStart({ scenario_id: selected, language, difficulty })}
        disabled={!selected}
        className="w-full py-4 rounded-xl font-semibold text-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        Start Scene →
      </button>
    </div>
  )
}
