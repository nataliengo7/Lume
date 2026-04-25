export default function ScoreScreen({ scoreData, onRestart }) {
  const { score = 0, grammar_errors = [], strengths = '', improvement = '' } = scoreData || {}
  const color = score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold mb-4">Session Complete</h2>
        <div className={`text-8xl font-bold ${color}`}>{score}</div>
        <p className="text-gray-500 mt-1">out of 100</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-900 border border-green-500/30 rounded-xl p-5">
          <h3 className="text-green-400 font-semibold mb-2">✓ Strengths</h3>
          <p className="text-gray-300 text-sm leading-relaxed">{strengths}</p>
        </div>
        <div className="bg-gray-900 border border-yellow-500/30 rounded-xl p-5">
          <h3 className="text-yellow-400 font-semibold mb-2">💡 To Improve</h3>
          <p className="text-gray-300 text-sm leading-relaxed">{improvement}</p>
        </div>
      </div>

      {grammar_errors.length > 0 && (
        <div className="bg-gray-900 border border-red-500/30 rounded-xl p-5 mb-8">
          <h3 className="text-red-400 font-semibold mb-3">Grammar Errors</h3>
          <ul className="space-y-1.5">
            {grammar_errors.map((e, i) => (
              <li key={i} className="text-gray-300 text-sm flex gap-2">
                <span className="text-red-400 shrink-0">✗</span>
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={onRestart}
        className="w-full py-4 bg-violet-600 hover:bg-violet-500 rounded-xl font-semibold text-lg transition-all"
      >
        Play Again
      </button>
    </div>
  )
}
