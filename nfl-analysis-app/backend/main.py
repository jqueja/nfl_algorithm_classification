# BACKEND: main.py

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
import pandas as pd
import os
import shutil
import requests
app = FastAPI()

# Enable CORS (for localhost dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_API_URL = "http://localhost:11434/api/generate"

UPLOAD_DIR = "backend/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"filename": file.filename}

class FeatureRequest(BaseModel):
    responseVar: str
    supportVars: List[str]
    filename: str

@app.post("/feature-importance")
def compute_feature_importance(payload: FeatureRequest):
    file_path = os.path.join(UPLOAD_DIR, payload.filename)
    if not os.path.exists(file_path):
        return {"error": f"File '{payload.filename}' not found on server."}

    df = pd.read_csv(file_path)

    if payload.responseVar not in df.columns:
        return {"error": f"Response variable '{payload.responseVar}' not in data."}
    for col in payload.supportVars:
        if col not in df.columns:
            return {"error": f"Supporting variable '{col}' not found in data."}

    df = df.dropna(subset=[payload.responseVar])
    target_series = df[payload.responseVar]
    df = df.drop(columns=[payload.responseVar])
    df = pd.get_dummies(df)
    df["target"] = target_series

    if "target" not in df.columns:
        return {"error": "Target column not created."}

    df["target"] = pd.factorize(df["target"])[0]
    X = df.drop(columns=["target"])
    y = df["target"]

    class_counts = y.value_counts()
    if (class_counts < 2).any():
        X_train, _, y_train, _ = train_test_split(X, y, random_state=42)
    else:
        X_train, _, y_train, _ = train_test_split(X, y, stratify=y, random_state=42)

    model = RandomForestClassifier(random_state=42)
    model.fit(X_train, y_train)

    importances = model.feature_importances_
    features = X.columns.tolist()

    # Create a sorted list of feature importances
    sorted_importances = sorted(
        zip(features, importances), key=lambda x: x[1], reverse=True
    )

    return {f: round(i, 6) for f, i in sorted_importances}

class LLMRequest(BaseModel):
    importances: Dict[str, float]


# Define a function to interact with the Ollama model
def query_ollama(prompt, model="deepseek-r1:7b"):
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False
    }
    response = requests.post(OLLAMA_API_URL, json=payload)
    print(response)
    if response.status_code == 200:
        return response.json()["response"]
    else:
        raise Exception(f"Error: {response.status_code}, {response.text}")


@app.get("/test-llm")
def test_llm():
    try:
        content = query_ollama("Say hello from DeepSeek.")
        return {"status": "LLM is reachable", "response": content}
    except Exception as e:
        return {"status": "LLM is NOT reachable", "error": str(e)}


@app.post("/contextualize")
def contextualize_with_llm(payload: LLMRequest):
    importance_text = "\n".join([f"{k}: {v}" for k, v in payload.importances.items()])
    prompt = (
        "You are an expert data scientist. Given the following feature importances, "
        "contextualize them in a way that a non-technical person can understand.\n\n"
        "Feature Importances:\n"
        + importance_text
        + "\n\n"
        "Please provide a clear and concise explanation of the most important features "
        "and their significance in the context of the data."
    )
    try:
        print("Before the query_ollama call")
        content = query_ollama(prompt)
        return {"response": content}
    except Exception as e:
        return {"error": str(e)}

@app.get("/health")
def health_check():         
    return {"status": "ok"}
