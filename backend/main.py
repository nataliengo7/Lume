import json
import os

import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from prompts import build_system_prompt

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


def to_gemini_contents(history: list, message: str) -> list:
    contents = []
    for msg in history:
        role = "model" if msg["role"] == "assistant" else "user"
        contents.append({"role": role, "parts": [{"text": msg["content"]}]})
    contents.append({"role": "user", "parts": [{"text": message}]})
    return contents


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
    contents = to_gemini_contents(req.history, req.message)
    response = model.generate_content(contents)
    return {"reply": response.text}


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
