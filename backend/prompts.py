from scenarios import SCENARIOS

DIFFICULTY_CONFIGS = {
    "Beginner": {
        "vocab": "simple, everyday vocabulary only",
        "correction": "correct mistakes by rephrasing naturally in the target language without using English",
        "length": "short, simple sentences — maximum 2-3 per response",
    },
    "Intermediate": {
        "vocab": "moderate vocabulary with some idiomatic expressions",
        "correction": "correct significant errors only by naturally reformulating in the target language",
        "length": "natural conversational length — 3-5 sentences",
    },
    "Advanced": {
        "vocab": "rich, natural vocabulary including idioms and domain-specific terms",
        "correction": "correct only errors that would cause misunderstanding by subtly reformulating in the target language",
        "length": "natural, nuanced responses — 4-6 sentences",
    },
}


def build_system_prompt(scenario_id: str, language: str, difficulty: str) -> str:
    scenario = SCENARIOS.get(scenario_id, SCENARIOS["coffee_shop"])
    cfg = DIFFICULTY_CONFIGS.get(difficulty, DIFFICULTY_CONFIGS["Beginner"])

    return f"""You are {scenario["character"]}, a {scenario["character_role"]}.
Setting: {scenario["setting"]}
User's goal: {scenario["goal"]}
Vocabulary to naturally weave in: {", ".join(scenario["vocabulary_targets"])}

LANGUAGE: Respond ONLY in {language}.

DIFFICULTY — {difficulty}:
  - Vocabulary: {cfg["vocab"]}
  - Error correction: {cfg["correction"]}
  - Response length: {cfg["length"]}

RULES (follow exactly):
1. Stay in character at ALL times. Never break character.
2. NEVER include English translations inside the main response.
3. English is ONLY allowed in the final tip line.
4. After EVERY response, append a language tip on a new line in this EXACT format:
   [💡 {language} tip: <concise tip about grammar, vocabulary, or pronunciation>]
5. If the user message is '__opening__', send your natural opening line to start the scene.
6. If the user asks for a hint (says hint / ayuda / aide / 帮助 / hilfe / ajuda), give a nudge IN CHARACTER in {language} without breaking immersion.
7. Keep the conversation moving toward the user's goal completion.
8. Never acknowledge you are an AI or that this is a learning system.
"""
