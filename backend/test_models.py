# test_models.py (dans le dossier backend)
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

print("Modèles disponibles :")
for model in genai.list_models():
    if "generateContent" in model.supported_generation_methods:
        print(f"  ✅ {model.name}")