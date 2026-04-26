import json
import os
import secrets

import resend
import google.generativeai as genai
from bson import ObjectId
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from pymongo import MongoClient

from prompts import build_system_prompt
from scenarios import get_all_scenarios, add_scenario
from auth import (
    LoginRequest,
    RegisterRequest,
    create_access_token,
    get_current_user_id,
    hash_password,
    verify_password,
)

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
resend.api_key = os.getenv("RESEND_API_KEY")

client = MongoClient(os.getenv("MONGODB_URI"))
db = client["lume"]

app = FastAPI()

origins = ["http://localhost:5173", "http://localhost:5174"]
if frontend_url := os.getenv("FRONTEND_URL"):
    origins.append(frontend_url)

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


@app.post("/register")
async def register(req: RegisterRequest):
    if db.users.find_one({"email": req.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    db.users.insert_one({
        "email": req.email,
        "password": hash_password(req.password),
    })
    user = db.users.find_one({"email": req.email})
    return {"token": create_access_token(str(user["_id"]))}


@app.get("/verify")
async def verify_email(token: str):
    user = db.users.find_one({"verify_token": token})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")
    db.users.update_one({"_id": user["_id"]}, {"$set": {"verified": True}, "$unset": {"verify_token": ""}})
    frontend = os.getenv("FRONTEND_URL", "http://localhost:5173")
    return RedirectResponse(url=f"{frontend}/?verified=1")


@app.post("/login")
async def login(req: LoginRequest):
    user = db.users.find_one({"email": req.email})
    if not user or not verify_password(req.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"token": create_access_token(str(user["_id"]))}


@app.post("/chat")
async def chat(req: ChatRequest, user_id: str = Depends(get_current_user_id)):
    system = build_system_prompt(req.scenario_id, req.language, req.difficulty)
    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=system,
    )
    try:
        chat_session = model.start_chat(history=to_gemini_history(req.history))
        response = chat_session.send_message(req.message)
        reply = response.text
        db.conversations.update_one(
            {"user_id": user_id, "scenario_id": req.scenario_id, "language": req.language, "difficulty": req.difficulty, "active": True},
            {"$push": {"messages": [
                {"role": "user", "content": req.message},
                {"role": "assistant", "content": reply},
            ]}},
            upsert=True,
        )
        return {"reply": reply}
    except Exception as e:
        msg = str(e)
        if "quota" in msg.lower() or "429" in msg or "rate" in msg.lower():
            raise HTTPException(status_code=429, detail="Gemini API quota exceeded. Check your API key or billing.")
        raise HTTPException(status_code=500, detail=f"Gemini error: {msg}")


@app.post("/score")
async def score(req: ScoreRequest, user_id: str = Depends(get_current_user_id)):
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
        result = json.loads(text)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Score parse failed")

    db.conversations.update_one(
        {"user_id": user_id, "scenario_id": req.scenario_id, "language": req.language, "difficulty": req.difficulty, "active": True},
        {"$set": {"score": result, "active": False}},
    )
    return result


@app.get("/history")
async def history(user_id: str = Depends(get_current_user_id)):
    convos = list(db.conversations.find({"user_id": user_id}, {"_id": 0}))
    return {"conversations": convos}


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
