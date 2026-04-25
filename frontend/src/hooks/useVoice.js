import { useRef, useState } from 'react'

const LANG_CODES = {
  Spanish: 'es-ES',
  French: 'fr-FR',
  Mandarin: 'zh-CN',
  Portuguese: 'pt-BR',
  German: 'de-DE',
}

export default function useVoice({ onResult, language }) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState(null)
  const recogRef = useRef(null)

  function start() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('Voice input requires Chrome. Please type your response.')
      return
    }
    const rec = new SpeechRecognition()
    rec.lang = LANG_CODES[language] || 'es-ES'
    rec.interimResults = false
    rec.maxAlternatives = 1

    rec.onresult = (e) => {
      onResult(e.results[0][0].transcript)
      setListening(false)
    }
    rec.onerror = (e) => {
      setError(e.error === 'not-allowed' ? 'Microphone permission denied.' : e.error)
      setListening(false)
    }
    rec.onend = () => setListening(false)

    recogRef.current = rec
    rec.start()
    setListening(true)
    setError(null)
  }

  function stop() {
    recogRef.current?.stop()
    setListening(false)
  }

  return { listening, error, start, stop }
}
