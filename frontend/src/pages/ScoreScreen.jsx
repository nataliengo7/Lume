export default function ScoreScreen({ scoreData, onRestart }) {
  const { score = 0, grammar_errors = [], strengths = '', improvement = '' } = scoreData || {}
  const color = score >= 80 ? '#4ade80' : score >= 60 ? '#fbbf24' : '#f87171'
  const medal = score >= 80 ? '🏆' : score >= 60 ? '🥈' : '🎯'

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="text-6xl mb-3">{medal}</div>
        <h2 className="text-3xl font-bold mb-4" style={{ color: '#e2ffe8' }}>Scene Complete!</h2>
        <div className="text-8xl font-bold" style={{ color }}>{score}</div>
        <p className="mt-1 text-lg" style={{ color: '#4b7a5a' }}>out of 100</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="rounded-2xl p-5" style={{ background: '#0a1409', border: '1px solid rgba(34,197,94,0.3)' }}>
          <h3 className="font-bold mb-2 text-lg" style={{ color: '#4ade80' }}>✓ Strengths</h3>
          <p className="text-sm leading-relaxed" style={{ color: '#a7f3d0' }}>{strengths}</p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: '#0a1409', border: '1px solid rgba(251,191,36,0.3)' }}>
          <h3 className="font-bold mb-2 text-lg" style={{ color: '#fbbf24' }}>💡 To Improve</h3>
          <p className="text-sm leading-relaxed" style={{ color: '#fde68a' }}>{improvement}</p>
        </div>
      </div>

      {grammar_errors.length > 0 && (
        <div className="rounded-2xl p-5 mb-8" style={{ background: '#0a1409', border: '1px solid rgba(248,113,113,0.3)' }}>
          <h3 className="font-bold mb-3 text-lg" style={{ color: '#f87171' }}>Grammar Errors</h3>
          <ul className="space-y-1.5">
            {grammar_errors.map((e, i) => (
              <li key={i} className="text-sm flex gap-2" style={{ color: '#fca5a5' }}>
                <span className="shrink-0" style={{ color: '#f87171' }}>✗</span>
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={onRestart}
        className="w-full py-4 rounded-2xl font-bold text-lg transition-all"
        style={{ background: '#166534', color: '#bbf7d0', border: '1px solid rgba(34,197,94,0.4)', boxShadow: '0 4px 0 #14532d' }}
      >
        Play Again 🗺️
      </button>
    </div>
  )
}
