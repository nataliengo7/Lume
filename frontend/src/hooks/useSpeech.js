const LANG_CODES = {
  Spanish: 'es',
  French: 'fr',
  Mandarin: 'zh',
  Portuguese: 'pt',
  German: 'de',
}

export default function useSpeech() {
  function speak(text, language) {
    window.speechSynthesis.cancel()

    function _speak(voices) {
      const utter = new SpeechSynthesisUtterance(text)
      utter.rate = 0.9
      utter.lang = { Spanish: 'es-ES', French: 'fr-FR', Mandarin: 'zh-CN', Portuguese: 'pt-BR', German: 'de-DE' }[language] || 'es-ES'
      const prefix = LANG_CODES[language] || 'es'
      const voice = voices.find((v) => v.lang.startsWith(prefix))
      if (voice) utter.voice = voice
      window.speechSynthesis.speak(utter)
    }

    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      _speak(voices)
    } else {
      window.speechSynthesis.addEventListener('voiceschanged', () => _speak(window.speechSynthesis.getVoices()), { once: true })
    }
  }

  function stop() {
    window.speechSynthesis.cancel()
  }

  return { speak, stop }
}
