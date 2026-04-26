import json
import os

import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from prompts import build_system_prompt

from scenarios import get_all_scenarios, add_scenario  # ✅ import these



load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI()

origins = ["http://localhost:5173", "http://localhost:5174"]
if os.getenv("FRONTEND_URL"):
    origins.append(os.getenv("FRONTEND_URL"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def to_gemini_history(history: list) -> list:
    result = []
    for msg in history:
        role = "model" if msg["role"] == "assistant" else "user"
        result.append({"role": role, "parts": [msg["content"]]})
    return result


class ChatRequest(BaseModel):
    scenario_id: str
    language: str
    difficulty: str
    history: list
    message: str


class ScoreRequest(BaseModel):
    scenario_id: str
    language: str
    difficulty: str
    history: list


@app.post("/chat")
async def chat(req: ChatRequest):
    system = build_system_prompt(req.scenario_id, req.language, req.difficulty)
    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=system,
    )
    try:
        chat_session = model.start_chat(history=to_gemini_history(req.history))
        response = chat_session.send_message(req.message)
        return {"reply": response.text}
    except Exception as e:
        msg = str(e)
        if "quota" in msg.lower() or "429" in msg or "rate" in msg.lower():
            raise HTTPException(status_code=429, detail="Gemini API quota exceeded. Check your API key or billing.")
        raise HTTPException(status_code=500, detail=f"Gemini error: {msg}")


@app.post("/score")
async def score(req: ScoreRequest):
    conversation = "\n".join(
        f"{'User' if m['role'] == 'user' else 'AI'}: {m['content']}"
        for m in req.history
        if m["content"] != "__opening__"
    )
    prompt = (
        f"Review this {req.language} conversation (difficulty: {req.difficulty}):\n\n"
        f"{conversation}\n\n"
        "Return ONLY valid JSON, no markdown fences:\n"
        '{"score": <0-100>, "grammar_errors": ["<error>"], '
        '"strengths": "<one sentence>", "improvement": "<one actionable tip>"}'
    )
    model = genai.GenerativeModel(model_name="gemini-2.5-flash")
    response = model.generate_content(prompt)

    text = response.text.strip()
    if text.startswith("```"):
        text = text[text.find("\n") + 1:]
        if "```" in text:
            text = text[:text.rfind("```")]

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Score parse failed")


class ScenarioRequest(BaseModel):
    prompt: str
    language: str


@app.post("/generate_scenario")
async def generate_scenario(req: ScenarioRequest):
    model = genai.GenerativeModel("gemini-2.5-flash")

    system = """
    You generate structured language-learning scenarios.
    Return ONLY valid JSON, no markdown fences, no extra text.

    IMPORTANT: ALL fields (title, description, character, character_role, setting, goal) must be written in ENGLISH.
    The language field only affects what language the USER will practice during the conversation — it does NOT affect the scenario metadata.

    {
    "id": "short_snake_case_id",
    "title": "...",
    "description": "one sentence summary in English",
    "character": "first name only",
    "character_role": "...",
    "setting": "...",
    "goal": "...",
    "vocabulary_targets": ["word1", "word2"],
    "turns_to_complete": 8
    }"""

    prompt = f"The user will be practicing {req.language}. User idea: {req.prompt}\nMake a realistic interactive scenario. All metadata in English."

    response = model.generate_content(system + "\n\n" + prompt)
    text = response.text.strip()

    if text.startswith("```"):
        text = text[text.find("\n") + 1:]
        if "```" in text:
            text = text[:text.rfind("```")]

    try:
        scenario = json.loads(text)
        add_scenario(scenario)
        return scenario
    except json.JSONDecodeError as e:
        print("JSON parse failed:", text)
        raise HTTPException(status_code=500, detail=f"Scenario generation failed: {str(e)}")


class HelpRequest(BaseModel):
    message: str
    language: str


@app.post("/help")
async def help_translate(req: HelpRequest):
    try:
        prompt = (
            f"A language learner is practicing {req.language} and needs help understanding this phrase:\n\n"
            f'"{req.message}"\n\n'
            "Provide:\n"
            "1. A natural English translation\n"
            "2. A brief breakdown of 1-2 key words or phrases they should know\n\n"
            "Be concise and encouraging. Plain text only, no markdown."
        )
        model = genai.GenerativeModel(model_name="gemini-2.5-flash")
        response = model.generate_content(prompt)
        return {"help": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
