from fastapi import FastAPI, Request
from pydantic import BaseModel
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

app = FastAPI()

class InputData(BaseModel):
    features: list

@app.post("/predict")
def predict(data: InputData):
    # Dummy data for demonstration
    df = pd.DataFrame(data.features, columns=["feature1", "feature2", "feature3"])
    model = RandomForestClassifier()
    y = [0, 1, 0, 1]  # dummy target
    X = df.copy()
    model.fit(X, y)
    prediction = model.predict(X)
    return {"predictions": prediction.tolist()}
